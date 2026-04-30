import { useEffect, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Image,
  Upload,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Album = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;

export default function GalleryManager() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlbumDialogOpen, setIsAlbumDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [albumFormData, setAlbumFormData] = useState({
    title: "",
    description: "",
    event_date: "",
  });

  useEffect(() => {
    fetchAlbums();
  }, []);

  useEffect(() => {
    if (selectedAlbum) {
      fetchImages(selectedAlbum.id);
    }
  }, [selectedAlbum]);

  const fetchAlbums = async () => {
    const { data, error } = await supabase
      .from("gallery_albums")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("event_date", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Alben");
    } else {
      setAlbums(data || []);
    }

    setIsLoading(false);
  };

  const handleAlbumMoveUp = async (index: number, event: MouseEvent) => {
    event.stopPropagation();
    if (index === 0) return;

    await Promise.all([
      supabase
        .from("gallery_albums")
        .update({ sort_order: index - 1 })
        .eq("id", albums[index].id),
      supabase
        .from("gallery_albums")
        .update({ sort_order: index })
        .eq("id", albums[index - 1].id),
    ]);

    fetchAlbums();
  };

  const handleAlbumMoveDown = async (index: number, event: MouseEvent) => {
    event.stopPropagation();
    if (index === albums.length - 1) return;

    await Promise.all([
      supabase
        .from("gallery_albums")
        .update({ sort_order: index + 1 })
        .eq("id", albums[index].id),
      supabase
        .from("gallery_albums")
        .update({ sort_order: index })
        .eq("id", albums[index + 1].id),
    ]);

    fetchAlbums();
  };

  const fetchImages = async (albumId: string) => {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Bilder");
    } else {
      setImages(data || []);
    }
  };

  const handleAlbumSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const missingFields = [];

    if (!albumFormData.title.trim()) {
      missingFields.push("Titel");
    }

    if (!albumFormData.description.trim()) {
      missingFields.push("Beschreibung");
    }

    if (!albumFormData.event_date) {
      missingFields.push("Datum");
    }

    if (missingFields.length > 0) {
      toast.error(
        `Bitte füllen Sie folgende Pflichtfelder aus: ${missingFields.join(", ")}`
      );
      return;
    }

    if (editingAlbum) {
      const { error } = await supabase
        .from("gallery_albums")
        .update(albumFormData)
        .eq("id", editingAlbum.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
      } else {
        toast.success("Album aktualisiert");
        fetchAlbums();
      }
    } else {
      const { error } = await supabase
        .from("gallery_albums")
        .insert([{ ...albumFormData, sort_order: -1 }]);

      if (error) {
        toast.error("Fehler beim Erstellen");
      } else {
        toast.success("Album erstellt");

        const { data: allAlbums } = await supabase
          .from("gallery_albums")
          .select("id")
          .order("sort_order", { ascending: true })
          .order("event_date", { ascending: false });

        if (allAlbums) {
          await Promise.all(
            allAlbums.map((album, index) =>
              supabase
                .from("gallery_albums")
                .update({ sort_order: index })
                .eq("id", album.id)
            )
          );
        }

        fetchAlbums();
      }
    }

    resetAlbumForm();
  };

  const handleAlbumDelete = async (id: string) => {
    if (
      !confirm(
        "Möchten Sie dieses Album wirklich löschen? Alle Bilder werden ebenfalls gelöscht."
      )
    ) {
      return;
    }

    const { error } = await supabase.from("gallery_albums").delete().eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Album gelöscht");
      if (selectedAlbum?.id === id) {
        setSelectedAlbum(null);
        setImages([]);
      }
      fetchAlbums();
    }
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setAlbumFormData({
      title: album.title,
      description: album.description || "",
      event_date: album.event_date || "",
    });
    setIsAlbumDialogOpen(true);
  };

  const resetAlbumForm = () => {
    setEditingAlbum(null);
    setAlbumFormData({ title: "", description: "", event_date: "" });
    setIsAlbumDialogOpen(false);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedAlbum || !event.target.files?.length) return;

    setIsUploading(true);
    const files = Array.from(event.target.files);

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedAlbum.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`Fehler beim Hochladen von ${file.name}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("gallery").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("gallery_images").insert([
        {
          album_id: selectedAlbum.id,
          image_url: publicUrl,
          sort_order: images.length,
        },
      ]);

      if (insertError) {
        toast.error(`Fehler beim Speichern von ${file.name}`);
      }
    }

    toast.success("Bilder hochgeladen");
    fetchImages(selectedAlbum.id);
    setIsUploading(false);
    event.target.value = "";
  };

  const handleImageDelete = async (image: GalleryImage) => {
    if (!confirm("Möchten Sie dieses Bild wirklich löschen?")) return;

    const urlParts = image.image_url.split("/gallery/");
    if (urlParts[1]) {
      await supabase.storage.from("gallery").remove([urlParts[1]]);
    }

    const { error } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", image.id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Bild gelöscht");
      if (selectedAlbum) fetchImages(selectedAlbum.id);
    }
  };

  const saveImageOrder = async (orderedImages: GalleryImage[]) => {
    setImages(orderedImages);

    const updateResults = await Promise.all(
      orderedImages.map((image, index) =>
        supabase
          .from("gallery_images")
          .update({ sort_order: index })
          .eq("id", image.id)
      )
    );

    const hasError = updateResults.some((result) => result.error);

    if (hasError) {
      toast.error("Fehler beim Speichern der Bild-Reihenfolge");
      if (selectedAlbum) {
        fetchImages(selectedAlbum.id);
      }
      return;
    }

    toast.success("Bild-Reihenfolge gespeichert");
  };

  const moveImageToIndex = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (toIndex < 0 || toIndex >= images.length) return;

    const reorderedImages = [...images];
    const [movedImage] = reorderedImages.splice(fromIndex, 1);
    reorderedImages.splice(toIndex, 0, movedImage);

    await saveImageOrder(reorderedImages);
  };

  const handleImageMoveUp = async (index: number) => {
    await moveImageToIndex(index, index - 1);
  };

  const handleImageMoveDown = async (index: number) => {
    await moveImageToIndex(index, index + 1);
  };

  const handleImageMoveToFirst = async (index: number) => {
    await moveImageToIndex(index, 0);
  };

  const handleImageDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleImageDrop = async (targetIndex: number) => {
    if (draggedImageIndex === null) return;

    await moveImageToIndex(draggedImageIndex, targetIndex);
    setDraggedImageIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageIndex(null);
  };

  if (isLoading) {
    return <div>Laden...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Galerie verwalten</h2>

        <Dialog
          open={isAlbumDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetAlbumForm();
            else setIsAlbumDialogOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neues Album
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAlbum ? "Album bearbeiten" : "Neues Album"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAlbumSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={albumFormData.title}
                  onChange={(event) =>
                    setAlbumFormData({
                      ...albumFormData,
                      title: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={albumFormData.description}
                  onChange={(event) =>
                    setAlbumFormData({
                      ...albumFormData,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="event_date">Datum</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={albumFormData.event_date}
                  onChange={(event) =>
                    setAlbumFormData({
                      ...albumFormData,
                      event_date: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetAlbumForm}>
                  Abbrechen
                </Button>
                <Button type="submit">
                  {editingAlbum ? "Speichern" : "Erstellen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4">
          <h3 className="font-semibold">Alben</h3>

          {albums.length === 0 ? (
            <Card>
              <CardContent className="py-4 text-center text-muted-foreground">
                Keine Alben vorhanden
              </CardContent>
            </Card>
          ) : (
            albums.map((album, index) => (
              <Card
                key={album.id}
                className={`cursor-pointer transition-colors ${
                  selectedAlbum?.id === album.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedAlbum(album)}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{album.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => handleAlbumMoveUp(index, event)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => handleAlbumMoveDown(index, event)}
                        disabled={index === albums.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditAlbum(album);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAlbumDelete(album.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold">
              {selectedAlbum ? `Bilder: ${selectedAlbum.title}` : "Album auswählen"}
            </h3>

            {selectedAlbum && (
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploading}
                />
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <Button asChild disabled={isUploading}>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploading ? "Hochladen..." : "Bilder hochladen"}
                    </span>
                  </Button>
                </Label>
              </div>
            )}
          </div>

          {selectedAlbum ? (
            images.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Image className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  Keine Bilder in diesem Album
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => handleImageDragStart(index)}
                    onDragOver={handleImageDragOver}
                    onDrop={() => handleImageDrop(index)}
                    onDragEnd={handleImageDragEnd}
                    className={`group relative aspect-square cursor-move ${
                      draggedImageIndex === index ? "opacity-50" : ""
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.caption || ""}
                      className="h-full w-full rounded-lg object-cover"
                    />

                    <div className="absolute inset-0 rounded-lg bg-black/0 transition-colors group-hover:bg-black/35" />

                    <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="rounded-md bg-black/60 p-2 text-white">
                        <GripVertical className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        title="Als erstes Bild setzen"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleImageMoveToFirst(index);
                        }}
                        disabled={index === 0}
                      >
                        <ChevronsUp className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        title="Ein Bild nach vorne"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleImageMoveUp(index);
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        title="Ein Bild nach hinten"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleImageMoveDown(index);
                        }}
                        disabled={index === images.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        title="Bild löschen"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleImageDelete(image);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Position {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Wählen Sie ein Album aus, um Bilder zu verwalten
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
