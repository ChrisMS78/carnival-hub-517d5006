import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Calendar, MapPin, Clock, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

export default function EventsManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("event_date", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Termine");
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    // Use index-based values to ensure unique sort orders
    await Promise.all([
      supabase.from("events").update({ sort_order: index - 1 }).eq("id", events[index].id),
      supabase.from("events").update({ sort_order: index }).eq("id", events[index - 1].id),
    ]);
    
    fetchEvents();
  };

  const handleMoveDown = async (index: number) => {
    if (index === events.length - 1) return;
    
    // Use index-based values to ensure unique sort orders
    await Promise.all([
      supabase.from("events").update({ sort_order: index + 1 }).eq("id", events[index].id),
      supabase.from("events").update({ sort_order: index }).eq("id", events[index + 1].id),
    ]);
    
    fetchEvents();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEvent) {
      const { error } = await supabase
        .from("events")
        .update(formData)
        .eq("id", editingEvent.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
      } else {
        toast.success("Termin aktualisiert");
        fetchEvents();
      }
    } else {
      // New items get sort_order -1 to appear first, then normalize all orders
      const { error } = await supabase.from("events").insert([{ ...formData, sort_order: -1 }]);

      if (error) {
        toast.error("Fehler beim Erstellen");
      } else {
        toast.success("Termin erstellt");
        // Normalize sort orders after insert
        const { data: allEvents } = await supabase
          .from("events")
          .select("id")
          .order("sort_order", { ascending: true })
          .order("event_date", { ascending: true });
        
        if (allEvents) {
          await Promise.all(
            allEvents.map((event, idx) =>
              supabase.from("events").update({ sort_order: idx }).eq("id", event.id)
            )
          );
        }
        fetchEvents();
      }
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Termin wirklich löschen?")) return;

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Termin gelöscht");
      fetchEvents();
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      event_time: event.event_time || "",
      location: event.location || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      event_date: "",
      event_time: "",
      location: "",
    });
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Termine verwalten</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Termin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Termin bearbeiten" : "Neuer Termin"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event_date">Datum</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="event_time">Uhrzeit</Label>
                  <Input
                    id="event_time"
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Ort</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Abbrechen
                </Button>
                <Button type="submit">
                  {editingEvent ? "Speichern" : "Erstellen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine Termine vorhanden
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event, index) => (
            <Card key={event.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleMoveUp(index)} disabled={index === 0}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleMoveDown(index)} disabled={index === events.length - 1}>
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(event)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(event.event_date), "dd. MMMM yyyy", { locale: de })}
                  </span>
                  {event.event_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {event.event_time}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-2 text-sm">{event.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
