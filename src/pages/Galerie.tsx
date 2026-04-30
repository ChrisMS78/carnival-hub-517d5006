import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePageBackground } from "@/hooks/usePageBackground";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Album = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;

interface AlbumWithImages extends Album {
  images: GalleryImage[];
}

export default function Galerie() {
  const [albums, setAlbums] = useState<AlbumWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { backgroundUrl } = usePageBackground("galerie");

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    const { data: albumsData, error: albumsError } = await supabase
      .from("gallery_albums")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("event_date", { ascending: false });

    if (albumsError) {
      console.error("Error fetching albums:", albumsError);
      setIsLoading(false);
      return;
    }

    const albumsWithImages: AlbumWithImages[] = await Promise.all(
      (albumsData || []).map(async (album) => {
        const { data: imagesData, error: imagesError } = await supabase
          .from("gallery_images")
          .select("*")
          .eq("album_id", album.id)
          .order("sort_order", { ascending: true });

        if (imagesError) {
          console.error("Error fetching gallery images:", imagesError);
        }

        return {
          ...album,
          images: imagesData || [],
        };
      })
    );

    setAlbums(albumsWithImages);
    setIsLoading(false);
  };

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
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Galerie</h1>
          <p className="text-lg text-muted-foreground">
            Impressionen aus unseren Veranstaltungen
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Lade Galerie...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              Noch keine Galerien vorhanden.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {albums.map((album) => (
              <section key={album.id}>
                <div className="mb-6">
                  <h2 className="mb-2 text-3xl font-bold">{album.title}</h2>

                  {album.event_date && (
                    <p className="mb-3 text-lg text-muted-foreground">
                      {format(new Date(album.event_date), "MMMM yyyy", {
                        locale: de,
                      })}
                    </p>
                  )}

                  {album.description && (
                    <p className="text-muted-foreground">
                      {album.description}
                    </p>
                  )}
                </div>

                {album.images.length === 0 ? (
                  <p className="text-muted-foreground">
                    Keine Bilder in diesem Album
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {album.images.slice(0, 3).map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedImage(img.image_url)}
                        className="group overflow-hidden rounded-xl shadow-md transition hover:scale-[1.02] hover:shadow-xl"
                      >
                        <img
                          src={img.image_url}
                          alt={img.alt_text || album.title}
                          className="h-64 w-full object-cover transition group-hover:brightness-90"
                        />
                      </button>
                    ))}

                    <Link
                      to={`/galerie/${album.id}`}
                      className="flex h-64 items-center justify-center rounded-xl bg-primary px-6 text-center text-xl font-bold text-primary-foreground shadow-md transition hover:scale-[1.02] hover:shadow-xl"
                    >
                      Alle Bilder
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-6 top-6 rounded-full bg-white/10 px-4 py-2 text-3xl text-white transition hover:bg-white/20"
            aria-label="Bild schließen"
          >
            ×
          </button>

          <img
            src={selectedImage}
            alt="Galeriebild"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
