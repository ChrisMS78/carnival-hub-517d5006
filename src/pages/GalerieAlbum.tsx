import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePageBackground } from "@/hooks/usePageBackground";
import type { Tables } from "@/integrations/supabase/types";

type Album = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;

export default function GalerieAlbum() {
  const { albumId } = useParams();
  const { backgroundUrl } = usePageBackground("galerie");

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchAlbum();
  }, [albumId]);

  const fetchAlbum = async () => {
    if (!albumId) {
      setIsLoading(false);
      return;
    }

    const { data: albumData, error: albumError } = await supabase
      .from("gallery_albums")
      .select("*")
      .eq("id", albumId)
      .single();

    if (albumError) {
      console.error("Error fetching album:", albumError);
      setIsLoading(false);
      return;
    }

    const { data: imagesData, error: imagesError } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true });

    if (imagesError) {
      console.error("Error fetching gallery images:", imagesError);
    }

    setAlbum(albumData);
    setImages(imagesData || []);
    setIsLoading(false);
  };

  const showPreviousImage = () => {
    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) return null;
      return currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    });
  };

  const showNextImage = () => {
    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) return null;
      return currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    });
  };

  const selectedImage =
    selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div
      className="min-h-screen bg-background"
      style={
        backgroundUrl
          ? {
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <Link
          to="/galerie"
          className="mb-8 inline-block text-primary hover:underline"
        >
          Zurück zur Galerie
        </Link>

        {isLoading ? (
          <p className="text-muted-foreground">Lade Album...</p>
        ) : !album ? (
          <p className="text-muted-foreground">Album nicht gefunden.</p>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="mb-2 text-4xl font-bold">{album.title}</h1>

              {album.event_date && (
                <p className="mb-3 text-lg text-muted-foreground">
                  {format(new Date(album.event_date), "MMMM yyyy", {
                    locale: de,
                  })}
                </p>
              )}

              {album.description && (
                <p className="text-muted-foreground">{album.description}</p>
              )}
            </div>

            {images.length === 0 ? (
              <p className="text-muted-foreground">
                Keine Bilder in diesem Album.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className="group overflow-hidden rounded-xl shadow-md transition hover:scale-[1.02] hover:shadow-xl"
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || album.title}
                      className="h-64 w-full object-cover transition group-hover:brightness-90"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {selectedImage && selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setSelectedIndex(null)}
            className="absolute right-6 top-6 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Bild schließen"
          >
            <X className="h-7 w-7" />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={showPreviousImage}
              className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="h-9 w-9" />
            </button>
          )}

          <img
            src={selectedImage.image_url}
            alt={selectedImage.alt_text || album?.title || "Galeriebild"}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
          />

          {images.length > 1 && (
            <button
              type="button"
              onClick={showNextImage}
              className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="h-9 w-9" />
            </button>
          )}

          <div className="absolute bottom-6 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
