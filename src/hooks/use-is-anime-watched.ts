import { useState, useEffect } from "react";
import { IWatchedAnime } from "@/types/watched-anime";
import { WatchHistory } from "./use-get-bookmark";

export const useHasAnimeWatched = (
  animeId: string,
  episodeId?: string,
  watchedEpisodes?: WatchHistory[],
) => {
  const [hasWatchedAnime, setHasWatchedAnime] = useState(false);
  const [hasWatchedEpisode, setHasWatchedEpisode] = useState(false);

  useEffect(() => {
    // Guard: localStorage is only available in the browser
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem("watched");
      const watchedDetails: Array<IWatchedAnime> = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(watchedDetails)) {
        localStorage.removeItem("watched");
        return;
      }

      const anime = watchedDetails.find(
        (watchedAnime) => watchedAnime.anime.id === animeId,
      );

      if (anime) {
        setHasWatchedAnime(true);
        if (episodeId) {
          setHasWatchedEpisode(anime.episodes.includes(episodeId));
        }
      } else {
        setHasWatchedAnime(false);
        setHasWatchedEpisode(false);
      }
    } catch {
      // Corrupt localStorage — ignore
    }
  }, [animeId, episodeId]);

  // Firestore watch history takes priority over localStorage
  if (watchedEpisodes && watchedEpisodes.length > 0) {
    if (episodeId) {
      return {
        hasWatchedAnime: true,
        hasWatchedEpisode: watchedEpisodes.some((ep) => ep.episodeId === episodeId),
      };
    }
    return { hasWatchedAnime: true, hasWatchedEpisode: false };
  }

  return { hasWatchedAnime, hasWatchedEpisode };
};
