<?php
declare(strict_types=1);

// No passwords, message bodies, email addresses or old/new values are written to the audit log.
function audit(array $actor,string $action,string $entity,string $id,string $label='',array $fields=[]): void {
 stmt('INSERT INTO audit_log (actor,action,entity,entity_id,label,fields) VALUES (?,?,?,?,?,?)',
  [$actor['username'],$action,$entity,$id,mb_safe($label,255),mb_safe(implode(', ',$fields),255)]);
}
function mb_safe(string $s,int $max): string {
 return function_exists('mb_substr')?mb_substr($s,0,$max,'UTF-8'):substr(preg_replace('/[^\x20-\x7E]/','?',$s),0,$max);
}
function entity_label(string $table,array $row): string {
 return match($table){
 'events','about_content','gallery_albums'=>(string)($row['title']??''),
 'gallery_images'=>basename((string)($row['image_url']??'')),
 'profiles'=>(string)($row['username']??''),
 'site_settings'=>(string)($row['key']??''),
 'page_backgrounds'=>(string)($row['page_label']??''),
 default=>''};
}
function trash_list(): array {
 $u=require_role(['admin','redakteur']);$out=[];
 foreach(TRASH_TABLES as $t){
  if($t==='contact_submissions'&&$u['role']!=='admin')continue;
  $rows=stmt("SELECT * FROM `$t` WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 1000")->fetchAll();
  foreach($rows as $row)$out[]=['table'=>$t,'id'=>$row['id'],'label'=>entity_label($t,$row)?:($t==='contact_submissions'?'Kontaktanfrage':$row['id']),'deleted_at'=>$row['deleted_at'],'last_edit_by'=>$row['last_edit_by']];
 }
 usort($out,fn($a,$b)=>strcmp($b['deleted_at'],$a['deleted_at']));return $out;
}
function restore_record(array $v): void {
 $t=$v['table']??'';$id=$v['id']??'';
 if(!in_array($t,TRASH_TABLES,true)||!is_string($id))fail(400,'Ungültiger Eintrag.');
 $u=require_role($t==='contact_submissions'?['admin']:['admin','redakteur']);$pdo=db();$pdo->beginTransaction();
 try{
  $r=stmt("SELECT * FROM `$t` WHERE id=? AND deleted_at IS NOT NULL FOR UPDATE",[$id])->fetch();if(!$r)fail(404,'Eintrag nicht gefunden.');
  if($t==='gallery_images'&&!stmt('SELECT id FROM gallery_albums WHERE id=? AND deleted_at IS NULL',[$r['album_id']])->fetch())fail(409,'Bitte zuerst das Album wiederherstellen.');
  stmt("UPDATE `$t` SET deleted_at=NULL,last_edit_by=?,last_edit_at=UTC_TIMESTAMP() WHERE id=?",[$u['username'],$id]);
  if($t==='gallery_images')stamp_album($r['album_id'],$u);
  audit($u,'restore',$t,$id,entity_label($t,$r));$pdo->commit();
 }catch(Throwable $e){$pdo->rollBack();throw $e;}
}
function dashboard(): array {
 $u=require_role(['admin','redakteur']);$stats=[];
 foreach(['events','gallery_albums','gallery_images','about_content'] as $t)$stats[$t]=(int)stmt("SELECT COUNT(*) FROM `$t` WHERE deleted_at IS NULL".($t==='gallery_images'?" AND album_id IN (SELECT id FROM gallery_albums WHERE deleted_at IS NULL)":""))->fetchColumn();
 $stats['drafts']=0;foreach(PUBLISH_TABLES as $t)$stats['drafts']+=(int)stmt("SELECT COUNT(*) FROM `$t` WHERE published=0 AND deleted_at IS NULL")->fetchColumn();
 if($u['role']==='admin')$stats['unread']=(int)stmt('SELECT COUNT(*) FROM contact_submissions WHERE is_read=0 AND deleted_at IS NULL')->fetchColumn();
 $stats['media_bytes']=0;foreach(['bilder','dokumente'] as $dir){
  $path=dirname(__DIR__).'/'.$dir;if(!is_dir($path))continue;
  foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile()&&!$f->isLink())$stats['media_bytes']+=$f->getSize();
 }
 return $stats;
}
function own_password(array $v): void {
 $u=require_role(['admin','redakteur']);rate_limit('own-password-'.$u['id'],10,900);$old=$v['currentPassword']??null;$new=$v['newPassword']??null;
 if(!is_string($old)||strlen($old)>72||!is_string($new)||$new!==($v['confirmation']??null))fail(400,'Passwörter prüfen.');
 $oldHash=stmt('SELECT password_hash FROM profiles WHERE id=?',[$u['id']])->fetchColumn();
 if(!$oldHash||!password_verify($old,$oldHash))fail(403,'Aktuelles Passwort ist falsch.');
 $hash=hash_password($new);
 $pdo=db();$pdo->beginTransaction();try{
  if(stmt('UPDATE profiles SET password_hash=?,last_edit_by=?,last_edit_at=UTC_TIMESTAMP() WHERE id=? AND password_hash=?',[$hash,$u['username'],$u['id'],$oldHash])->rowCount()!==1)fail(409,'Passwort wurde zwischenzeitlich geändert.');
  audit($u,'password','profiles',$u['id'],$u['username']);$pdo->commit();
 }catch(Throwable $e){$pdo->rollBack();throw $e;}
 session_regenerate_id(true);$_SESSION['version']=hash('sha256',$hash);
}

// Permanent purge is deliberately restricted to administrators. Media is retained until this action.
function purge_record(array $v): void {
 $u=require_role(['admin']);$t=$v['table']??'';$id=$v['id']??'';
 if(!in_array($t,TRASH_TABLES,true)||!is_string($id))fail(400,'Ungültiger Eintrag.');
 $pdo=db();$media=[];$pdo->beginTransaction();
 try{
  $r=stmt("SELECT * FROM `$t` WHERE id=? AND deleted_at IS NOT NULL FOR UPDATE",[$id])->fetch();if(!$r)fail(404,'Eintrag nicht gefunden.');
  if($t==='gallery_images')$media=[$r['image_url'],$r['thumbnail_url']];
  if($t==='gallery_albums')foreach(stmt('SELECT image_url,thumbnail_url FROM gallery_images WHERE album_id=?',[$id])->fetchAll() as $im)array_push($media,$im['image_url'],$im['thumbnail_url']);
  stmt("DELETE FROM `$t` WHERE id=?",[$id]);audit($u,'purge',$t,$id,entity_label($t,$r));$pdo->commit();
 }catch(Throwable $e){$pdo->rollBack();throw $e;}
 foreach($media as $url)delete_media($url);
}
