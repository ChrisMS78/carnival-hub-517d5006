import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
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

    // Fetch images for each album
    const albumsWithImages: AlbumWithImages[] = await Promise.all(
      (albumsData || []).map(async (album) => {
        const { data: imagesData } = await supabase
          .from("gallery_images")
          .select("*")
          .eq("album_id", album.id)
          .order("sort_order", { ascending: true });

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <section className="py-20 carnival-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">Galerie</h1>
            <p className="text-xl text-primary-foreground/80">Impressionen aus unseren Veranstaltungen</p>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Lade Galerie...</p>
              </div>
            ) : albums.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Noch keine Galerien vorhanden.</p>
              </div>
            ) : (
              albums.map((album) => (
                <div key={album.id} className="mb-16">
                  <h2 className="text-3xl font-display font-bold text-foreground mb-2">{album.title}</h2>
                  {album.event_date && (
                    <p className="text-muted-foreground mb-2">
                      {format(new Date(album.event_date), "MMMM yyyy", { locale: de })}
                    </p>
                  )}
                  {album.description && (
                    <p className="text-muted-foreground mb-6">{album.description}</p>
                  )}
                  {album.images.length === 0 ? (
                    <p className="text-muted-foreground italic">Keine Bilder in diesem Album</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {album.images.map((img) => (
                        <div
                          key={img.id}
                          className="aspect-square rounded-xl overflow-hidden group cursor-pointer"
                          onClick={() => setSelectedImage(img.image_url)}
                        >
                          <img
                            src={img.image_url}
                            alt={img.caption || album.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <Footer />

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Vergrößertes Bild"
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-4xl hover:text-primary transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
