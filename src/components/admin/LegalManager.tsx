import { useEffect, useState } from "react";
import { siteApi, type LegalStatus } from "@/lib/siteApi";
import type { Tables } from "@/lib/siteTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LastEdit } from "./LastEdit";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Category = "impressum" | "datenschutz";
type Setting = Tables<"site_settings">;
const imprintRequired = ["imprint_name","imprint_address","imprint_board","imprint_board_address","imprint_email","imprint_phone","imprint_court","imprint_register"];
const flags: Record<string,string[]> = {imprint_has_vat:["imprint_vat"],imprint_has_economic_id:["imprint_economic_id"],imprint_has_editor:["imprint_editor","imprint_editor_address"]};
const privacyRequired = ["privacy_hosting","privacy_logs_retention","privacy_hosting_transfers","privacy_contact","privacy_contact_retention","privacy_accounts","privacy_security","privacy_accounts_retention","privacy_photos","privacy_photos_basis","privacy_external","privacy_backup","privacy_backup_retention","privacy_rights"];
const imprintOrder = [...imprintRequired,"imprint_has_vat","imprint_vat","imprint_has_economic_id","imprint_economic_id","imprint_has_editor","imprint_editor","imprint_editor_address","imprint_extra"];
const privacyOrder = [...privacyRequired,"privacy_dpo","privacy_extra","privacy_reviewed"];
const title = (c:Category) => c==="impressum"?"Impressum":"Datenschutzerklärung";

function validate(category:Category, values:Record<string,string>):Record<string,string>{
 const errors:Record<string,string>={};
 const require=(key:string)=>{if(!values[key]?.trim())errors[key]="Pflichtangabe fehlt.";};
 (category==="impressum"?imprintRequired:privacyRequired).forEach(require);
 if(category==="impressum"){
  if(values.imprint_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.imprint_email.trim()))errors.imprint_email="Bitte eine gültige E-Mail-Adresse eingeben.";
  for(const [flag,keys] of Object.entries(flags)){
   if(!["true","false"].includes(values[flag]||""))errors[flag]="Bitte Ja oder Nein auswählen.";
   else if(values[flag]==="true")keys.forEach(require);
   else if(keys.some(k=>values[k]?.trim()))errors[flag]="Bitte Ja wählen oder die zugehörigen Angaben leeren.";
  }
  for(const key of ["imprint_address","imprint_board_address"])if(/musterstra(?:ße|sse)|postfach/i.test(values[key]||""))errors[key]="Bitte eine tatsächliche ladungsfähige Anschrift angeben.";
  if(values.imprint_phone==="+49 123 456789")errors.imprint_phone="Bitte tatsächliche Kontaktmöglichkeit angeben.";
 }else if(values.privacy_reviewed!=="true")errors.privacy_reviewed="Bitte tatsächliche Angaben prüfen und bestätigen.";
 return errors;
}
export function LegalWarning({version,onNavigate}:{version:number;onNavigate:(tab:string)=>void}){
 const [status,setStatus]=useState<LegalStatus|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;setError("");siteApi.legalStatus().then(r=>{if(!active)return;if(r.error){setError(r.error.message);setStatus(null);}else setStatus(r.data);});return()=>{active=false;};},[version]);
 if(error)return <div role="alert" className="rounded-lg border border-amber-500 bg-amber-50 text-amber-950 p-4 mb-4">Rechtliche Angaben konnten nicht geprüft werden: {error}</div>;
 if(!status)return null;
 const imprint=Object.keys(status.impressum).length,privacy=Object.keys(status.datenschutz).length;
 if(!imprint&&!privacy)return null;
 return <div role="alert" className="rounded-lg border border-amber-500 bg-amber-50 text-amber-950 p-4 mb-4 space-y-2">
  <strong>Rechtliche Angaben noch nicht vollständig</strong>
  <p className="text-sm">Bitte die folgenden Bereiche vervollständigen und prüfen. Die technische Vollständigkeit ersetzt keine rechtliche Prüfung.</p>
  <div className="flex flex-wrap gap-2">{imprint>0&&<Button variant="outline" size="sm" onClick={()=>onNavigate("imprint")}>Impressum: {imprint} offene Angaben</Button>}{privacy>0&&<Button variant="outline" size="sm" onClick={()=>onNavigate("privacy")}>Datenschutz: {privacy} offene Angaben</Button>}</div>
 </div>;
}
export function LegalManager({category,onSaved}:{category:Category;onSaved:()=>void}){
 const [rows,setRows]=useState<Setting[]>([]);
 const [values,setValues]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState("");
 const [busy,setBusy]=useState(false);
 const load=async()=>{setLoading(true);setLoadError("");const r=await siteApi.adminFrom("site_settings").select("*").eq("category",category);
  if(r.error){setLoadError(r.error.message);setLoading(false);return;}
  const order=category==="impressum"?imprintOrder:privacyOrder;
  const data=[...(r.data||[])].sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key));
  setRows(data);setValues(Object.fromEntries(data.map(r=>[r.key,r.value||""])));setLoading(false);
 };
 useEffect(()=>{void load();},[category]);
 const errors=validate(category,values);
 const missing=Object.keys(errors).length;
 const change=(key:string,value:string)=>setValues(prev=>({...prev,[key]:value,...(category==="datenschutz"&&key!=="privacy_reviewed"?{privacy_reviewed:"false"}:{})}));
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;if(missing){toast.error("Bitte alle Pflichtangaben ergänzen.");return;}setBusy(true);
  try{const r=await siteApi.saveLegal(category,values);if(r.error)toast.error(r.error.message);else{toast.success("Rechtstext gespeichert");onSaved();await load();}}finally{setBusy(false);}
 };
 if(loading)return <p>Laden...</p>;
 if(loadError)return <div role="alert"><p>{loadError}</p><Button onClick={load}>Erneut laden</Button></div>;
 return <form onSubmit={submit} className="space-y-4">
  <div className="flex flex-wrap gap-3 items-center justify-between"><h2 className="text-2xl font-bold">{title(category)} bearbeiten</h2><Link className="underline text-primary" to={category==="impressum"?"/impressum":"/datenschutz"} target="_blank" rel="noopener noreferrer">Öffentliche Seite ansehen</Link></div>
  <p className={missing?"text-amber-800 bg-amber-50 border border-amber-400 rounded-lg p-3":"text-sm text-muted-foreground"}>{missing?missing+" offene Pflichtangaben. Speichern ist erst nach Vervollständigung möglich.":"Alle technisch geprüften Pflichtfelder sind ausgefüllt. Inhaltliche Richtigkeit bitte weiterhin prüfen."}</p>
  {category==="impressum"?<p className="text-sm text-muted-foreground">Vorsorglich wird der umfangreichere Angabenstandard des § 5 DDG und § 18 MStV verwendet. Bei den optionalen Angaben bitte ausdrücklich Ja oder Nein auswählen. Für den Vorstand kann die Vereinsanschrift verwendet werden, sofern die Vertretungsberechtigten dort erreichbar sind.</p>:<p className="text-sm text-muted-foreground">Die Texte sind vorbelegt. Bitte insbesondere Hosting-Vertrag, Aufbewahrungszeiten, Drittlandübermittlungen, Bildrechte und Backups anhand der tatsächlichen Gegebenheiten prüfen. Nicht zutreffende optionale Angaben leer lassen.</p>}
  <Card><CardHeader><CardTitle>{title(category)}</CardTitle></CardHeader><CardContent className="space-y-5">
   {rows.map(row=>{const key=row.key;const required=(category==="impressum"?imprintRequired:privacyRequired).includes(key)||key in flags||Object.entries(flags).some(([f,ks])=>values[f]==="true"&&ks.includes(key))||key==="privacy_reviewed";
    const error=errors[key];const id="legal-"+key;const multiline=category==="datenschutz"||key.includes("address")||["imprint_board","imprint_extra"].includes(key);
    if(key==="privacy_reviewed")return <div key={key} className="space-y-2 border-t pt-4"><div className="flex gap-2 items-start"><Checkbox id={id} checked={values[key]==="true"} onCheckedChange={v=>change(key,v===true?"true":"false")}/><Label htmlFor={id}>{row.label} *</Label></div>{error&&<p className="text-sm text-destructive">{error}</p>}</div>;
    return <div key={key} className="space-y-2">
      <Label htmlFor={id}>{row.label}{required?" *":""}</Label>
      {key in flags?<select id={id} className="w-full rounded-md border bg-background px-3 py-2" value={values[key]||""} onChange={e=>change(key,e.target.value)} aria-invalid={!!error}><option value="">Bitte auswählen</option><option value="true">Ja</option><option value="false">Nein</option></select>:multiline?<Textarea id={id} rows={category==="datenschutz"?5:3} value={values[key]||""} onChange={e=>change(key,e.target.value)} required={required} aria-invalid={!!error}/>:<Input id={id} type={key==="imprint_email"?"email":"text"} value={values[key]||""} onChange={e=>change(key,e.target.value)} required={required} aria-invalid={!!error}/>}
      {error&&<p className="text-sm text-destructive">{error}</p>}
      <LastEdit record={row}/>
    </div>;
   })}
  </CardContent></Card>
  <Button type="submit" disabled={busy||missing>0||!rows.length}>{busy?"Speichern...":"Vollständige Angaben speichern"}</Button>
 </form>;
}
