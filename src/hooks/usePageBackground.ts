import { useState, useEffect } from "react";
import { siteApi } from "@/lib/siteApi";

export function usePageBackground(pageKey: string) {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBackground = async () => {
      const { data, error } = await siteApi
        .from("page_backgrounds")
        .select("background_url")
        .eq("page_key", pageKey)
        .single();

      setBackgroundUrl(!error ? data?.background_url || null : null);
      setIsLoading(false);
    };

    fetchBackground();
  }, [pageKey]);

  return { backgroundUrl, isLoading };
}
