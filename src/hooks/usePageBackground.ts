import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePageBackground(pageKey: string) {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBackground = async () => {
      const { data, error } = await supabase
        .from("page_backgrounds")
        .select("background_url")
        .eq("page_key", pageKey)
        .single();

      if (!error && data?.background_url) {
        setBackgroundUrl(data.background_url);
      }
      setIsLoading(false);
    };

    fetchBackground();
  }, [pageKey]);

  return { backgroundUrl, isLoading };
}
