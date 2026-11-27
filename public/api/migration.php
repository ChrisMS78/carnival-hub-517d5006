<?php
declare(strict_types=1);

// Additive and restartable; existing content and password hashes are preserved.
const TRASH_TABLES=['events','about_content','gallery_albums','gallery_images','contact_submissions'];
const PUBLISH_TABLES=['events','about_content','gallery_albums'];
const EDIT_TABLES=['profiles','events','about_content','gallery_albums','gallery_images','contact_submissions','page_backgrounds','site_settings'];
function column_exists(string $table,string $column): bool {
 return (bool)stmt('SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?',[$table,$column])->fetchColumn();
}
function username_base(string $name): string {
 $name=strtr($name,['ä'=>'ae','ö'=>'oe','ü'=>'ue','Ä'=>'ae','Ö'=>'oe','Ü'=>'ue','ß'=>'ss']);
 $name=trim(preg_replace('/[^a-z0-9._-]+/','-',strtolower($name)),'._-');
 return substr(strlen($name)>=3?$name:'user',0,48);
}
function valid_username(mixed $name): string {
 if(!is_string($name))fail(400,'Benutzername fehlt.');
 $name=strtolower(trim($name));
 if(!preg_match('/^[a-z0-9][a-z0-9._-]{2,63}$/D',$name))fail(400,'Benutzername: 3–64 Zeichen (Buchstaben, Zahlen, Punkt, Bindestrich, Unterstrich).');
 return $name;
}
function ensure_schema(): void {
 $pdo=db();
 try {
  if((int)$pdo->query('SELECT version FROM keb_schema_version WHERE id=1')->fetchColumn()>=3)return;
 }catch(PDOException $e){if((int)($e->errorInfo[1]??0)!==1146)throw $e;}
 if(!column_exists('profiles','id'))fail(503,'Bitte zuerst die Ersteinrichtung durchführen.');
 $lock='keb-schema-'.substr(hash('sha256',config()['database']),0,24);
 if((int)stmt('SELECT GET_LOCK(?,15)',[$lock])->fetchColumn()!==1)fail(503,'Datenbankaktualisierung läuft. Bitte erneut versuchen.');
 try {
  $pdo->exec('CREATE TABLE IF NOT EXISTS keb_schema_version (id INT PRIMARY KEY,version INT NOT NULL) ENGINE=InnoDB');
  if((int)$pdo->query('SELECT version FROM keb_schema_version WHERE id=1')->fetchColumn()>=3)return;
  if(!column_exists('profiles','username'))$pdo->exec('ALTER TABLE profiles ADD COLUMN username VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NULL');
  $used=[];
  foreach(stmt('SELECT username FROM profiles WHERE username IS NOT NULL')->fetchAll() as $r)$used[strtolower($r['username'])]=true;
  foreach(stmt('SELECT id,display_name,email FROM profiles WHERE username IS NULL ORDER BY created_at,id')->fetchAll() as $r){
   $base=username_base(trim((string)$r['display_name'])?:explode('@',$r['email'])[0]);
   $name=$base;$i=2;while(isset($used[$name]))$name=$base.'-'.$i++;
   stmt('UPDATE profiles SET username=? WHERE id=? AND username IS NULL',[$name,$r['id']]);$used[$name]=true;
  }
  if(!stmt("SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='profiles' AND index_name='uq_keb_username'")->fetchColumn())
   $pdo->exec('ALTER TABLE profiles ADD UNIQUE KEY uq_keb_username (username)');
  $pdo->exec('ALTER TABLE profiles MODIFY username VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL');
  foreach(EDIT_TABLES as $table){
   if(!column_exists($table,'last_edit_by'))$pdo->exec("ALTER TABLE `$table` ADD COLUMN last_edit_by VARCHAR(64) NULL");
   if(!column_exists($table,'last_edit_at'))$pdo->exec("ALTER TABLE `$table` ADD COLUMN last_edit_at DATETIME NULL");
  }
  foreach(TRASH_TABLES as $table){
   if(!column_exists($table,'deleted_at'))$pdo->exec("ALTER TABLE `$table` ADD COLUMN deleted_at DATETIME NULL");
  }
  foreach(PUBLISH_TABLES as $table){
   if(!column_exists($table,'published'))$pdo->exec("ALTER TABLE `$table` ADD COLUMN published BOOLEAN NOT NULL DEFAULT TRUE");
  }
  if(!column_exists('profiles','last_login_at'))$pdo->exec('ALTER TABLE profiles ADD COLUMN last_login_at DATETIME NULL');
  $pdo->exec('CREATE TABLE IF NOT EXISTS audit_log (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor VARCHAR(64) NOT NULL, action VARCHAR(40) NOT NULL, entity VARCHAR(50) NOT NULL, entity_id VARCHAR(100) NOT NULL, label VARCHAR(255) NOT NULL, fields VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  $contact=[];foreach(stmt("SELECT `key`,value FROM site_settings WHERE `key` IN ('contact_address','contact_email','contact_phone')")->fetchAll() as $row)$contact[$row['key']]=trim((string)$row['value']);
  $address=$contact['contact_address']??'';if(str_contains(strtolower($address),'musterstraße'))$address='';
  $phone=$contact['contact_phone']??'';if($phone==='+49 123 456789')$phone='';
  $imprint=[
   ['imprint_name','K.E.B. e.V.','Vollständiger Vereinsname (laut Register)'],
   ['imprint_address',$address,'Ladungsfähige Anschrift (Straße, Hausnummer, PLZ, Ort)'],
   ['imprint_board','','Vertretungsberechtigter Vorstand (§ 26 BGB, Vor- und Nachnamen)'],
   ['imprint_court','','Registergericht'],['imprint_register','','Vereinsregisternummer'],
   ['imprint_email',($contact['contact_email']??'')?:'info@keb-ev.de','Kontakt-E-Mail'],['imprint_phone',$phone,'Telefon / unmittelbarer Kontakt'],
   ['imprint_vat','','USt-IdNr. (falls vorhanden)'],['imprint_economic_id','','Wirtschafts-IdNr. (falls vorhanden)'],
   ['imprint_editor','','Verantwortlicher nach § 18 Abs. 2 MStV (nur falls erforderlich)'],
   ['imprint_editor_address','','Anschrift des redaktionell Verantwortlichen (falls erforderlich)'],
   ['imprint_extra','','Weitere Pflichtangaben (falls zutreffend)']
  ];
  foreach($imprint as [$key,$value,$label])stmt("INSERT IGNORE INTO site_settings (id,`key`,value,label,category) VALUES (?,?,?,?,'impressum')",[uuid(),$key,$value,$label]);
  $pdo->exec('INSERT INTO keb_schema_version (id,version) VALUES (1,3) ON DUPLICATE KEY UPDATE version=3');
 }finally{stmt('SELECT RELEASE_LOCK(?)',[$lock]);}
}
function stamp_album(string $id,array $actor): void {
 stmt('UPDATE gallery_albums SET last_edit_by=?,last_edit_at=UTC_TIMESTAMP() WHERE id=?',[$actor['username'],$id]);
}
function admin_account_change(callable $operation): mixed {
 $lock='keb-accounts-'.substr(hash('sha256',config()['database']),0,24);
 if((int)stmt('SELECT GET_LOCK(?,10)',[$lock])->fetchColumn()!==1)fail(503,'Benutzerverwaltung ist beschäftigt.');
 try { $actor=require_role(['admin']); return $operation($actor); }
 finally { stmt('SELECT RELEASE_LOCK(?)',[$lock]); }
}
function guard_account(string $id,array $actor,bool $removesAdmin): array {
 if($id===$actor['id'])fail(403,'Das eigene Konto darf nicht gelöscht, deaktiviert oder herabgestuft werden.');
 $target=stmt('SELECT p.id,p.is_active,r.role FROM profiles p LEFT JOIN user_roles r ON p.id=r.user_id WHERE p.id=?',[$id])->fetch();
 if(!$target)fail(404,'Benutzer nicht gefunden.');
 if($removesAdmin&&$target['is_active']&&$target['role']==='admin'&&(int)stmt("SELECT COUNT(*) FROM profiles p JOIN user_roles r ON p.id=r.user_id WHERE p.is_active=1 AND r.role='admin'")->fetchColumn()<=1)fail(409,'Der letzte aktive Administrator muss erhalten bleiben.');
 return $target;
}
