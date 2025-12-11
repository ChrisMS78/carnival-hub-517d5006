import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image, Upload } from "lucide-react";
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
      .order("event_date", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Alben");
    } else {
      setAlbums(data || []);
    }
    setIsLoading(false);
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

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { error } = await supabase.from("gallery_albums").insert([albumFormData]);

      if (error) {
        toast.error("Fehler beim Erstellen");
      } else {
        toast.success("Album erstellt");
        fetchAlbums();
      }
    }

    resetAlbumForm();
  };

  const handleAlbumDelete = async (id: string) => {
    if (!confirm("Möchten Sie dieses Album wirklich löschen? Alle Bilder werden ebenfalls gelöscht.")) return;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAlbum || !e.target.files?.length) return;

    setIsUploading(true);
    const files = Array.from(e.target.files);

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedAlbum.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`Fehler beim Hochladen von ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

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
  };

  const handleImageDelete = async (image: GalleryImage) => {
    if (!confirm("Möchten Sie dieses Bild wirklich löschen?")) return;

    // Extract file path from URL
    const urlParts = image.image_url.split("/gallery/");
    if (urlParts[1]) {
      await supabase.storage.from("gallery").remove([urlParts[1]]);
    }

    const { error } = await supabase.from("gallery_images").delete().eq("id", image.id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Bild gelöscht");
      if (selectedAlbum) fetchImages(selectedAlbum.id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Galerie verwalten</h2>
        <Dialog open={isAlbumDialogOpen} onOpenChange={(open) => { if (!open) resetAlbumForm(); else setIsAlbumDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neues Album
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAlbum ? "Album bearbeiten" : "Neues Album"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAlbumSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={albumFormData.title}
                  onChange={(e) => setAlbumFormData({ ...albumFormData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={albumFormData.description}
                  onChange={(e) => setAlbumFormData({ ...albumFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="event_date">Datum</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={albumFormData.event_date}
                  onChange={(e) => setAlbumFormData({ ...albumFormData, event_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
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

      <div className="grid md:grid-cols-3 gap-6">
        {/* Albums List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Alben</h3>
          {albums.length === 0 ? (
            <Card>
              <CardContent className="py-4 text-center text-muted-foreground">
                Keine Alben vorhanden
              </CardContent>
            </Card>
          ) : (
            albums.map((album) => (
              <Card
                key={album.id}
                className={`cursor-pointer transition-colors ${selectedAlbum?.id === album.id ? "border-primary" : ""}`}
                onClick={() => setSelectedAlbum(album)}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{album.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditAlbum(album); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAlbumDelete(album.id); }}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Images Grid */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
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
                      <Upload className="w-4 h-4 mr-2" />
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
                  <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Keine Bilder in diesem Album
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="relative group aspect-square">
                    <img
                      src={image.image_url}
                      alt={image.caption || ""}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleImageDelete(image)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
