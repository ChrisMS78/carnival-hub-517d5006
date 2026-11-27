import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
export function BackupManager() {
 const [busy,setBusy]=useState(false);
 const download=async()=>{
  if(!confirm("Die ZIP-Datei enthält personenbezogene Daten und Passwort-Hashes. Nur an einem geschützten Ort speichern. Backup möglichst ohne parallele Änderungen erstellen."))return;
  setBusy(true);
  try{
   const r=await fetch("/api/backup.php",{method:"POST",credentials:"same-origin",headers:{"X-KEB-Request":"1"}});
   if(!r.ok||!(r.headers.get("content-type")||"").includes("application/zip")){
    const error=await r.json().catch(()=>null);throw new Error(error?.error?.message||"Datensicherung fehlgeschlagen");
   }
   const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");
   a.href=url;a.download="KEB-"+new Date().toISOString().replace(/[:.]/g,"-")+".zip";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
   toast.success("Datensicherung heruntergeladen");
  }catch(e){toast.error(e instanceof Error?e.message:"Datensicherung fehlgeschlagen");}
  finally{setBusy(false);}
 };
 return <Card className="max-w-3xl"><CardHeader><CardTitle>Datensicherung</CardTitle></CardHeader><CardContent className="space-y-4">
 <p>Eine ZIP-Sicherung enthält die MySQL-Datenbank, Bilder und Dokumente. Der Quellcode liegt separat auf GitHub. Zugangsdaten zur Datenbank sind nicht enthalten.</p>
 <p className="text-sm text-muted-foreground">Sicherungen nicht im öffentlichen Webspace oder Repository speichern. Verschlüsselt auf einem separaten Datenträger oder in einem privaten Backup-Speicher ablegen. Die automatische externe Sicherung muss separat eingerichtet werden.</p>
 <Button disabled={busy} onClick={download}>{busy?"Sicherung wird erstellt...":"Vollständiges Backup herunterladen"}</Button>
 </CardContent></Card>;
}
