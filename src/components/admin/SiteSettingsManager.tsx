import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type SiteSetting = Tables<"site_settings">;

const categoryLabels: Record<string, string> = {
  hero: "Startseite (Hero)",
  about: "Über uns",
  contact: "Kontakt",
};

export default function SiteSettingsManager() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .order("category")
      .order("key");

    if (error) {
      toast.error("Fehler beim Laden der Einstellungen");
    } else {
      setSettings(data || []);
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
      const updates = settings.map((setting) =>
        supabase
          .from("site_settings")
          .update({ value: editedValues[setting.key], updated_at: new Date().toISOString() })
          .eq("key", setting.key)
      );

      await Promise.all(updates);
      toast.success("Einstellungen gespeichert");
      fetchSettings();
    } catch {
      toast.error("Fehler beim Speichern");
    }

    setIsSaving(false);
  };

  const categories = [...new Set(settings.map((s) => s.category))];

  const isMultiline = (key: string) => key.includes("address") || key.includes("content");

  if (isLoading) {
    return <div className="flex justify-center p-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Seiteneinstellungen</h2>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Speichern..." : "Alle speichern"}
        </Button>
      </div>

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
