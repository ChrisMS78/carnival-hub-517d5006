import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type ContactSubmission = Tables<"contact_submissions">;

export default function ContactManager() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Nachrichten");
    } else {
      setSubmissions(data || []);
    }
    setIsLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
    } else {
      fetchSubmissions();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Nachricht gelöscht");
      fetchSubmissions();
    }
  };

  const unreadCount = submissions.filter((s) => !s.is_read).length;

  if (isLoading) {
    return <div className="flex justify-center p-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Kontaktanfragen</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} ungelesen</Badge>
          )}
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
            Keine Nachrichten vorhanden
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className={!submission.is_read ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {submission.name}
                      {!submission.is_read && (
                        <Badge variant="secondary" className="text-xs">Neu</Badge>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                      <a href={`mailto:${submission.email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="w-4 h-4" />
                        {submission.email}
                      </a>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(submission.created_at!), "dd. MMM yyyy, HH:mm", { locale: de })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!submission.is_read && (
                      <Button variant="outline" size="sm" onClick={() => markAsRead(submission.id)}>
                        <Check className="w-4 h-4 mr-1" />
                        Als gelesen markieren
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(submission.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Löschen
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {submission.subject && (
                  <p className="font-medium mb-2">{submission.subject}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{submission.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
