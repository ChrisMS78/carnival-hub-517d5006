import { useState, useEffect } from "react";
import { siteApi } from "@/lib/siteApi";
import { LastEdit } from "./LastEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/siteTypes";

type SiteSetting = Tables<"site_settings">;

const categoryLabels: Record<string, string> = {
  hero: "Startseite (Hero)",
  about: "Über uns",
  contact: "Kontakt",
  impressum: "Impressum",
};

export default function SiteSettingsManager({ imprint = false }: { imprint?: boolean }) {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await siteApi
      .adminFrom("site_settings")
      .select("*")
      .in("category", imprint ? ["impressum"] : ["hero", "about", "contact"])
      .order("category")
      .order("key");

    if (error) {
      toast.error("Fehler beim Laden der Einstellungen");
    } else {
      const order = ["imprint_name","imprint_address","imprint_board","imprint_email","imprint_phone","imprint_court","imprint_register","imprint_vat","imprint_economic_id","imprint_editor","imprint_editor_address","imprint_extra"];
      setSettings(imprint ? [...(data || [])].sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key)) : (data || []).filter(s=>!["contact_address","contact_email","contact_phone"].includes(s.key)));
      // Initialize edited values with current values
      const values: Record<string, string> = {};
      data?.forEach((s) => {
        values[s.key] = s.value || "";
      });
      setEditedValues(values);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Update all changed settings
      const updates = settings.filter((setting) => (setting.value || "") !== editedValues[setting.key]).map((setting) =>
        siteApi
          .adminFrom("site_settings")
          .update({ value: editedValues[setting.key], updated_at: new Date().toISOString() })
          .eq("key", setting.key)
      );

      const results = await Promise.all(updates);
      if (results.some((result) => result.error)) toast.error("Einige Einstellungen konnten nicht gespeichert werden.");
      else toast.success(updates.length ? "Einstellungen gespeichert" : "Keine Änderungen vorhanden");
      fetchSettings();
    } catch {
      toast.error("Fehler beim Speichern");
    }

    setIsSaving(false);
  };

  const categories = [...new Set(settings.map((s) => s.category))];

  const isMultiline = (key: string) => key.includes("address") || key.includes("content") || key === "imprint_board" || key === "imprint_extra";
  const isCheckbox = (key: string) => key.includes("show_");

  if (isLoading) {
    return <div className="flex justify-center p-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{imprint ? "Impressum bearbeiten" : "Seiteneinstellungen"}</h2>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Speichern..." : "Alle speichern"}
        </Button>
      </div>

      {imprint && <p className="text-sm text-muted-foreground">Bitte vollständigen Vereinsnamen, ladungsfähige Anschrift, vertretungsberechtigten Vorstand, Registergericht und Registernummer sowie Kontaktmöglichkeiten prüfen. Optionale Angaben nur bei Zutreffen ausfüllen.</p>}
      <Tabs defaultValue={categories[0]} className="space-y-4">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {categoryLabels[cat] || cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle>{categoryLabels[category] || category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings
                  .filter((s) => s.category === category)
                  .map((setting) => (
                    <div key={setting.key}>
                      {isCheckbox(setting.key) ? (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={setting.key}
                            checked={editedValues[setting.key] === "true"}
                            onCheckedChange={(checked) =>
                              setEditedValues({ ...editedValues, [setting.key]: checked ? "true" : "false" })
                            }
                          />
                          <Label htmlFor={setting.key}>{setting.label}</Label>
                        </div>
                      ) : (
                        <>
                          <Label htmlFor={setting.key}>{setting.label}</Label>
                          {isMultiline(setting.key) ? (
                            <Textarea
                              id={setting.key}
                              value={editedValues[setting.key] || ""}
                              onChange={(e) =>
                                setEditedValues({ ...editedValues, [setting.key]: e.target.value })
                              }
                              className="mt-2"
                              rows={3}
                            />
                          ) : (
                            <Input
                              id={setting.key}
                              value={editedValues[setting.key] || ""}
                          onChange={(e) =>
                            setEditedValues({ ...editedValues, [setting.key]: e.target.value })
                          }
                              className="mt-2"
                            />
                          )}
                        </>
                      )}
                      <LastEdit record={setting} />
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
