import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Images, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Album = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;

interface GalleryPreviewItem {
  album: Album;
  image: GalleryImage | null;
}

export function GalleryPreview() {
  const [previewItems, setPreviewItems] = useState<GalleryPreviewItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryPreviewItem | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGalleryPreview();
  }, []);

  const fetchGalleryPreview = async () => {
    setIsLoading(true);

    const { data: albumsData, error: albumsError } = await supabase
      .from("gallery_albums")
      .select("*")
      .order("event_date", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(3);

    if (albumsError) {
      console.error("Error fetching gallery albums:", albumsError);
      setPreviewItems([]);
      setIsLoading(false);
      return;
    }

    const items: GalleryPreviewItem[] = await Promise.all(
      (albumsData || []).map(async (album) => {
        const { data: imagesData, error: imagesError } = await supabase
          .from("gallery_images")
          .select("*")
          .eq("album_id", album.id)
          .order("sort_order", { ascending: true })
          .limit(1);

        if (imagesError) {
          console.error("Error fetching gallery preview image:", imagesError);
        }

        return {
          album,
          image: imagesData && imagesData.length > 0 ? imagesData[0] : null,
        };
      })
    );

    setPreviewItems(items);
    setIsLoading(false);
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Images className="h-4 w-4" />
            Impressionen
          </div>

          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Galerie</h2>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Eindrücke aus unseren Veranstaltungen und Feiern
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Lade Galerie...</p>
          </div>
        ) : previewItems.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Keine Galerien vorhanden</p>
          </div>
        ) : (
          <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {previewItems.map((item) => (
              <button
                key={item.album.id}
                type="button"
                onClick={() => item.image && setSelectedImage(item)}
                disabled={!item.image}
                className="group relative h-72 overflow-hidden rounded-2xl shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {item.image ? (
                  <img
                    src={item.image.image_url}
                    alt={item.image.alt_text || item.album.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Images className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
                  <h3 className="mb-2 text-2xl font-bold text-white">
                    {item.album.title}
                  </h3>

                  {item.album.description && (
                    <p className="line-clamp-2 text-sm text-white/85">
                      {item.album.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button asChild size="lg">
            <Link to="/galerie">
              Alle Bilder ansehen
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {selectedImage?.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-6 top-6 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Bild schließen"
          >
            <X className="h-7 w-7" />
          </button>

          <div
            className="max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedImage.image.image_url}
              alt={
                selectedImage.image.alt_text ||
                selectedImage.album.title ||
                "Galeriebild"
              }
              className="max-h-[82vh] max-w-[90vw] rounded-lg object-contain"
            />

            <div className="mt-4 text-center">
              <h3 className="text-2xl font-bold text-white">
                {selectedImage.album.title}
              </h3>

              {selectedImage.album.description && (
                <p className="mt-2 text-white/80">
                  {selectedImage.album.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
