import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, Phone, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";

export function Footer() {
  const { user, signOut } = useAuth();

  const { settings } = useSiteSettings([
    "contact_address",
    "contact_email",
    "contact_phone",
  ]);

  const handleLogout = async () => {
    await signOut();
  };

  const contactAddress =
    settings.contact_address || "Musterstraße 123\n48329 Bösensell";
  const contactEmail = settings.contact_email || "info@keb-ev.de";
  const contactPhone = settings.contact_phone || "+49 123 456789";

  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="mb-4 text-2xl font-bold text-primary">
              K.E.B e.V.
            </h3>

            <p className="mb-4 text-muted-foreground">
              Wir vom K.E.B e.V. möchten die Tradition des Karnevals
              aufrechterhalten, so dass jung und alt zusammen die fünfte
              Jahreszeit vor Ort in Bösensell feiern können.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" size="icon" asChild>
                <a
                  href="#"
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </Button>

              <Button variant="outline" size="icon" asChild>
                <a
                  href="#"
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-lg font-semibold">Quick Links</h4>

            <nav className="flex flex-col gap-2">
              <Link
                to="/ueber-uns"
                className="text-muted-foreground transition hover:text-primary"
              >
                Über Uns
              </Link>

              <Link
                to="/termine"
                className="text-muted-foreground transition hover:text-primary"
              >
                Termine
              </Link>

              <Link
                to="/galerie"
                className="text-muted-foreground transition hover:text-primary"
              >
                Galerie
              </Link>

              <Link
                to="/kontakt"
                className="text-muted-foreground transition hover:text-primary"
              >
                Kontakt
              </Link>

              <Link
                to="/admin"
                className="text-muted-foreground transition hover:text-primary"
              >
                Verwaltung
              </Link>

              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-fit justify-start px-0 text-muted-foreground hover:text-primary"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </Button>
              )}
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 text-lg font-semibold">Kontakt</h4>

            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <span className="whitespace-pre-line">{contactAddress}</span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <a
                  href={`mailto:${contactEmail}`}
                  className="transition hover:text-primary"
                >
                  {contactEmail}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-primary" />
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  className="transition hover:text-primary"
                >
                  {contactPhone}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} K.E.B e.V. Alle Rechte vorbehalten.</p>
          <p className="mt-2 text-sm">Helau Bösensell!</p>
        </div>
      </div>
    </footer>
  );
}
