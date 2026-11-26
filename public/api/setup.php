<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
require __DIR__.'/images.php';
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
header('Referrer-Policy: no-referrer');
header('Content-Type: text/html; charset=utf-8');
$message='';$done=false;$error=false;
if($_SERVER['REQUEST_METHOD']==='POST'){
 try{
  $cfg=config();$token=(string)($_POST['token']??'');
  if(strlen((string)($cfg['setup_token']??''))<32||!hash_equals($cfg['setup_token'],$token))fail(403,'Installationsschlüssel ungültig.');
  if(!extension_loaded('gd')&&!class_exists('Imagick'))fail(503,'GD oder Imagick fehlt.');
  if(!extension_loaded('pdo_mysql'))fail(503,'PDO MySQL fehlt.');
  $pdo=db();
  if((int)$pdo->query("SELECT GET_LOCK('keb_install',10)")->fetchColumn()!==1)fail(409,'Installation läuft bereits.');
  try {
   $exists=$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='profiles'")->fetchColumn();
   if($exists&&(int)$pdo->query('SELECT COUNT(*) FROM profiles')->fetchColumn()>0)fail(409,'Installation ist bereits abgeschlossen.');
   $email=valid_email($_POST['email']??null);hash_password($_POST['password']??null);
   media_dir('bilder');media_dir('dokumente');
   foreach(explode(';',file_get_contents(__DIR__.'/schema.sql')) as $sql)if(trim($sql)!=='')$pdo->exec($sql);
   $pdo->beginTransaction();
   try{create_account(['email'=>$email,'password'=>$_POST['password'],'display_name'=>'Administrator','role'=>'admin']);$pdo->commit();}
   catch(Throwable $e){$pdo->rollBack();throw $e;}
   $message='Installation erfolgreich. Die Einrichtung ist jetzt gesperrt.';$done=true;
  }finally{$pdo->query("SELECT RELEASE_LOCK('keb_install')");}
 }catch(Throwable $e){$error=true;$message=$e instanceof ApiError?$e->getMessage():'Einrichtung fehlgeschlagen. Datenbankverbindung und PHP-Protokoll prüfen.';error_log('KEB Setup: '.get_class($e).' '.$e->getCode());}
}
function esc(string $s):string{return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
?><!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KEB – Einrichtung</title>
<style>body{font:16px system-ui;max-width:32rem;margin:3rem auto;padding:1rem;background:#fafafa;color:#222}label{display:block;margin:1rem 0}input{display:block;box-sizing:border-box;width:100%;padding:.6rem;margin-top:.4rem}button{padding:.7rem 1.2rem}p{line-height:1.5}</style>
<h1>KEB – Ersteinrichtung</h1>
<?php if($message!==''): ?><p role="status"><?=esc($message)?></p><?php endif; ?>
<?php if(!$done): ?><p>Gib den Installationsschlüssel und die Zugangsdaten des ersten Administrators ein. Eine bereits eingerichtete Benutzerverwaltung kann hier nicht überschrieben werden.</p>
<form method="post" autocomplete="off"><label>Installationsschlüssel<input name="token" type="password" required></label><label>Administrator-E-Mail<input name="email" type="email" value="info@keb-ev.de" required></label><label>Administrator-Passwort (mindestens 12 Zeichen)<input name="password" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></label><button>Installation starten</button></form><?php else: ?><p><a href="/admin">Zur Verwaltung</a> · <a href="/">Zur Homepage</a></p><?php endif; ?></html>
