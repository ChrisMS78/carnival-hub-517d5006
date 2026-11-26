<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
require __DIR__.'/images.php';

// Fixed table/column allowlists; all values use PDO parameters.
const COLS=[
 'events'=>['id','title','description','event_date','event_time','location','image_url','sort_order','created_at','updated_at'],
 'about_content'=>['id','title','content','image_url','pdf_name','pdf_url','section_type','sort_order','created_at','updated_at'],
 'gallery_albums'=>['id','title','description','event_date','cover_image_url','sort_order','created_at'],
 'gallery_images'=>['id','album_id','image_url','thumbnail_url','caption','sort_order','created_at'],
 'contact_submissions'=>['id','name','email','subject','message','is_read','created_at'],
 'site_settings'=>['id','key','value','label','category','created_at','updated_at'],
 'page_backgrounds'=>['id','page_key','page_label','background_url','created_at','updated_at'],
 'profiles'=>['id','email','display_name','is_active','created_at'],
 'user_roles'=>['id','user_id','role']
];
const WRITE=[
 'events'=>['title','description','event_date','event_time','location','image_url','sort_order'],
 'about_content'=>['title','content','image_url','pdf_name','pdf_url','section_type','sort_order'],
 'gallery_albums'=>['title','description','event_date','sort_order'],
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
  if(in_array($k,['is_active','is_read'],true)){if(!is_bool($v)&&!in_array($v,[0,1],true))fail(400,'Ungültiger Status.');$v=(int)$v;}
  $out[$k]=$v;
 }return $out;
}
function insert_row(string $table,array $v): void {
 $v['id']=uuid();$keys=array_keys($v);
 stmt('INSERT INTO `'.$table.'` ('.implode(',',array_map(fn($k)=>'`'.$k.'`',$keys)).') VALUES ('.implode(',',array_fill(0,count($keys),'?')).')',array_values($v));
}
function query(array $q): mixed {
 $table=$q['table']??'';$op=$q['op']??'select';
 if(!is_string($table)||!isset(COLS[$table])||!in_array($op,['select','insert','update','delete'],true))fail(400,'Ungültige Abfrage.');
 $public=in_array($table,['events','about_content','gallery_albums','gallery_images','site_settings','page_backgrounds'],true);
 $editor=in_array($table,['events','about_content','gallery_albums','gallery_images'],true);
 $contactInsert=$table==='contact_submissions'&&$op==='insert';
 $actor=null;
 if($op==='select'){if(!$public)$actor=require_role(['admin']);}
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
 $w=$where?' WHERE '.implode(' AND ',$where):'';$t='`'.$table.'`';
 if($op==='select'){
  $fields=trim((string)($q['columns']??'*'));$fields=$fields==='*'?COLS[$table]:array_map('trim',explode(',',$fields));
  $s='SELECT '.implode(',',array_map(fn($x)=>col($table,$x),$fields)).' FROM '.$t.$w;
  $orders=[];foreach(($q['orders']??[]) as $o)$orders[]=col($table,$o['field']??null).(($o['ascending']??true)?' ASC':' DESC');
  if($orders)$s.=' ORDER BY '.implode(',',$orders);
  if(isset($q['limit']))$s.=' LIMIT '.max(0,min(10000,(int)$q['limit']));
  $rows=stmt($s,$args)->fetchAll();foreach($rows as &$row){foreach(['is_active','is_read'] as $k)if(isset($row[$k]))$row[$k]=(bool)$row[$k];foreach(['sort_order'] as $k)if(isset($row[$k]))$row[$k]=(int)$row[$k];}unset($row);
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
    if($table==='gallery_albums'){
     $title=trim((string)($v['title']??''));if($title==='')fail(400,'Albumtitel fehlt.');
     $folder=album_folder($title);$base=$folder;$i=2;
     while(stmt('SELECT id FROM gallery_albums WHERE folder=?',[$folder])->fetch()||is_dir(dirname(__DIR__).'/bilder/'.$folder))$folder=$base.'_'.($i++);
     $v['folder']=$folder;
    }
    insert_row($table,$v);
   }db()->commit();
  }catch(Throwable $e){db()->rollBack();throw $e;}return null;
 }
 if(!$where)fail(400,'Filter erforderlich.');
 if(in_array($table,['profiles','user_roles'],true)){
  if($op!=='update'||count($args)!==1||count($where)!==1||$where[0]!==($table==='profiles'?"`id`=?":"`user_id`=?"))fail(403,'Benutzeränderung nicht erlaubt.');
  if($args[0]===$actor['id'])fail(403,'Eigene Rolle oder Aktivierung kann nicht geändert werden.');
 }
 if($op==='update'){
  $v=values_for($table,$q['values']??null,WRITE[$table]);if(!$v)return null;
  $sets=[];foreach($v as $k=>$val)$sets[]=col($table,$k).'=?';
  stmt('UPDATE '.$t.' SET '.implode(',',$sets).$w,[...array_values($v),...$args]);return null;
 }
 if(!in_array($table,['events','about_content','gallery_albums','gallery_images','contact_submissions'],true))fail(403,'Löschen nicht erlaubt.');
 $media=[];db()->beginTransaction();try{
  if($table==='gallery_albums'||$table==='gallery_images'){
   $rows=stmt('SELECT * FROM '.$t.$w.' FOR UPDATE',$args)->fetchAll();
   foreach($rows as $row){
    $images=$table==='gallery_albums'?stmt('SELECT image_url,thumbnail_url FROM gallery_images WHERE album_id=?',[$row['id']])->fetchAll():[$row];
    foreach($images as $im){$media[]=$im['image_url'];$media[]=$im['thumbnail_url'];}
   }
  }
  stmt('DELETE FROM '.$t.$w,$args);db()->commit();
 }catch(Throwable $e){db()->rollBack();throw $e;}
 foreach($media as $url)delete_media($url);return null;
}
try {
 csrf();$action=$_GET['action']??'';
 if($action==='me')json_response(current_user());
 if($action==='login'){
  rate_limit('login',15,900);$v=input();$email=valid_email($v['email']??null);$pw=$v['password']??'';
  if(!is_string($pw)||strlen($pw)>72)fail(401,'Ungültige Anmeldedaten.');
  $u=stmt('SELECT p.*,r.role FROM profiles p LEFT JOIN user_roles r ON p.id=r.user_id WHERE p.email=?',[$email])->fetch();
  $hash=$u['password_hash']??'$2y$12$LQv3c1yqBWVHxkd0LHAkCOYv5hZJNC6p2V3HYweM0vhsPv6shPrUe';
  if(!password_verify($pw,$hash)||!$u||!$u['is_active'])fail(401,'Ungültige Anmeldedaten.');
  session_regenerate_id(true);$_SESSION=['uid'=>$u['id'],'last'=>time(),'version'=>hash('sha256',$hash)];
  json_response(current_user());
 }
 if($action==='logout'){$_SESSION=[];session_destroy();setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);json_response();}
 if($action==='create-user'){require_role(['admin']);$v=input();db()->beginTransaction();try{$u=create_account($v);db()->commit();}catch(Throwable $e){db()->rollBack();throw $e;}json_response($u);}
 if($action==='password'){require_role(['admin']);$v=input();$hash=hash_password($v['newPassword']??null);stmt('UPDATE profiles SET password_hash=? WHERE id=?',[$hash,(string)($v['userId']??'')]);json_response();}
 if($action==='query')json_response(query(input()));
 if($action==='album-upload')json_response(album_upload((string)($_POST['albumId']??'')));
 if($action==='rebuild-thumbnail'){ $v=input();json_response(rebuild_thumbnail((string)($v['id']??''))); }
 if($action==='upload')json_response(other_upload((string)($_POST['bucket']??''),(string)($_POST['name']??'')));
 // Media referenced by non-gallery content is intentionally retained for recovery.
 fail(404,'Unbekannte Funktion.');
}catch(Throwable $e){handle_error($e);}
