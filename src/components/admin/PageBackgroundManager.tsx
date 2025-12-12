import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PageBackground {
  id: string;
  page_key: string;
  page_label: string;
  background_url: string | null;
}

export default function PageBackgroundManager() {
  const [pages, setPages] = useState<PageBackground[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPage, setUploadingPage] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from("page_backgrounds")
      .select("*")
      .order("page_label");

    if (error) {
      toast.error("Fehler beim Laden der Seiten");
    } else {
      setPages(data || []);
    }
    setIsLoading(false);
  };

  const handleUpload = async (pageKey: string, file: File) => {
    setUploadingPage(pageKey);

    const fileExt = file.name.split(".").pop();
    const fileName = `backgrounds/${pageKey}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Fehler beim Hochladen");
      setUploadingPage(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("gallery")
      .getPublicUrl(fileName);

    const { error } = await supabase
      .from("page_backgrounds")
      .update({ background_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("page_key", pageKey);

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Hintergrundbild gespeichert");
      fetchPages();
    }
    setUploadingPage(null);
  };

  const handleRemove = async (page: PageBackground) => {
    if (!confirm("Möchten Sie das Hintergrundbild entfernen?")) return;

    // Delete from storage if exists
    if (page.background_url) {
      const urlParts = page.background_url.split("/gallery/");
      if (urlParts[1]) {
        await supabase.storage.from("gallery").remove([urlParts[1]]);
      }
    }

    const { error } = await supabase
      .from("page_backgrounds")
      .update({ background_url: null, updated_at: new Date().toISOString() })
      .eq("page_key", page.page_key);

    if (error) {
      toast.error("Fehler beim Entfernen");
    } else {
      toast.success("Hintergrundbild entfernt");
      fetchPages();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Seiten-Hintergrundbilder</h2>
      <p className="text-muted-foreground">
        Hier können Sie für jede Seite ein optionales Hintergrundbild festlegen.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="w-5 h-5" />
                {page.page_label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {page.background_url ? (
                <div className="relative">
                  <img
                    src={page.background_url}
                    alt={`Hintergrund ${page.page_label}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemove(page)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                  Kein Hintergrundbild
                </div>
              )}

              <div>
                <Label htmlFor={`upload-${page.page_key}`} className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="w-4 h-4" />
                    {uploadingPage === page.page_key ? "Hochladen..." : "Bild hochladen"}
                  </div>
                </Label>
                <Input
                  id={`upload-${page.page_key}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(page.page_key, file);
                  }}
                  disabled={uploadingPage === page.page_key}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
