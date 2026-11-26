<?php
declare(strict_types=1);
function upload_file(): array {
 $f=$_FILES['file']??null;
 if(!is_array($f)||($f['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name']))fail(400,'Dateiupload fehlgeschlagen (PHP-Limit prüfen).');
 if($f['size']>20*1024*1024)fail(413,'Datei zu groß (maximal 20 MB).');
 return $f;
}
function media_dir(string $rel): string {
 if(!preg_match('~^(bilder|dokumente)(/[A-Za-z0-9_-]+)*$~D',$rel))fail(400,'Ungültiger Ordner.');
 $dir=dirname(__DIR__).'/'.$rel;
 if(!is_dir($dir)&&!mkdir($dir,0755,true)&&!is_dir($dir))fail(500,'Ordner nicht beschreibbar.');
 if(is_link($dir)||!is_writable($dir))fail(500,'Ordner nicht beschreibbar.');
 return $dir;
}
function jpg(string $src,string $dest,int $edge,int $limit,int $minQuality=35): void {
 $info=@getimagesize($src);
 if(!$info||!in_array($info[2],[IMAGETYPE_JPEG,IMAGETYPE_PNG,IMAGETYPE_WEBP,IMAGETYPE_GIF],true)||$info[0]*$info[1]>30000000)fail(400,'Ungültiges Bild oder mehr als 30 Megapixel.');
 $bytes=null;
 if(class_exists('Imagick')){
  $im=new Imagick();$im->readImage($src.'[0]');$im->autoOrient();$im->setImageBackgroundColor('white');
  $im->setImageAlphaChannel(Imagick::ALPHACHANNEL_REMOVE);$im->stripImage();$im->setImageFormat('jpeg');
  $im->thumbnailImage(min($edge,$im->getImageWidth()),min($edge,$im->getImageHeight()),true);
  for($round=0;$round<12;$round++){
   for($q=88;$q>=$minQuality;$q-=5){$im->setImageCompressionQuality($q);$bytes=$im->getImageBlob();if(strlen($bytes)<=$limit)break 2;}
   $im->thumbnailImage(max(1,(int)($im->getImageWidth()*0.8)),max(1,(int)($im->getImageHeight()*0.8)),true);
  }
  $im->clear();
 }elseif(extension_loaded('gd')){
  $im=@imagecreatefromstring(file_get_contents($src));if(!$im)fail(400,'Bild nicht lesbar.');
  if($info[2]===IMAGETYPE_JPEG&&function_exists('exif_read_data')){
   $o=(int)(@exif_read_data($src)['Orientation']??1);
   if(in_array($o,[2,4,5,7],true))imageflip($im,IMG_FLIP_HORIZONTAL);
   $angle=match($o){3,4=>180,5,8=>90,6,7=>-90,default=>0};
   if($angle){$rot=imagerotate($im,$angle,0);if($rot){imagedestroy($im);$im=$rot;}}
  }
  $w=imagesx($im);$h=imagesy($im);$scale=min(1,$edge/max($w,$h));
  for($round=0;$round<12;$round++){
   $nw=max(1,(int)round($w*$scale));$nh=max(1,(int)round($h*$scale));
   $out=imagecreatetruecolor($nw,$nh);imagefill($out,0,0,imagecolorallocate($out,255,255,255));imagecopyresampled($out,$im,0,0,0,0,$nw,$nh,$w,$h);
   for($q=88;$q>=$minQuality;$q-=5){ob_start();imagejpeg($out,null,$q);$bytes=ob_get_clean();if(strlen($bytes)<=$limit){imagedestroy($out);break 2;}}
   imagedestroy($out);$scale*=0.8;
  }
  imagedestroy($im);
 }else fail(503,'PHP GD oder Imagick fehlt.');
 if(!is_string($bytes)||strlen($bytes)>$limit||strlen($bytes)===0)fail(422,'Bild konnte nicht ausreichend verkleinert werden.');
 if(file_put_contents($dest,$bytes,LOCK_EX)!==strlen($bytes)){@unlink($dest);fail(500,'Bild konnte nicht gespeichert werden.');}
 chmod($dest,0644);
}
function album_folder(string $title): string {
 $title=strtr($title,['ä'=>'ae','ö'=>'oe','ü'=>'ue','Ä'=>'Ae','Ö'=>'Oe','Ü'=>'Ue','ß'=>'ss']);
 $slug=trim(preg_replace('/[^A-Za-z0-9_-]+/','_',$title),'_-');return substr($slug?:'Album',0,100);
}
function album_upload(string $albumId): array {
 require_role(['admin','redakteur']);$f=upload_file();$pdo=db();$pdo->beginTransaction();$files=[];
 try{
  $a=stmt('SELECT id,folder,next_number FROM gallery_albums WHERE id=? FOR UPDATE',[$albumId])->fetch();if(!$a)fail(404,'Album nicht gefunden.');
  $folder=$a['folder'];$dir=media_dir('bilder/'.$folder);$n=(int)$a['next_number'];
  do{$stem=$folder.'_'.str_pad((string)$n++,3,'0',STR_PAD_LEFT);$large=$dir.'/'.$stem.'.jpg';$small=$dir.'/'.$stem.'_small.jpg';}while(file_exists($large)||file_exists($small));
  $files=[$large,$small];jpg($f['tmp_name'],$large,1600,400000);jpg($f['tmp_name'],$small,900,180000,60);
  $url='/bilder/'.$folder.'/'.$stem.'.jpg';$thumb='/bilder/'.$folder.'/'.$stem.'_small.jpg';$id=uuid();
  $order=(int)stmt('SELECT COALESCE(MAX(sort_order),-1)+1 FROM gallery_images WHERE album_id=?',[$albumId])->fetchColumn();
  stmt('INSERT INTO gallery_images (id,album_id,image_url,thumbnail_url,sort_order) VALUES (?,?,?,?,?)',[$id,$albumId,$url,$thumb,$order]);
  stmt('UPDATE gallery_albums SET next_number=? WHERE id=?',[$n,$albumId]);$pdo->commit();
  return ['id'=>$id,'image_url'=>$url,'thumbnail_url'=>$thumb];
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();foreach($files as $p)@unlink($p);throw $e;}
}
// Rebuild an existing thumbnail from its local full-size JPEG without modifying that JPEG.
function rebuild_thumbnail(string $id): array {
 require_role(['admin','redakteur']);
 $pdo=db();$pdo->beginTransaction();$tmp=null;
 try {
  $row=stmt('SELECT image_url,thumbnail_url FROM gallery_images WHERE id=? FOR UPDATE',[$id])->fetch();
  if(!$row)fail(404,'Bild nicht gefunden.');
  $url=$row['image_url'];$thumb=$row['thumbnail_url'];
  if(!preg_match('~^/bilder/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.jpg$~D',$url)||$thumb!==substr($url,0,-4).'_small.jpg')fail(400,'Ungültiger Bildpfad.');
  $root=dirname(__DIR__);$src=$root.$url;$dest=$root.$thumb;
  if(!is_file($src)||is_link($src)||is_link($dest))fail(404,'Ansichtsbild fehlt oder Bildpfad ist ungültig.');
  $tmp=tempnam(dirname($dest),'.thumb-');if($tmp===false)fail(500,'Vorschaubild konnte nicht vorbereitet werden.');
  jpg($src,$tmp,900,180000,60);
  if(!rename($tmp,$dest))fail(500,'Vorschaubild konnte nicht ersetzt werden.');
  $tmp=null;$pdo->commit();
  return ['id'=>$id,'thumbnail_url'=>$thumb];
 } catch(Throwable $e) {
  if($pdo->inTransaction())$pdo->rollBack();
  if(is_string($tmp)&&is_file($tmp))@unlink($tmp);
  throw $e;
 }
}
function other_upload(string $bucket,string $name): array {
 $f=upload_file();
 if($bucket==='documents'){
  require_role(['admin','redakteur']);$dir=media_dir('dokumente');
  if((new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name'])!=='application/pdf'||file_get_contents($f['tmp_name'],false,null,0,5)!=='%PDF-')fail(400,'Nur PDF-Dateien sind erlaubt.');
  $filename=uuid().'.pdf';if(!move_uploaded_file($f['tmp_name'],$dir.'/'.$filename))fail(500,'Datei konnte nicht gespeichert werden.');
  chmod($dir.'/'.$filename,0644);return ['url'=>'/dokumente/'.$filename];
 }
 if($bucket!=='gallery')fail(400,'Unbekannter Dateityp.');
 $section=explode('/',$name)[0];if(!in_array($section,['events','about','backgrounds'],true))fail(400,'Ungültiger Bildbereich.');
 require_role($section==='backgrounds'?['admin']:['admin','redakteur']);
 $filename=uuid().'.jpg';$dir=media_dir('bilder/_'.$section);jpg($f['tmp_name'],$dir.'/'.$filename,1600,400000);
 return ['url'=>'/bilder/_'.$section.'/'.$filename];
}
function delete_media(?string $url): void {
 if(!$url||!preg_match('~^/(bilder/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.jpg|dokumente/[A-Za-z0-9_-]+\.pdf)$~D',$url))return;
 $path=dirname(__DIR__).$url;if(is_file($path)&&!is_link($path)&&!unlink($path))error_log('KEB: Mediendatei konnte nicht gelöscht werden.');
}
