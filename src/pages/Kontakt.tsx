import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePageBackground } from "@/hooks/usePageBackground";
import { siteApi } from "@/lib/siteApi";

export default function Kontakt() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { backgroundUrl } = usePageBackground("kontakt");
  
  const { settings } = useSiteSettings([
    "contact_title",
    "contact_subtitle",
    "imprint_address",
    "imprint_email",
    "imprint_phone",
  ]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string || null,
      message: formData.get("message") as string,
    };

    const { error } = await siteApi.from("contact_submissions").insert([data]);

    if (error) {
      toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden.", variant: "destructive" });
    } else {
      toast({ title: "Nachricht gesendet!", description: "Wir melden uns bald bei Ihnen." });
      (e.target as HTMLFormElement).reset();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <section className="py-20 carnival-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              {settings.contact_title || "Kontakt"}
            </h1>
            <p className="text-xl text-primary-foreground/80">
              {settings.contact_subtitle || "Wir freuen uns auf Ihre Nachricht!"}
            </p>
          </div>
        </section>

        <section 
          className="py-20 bg-cover bg-center bg-no-repeat"
          style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Contact Info */}
              <div>
                <h2 className="text-3xl font-display font-bold text-foreground mb-8">Kontaktdaten</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Adresse</h3>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {settings.imprint_address || "Siehe Impressum"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">E-Mail</h3>
                      <a
                        href={`mailto:${settings.imprint_email || "info@keb-ev.de"}`}
                        className="text-primary hover:underline"
                      >
                        {settings.imprint_email || "info@keb-ev.de"}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Telefon</h3>
                      <p className="text-muted-foreground">{settings.imprint_phone || "Siehe Impressum"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
                <h2 className="text-2xl font-display font-bold text-foreground mb-6">Nachricht senden</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="email">E-Mail *</Label>
                      <Input id="email" name="email" type="email" required className="mt-2" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject">Betreff</Label>
                    <Input id="subject" name="subject" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="message">Nachricht *</Label>
                    <Textarea id="message" name="message" rows={5} required className="mt-2" />
                  </div>
                  <p className="text-sm text-muted-foreground">Wir verarbeiten Ihre Angaben zur Bearbeitung Ihrer Anfrage. Name, E-Mail-Adresse und Nachricht sind Pflichtangaben. Informationen zu Rechtsgrundlagen, Speicherdauer und Ihren Rechten finden Sie in unserer <Link to="/datenschutz" className="text-primary underline">Datenschutzerklärung</Link>.</p>
                  <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Wird gesendet..." : "Absenden"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
