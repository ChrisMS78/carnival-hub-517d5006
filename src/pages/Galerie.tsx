import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Images, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { siteApi } from "@/lib/siteApi";
import { usePageBackground } from "@/hooks/usePageBackground";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Tables } from "@/lib/siteTypes";

type Album = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;

interface AlbumWithPreview extends Album {
  previewImage: GalleryImage | null;
}

export default function Galerie() {
  const [albums, setAlbums] = useState<AlbumWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { backgroundUrl } = usePageBackground("galerie");

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    const { data: albumsData, error: albumsError } = await siteApi
      .from("gallery_albums")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("event_date", { ascending: false });

    if (albumsError) {
      console.error("Error fetching albums:", albumsError);
      setIsLoading(false);
      return;
    }

    const albumsWithPreviews: AlbumWithPreview[] = await Promise.all(
      (albumsData || []).map(async (album) => {
        const { data: imagesData, error: imagesError } = await siteApi
          .from("gallery_images")
          .select("*")
          .eq("album_id", album.id)
          .order("sort_order", { ascending: true })
          .limit(1);

        if (imagesError) {
          console.error("Error fetching gallery images:", imagesError);
        }

        return {
          ...album,
          previewImage: imagesData?.[0] ?? null,
        };
      })
    );

    setAlbums(albumsWithPreviews);
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {albums.map((album) => (
              <Link
                key={album.id}
                to={`/galerie/${album.id}`}
                state={{ scrollToTop: true }}
                aria-label={`Album ${album.title} öffnen`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {album.previewImage ? (
                    <img
                      src={album.previewImage.thumbnail_url || album.previewImage.image_url}
                      alt={album.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Images className="h-12 w-12" aria-hidden="true" />
                      <span className="text-sm">Kein Vorschaubild vorhanden</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="break-words text-xl font-display font-bold text-foreground transition group-hover:text-primary">
                    {album.title}
                  </h2>
                  {album.event_date && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(album.event_date), "MMMM yyyy", { locale: de })}
                    </p>
                  )}
                  {album.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{album.description}</p>
                  )}
                  <span className="mt-auto flex items-center gap-2 pt-3 font-semibold text-primary">
                    Album öffnen <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />

    </div>
  );
}
