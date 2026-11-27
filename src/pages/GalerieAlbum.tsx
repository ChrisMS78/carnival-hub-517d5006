import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { siteApi } from "@/lib/siteApi";
import { usePageBackground } from "@/hooks/usePageBackground";
import type { Tables } from "@/lib/siteTypes";

type Album = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;

export default function GalerieAlbum() {
  const { albumId } = useParams();
  const { backgroundUrl } = usePageBackground("galerie");

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isLightboxOpen = selectedIndex !== null;

  useEffect(() => {
    setSelectedIndex(null);
    fetchAlbum();
  }, [albumId]);

  const fetchAlbum = async () => {
    if (!albumId) {
      setIsLoading(false);
      return;
    }

    const { data: albumData, error: albumError } = await siteApi
      .from("gallery_albums")
      .select("*")
      .eq("id", albumId)
      .single();

    if (albumError) {
      console.error("Error fetching album:", albumError);
      setIsLoading(false);
      return;
    }

    const { data: imagesData, error: imagesError } = await siteApi
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

  // Touch navigation: a deliberate horizontal swipe changes exactly one image.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !event.isPrimary || images.length < 2) {
      if (event.pointerType === "touch" && !event.isPrimary) swipeStart.current = null;
      return;
    }
    swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    if (!start || start.id !== event.pointerId) return;
    swipeStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    if (dx < 0) showNextImage();
    else showPreviousImage();
  };

  // Keep the album at its original scroll position and support desktop keyboards.
  useEffect(() => {
    if (!isLightboxOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedIndex(null);
      } else if (images.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setSelectedIndex(index => index === null ? null : (index + direction + images.length) % images.length);
      } else if (event.key === "Tab") {
        const controls = Array.from(lightboxRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") || []);
        if (!controls.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      swipeStart.current = null;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isLightboxOpen, images.length]);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

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
                      src={image.thumbnail_url || image.image_url}
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
        <div ref={lightboxRef} role="dialog" aria-modal="true" aria-label="Album-Bildansicht" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4">
          <button
            type="button"
            ref={closeRef}
            onClick={() => setSelectedIndex(null)}
            className="absolute right-3 top-3 z-20 rounded-full bg-black/65 p-3 text-white transition hover:bg-white/20 sm:right-6 sm:top-6"
            aria-label="Bild schließen"
          >
            <X className="h-7 w-7" />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={showPreviousImage}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/65 p-2 text-white transition hover:bg-white/20 sm:left-6 sm:p-3"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="h-9 w-9" />
            </button>
          )}

          <div
            className="absolute inset-0 flex items-center justify-center px-2 pb-16 pt-16 sm:px-16"
            style={{ touchAction: "pan-y pinch-zoom" }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { swipeStart.current = null; }}
            onLostPointerCapture={() => { swipeStart.current = null; }}
          >
            <img
              src={selectedImage.image_url}
              alt={selectedImage.alt_text || album?.title || "Galeriebild"}
              draggable={false}
              className="max-h-full max-w-full select-none rounded-lg object-contain"
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={showNextImage}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/65 p-2 text-white transition hover:bg-white/20 sm:right-6 sm:p-3"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="h-9 w-9" />
            </button>
          )}

          <div className="pointer-events-none absolute bottom-4 z-10 text-center text-white sm:bottom-6">
            <div aria-live="polite" className="rounded-full bg-black/65 px-4 py-2 text-sm">{selectedIndex + 1} / {images.length}</div>
            {images.length > 1 && <p className="mt-1 text-xs sm:hidden">Nach links oder rechts wischen</p>}
          </div>
        </div>
      )}
    </div>
  );
}
