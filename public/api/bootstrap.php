<?php
declare(strict_types=1);
require_once __DIR__.'/migration.php';
ini_set('display_errors','0');
ini_set('session.use_strict_mode','1');
ini_set('session.use_only_cookies','1');
session_name('KEBSESSID');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
// Public visitors do not receive a session cookie until successful authentication.
if(isset($_COOKIE[session_name()]))session_start();
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

class ApiError extends RuntimeException {
 public function __construct(public int $status, string $message) { parent::__construct($message); }
}
function fail(int $status,string $message): never { throw new ApiError($status,$message); }
function config(): array {
 $path=__DIR__.'/config.php';
 if (!is_file($path)) fail(503,'Datenbankkonfiguration fehlt.');
 $c=require $path;
 if (!is_array($c) || empty($c['password'])) fail(503,'Datenbankkonfiguration fehlt.');
 return $c;
}
function db(): PDO {
 static $pdo;
 if (!$pdo) {
  $c=config();
  $pdo=new PDO('mysql:host='.$c['host'].';port=3306;dbname='.$c['database'].';charset=utf8mb4',$c['username'],$c['password'],
   [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $pdo->exec("SET time_zone = '+00:00'");
 }
 return $pdo;
}
function stmt(string $sql,array $args=[]): PDOStatement { $s=db()->prepare($sql); $s->execute($args); return $s; }
function uuid(): string { $b=random_bytes(16); $b[6]=chr((ord($b[6])&15)|64); $b[8]=chr((ord($b[8])&63)|128); return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($b),4)); }
function input(): array {
 $raw=file_get_contents('php://input',false,null,0,1048577);
 if(strlen($raw)>1048576) fail(413,'Anfrage zu groß.');
 try {$v=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(JsonException){fail(400,'Ungültige Anfrage.');}
 if(!is_array($v)) fail(400,'Ungültige Anfrage.');
 return $v;
}
function current_user(): ?array {
 if(empty($_SESSION['uid'])) return null;
 if(time()-($_SESSION['last']??0)>7200){unset($_SESSION['uid']);return null;}
 $u=stmt('SELECT p.id,p.email,p.display_name,p.username,p.password_hash,r.role FROM profiles p LEFT JOIN user_roles r ON p.id=r.user_id WHERE p.id=? AND p.is_active=1',[$_SESSION['uid']])->fetch();
 if(!$u || !hash_equals(hash('sha256',$u['password_hash']),$_SESSION['version']??'')){unset($_SESSION['uid']);return null;}
 unset($u['password_hash']); $u['role']=$u['role']??'user'; $_SESSION['last']=time();return $u;
}
function require_role(array $roles): array {
 $u=current_user(); if(!$u)fail(401,'Bitte anmelden.'); if(!in_array($u['role'],$roles,true))fail(403,'Keine Berechtigung.');return $u;
}
function csrf(): void {
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST' || ($_SERVER['HTTP_X_KEB_REQUEST']??'')!=='1')fail(403,'Ungültige Anfrage.');
 if(isset($_SERVER['HTTP_SEC_FETCH_SITE']) && !in_array($_SERVER['HTTP_SEC_FETCH_SITE'],['same-origin','none'],true))fail(403,'Ungültiger Ursprung.');
 if(isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN']!=='https://'.($_SERVER['HTTP_HOST']??''))fail(403,'Ungültiger Ursprung.');
}
function rate_limit(string $name,int $max,int $seconds): void {
 $key=hash('sha256',$name.'|'.($_SERVER['REMOTE_ADDR']??'unknown'));$now=time();
 stmt('INSERT INTO request_limits (bucket,hits,window_start) VALUES (?,1,?) ON DUPLICATE KEY UPDATE hits=IF(window_start<=?,1,hits+1),window_start=IF(window_start<=?, ?,window_start)',[$key,$now,$now-$seconds,$now-$seconds,$now]);
 if((int)stmt('SELECT hits FROM request_limits WHERE bucket=?',[$key])->fetchColumn()>$max)fail(429,'Zu viele Anfragen. Bitte später erneut versuchen.');
}
function valid_email(mixed $email): string {
 if(!is_string($email)||strlen($email)>254||!filter_var(trim($email),FILTER_VALIDATE_EMAIL))fail(400,'Ungültige E-Mail-Adresse.');
 return strtolower(trim($email));
}
function hash_password(mixed $pw): string {
 if(!is_string($pw)||strlen($pw)<12||strlen($pw)>72||str_contains($pw,chr(0)))fail(400,'Passwort muss 12 bis 72 Bytes lang sein.');
 return password_hash($pw,PASSWORD_DEFAULT);
}
function create_account(array $v,?array $actor=null): array {
 $email=valid_email($v['email']??null);$hash=hash_password($v['password']??null);
 $role=$v['role']??'redakteur'; if(!in_array($role,['admin','redakteur','user'],true))fail(400,'Ungültige Rolle.');
 $id=uuid();$name=trim((string)($v['display_name']??''));if(strlen($name)>255)fail(400,'Name zu lang.');
 $username=valid_username($v['username']??username_base($name?:explode('@',$email)[0]));
 $name=$username; // One visible account name; retain the legacy column for compatibility.
 if(stmt('SELECT id FROM profiles WHERE email=?',[$email])->fetch())fail(409,'Diese E-Mail ist bereits registriert.');
 if(stmt('SELECT id FROM profiles WHERE username=?',[$username])->fetch())fail(409,'Dieser Benutzername ist bereits vergeben.');
 try {stmt('INSERT INTO profiles (id,email,display_name,username,password_hash,last_edit_by,last_edit_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP())',[$id,$email,$name,$username,$hash,$actor['username']??$username]);}
 catch(PDOException $e){if((int)($e->errorInfo[1]??0)===1062)fail(409,'E-Mail oder Benutzername bereits vergeben.');throw $e;}
 stmt('INSERT INTO user_roles (id,user_id,role) VALUES (?,?,?)',[uuid(),$id,$role]);
 return ['id'=>$id,'email'=>$email,'display_name'=>$name,'username'=>$username,'role'=>$role];
}
function json_response(mixed $data=null,int $status=200,?string $error=null): never {
 http_response_code($status);header('Content-Type: application/json; charset=utf-8');
 echo json_encode(['data'=>$data,'error'=>$error===null?null:['message'=>$error]],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;
}
function handle_error(Throwable $e): never {
 if($e instanceof ApiError)json_response(null,$e->status,$e->getMessage());
 error_log('KEB API: '.get_class($e).' code '.$e->getCode());
 json_response(null,500,'Serverfehler. Bitte Konfiguration und Serverprotokoll prüfen.');
}
