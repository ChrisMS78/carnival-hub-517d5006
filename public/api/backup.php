<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';

// Download only over the authenticated API; never store backups in the public document root.
try {
 csrf();
 $provided=$_SERVER['HTTP_X_KEB_BACKUP_TOKEN']??'';
 if($provided!==''){
  $configured=(string)(config()['backup_token']??'');
  if(strlen($configured)<32||!hash_equals($configured,$provided))fail(403,'Keine Berechtigung.');
 }else require_backup_admin();
 ensure_schema();
 if(!class_exists('ZipArchive'))fail(503,'PHP ZipArchive ist nicht verfügbar.');
 // Avoid holding the PHP session lock throughout a potentially large download.
 session_write_close();
 $zipPath=tempnam(sys_get_temp_dir(),'keb-backup-');$sqlPath=tempnam(sys_get_temp_dir(),'keb-sql-');
 if($zipPath===false||$sqlPath===false){if(is_string($zipPath))@unlink($zipPath);if(is_string($sqlPath))@unlink($sqlPath);fail(500,'Temporäre Datei konnte nicht erstellt werden.');}
 chmod($zipPath,0600);chmod($sqlPath,0600);
 register_shutdown_function(function()use($zipPath,$sqlPath){@unlink($zipPath);@unlink($sqlPath);});
 $tables=['profiles','user_roles','events','about_content','gallery_albums','gallery_images','contact_submissions','page_backgrounds','site_settings','request_limits','audit_log','keb_schema_version'];
 $pdo=db();$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY,false);$sql=fopen($sqlPath,'wb');if(!$sql)fail(500,'SQL-Datei nicht beschreibbar.');
 try {
  fwrite($sql,"-- KEB backup, restore into a new empty MySQL database\nSET NAMES utf8mb4;\nSET time_zone='+00:00';\nSET FOREIGN_KEY_CHECKS=0;\n");
  $pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');$pdo->beginTransaction();
  foreach($tables as $table){
   $ddl=$pdo->query("SHOW CREATE TABLE `$table`");$create=$ddl->fetch(PDO::FETCH_NUM);$ddl->closeCursor();
   if(!$create)throw new RuntimeException('Missing table');
   if(fwrite($sql,$create[1].";\n")===false)throw new RuntimeException('Write error');
   $rows=$pdo->query("SELECT * FROM `$table`");
   while($row=$rows->fetch()){
    $cols=implode(',',array_map(fn($k)=>'`'.str_replace('`','``',$k).'`',array_keys($row)));
    $values=implode(',',array_map(fn($v)=>$v===null?'NULL':$pdo->quote((string)$v),array_values($row)));
    $line="INSERT INTO `$table` ($cols) VALUES ($values);\n";
    if(fwrite($sql,$line)!==strlen($line))throw new RuntimeException('Write error');
   }
   $rows->closeCursor();
  }
  $pdo->commit();fwrite($sql,"SET FOREIGN_KEY_CHECKS=1;\n");
 }finally{if($pdo->inTransaction())$pdo->rollBack();fclose($sql);}
 $zip=new ZipArchive();
 if($zip->open($zipPath,ZipArchive::CREATE|ZipArchive::OVERWRITE)!==true)fail(500,'ZIP-Datei konnte nicht erstellt werden.');
 if(!$zip->addFile($sqlPath,'database.sql'))fail(500,'Datenbank konnte nicht zum ZIP hinzugefügt werden.');
 foreach(['bilder','dokumente'] as $dir){
  $root=dirname(__DIR__).'/'.$dir;
  if(!is_dir($root))continue;
  $zip->addEmptyDir($dir);
  foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS)) as $f){
   if(!$f->isFile()||$f->isLink())continue;
   $rel=$dir.'/'.substr($f->getPathname(),strlen($root)+1);
   if(!preg_match('~^(bilder/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\\.jpg|dokumente/[A-Za-z0-9_-]+\\.pdf)$~D',$rel))continue;
   if(!$zip->addFile($f->getPathname(),$rel))fail(500,'Mediendatei konnte nicht gesichert werden.');
  }
 }
 $zip->addFromString('RESTORE.txt',"Restore into an empty database using database.sql, copy bilder/ and dokumente/ into the site webroot, deploy the corresponding source revision and configure the new database credentials. Do not run setup.php over restored data. This archive contains password hashes and personal data; keep it private and encrypted. Back up while no editor is changing content.\n");
 if(!$zip->close())fail(500,'ZIP-Datei konnte nicht abgeschlossen werden.');
 clearstatcache(true,$zipPath);$size=filesize($zipPath);if(!$size)fail(500,'Leere Sicherung.');
 header('Content-Type: application/zip');
 header('Content-Disposition: attachment; filename="KEB-'.gmdate('Y-m-d-His').'.zip"');
 header('Content-Length: '.$size);
 readfile($zipPath);exit;
}catch(Throwable $e){handle_error($e);}
function require_backup_admin(): void { ensure_schema();require_role(['admin']); }
