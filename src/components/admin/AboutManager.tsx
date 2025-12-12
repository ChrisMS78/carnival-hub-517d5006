import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, FileText, ArrowUp, ArrowDown, BookOpen, Download, Image } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type AboutContent = Tables<"about_content"> & { section_type?: string; image_url?: string | null };

interface AboutManagerProps {
  sectionType?: "story" | "download";
}

export default function AboutManager({ sectionType }: AboutManagerProps) {
  const [activeSection, setActiveSection] = useState<"story" | "download">(sectionType || "story");
  const [contents, setContents] = useState<AboutContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<AboutContent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    sort_order: 0,
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchContents();
  }, [activeSection]);

  const fetchContents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("about_content")
      .select("*")
      .eq("section_type", activeSection)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Inhalte");
    } else {
      setContents(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    let pdfUrl = editingContent?.pdf_url || null;
    let pdfName = editingContent?.pdf_name || null;
    let imageUrl = editingContent?.image_url || null;

    // Upload PDF if selected
    if (pdfFile) {
      const fileExt = pdfFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, pdfFile);

      if (uploadError) {
        toast.error("Fehler beim Hochladen der PDF");
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      pdfUrl = publicUrl;
      pdfName = pdfFile.name;
    }

    // Upload Image if selected
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `about/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, imageFile);

      if (uploadError) {
        toast.error("Fehler beim Hochladen des Bildes");
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      imageUrl = publicUrl;
    }

    const dataToSave = {
      ...formData,
      pdf_url: pdfUrl,
      pdf_name: pdfName,
      image_url: imageUrl,
      section_type: activeSection,
    };

    if (editingContent) {
      const { error } = await supabase
        .from("about_content")
        .update(dataToSave)
        .eq("id", editingContent.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
      } else {
        toast.success("Inhalt aktualisiert");
        fetchContents();
      }
    } else {
      const { error } = await supabase.from("about_content").insert([dataToSave]);

      if (error) {
        toast.error("Fehler beim Erstellen");
      } else {
        toast.success("Inhalt erstellt");
        fetchContents();
      }
    }

    resetForm();
    setIsUploading(false);
  };

  const handleDelete = async (content: AboutContent) => {
    if (!confirm("Möchten Sie diesen Inhalt wirklich löschen?")) return;

    // Delete PDF from storage if exists
    if (content.pdf_url) {
      const urlParts = content.pdf_url.split("/documents/");
      if (urlParts[1]) {
        await supabase.storage.from("documents").remove([urlParts[1]]);
      }
    }

    const { error } = await supabase.from("about_content").delete().eq("id", content.id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Inhalt gelöscht");
      fetchContents();
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    await Promise.all([
      supabase.from("about_content").update({ sort_order: index - 1 }).eq("id", contents[index].id),
      supabase.from("about_content").update({ sort_order: index }).eq("id", contents[index - 1].id),
    ]);
    
    fetchContents();
  };

  const handleMoveDown = async (index: number) => {
    if (index === contents.length - 1) return;
    
    await Promise.all([
      supabase.from("about_content").update({ sort_order: index + 1 }).eq("id", contents[index].id),
      supabase.from("about_content").update({ sort_order: index }).eq("id", contents[index + 1].id),
    ]);
    
    fetchContents();
  };

  const handleEdit = (content: AboutContent) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      content: content.content || "",
      sort_order: content.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContent(null);
    setFormData({ title: "", content: "", sort_order: 0 });
    setPdfFile(null);
    setImageFile(null);
    setIsDialogOpen(false);
  };

  const renderContentList = () => {
    if (isLoading) {
      return <div className="flex justify-center p-8">Laden...</div>;
    }

    if (contents.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine Inhalte vorhanden
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {contents.map((content, index) => (
          <Card key={content.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{content.title}</CardTitle>
                  <span className="text-xs text-muted-foreground">Reihenfolge: {content.sort_order}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleMoveUp(index)} disabled={index === 0}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleMoveDown(index)} disabled={index === contents.length - 1}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(content)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(content)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {content.image_url && (
                <div className="mb-2">
                  <img src={content.image_url} alt={content.title} className="w-full max-w-xs h-24 object-cover rounded" />
                </div>
              )}
              {content.content && (
                <p className="text-sm text-muted-foreground line-clamp-3">{content.content}</p>
              )}
              {content.pdf_url && (
                <a
                  href={content.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-sm text-primary hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  {content.pdf_name || "PDF herunterladen"}
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "story" | "download")}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="story" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Geschichte
            </TabsTrigger>
            <TabsTrigger value="download" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Downloads
            </TabsTrigger>
          </TabsList>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {activeSection === "story" ? "Neue Geschichte" : "Neuer Download"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingContent 
                    ? (activeSection === "story" ? "Geschichte bearbeiten" : "Download bearbeiten")
                    : (activeSection === "story" ? "Neue Geschichte" : "Neuer Download")
                  }
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="content">Inhalt</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="sort_order">Reihenfolge</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="image">Bild (optional)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  {editingContent?.image_url && !imageFile && (
                    <div className="mt-2">
                      <img src={editingContent.image_url} alt="Aktuelles Bild" className="w-32 h-20 object-cover rounded" />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="pdf">PDF-Dokument (optional)</Label>
                  <Input
                    id="pdf"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  {editingContent?.pdf_name && !pdfFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Aktuell: {editingContent.pdf_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? "Speichern..." : (editingContent ? "Speichern" : "Erstellen")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="story" className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Geschichte & Texte</h3>
          {renderContentList()}
        </TabsContent>

        <TabsContent value="download" className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Downloads & Dokumente</h3>
          {renderContentList()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
