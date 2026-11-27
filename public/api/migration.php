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
  if((int)$pdo->query('SELECT version FROM keb_schema_version WHERE id=1')->fetchColumn()>=4)return;
 }catch(PDOException $e){if((int)($e->errorInfo[1]??0)!==1146)throw $e;}
 if(!column_exists('profiles','id'))fail(503,'Bitte zuerst die Ersteinrichtung durchführen.');
 $lock='keb-schema-'.substr(hash('sha256',config()['database']),0,24);
 if((int)stmt('SELECT GET_LOCK(?,15)',[$lock])->fetchColumn()!==1)fail(503,'Datenbankaktualisierung läuft. Bitte erneut versuchen.');
 try {
  $pdo->exec('CREATE TABLE IF NOT EXISTS keb_schema_version (id INT PRIMARY KEY,version INT NOT NULL) ENGINE=InnoDB');
  if((int)$pdo->query('SELECT version FROM keb_schema_version WHERE id=1')->fetchColumn()>=4)return;
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
  $legalFields=[
   ['imprint_board_address','','Anschrift der Vertretungsberechtigten (auch Vereinsanschrift, falls dort erreichbar)','impressum'],
   ['imprint_has_vat','','USt-IdNr. vorhanden?','impressum'],
   ['imprint_has_economic_id','','Wirtschafts-IdNr. vorhanden?','impressum'],
   ['imprint_has_editor','','Journalistisch-redaktionelles Angebot im Sinne von § 18 Abs. 2 MStV?','impressum'],
   ['privacy_hosting','Die Website wird auf Webspace von Host Europe GmbH betrieben. Bei einem Aufruf verarbeitet der Hostingdienst technisch erforderliche Zugriffsdaten, insbesondere IP-Adresse, Zeitpunkt, angeforderte Ressource, HTTP-Status und Browserinformationen, soweit diese protokolliert werden. Dies dient der Auslieferung, Fehleranalyse und Sicherheit (Art. 6 Abs. 1 lit. f DSGVO). Empfänger sind der Hostingdienst und gegebenenfalls dessen eingesetzte Dienstleister.','Hosting und Server-Protokolle','datenschutz'],
   ['privacy_logs_retention','','Speicherfrist der Server-Protokolle (laut KIS / Vertrag)','datenschutz'],
   ['privacy_hosting_transfers','','Hosting: Speicherort, Empfänger und ggf. Drittlandübermittlung / Garantien (laut Vertrag)','datenschutz'],
   ['privacy_contact','Bei einer Kontaktanfrage verarbeiten wir Name, E-Mail-Adresse, gegebenenfalls Betreff und Nachricht zur Bearbeitung und Beantwortung. Die Angaben aus dem Formular werden in unserer MySQL-Datenbank gespeichert und sind für berechtigte Administratoren zugänglich. Pflichtangaben sind erforderlich, um die Anfrage zu bearbeiten; der Betreff ist freiwillig. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bei vertragsbezogenen Anfragen, andernfalls Art. 6 Abs. 1 lit. f DSGVO (Interesse an der Beantwortung).','Kontaktformular und E-Mail','datenschutz'],
   ['privacy_contact_retention','','Speicherfrist bzw. Löschkriterien für Kontaktanfragen (auch Papierkorb)','datenschutz'],
   ['privacy_accounts','Für die Verwaltung verarbeiten wir Benutzername, E-Mail-Adresse, Rolle, Passwort-Hash, letzte Anmeldung und Bearbeiterinformationen. Die Änderungshistorie dokumentiert Verwaltungsaktionen. Das technisch notwendige Cookie KEBSESSID ordnet die angemeldete Sitzung zu; es wird nach erfolgreicher Anmeldung gesetzt und beim Abmelden gelöscht. Es ist ein Sitzungscookie ohne feste Ablaufzeit im Browser; nach zwei Stunden Inaktivität wird die Anmeldung ungültig. Rechtsgrundlagen sind Art. 6 Abs. 1 lit. f DSGVO (Zugriffsschutz und nachvollziehbare Verwaltung) sowie für das notwendige Cookie § 25 Abs. 2 Nr. 2 TDDDG.','Verwaltung und Sitzungs-Cookies','datenschutz'],
   ['privacy_security','Zur Begrenzung von Anmeldeversuchen und Kontaktanfragen speichert die Anwendung einen aus der IP-Adresse und dem Anfragezweck abgeleiteten Hash, den Anfragezähler und den Zeitraum. Dies dient dem Schutz vor Missbrauch (Art. 6 Abs. 1 lit. f DSGVO).','Missbrauchsschutz','datenschutz'],
   ['privacy_accounts_retention','','Speicherfristen für Konten, Sicherheitsdaten und Änderungshistorie','datenschutz'],
   ['privacy_photos','Wir veröffentlichen in der Galerie Fotos von Vereinsveranstaltungen. Fotos können personenbezogene Daten enthalten; insbesondere bei Kindern und Jugendlichen sind die Persönlichkeitsrechte zu beachten. Öffentlich bereitgestellte Bilder können von Internetnutzern weltweit abgerufen werden. Bei Fragen oder Einwänden gegen eine Veröffentlichung wenden Sie sich bitte an die im Impressum genannte Kontaktadresse.','Veranstaltungsfotos und Bildrechte','datenschutz'],
   ['privacy_photos_basis','','Fotos: tatsächliche Rechtsgrundlage, Informationspraxis und Löschkriterien','datenschutz'],
   ['privacy_external','Die Website verlinkt auf Facebook. Beim bloßen Aufruf unserer Seiten wird über diesen Link kein Facebook-Dienst eingebunden. Erst beim Anklicken verlassen Sie unsere Website; für die dortige Verarbeitung gelten die Hinweise des jeweiligen Anbieters. Wir verwenden lokale Systemschriftarten und binden keine externen Webfonts ein.','Externe Links und Schriftarten','datenschutz'],
   ['privacy_backup','Administratoren können Sicherungen der Datenbank, Bilder und Dokumente erstellen. Die Sicherungen können personenbezogene Daten enthalten und dienen der Wiederherstellung und Sicherheit (Art. 6 Abs. 1 lit. f DSGVO).','Datensicherung','datenschutz'],
   ['privacy_backup_retention','','Backup: tatsächliche Speicherorte, Empfänger und Löschfristen','datenschutz'],
   ['privacy_rights','Sie haben nach Maßgabe der DSGVO das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit. Sie können einer Verarbeitung auf Grundlage berechtigter Interessen nach Art. 21 DSGVO widersprechen. Erteilte Einwilligungen können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Zudem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde, insbesondere der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (www.ldi.nrw.de).','Betroffenenrechte und Beschwerde','datenschutz'],
   ['privacy_dpo','','Datenschutzbeauftragter (Kontaktdaten, sofern bestellt)','datenschutz'],
   ['privacy_extra','','Weitere Verarbeitungen / Empfänger / Pflichtangaben (falls zutreffend)','datenschutz'],
   ['privacy_reviewed','false','Angaben mit tatsächlicher Verarbeitung, Verträgen und Löschpraxis abgeglichen','datenschutz']
  ];
  foreach($legalFields as [$key,$value,$label,$category])stmt("INSERT IGNORE INTO site_settings (id,`key`,value,label,category) VALUES (?,?,?,?,?)",[uuid(),$key,$value,$label,$category]);
  $pdo->exec('INSERT INTO keb_schema_version (id,version) VALUES (1,4) ON DUPLICATE KEY UPDATE version=4');
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
