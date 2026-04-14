"use client";
import { useEffect, useState } from "react";

export type RecentlyViewedAnime = {
  id: string;
  name: string;
  poster: string;
  viewedAt: number;
};

const KEY = "aniflix-recently-viewed";
const MAX = 12;

export function useRecentlyViewed() {
  const [recent, setRecent] = useState<RecentlyViewedAnime[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setRecent(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const addRecentlyViewed = (anime: Omit<RecentlyViewedAnime, "viewedAt">) => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(KEY);
      const existing: RecentlyViewedAnime[] = stored ? JSON.parse(stored) : [];
      // Remove duplicate
      const filtered = existing.filter((a) => a.id !== anime.id);
      const updated = [{ ...anime, viewedAt: Date.now() }, ...filtered].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(updated));
      setRecent(updated);
    } catch { /* ignore */ }
  };

  return { recent, addRecentlyViewed };
}
