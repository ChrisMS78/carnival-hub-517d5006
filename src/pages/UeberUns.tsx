import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FileText, Download, Users, Award, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { Tables } from "@/integrations/supabase/types";

type AboutContent = Tables<"about_content">;

export default function UeberUns() {
  const [sections, setSections] = useState<AboutContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { settings } = useSiteSettings([
    "about_title",
    "about_subtitle",
    "about_stat_members",
    "about_stat_years",
    "about_stat_events",
  ]);

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from("about_content")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) setSections(data);
      setIsLoading(false);
    };
    fetchContent();
  }, []);

  // Filter sections with and without PDFs
  const textSections = sections.filter((s) => !s.pdf_url);
  const documents = sections.filter((s) => s.pdf_url);

  const stats = [
    { icon: Users, value: settings.about_stat_members || "150+", label: "Mitglieder" },
    { icon: Award, value: settings.about_stat_years || "10+", label: "Jahre Tradition" },
    { icon: Heart, value: settings.about_stat_events || "20+", label: "Events pro Jahr" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-20 carnival-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              {settings.about_title || "Über Uns"}
            </h1>
            <p className="text-xl text-primary-foreground/80">
              {settings.about_subtitle || "Helau Bösensell - Lernen Sie uns kennen!"}
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-4xl font-display font-bold text-foreground mb-2">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-12">
              {isLoading ? (
                <div className="text-center text-muted-foreground">Laden...</div>
              ) : textSections.length === 0 ? (
                <div className="text-center text-muted-foreground">Kein Inhalt vorhanden</div>
              ) : (
                textSections.map((section) => (
                  <div key={section.id}>
                    <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                      {section.title}
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Documents */}
        {documents.length > 0 && (
          <section className="py-20 bg-secondary">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
                Downloads
              </h2>
              <div className="max-w-2xl mx-auto grid gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between bg-card rounded-xl p-4 shadow-sm border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{doc.title}</div>
                        <div className="text-sm text-muted-foreground">{doc.pdf_name || "PDF"}</div>
                      </div>
                    </div>
                    <a href={doc.pdf_url!} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
