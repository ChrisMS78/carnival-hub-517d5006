import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Calendar, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageBackground } from "@/hooks/usePageBackground";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

export default function Termine() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { backgroundUrl } = usePageBackground("termine");

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("event_date", { ascending: true });

      if (!error && data) {
        setEvents(data);
      }
      setIsLoading(false);
    };

    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <section className="py-20 carnival-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">Termine</h1>
            <p className="text-xl text-primary-foreground/80">Unsere kommenden Veranstaltungen</p>
          </div>
        </section>

        <section 
          className="py-20 bg-cover bg-center bg-no-repeat"
          style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Laden...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Keine Termine vorhanden</div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
                    <div className="h-2 carnival-gradient rounded-full mb-4" />
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <h3 className="text-2xl font-display font-bold text-foreground mb-2">{event.title}</h3>
                        {event.description && (
                          <p className="text-muted-foreground mb-4">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>{format(new Date(event.event_date), "dd. MMMM yyyy", { locale: de })}</span>
                          </div>
                          {event.event_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-primary" />
                              <span>{event.event_time}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-accent" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {event.image_url && (
                        <div className="w-full md:w-48 h-32 md:h-auto flex-shrink-0">
                          <img 
                            src={event.image_url} 
                            alt={event.title} 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
