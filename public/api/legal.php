<?php
declare(strict_types=1);

// Validate the complete legal document together, not individual fields.
function legal_values(string $category): array {
 $out=[];foreach(stmt('SELECT `key`,value FROM site_settings WHERE category=?',[$category])->fetchAll() as $r)$out[$r['key']]=(string)($r['value']??'');return $out;
}
function legal_errors(string $category,array $v): array {
 $errors=[];
 $require=function(string $key)use($v,&$errors){if(trim($v[$key]??'')==='')$errors[$key]='Pflichtangabe fehlt.';};
 if($category==='impressum'){
  foreach(['imprint_name','imprint_address','imprint_board','imprint_board_address','imprint_email','imprint_phone','imprint_court','imprint_register'] as $k)$require($k);
  if(!empty($v['imprint_email'])&&!filter_var($v['imprint_email'],FILTER_VALIDATE_EMAIL))$errors['imprint_email']='Bitte eine gültige E-Mail-Adresse eingeben.';
  foreach(['imprint_has_vat'=>['imprint_vat'],'imprint_has_economic_id'=>['imprint_economic_id'],'imprint_has_editor'=>['imprint_editor','imprint_editor_address']] as $flag=>$keys){
   if(!in_array($v[$flag]??'',['true','false'],true))$errors[$flag]='Bitte Ja oder Nein auswählen.';
   elseif($v[$flag]==='true')foreach($keys as $k)$require($k);
   else foreach($keys as $k)if(trim($v[$k]??'')!=='')$errors[$flag]='Bitte Ja wählen oder die zugehörigen Angaben leeren.';
  }
  foreach(['imprint_address','imprint_board_address'] as $k)if(preg_match('/musterstra(?:ße|sse)|postfach/i',$v[$k]??''))$errors[$k]='Bitte eine tatsächliche ladungsfähige Anschrift angeben, kein Postfach.';
  if(($v['imprint_phone']??'')==='+49 123 456789')$errors['imprint_phone']='Bitte tatsächliche Kontaktmöglichkeit angeben.';
 }elseif($category==='datenschutz'){
  foreach(['privacy_hosting','privacy_logs_retention','privacy_hosting_transfers','privacy_contact','privacy_contact_retention','privacy_accounts','privacy_security','privacy_accounts_retention','privacy_photos','privacy_photos_basis','privacy_external','privacy_backup','privacy_backup_retention','privacy_rights'] as $k)$require($k);
  if(($v['privacy_reviewed']??'')!=='true')$errors['privacy_reviewed']='Bitte tatsächliche Verarbeitung und Angaben prüfen und bestätigen.';
 }
 return $errors;
}
function legal_status(): array {
 return ['impressum'=>legal_errors('impressum',legal_values('impressum')),'datenschutz'=>legal_errors('datenschutz',legal_values('datenschutz'))];
}
function save_legal(array $request): void {
 $actor=require_role(['admin']);$category=$request['category']??'';$values=$request['values']??null;
 if(!in_array($category,['impressum','datenschutz'],true)||!is_array($values))fail(400,'Ungültige Rechtstexte.');
 $pdo=db();$pdo->beginTransaction();
 try{
  $rows=stmt('SELECT id,`key`,value FROM site_settings WHERE category=? FOR UPDATE',[$category])->fetchAll();
  $old=[];foreach($rows as $r)$old[$r['key']]=$r;
  if(count($old)!==count($values)||array_diff_key($old,$values)||array_diff_key($values,$old))fail(400,'Bitte alle Felder der Seite übermitteln.');
  foreach($values as $k=>$v){if(!is_string($v)||strlen($v)>60000)fail(400,'Ungültige oder zu lange Angabe.');$values[$k]=trim($v);}
  $errors=legal_errors($category,$values);if($errors)fail(422,'Pflichtangaben unvollständig oder ungültig: '.implode(', ',array_keys($errors)));
  foreach($values as $k=>$v)if((string)($old[$k]['value']??'')!==$v){
   stmt('UPDATE site_settings SET value=?,last_edit_by=?,last_edit_at=UTC_TIMESTAMP() WHERE id=?',[$v,$actor['username'],$old[$k]['id']]);
   audit($actor,'update','site_settings',$old[$k]['id'],$k,['value']);
  }
  $pdo->commit();
 }catch(Throwable $e){$pdo->rollBack();throw $e;}
}
