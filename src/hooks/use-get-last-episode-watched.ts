import { useState, useEffect } from "react";
import { IWatchedAnime } from "@/types/watched-anime";

export const useGetLastEpisodeWatched = (animeId: string) => {
  const [lastEpisodeWatched, setLastEpisodeWatched] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem("watched");
      const watchedDetails: Array<IWatchedAnime> = raw ? JSON.parse(raw) : [];

      const anime = watchedDetails.find(
        (watchedAnime) => watchedAnime.anime.id === animeId,
      );

      if (anime && anime.episodes.length > 0) {
        setLastEpisodeWatched(anime.episodes[anime.episodes.length - 1]);
      } else {
        setLastEpisodeWatched(null);
      }
    } catch {
      setLastEpisodeWatched(null);
    }
  }, [animeId]);

  return lastEpisodeWatched;
};
