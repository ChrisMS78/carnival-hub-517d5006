import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { siteApi } from "@/lib/siteApi";
import { toast } from "sonner";

type Content = { id: string; title: string; published?: boolean; description?: string | null; content?: string | null; event_date?: string | null; event_time?: string | null; location?: string | null; image_url?: string | null; pdf_url?: string | null };
export function PublicationControls({ table, record, refresh }: { table: "events" | "about_content" | "gallery_albums"; record: Content; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pictures, setPictures] = useState<{id: string; image_url: string; thumbnail_url?: string | null}[]>([]);
  const published = record.published === true;
  const toggle = async () => {
    if (busy || !confirm(published ? "Diesen Inhalt von der öffentlichen Homepage nehmen?" : "Diesen Inhalt öffentlich veröffentlichen?")) return;
    setBusy(true);
    const { error } = await siteApi.adminFrom(table).update({ published: !published }).eq("id", record.id);
    if (error) toast.error(error.message); else { toast.success(published ? "Als Entwurf gespeichert" : "Veröffentlicht"); refresh(); setOpen(false); }
    setBusy(false);
  };
  const show = async () => {
    setOpen(true);
    if (table === "gallery_albums") {
      const { data, error } = await siteApi.adminFrom("gallery_images").select("*").eq("album_id", record.id).order("sort_order");
      if (error) toast.error(error.message); else setPictures(data || []);
    }
  };
  return <div className="flex flex-wrap gap-2 items-center mt-2" onClick={e => e.stopPropagation()}>
    <Badge variant={published ? "secondary" : "outline"}>{published ? "Veröffentlicht" : "Entwurf"}</Badge>
    <Button type="button" variant="outline" size="sm" onClick={show}>Vorschau</Button>
    <Button type="button" variant={published ? "outline" : "default"} size="sm" disabled={busy} onClick={toggle}>{published ? "Zurückziehen" : "Veröffentlichen"}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Vorschau – {published ? "Veröffentlicht" : "Entwurf"}</DialogTitle></DialogHeader>
        <article className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="h-2 rounded-full carnival-gradient" />
          <h3 className="text-2xl font-display font-bold">{record.title}</h3>
          {record.event_date && <p>{record.event_date.split("-").reverse().join(".")} {record.event_time?.slice(0,5)} {record.location}</p>}
          <p className="whitespace-pre-wrap">{record.description || record.content}</p>
          {record.image_url && <img src={record.image_url} alt={record.title} className="max-h-80 w-full object-contain rounded-lg" />}
          {record.pdf_url && <a href={record.pdf_url} target="_blank" rel="noreferrer" className="underline">PDF ansehen</a>}
          {table === "gallery_albums" && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{pictures.map(p => <img key={p.id} src={p.thumbnail_url || p.image_url} alt="" className="w-full aspect-square object-cover rounded" />)}</div>}
        </article>
        <Button onClick={toggle} disabled={busy}>{published ? "Zurückziehen" : "Jetzt veröffentlichen"}</Button>
      </DialogContent>
    </Dialog>
  </div>;
}
