import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type SettingsMap = Record<string, string>;

export function useSiteSettings(keys?: string[]) {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      let query = supabase.from("site_settings").select("key, value");
      
      if (keys && keys.length > 0) {
        query = query.in("key", keys);
      }

      const { data } = await query;

      if (data) {
        const map: SettingsMap = {};
        data.forEach((s) => {
          map[s.key] = s.value || "";
        });
        setSettings(map);
      }
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  return { settings, isLoading };
}
