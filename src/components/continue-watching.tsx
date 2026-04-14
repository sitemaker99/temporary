"use client";

import React, { useEffect, useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import BlurFade from "./ui/blur-fade";
import { IAnime } from "@/types/anime";
import { History } from "lucide-react";
import useBookMarks, { WatchHistory } from "@/hooks/use-get-bookmark";
import { useAuthStore } from "@/store/auth-store";

type Props = {
  loading: boolean;
};

interface WatchedAnime extends Partial<IAnime> {
  id: string;
  name: string;
  poster: string;
  episode: WatchHistory | string | null;
}

const ContinueWatching = (props: Props) => {
  const [anime, setAnime] = useState<WatchedAnime[] | null>(null);
  const { auth } = useAuthStore();

  const { bookmarks, isLoading: bookmarksLoading } = useBookMarks({
    page: 1,
    per_page: 14,
    status: "watching",
    populate: !!auth,
  });

  useEffect(() => {
    if (!auth) {
      // Guest — read from localStorage
      if (typeof window === "undefined") return;
      try {
        const storedData = localStorage.getItem("watched");
        const watchedAnimes: {
          anime: { id: string; title: string; poster: string };
          episodes: string[];
        }[] = storedData ? JSON.parse(storedData) : [];

        if (!Array.isArray(watchedAnimes)) {
          localStorage.removeItem("watched");
          return;
        }

        const animes = [...watchedAnimes].reverse().map((item) => ({
          id: item.anime.id,
          name: item.anime.title,
          poster: item.anime.poster,
          episode: item.episodes[item.episodes.length - 1] ?? null,
        }));
        setAnime(animes);
      } catch {
        setAnime(null);
      }
      return;
    }

    // Logged in — use Firestore bookmarks
    // We show the anime even without a specific episode record — link to first episode
    if (bookmarks && bookmarks.length > 0) {
      const animes = bookmarks.map((bm) => {
        const lastWatched = bm.expand?.watchHistory?.length
          ? [...bm.expand.watchHistory].sort(
              (a, b) => b.episodeNumber - a.episodeNumber
            )[0]
          : null;

        return {
          id: bm.animeId,
          name: bm.animeTitle,
          poster: bm.thumbnail,
          // Always have a valid href — go to watch page even without episode record
          episode: lastWatched ?? bm.animeId,
        };
      });
      setAnime(animes);
    } else if (!bookmarksLoading) {
      setAnime(null);
    }
  }, [auth, bookmarks, bookmarksLoading]);

  if (props.loading || (auth && bookmarksLoading)) return <LoadingSkeleton />;
  if (!anime || anime.length === 0) return <></>;

  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
      <div className="flex items-center gap-2">
        <History />
        <h5 className="text-xl sm:text-2xl font-bold section-header">Continue Watching</h5>
      </div>
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5 content-center">
        {anime.map(
          (ani, idx) =>
            ani.episode && (
              <BlurFade key={ani.id + idx} delay={idx * 0.05} inView>
                <AnimeCard
                  title={ani.name}
                  poster={ani.poster}
                  className="self-center justify-self-center"
                  href={
                    typeof ani.episode !== "string"
                      ? `${ROUTES.WATCH}?anime=${ani.id}&episode=${ani.episode.episodeId}`
                      : `${ROUTES.WATCH}?anime=${ani.id}`
                  }
                  watchDetail={
                    typeof ani.episode !== "string" ? ani.episode : null
                  }
                />
              </BlurFade>
            )
        )}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
    <div className="h-10 w-[15.625rem] animate-pulse bg-slate-700 rounded"></div>
    <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5 content-center">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl h-[15.625rem] min-w-[10.625rem] max-w-[12.625rem] md:h-[18.75rem] md:max-w-[12.5rem] animate-pulse bg-slate-700"
        />
      ))}
    </div>
  </Container>
);

export default ContinueWatching;
