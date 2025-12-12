import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import heroImage from "@/assets/hero-carnival.jpg";

export function HeroSection() {
  const { settings } = useSiteSettings(["hero_title", "hero_subtitle"]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Karneval Feier"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-carnival-dark/60 via-carnival-dark/40 to-carnival-dark/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-primary-foreground mb-6 animate-fade-up">
            {settings.hero_title || "Karneval bei Dir vor Ort"}
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 animate-fade-up delay-100">
            {settings.hero_subtitle || "Die fünfte Jahreszeit in Bösensell"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-200">
            <Link to="/galerie">
              <Button variant="hero" size="lg">
                Galerie
              </Button>
            </Link>
            <Link to="/kontakt">
              <Button variant="heroOutline" size="lg">
                Kontakt
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
