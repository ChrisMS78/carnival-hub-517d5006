import { Link } from "react-router-dom";
import { Facebook, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Footer() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
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
                  href="https://www.facebook.com/KarnevalsfreundeBoesensell"
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </Button>

            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-lg font-semibold">Quick Links</h4>

            <nav className="flex flex-col gap-2">
              <Link
                to="/ueber-uns" state={{ scrollToTop: true }}
                className="text-muted-foreground transition hover:text-primary"
              >
                Über Uns
              </Link>

              <Link
                to="/termine" state={{ scrollToTop: true }}
                className="text-muted-foreground transition hover:text-primary"
              >
                Termine
              </Link>

              <Link
                to="/galerie" state={{ scrollToTop: true }}
                className="text-muted-foreground transition hover:text-primary"
              >
                Galerie
              </Link>

              <Link
                to="/kontakt" state={{ scrollToTop: true }}
                className="text-muted-foreground transition hover:text-primary"
              >
                Kontakt
              </Link>

              <Link to="/impressum" state={{ scrollToTop: true }} className="text-muted-foreground transition hover:text-primary">Impressum</Link>
              <Link to="/datenschutz" state={{ scrollToTop: true }} className="text-muted-foreground transition hover:text-primary">Datenschutz</Link>
              <Link
                to="/admin" state={{ scrollToTop: true }}
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


        </div>

        <div className="mt-8 border-t pt-8 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} K.E.B e.V. Alle Rechte vorbehalten.</p>
          <p className="mt-2 text-sm">Helau Bösensell!</p>
        </div>
      </div>
    </footer>
  );
}
