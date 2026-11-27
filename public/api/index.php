<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
require __DIR__.'/images.php';
require __DIR__.'/management.php';

// Fixed table/column allowlists; all values use PDO parameters.
const COLS=[
 'events'=>['id','title','description','event_date','event_time','location','image_url','sort_order','created_at','updated_at','published'],
 'about_content'=>['id','title','content','image_url','pdf_name','pdf_url','section_type','sort_order','created_at','updated_at','published'],
 'gallery_albums'=>['id','title','description','event_date','cover_image_url','sort_order','created_at','published'],
 'gallery_images'=>['id','album_id','image_url','thumbnail_url','caption','sort_order','created_at'],
 'contact_submissions'=>['id','name','email','subject','message','is_read','created_at'],
 'site_settings'=>['id','key','value','label','category','created_at','updated_at'],
 'page_backgrounds'=>['id','page_key','page_label','background_url','created_at','updated_at'],
 'profiles'=>['id','email','display_name','username','is_active','created_at','last_login_at'],
 'user_roles'=>['id','user_id','role']
];
const WRITE=[
 'events'=>['title','description','event_date','event_time','location','image_url','sort_order','published'],
 'about_content'=>['title','content','image_url','pdf_name','pdf_url','section_type','sort_order','published'],
 'gallery_albums'=>['title','description','event_date','sort_order','published'],
 'gallery_images'=>['caption','sort_order'],
 'contact_submissions'=>['is_read'],
 'site_settings'=>['value'],
 'page_backgrounds'=>['background_url'],
 'profiles'=>['is_active'],
 'user_roles'=>['role']
];
function col(string $table,mixed $field): string {
 if(!is_string($field)||!in_array($field,COLS[$table],true))fail(400,'Ungültiges Feld.');return '`'.$field.'`';
}
function values_for(string $table,mixed $data,array $allowed): array {
 if(!is_array($data)||!$data)fail(400,'Keine Daten.');
 $out=[];foreach($data as $k=>$v){
  if($k==='updated_at')continue;
  if(!in_array($k,$allowed,true)||(!is_scalar($v)&&$v!==null))fail(400,'Ungültiges Feld.');
  if(is_string($v)&&strlen($v)>65000)fail(400,'Feld zu lang.');
  if(in_array($k,['image_url','pdf_url','background_url','cover_image_url'],true)&&$v!==null&&$v!==''&&!preg_match('~^/(bilder/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.jpg|dokumente/[A-Za-z0-9_-]+\.pdf)$~D',(string)$v))fail(400,'Nur lokale Mediendateien erlaubt.');
  if($k==='role'&&!in_array($v,['admin','redakteur','user'],true))fail(400,'Ungültige Rolle.');
  if(in_array($k,['event_date','event_time'],true)&&$v==='')$v=null;
  if(in_array($k,['is_active','is_read','published'],true)){if(!is_bool($v)&&!in_array($v,[0,1],true))fail(400,'Ungültiger Status.');$v=(int)$v;}
  $out[$k]=$v;
 }return $out;
}
function insert_row(string $table,array $v): string {
 $v['id']=uuid();$keys=array_keys($v);
 stmt('INSERT INTO `'.$table.'` ('.implode(',',array_map(fn($k)=>'`'.$k.'`',$keys)).') VALUES ('.implode(',',array_fill(0,count($keys),'?')).')',array_values($v));return $v['id'];
}
function query(array $q): mixed {
 $table=$q['table']??'';$op=$q['op']??'select';
 if(!is_string($table)||!isset(COLS[$table])||!in_array($op,['select','insert','update','delete'],true))fail(400,'Ungültige Abfrage.');
 $public=in_array($table,['events','about_content','gallery_albums','gallery_images','site_settings','page_backgrounds'],true);
 $editor=in_array($table,['events','about_content','gallery_albums','gallery_images'],true);
 $contactInsert=$table==='contact_submissions'&&$op==='insert';
 $actor=null;
 if($op==='select'){if(!$public||($q['management']??false)===true)$actor=require_role($editor?['admin','redakteur']:['admin']);}
 elseif($contactInsert){rate_limit('contact',5,3600);}
 else $actor=require_role($editor?['admin','redakteur']:['admin']);
 $where=[];$args=[];
 foreach(($q['filters']??[]) as $f){
  $c=col($table,$f['field']??null);$v=$f['value']??null;
  if(($f['kind']??'')==='eq'&&is_scalar($v)){$where[]=$c.'=?';$args[]=$v;}
  elseif(($f['kind']??'')==='in'&&is_array($v)&&count($v)<=100){
   if(!$v){$where[]='1=0';continue;}foreach($v as $x)if(!is_scalar($x))fail(400,'Ungültiger Filter.');
   $where[]=$c.' IN ('.implode(',',array_fill(0,count($v),'?')).')';array_push($args,...$v);
  }else fail(400,'Ungültiger Filter.');
 }
 if($op!=='select'&&$op!=='insert'&&!$where)fail(400,'Filter erforderlich.');
 if(in_array($table,TRASH_TABLES,true))$where[]='deleted_at IS NULL';
 if($op==='select'&&!$actor&&in_array($table,PUBLISH_TABLES,true))$where[]='published=1';
 if($table==='gallery_images')$where[]='album_id IN (SELECT id FROM gallery_albums WHERE deleted_at IS NULL'.($op==='select'&&!$actor?' AND published=1':'').')';
 if($table==='events'&&$op==='select'&&!$actor&&($q['upcoming']??false)===true){$where[]='event_date>=?';$args[]=(new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin')))->format('Y-m-d');}
 $w=$where?' WHERE '.implode(' AND ',$where):'';$t='`'.$table.'`';
 if($op==='select'){
  $fields=trim((string)($q['columns']??'*'));$fields=$fields==='*'?COLS[$table]:array_map('trim',explode(',',$fields));
  $projection=array_map(fn($x)=>col($table,$x),$fields);
  // Audit data is never included in anonymous responses or allowed in public filters.
  if(trim((string)($q['columns']??'*'))==='*'&&in_array($table,EDIT_TABLES,true)&&in_array($actor['role']??null,$editor?['admin','redakteur']:['admin'],true))array_push($projection,'last_edit_by','last_edit_at');
  $s='SELECT '.implode(',',$projection).' FROM '.$t.$w;
  $orders=[];foreach(($q['orders']??[]) as $o)$orders[]=col($table,$o['field']??null).(($o['ascending']??true)?' ASC':' DESC');
  if($orders)$s.=' ORDER BY '.implode(',',$orders);
  if(isset($q['limit']))$s.=' LIMIT '.max(0,min(10000,(int)$q['limit']));
  $rows=stmt($s,$args)->fetchAll();foreach($rows as &$row){foreach(['is_active','is_read','published'] as $k)if(isset($row[$k]))$row[$k]=(bool)$row[$k];foreach(['sort_order'] as $k)if(isset($row[$k]))$row[$k]=(int)$row[$k];}unset($row);
  if(!empty($q['single'])){if(count($rows)>1||(!$rows&&$q['single']==='required'))fail(404,'Eintrag nicht eindeutig gefunden.');return $rows[0]??null;}return $rows;
 }
 if($op==='insert'){
  if(!$contactInsert&&!in_array($table,['events','about_content','gallery_albums'],true))fail(403,'Anlegen nicht erlaubt.');
  $rows=$q['values']??[];if(!is_array($rows))fail(400,'Ungültige Daten.');
  if(!array_is_list($rows))$rows=[$rows];if(!$rows||count($rows)>50||($contactInsert&&count($rows)!==1))fail(400,'Ungültige Anzahl.');
  db()->beginTransaction();try{
   foreach($rows as $row){
    $v=values_for($table,$row,$contactInsert?['name','email','subject','message']:WRITE[$table]);
    if($contactInsert){$v['email']=valid_email($v['email']??null);if(!trim((string)($v['name']??''))||!trim((string)($v['message']??''))||strlen((string)$v['message'])>10000)fail(400,'Ungültige Nachricht.');}
    if(in_array($table,PUBLISH_TABLES,true)&&!isset($v['published']))$v['published']=0;
    if($table==='gallery_albums'){
     $title=trim((string)($v['title']??''));if($title==='')fail(400,'Albumtitel fehlt.');
     $folder=album_folder($title);$base=$folder;$i=2;
     while(stmt('SELECT id FROM gallery_albums WHERE folder=?',[$folder])->fetch()||is_dir(dirname(__DIR__).'/bilder/'.$folder))$folder=$base.'_'.($i++);
     $v['folder']=$folder;
    }
    if($actor&&in_array($table,EDIT_TABLES,true)){$v['last_edit_by']=$actor['username'];$v['last_edit_at']=gmdate('Y-m-d H:i:s');}
    $id=insert_row($table,$v);
    if($actor)audit($actor,'create',$table,$id,entity_label($table,$v));
   }db()->commit();
  }catch(Throwable $e){db()->rollBack();throw $e;}return null;
 }
 if(!$where)fail(400,'Filter erforderlich.');
 if(in_array($table,['profiles','user_roles'],true)){
  if($op!=='update'||count($args)!==1||count($where)!==1||$where[0]!==($table==='profiles'?"`id`=?":"`user_id`=?"))fail(403,'Benutzeränderung nicht erlaubt.');
  $v=values_for($table,$q['values']??null,WRITE[$table]);if(!$v)return null;
  return admin_account_change(function($admin)use($table,$args,$v){
   $id=(string)$args[0];$removes=$table==='profiles'?empty($v['is_active']):$v['role']!=='admin';
   $target=guard_account($id,$admin,$removes);
   db()->beginTransaction();try{
    if($table==='profiles'){
     if((bool)$target['is_active']!==(bool)$v['is_active'])stmt('UPDATE profiles SET is_active=?,last_edit_by=?,last_edit_at=UTC_TIMESTAMP() WHERE id=?',[$v['is_active'],$admin['username'],$id]);
    }elseif($target['role']!==$v['role']){
     stmt('UPDATE user_roles SET role=? WHERE user_id=?',[$v['role'],$id]);
     stmt('UPDATE profiles SET last_edit_by=?,last_edit_at=UTC_TIMESTAMP() WHERE id=?',[$admin['username'],$id]);
    }
    audit($admin,'update','profiles',$id,'',array_keys($v));
    db()->commit();
   }catch(Throwable $e){db()->rollBack();throw $e;}return null;
  });
 }
 if($op==='update'){
  $v=values_for($table,$q['values']??null,WRITE[$table]);if(!$v)return null;
  $sets=[];$different=[];foreach($v as $k=>$val){$c=col($table,$k);$sets[]=$c.'=?';$different[]='NOT (CAST('.$c.' AS BINARY) <=> CAST(? AS BINARY))';}
  $match=$w.' AND ('.implode(' OR ',$different).')';$params=[...$args,...array_values($v)];
  db()->beginTransaction();try{
   $changed=stmt('SELECT * FROM '.$t.$match.' FOR UPDATE',$params)->fetchAll();
   $albums=$table==='gallery_images'?array_unique(array_column($changed,'album_id')):[];
   $sets[]='last_edit_by=?';$sets[]='last_edit_at=UTC_TIMESTAMP()';
   stmt('UPDATE '.$t.' SET '.implode(',',$sets).$match,[...array_values($v),$actor['username'],...$params]);
   foreach($albums as $album)stamp_album($album,$actor);
   foreach($changed as $row)audit($actor,'update',$table,$row['id'],entity_label($table,$row),array_keys($v));
   db()->commit();
  }catch(Throwable $e){db()->rollBack();throw $e;}return null;
 }
 if(!in_array($table,['events','about_content','gallery_albums','gallery_images','contact_submissions'],true))fail(403,'Löschen nicht erlaubt.');
 // Soft deletion: retain records and media for restoration.
 db()->beginTransaction();try{
  $rows=stmt('SELECT * FROM '.$t.$w.' FOR UPDATE',$args)->fetchAll();
  stmt('UPDATE '.$t.' SET deleted_at=UTC_TIMESTAMP(),last_edit_by=?,last_edit_at=UTC_TIMESTAMP()'.$w,[$actor['username'],...$args]);
  foreach($rows as $row){
   if($table==='gallery_images')stamp_album($row['album_id'],$actor);
   audit($actor,'trash',$table,$row['id'],entity_label($table,$row));
  }
  db()->commit();
 }catch(Throwable $e){db()->rollBack();throw $e;}return null;
}
try {
 csrf();ensure_schema();$action=$_GET['action']??'';
 if($action==='me')json_response(current_user());
 if($action==='login'){
  rate_limit('login',15,900);$v=input();$identity=$v['identifier']??$v['email']??'';$pw=$v['password']??'';
  if(!is_string($identity)||strlen($identity)>254||trim($identity)==='')fail(401,'Ungültige Anmeldedaten.');
  $identity=strtolower(trim($identity));
  if(!str_contains($identity,'@')&&!preg_match('/^[a-z0-9][a-z0-9._-]{2,63}$/D',$identity))fail(401,'Ungültige Anmeldedaten.');
  if(!is_string($pw)||strlen($pw)>72)fail(401,'Ungültige Anmeldedaten.');
  $u=stmt('SELECT p.*,r.role FROM profiles p LEFT JOIN user_roles r ON p.id=r.user_id WHERE p.'.(str_contains($identity,'@')?'email':'username').'=?',[$identity])->fetch();
  $hash=$u['password_hash']??'$2y$12$LQv3c1yqBWVHxkd0LHAkCOYv5hZJNC6p2V3HYweM0vhsPv6shPrUe';
  if(!password_verify($pw,$hash)||!$u||!$u['is_active'])fail(401,'Ungültige Anmeldedaten.');
  stmt('UPDATE profiles SET last_login_at=UTC_TIMESTAMP() WHERE id=?',[$u['id']]);
  session_regenerate_id(true);$_SESSION=['uid'=>$u['id'],'last'=>time(),'version'=>hash('sha256',$hash)];
  json_response(current_user());
 }
 if($action==='logout'){$_SESSION=[];session_destroy();setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);json_response();}
 if($action==='create-user'){
  $actor=require_role(['admin']);$v=input();
  if(!is_string($v['password']??null)||!is_string($v['password_confirmation']??null)||$v['password']!==$v['password_confirmation'])fail(400,'Die Passwörter stimmen nicht überein.');
  db()->beginTransaction();
  try{$u=create_account($v,$actor);audit($actor,'create','profiles',$u['id'],$u['username']);db()->commit();}catch(Throwable $e){db()->rollBack();throw $e;}
  json_response($u);
 }
 if($action==='delete-user'){
  $v=input();$id=(string)($v['id']??'');
  admin_account_change(function($actor)use($id){
   guard_account($id,$actor,true);
   // The foreign key removes the assigned role; all content and editor snapshots remain.
   $target=stmt('SELECT username FROM profiles WHERE id=?',[$id])->fetchColumn();
   db()->beginTransaction();try{
    if(stmt('DELETE FROM profiles WHERE id=?',[$id])->rowCount()!==1)fail(404,'Benutzer nicht gefunden.');
    audit($actor,'delete','profiles',$id,(string)$target);db()->commit();
   }catch(Throwable $e){db()->rollBack();throw $e;}
  });json_response();
 }
 if($action==='password'){
  $actor=require_role(['admin']);$v=input();$hash=hash_password($v['newPassword']??null);
  $id=(string)($v['userId']??'');db()->beginTransaction();try{
   if(stmt('UPDATE profiles SET password_hash=?,last_edit_by=?,last_edit_at=UTC_TIMESTAMP() WHERE id=?',[$hash,$actor['username'],$id])->rowCount()!==1)fail(404,'Benutzer nicht gefunden.');
   audit($actor,'password','profiles',$id);db()->commit();
  }catch(Throwable $e){db()->rollBack();throw $e;}
  json_response();
 }
 if($action==='dashboard')json_response(dashboard());
 if($action==='trash')json_response(trash_list());
 if($action==='restore'){restore_record(input());json_response();}
 if($action==='purge'){purge_record(input());json_response();}
 if($action==='audit'){require_role(['admin']);json_response(stmt('SELECT * FROM audit_log ORDER BY id DESC LIMIT 500')->fetchAll());}
 if($action==='own-password'){own_password(input());json_response();}
 if($action==='query')json_response(query(input()));
 if($action==='album-upload')json_response(album_upload((string)($_POST['albumId']??'')));
 if($action==='rebuild-thumbnail'){ $v=input();json_response(rebuild_thumbnail((string)($v['id']??''))); }
 if($action==='upload')json_response(other_upload((string)($_POST['bucket']??''),(string)($_POST['name']??'')));
 // Media referenced by non-gallery content is intentionally retained for recovery.
 fail(404,'Unbekannte Funktion.');
}catch(Throwable $e){handle_error($e);}
