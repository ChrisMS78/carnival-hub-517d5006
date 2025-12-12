import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, Phone, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Footer() {
  const { user, hasBackendAccess, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <footer className="bg-carnival-dark text-carnival-cream">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-display font-bold mb-4 text-carnival-gold">
              K.E.B e.V.
            </h3>
            <p className="text-carnival-cream/70 leading-relaxed">
              Wir vom K.E.B e.V. möchten die Tradition des Karnevals aufrechterhalten, 
              so dass jung und alt zusammen die fünfte Jahreszeit vor Ort in Bösensell feiern können.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-carnival-cream/10 hover:bg-carnival-red transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-carnival-cream/10 hover:bg-carnival-red transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-carnival-gold">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/ueber-uns" className="text-carnival-cream/70 hover:text-carnival-cream transition-colors">
                  Über Uns
                </Link>
              </li>
              <li>
                <Link to="/termine" className="text-carnival-cream/70 hover:text-carnival-cream transition-colors">
                  Termine
                </Link>
              </li>
              <li>
                <Link to="/galerie" className="text-carnival-cream/70 hover:text-carnival-cream transition-colors">
                  Galerie
                </Link>
              </li>
              <li>
                <Link to="/kontakt" className="text-carnival-cream/70 hover:text-carnival-cream transition-colors">
                  Kontakt
                </Link>
              </li>
              <li className="flex items-center gap-2 flex-wrap">
                <Link to="/admin" className="text-carnival-cream/70 hover:text-carnival-cream transition-colors">
                  Verwaltung
                </Link>
                {user && hasBackendAccess && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-carnival-cream/70 hover:text-carnival-cream hover:bg-carnival-cream/10 p-1 h-auto"
                  >
                    <LogOut size={16} />
                    <span className="ml-1 text-xs">Abmelden</span>
                  </Button>
                )}
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-carnival-gold">Kontakt</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-carnival-cream/70">
                <MapPin size={20} className="flex-shrink-0 mt-0.5" />
                <span>Musterstraße 123<br />48329 Bösensell</span>
              </li>
              <li className="flex items-center gap-3 text-carnival-cream/70">
                <Mail size={20} className="flex-shrink-0" />
                <a href="mailto:info@keb-ev.de" className="hover:text-carnival-cream transition-colors">
                  info@keb-ev.de
                </a>
              </li>
              <li className="flex items-center gap-3 text-carnival-cream/70">
                <Phone size={20} className="flex-shrink-0" />
                <span>+49 123 456789</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-carnival-cream/10 text-center text-carnival-cream/50 text-sm">
          <p>© {new Date().getFullYear()} K.E.B e.V. Alle Rechte vorbehalten.</p>
          <p className="mt-2">
            Helau Bösensell! 🎭
          </p>
        </div>
      </div>
    </footer>
  );
}
