import { useEffect, useState } from "react";
import { siteApi, type TrashItem, type AuditItem } from "@/lib/siteApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const labels: Record<string,string> = {events:"Termine",about_content:"Über uns / Downloads",gallery_albums:"Alben",gallery_images:"Bilder",contact_submissions:"Kontaktanfragen",site_settings:"Einstellungen",page_backgrounds:"Hintergründe",profiles:"Benutzer",drafts:"Entwürfe",unread:"Ungelesene Nachrichten",media_bytes:"Bilder und Dokumente"};
const actions: Record<string,string> = {create:"Erstellt",update:"Bearbeitet",trash:"In Papierkorb verschoben",restore:"Wiederhergestellt",purge:"Endgültig gelöscht",delete:"Gelöscht",upload:"Hochgeladen",thumbnail:"Vorschaubild erneuert",password:"Passwort geändert"};
function stamp(s:string) { return new Date(s.replace(" ","T")+"Z").toLocaleString("de-DE",{timeZone:"Europe/Berlin"}); }
function bytes(n:number) { return n>=1073741824 ? (n/1073741824).toFixed(2)+" GB" : (n/1048576).toFixed(2)+" MB"; }
export function Overview() {
 const [data,setData]=useState<Record<string,number>|null>(null);const [error,setError]=useState("");
 const load=async()=>{setError("");const r=await siteApi.dashboard();if(r.error)setError(r.error.message);else setData(r.data);};
 useEffect(()=>{void load();},[]);
 return <div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Übersicht</h2><Button variant="outline" onClick={load}>Aktualisieren</Button></div>
 {error&&<p role="alert">{error}</p>}{!data&&!error&&<p>Laden...</p>}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Object.entries(data||{}).map(([k,v])=><Card key={k}><CardHeader><CardTitle className="text-sm">{labels[k]||k}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{k==="media_bytes"?bytes(v):v}</CardContent></Card>)}</div>
 <p className="text-xs text-muted-foreground">Speicherbedarf umfasst auch aufbewahrte Dateien im Papierkorb; das gesamte Hosting-Kontingent wird nicht abgefragt.</p></div>;
}
export function TrashManager({isAdmin}:{isAdmin:boolean}) {
 const [rows,setRows]=useState<TrashItem[]>([]);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);const r=await siteApi.trash();if(r.error)toast.error(r.error.message);else setRows(r.data||[]);setLoading(false);};
 useEffect(()=>{void load();},[]);
 const change=async(r:TrashItem,purge:boolean)=>{if(busy||!confirm(purge?"Diesen Eintrag endgültig löschen? Diese Aktion ist nicht rückgängig zu machen.":"Diesen Eintrag wiederherstellen? Ein zuvor veröffentlichter Eintrag kann wieder öffentlich sichtbar werden."))return;setBusy(true);const result=purge?await siteApi.purge(r.table,r.id):await siteApi.restore(r.table,r.id);if(result.error)toast.error(result.error.message);else{toast.success(purge?"Endgültig gelöscht":"Wiederhergestellt");await load();}setBusy(false);};
 return <div className="space-y-4"><h2 className="text-2xl font-bold">Papierkorb</h2><p className="text-sm text-muted-foreground">Alben enthalten weiterhin ihre Bilder. Bei einem einzeln gelöschten Bild muss ggf. zuerst das Album wiederhergestellt werden. Nur Administratoren können endgültig löschen.</p>
 {loading?<p>Laden...</p>:!rows.length?<p>Der Papierkorb ist leer.</p>:rows.map(r=><Card key={r.table+r.id}><CardContent className="pt-4 flex flex-wrap gap-3 items-center justify-between"><div><strong>{r.label}</strong><p className="text-sm">{labels[r.table]} · {stamp(r.deleted_at)} · {r.last_edit_by||"Unbekannt"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>change(r,false)}>Wiederherstellen</Button>{isAdmin&&<Button size="sm" variant="destructive" disabled={busy} onClick={()=>change(r,true)}>Endgültig löschen</Button>}</div></CardContent></Card>)}</div>;
}
export function AuditManager() {
 const [rows,setRows]=useState<AuditItem[]>([]);const [search,setSearch]=useState("");const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);const r=await siteApi.audit();if(r.error)toast.error(r.error.message);else setRows(r.data||[]);setLoading(false);};
 useEffect(()=>{void load();},[]);
 const visible=rows.filter(r=>[r.actor,r.action,actions[r.action],r.label,labels[r.entity],r.fields,r.entity_id].join(" ").toLowerCase().includes(search.toLowerCase()));
 return <div className="space-y-4"><div className="flex justify-between"><h2 className="text-2xl font-bold">Änderungshistorie</h2><Button variant="outline" onClick={load}>Aktualisieren</Button></div><p className="text-sm text-muted-foreground">Die letzten 500 protokollierten Aktionen, ohne Passwörter oder Inhalte von Kontaktanfragen.</p><Input placeholder="Nach Benutzer, Aktion oder Inhalt suchen" value={search} onChange={e=>setSearch(e.target.value)} />
 {loading?<p>Laden...</p>:!visible.length?<p>Keine Einträge.</p>:visible.map(r=><Card key={r.id}><CardContent className="pt-4"><div className="flex justify-between gap-2 flex-wrap"><strong>{actions[r.action]||r.action} · {labels[r.entity]||r.entity}</strong><span className="text-xs">{stamp(r.created_at)}</span></div><p>{r.label||r.entity_id}</p><p className="text-sm text-muted-foreground">Benutzer: {r.actor}{r.fields&&" · Felder: "+r.fields}</p></CardContent></Card>)}</div>;
}
export function OwnPassword() {
 const [old,setOld]=useState("");const [pw,setPw]=useState("");const [confirmPw,setConfirmPw]=useState("");const [visible,setVisible]=useState(false);const [busy,setBusy]=useState(false);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(pw!==confirmPw||pw.length<12||new TextEncoder().encode(pw).length>72){toast.error("Passwörter prüfen.");return;}setBusy(true);const r=await siteApi.ownPassword(old,pw,confirmPw);if(r.error)toast.error(r.error.message);else{toast.success("Passwort geändert");setOld("");setPw("");setConfirmPw("");setVisible(false);}setBusy(false);};
 return <Card className="max-w-xl"><CardHeader><CardTitle>Eigenes Passwort ändern</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}>
 <div><Label htmlFor="own-old">Aktuelles Passwort</Label><Input id="own-old" type={visible?"text":"password"} autoComplete="current-password" value={old} onChange={e=>setOld(e.target.value)} required /></div>
 <div><Label htmlFor="own-new">Neues Passwort</Label><Input id="own-new" type={visible?"text":"password"} autoComplete="new-password" minLength={12} maxLength={72} value={pw} onChange={e=>setPw(e.target.value)} required /></div>
 <div><Label htmlFor="own-repeat">Passwort wiederholen</Label><Input id="own-repeat" type={visible?"text":"password"} autoComplete="new-password" minLength={12} maxLength={72} value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} required /></div>
 <Button type="button" variant="outline" onClick={()=>setVisible(!visible)}>{visible?"Passwörter ausblenden":"Passwörter anzeigen"}</Button><Button type="submit" className="ml-2" disabled={busy||!pw||pw!==confirmPw}>Passwort speichern</Button>
 </form></CardContent></Card>;
}
