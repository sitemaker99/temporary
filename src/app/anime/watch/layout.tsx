"use client";

import Loading from "@/app/loading";
import parse from "html-react-parser";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/container";
import AnimeCard from "@/components/anime-card";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/episode-playlist";
import Select, { ISelectOptions } from "@/components/common/select";
import {
  Ban,
  BookmarkCheck,
  CheckCheck,
  Hand,
  TvMinimalPlay,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import React, { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import AnimeCarousel from "@/components/anime-carousel";
import { IAnime } from "@/types/anime";
import useBookMarks from "@/hooks/use-get-bookmark";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import { IWatchedAnime } from "@/types/watched-anime";

type Props = {
  children: ReactNode;
};

const SelectOptions: ISelectOptions[] = [
  { value: "plan to watch", label: "Plan to Watch", icon: BookmarkCheck },
  { value: "watching", label: "Watching", icon: TvMinimalPlay },
  { value: "completed", label: "Completed", icon: CheckCheck },
  { value: "on hold", label: "On Hold", icon: Hand },
  { value: "dropped", label: "Dropped", icon: Ban },
];

// Inner component that safely uses useSearchParams (wrapped in Suspense below)
const LayoutInner = ({ children }: Props) => {
  const searchParams = useSearchParams();
  const { setAnime, setSelectedEpisode } = useAnimeStore();
  const router = useRouter();

  const currentAnimeId = useMemo(
    () => searchParams.get("anime"),
    [searchParams],
  );
  const episodeId = searchParams.get("episode");

  const [animeId, setAnimeId] = useState<string | null>(currentAnimeId);

  useEffect(() => {
    if (currentAnimeId !== animeId) {
      setAnimeId(currentAnimeId);
    }
    if (episodeId) {
      setSelectedEpisode(episodeId);
    }
  }, [currentAnimeId, episodeId, animeId, setSelectedEpisode]);

  const { data: anime, isLoading } = useGetAnimeDetails(animeId as string);

  useEffect(() => {
    if (anime) {
      setAnime(anime);
    }
  }, [anime, setAnime]);

  const { auth } = useAuthStore();
  const { bookmarks, createOrUpdateBookMark } = useBookMarks({
    animeID: currentAnimeId as string,
    page: 1,
    per_page: 1,
  });
  const [selected, setSelected] = useState("");

  // Auto-mark as watching when user opens an episode
  useEffect(() => {
    if (!anime || !episodeId || !auth) return;
    const animeInfo = anime?.anime?.info;
    if (!animeInfo?.id || !animeInfo?.name) return;
    if (!bookmarks || bookmarks.length === 0) {
      createOrUpdateBookMark(
        animeInfo.id,
        animeInfo.name,
        animeInfo.poster || "",
        "watching",
        false,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime, episodeId]);

  useEffect(() => {
    if (!animeId) {
      router.push(ROUTES.HOME);
    }
    //eslint-disable-next-line
  }, [animeId]);

  const handleSelect = async (value: string) => {
    if (!auth) {
      toast.error("Login to save your watchlist 🎌");
      return;
    }
    const previousSelected = selected;
    setSelected(value);
    try {
      await createOrUpdateBookMark(
        currentAnimeId as string,
        anime?.anime.info.name!,
        anime?.anime.info.poster!,
        value,
      );
    } catch (error) {
      console.log(error);
      setSelected(previousSelected);
      toast.error("Error adding to list", { style: { background: "red" } });
    }
  };

  const handleEpisodeSelect = React.useCallback(
    (episodeId: string) => {
      setSelectedEpisode(episodeId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("episode", episodeId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [setSelectedEpisode, router, searchParams]
  );

  const { data: episodes, isLoading: episodeLoading } = useGetAllEpisodes(
    animeId as string,
  );

  // Auto-redirect to the right episode when none is in the URL
  useEffect(() => {
    if (!animeId || episodeId) return; // Already have an episode param
    const epList: any[] = Array.isArray((episodes as any)?.episodes)
      ? (episodes as any).episodes
      : Array.isArray(episodes)
      ? episodes
      : [];
    if (epList.length === 0) return;

    let targetEpisodeId: string | null = null;

    try {
      const raw = localStorage.getItem("watched");
      const watchedDetails: IWatchedAnime[] = raw ? JSON.parse(raw) : [];
      const entry = watchedDetails.find((w) => w.anime.id === animeId);
      if (entry && entry.episodes.length > 0) {
        const lastWatched = entry.episodes[entry.episodes.length - 1];
        const stillExists = epList.find(
          (ep: any) => (ep.episodeId ?? ep.id) === lastWatched
        );
        targetEpisodeId = stillExists
          ? lastWatched
          : (epList[0].episodeId ?? epList[0].id);
      }
    } catch {
      // localStorage unreadable — fall through
    }

    if (!targetEpisodeId) {
      targetEpisodeId = epList[0].episodeId ?? epList[0].id;
    }

    setSelectedEpisode(targetEpisodeId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("episode", targetEpisodeId);
    router.replace(`?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes, animeId]);

  if (isLoading) return <Loading />;

  return (
    anime?.anime.info && (
      <Container className="mt-16 md:mt-[5.5rem] space-y-6 pb-20">
        {/* Player + Episode list grid */}
        <div className="grid lg:grid-cols-4 grid-cols-1 gap-y-4 gap-x-5 h-auto w-full items-start">
          <div className="lg:col-span-3 col-span-1 space-y-3">
            {children}
          </div>
          {episodes && (
            <div className="watch-sidebar hidden lg:block">
              <EpisodePlaylist
                animeId={animeId as string}
                title={
                  !!anime?.anime.info.name
                    ? anime.anime.info.name
                    : (anime?.anime.moreInfo.japanese as string)
                }
                subOrDub={anime?.anime.info.stats.episodes}
                episodes={episodes}
                isLoading={episodeLoading}
                bookmarks={bookmarks}
                onEpisodeSelect={handleEpisodeSelect}
              />
            </div>
          )}
        </div>

        {/* Anime info section */}
        <div className="flex md:flex-row flex-col gap-5 md:gap-6 pt-2 border-t border-white/5">
          <div className="shrink-0">
            <AnimeCard
              title={anime?.anime.info.name}
              poster={anime?.anime.info.poster}
              subTitle={anime?.anime.moreInfo.aired}
              displayDetails={false}
              className="!rounded-xl w-32 sm:w-36 md:w-40 !h-auto"
              href={ROUTES.ANIME_DETAILS + "/" + anime?.anime.info.id}
            />
          </div>
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl md:font-black font-extrabold z-[100] leading-tight">
                {anime?.anime.info.name}
              </h1>
              <Select
                placeholder="Add to list"
                value={bookmarks?.[0]?.status || selected}
                options={SelectOptions}
                onChange={handleSelect}
              />
            </div>
            <div className="text-sm text-gray-400 leading-6 line-clamp-4 md:line-clamp-none">
              {parse(anime?.anime.info.description as string)}
            </div>
          </div>
        </div>

        {!!anime?.relatedAnimes?.length && (
          <AnimeCarousel
            title={"Also Watch"}
            anime={anime?.relatedAnimes as IAnime[]}
          />
        )}
        {!!anime?.recommendedAnimes?.length && (
          <AnimeCarousel
            title={"Recommended"}
            anime={anime?.recommendedAnimes as IAnime[]}
          />
        )}
      </Container>
    )
  );
};

const Layout = ({ children }: Props) => {
  return (
    <Suspense fallback={<Loading />}>
      <LayoutInner>{children}</LayoutInner>
    </Suspense>
  );
};

export default Layout;
