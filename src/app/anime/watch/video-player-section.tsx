"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAnimeStore } from "@/store/anime-store";
import { useGetEpisodeServers } from "@/query/get-episode-servers";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import { useSearchParams, useRouter } from "next/navigation";
import { UnifiedPlayer } from "@/components/watch/video/UnifiedPlayer";
import { MediaSource } from "@/components/watch/video/MediaSource";
import { EpisodeList } from "@/components/watch/EpisodeList";
import { useCountdown } from "@/hooks/useCountdown";
import { IWatchedAnime } from "@/types/watched-anime";

// ─── URL helpers ──────────────────────────────────────────────────────────────
//
// The aniwatch scraper returns episodeIds in the format:
//   "hells-paradise-season-2-20405?ep=162597"
//   i.e.  "<anime-slug>?ep=<number>"
//
// Putting that raw value in the URL query string produces the ugly repeated slug:
//   ?anime=hells-paradise-season-2-20405&episode=hells-paradise-season-2-20405%3Fep%3D162597
//
// Fix: store ONLY the numeric ep value in the URL (?episode=162597), and
// reconstruct the full internal ID when we need to call the API.

/** Extract the ep number string from a full episodeId, e.g. "slug?ep=162597" → "162597" */
function toUrlEpisodeParam(fullEpisodeId: string): string {
  const match = fullEpisodeId.match(/[?&]ep=(\d+)/);
  return match ? match[1] : fullEpisodeId; // fallback: use as-is if format differs
}

/**
 * Reconstruct the full episodeId the API expects from the URL param + anime slug.
 * "162597" + "hells-paradise-season-2-20405" → "hells-paradise-season-2-20405?ep=162597"
 * If the param already contains "?" (old-style full ID) it is returned unchanged.
 */
function fromUrlEpisodeParam(param: string, animeId: string): string {
  if (param.includes("?") || param.includes("%3F")) return decodeURIComponent(param);
  // Pure numeric ep number — reconstruct
  if (/^\d+$/.test(param) && animeId) return `${animeId}?ep=${param}`;
  return param; // already a full id or unknown format
}
// ─────────────────────────────────────────────────────────────────────────────

const VideoPlayerSection = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeParam = searchParams.get("episode");
  const { selectedEpisode, anime, setSelectedEpisode } = useAnimeStore();

  const animeId = anime?.anime?.info?.id ?? "";

  // Reconstruct the full internal episode ID from the clean URL param
  const fullEpisodeId = episodeParam
    ? fromUrlEpisodeParam(episodeParam, animeId)
    : selectedEpisode;

  const { data: serversData } = useGetEpisodeServers(fullEpisodeId);
  const { data: allEpisodes } = useGetAllEpisodes(animeId);

  const [serverName, setServerName] = useState<string>("hd-1");
  const [language, setLanguage] = useState<string>("sub");
  const [downloadLink, setDownloadLink] = useState<string>("");
  const [retryKey, setRetryKey] = useState<number>(0);

  const handleServerSelect = useCallback((_server: string, _lang: string) => {
    setRetryKey((k) => k + 1);
  }, []);

  const animeInfo = (anime as any)?.anime;
  const nextAiringTime = animeInfo?.nextAiringEpisode?.airingTime
    ? animeInfo.nextAiringEpisode.airingTime * 1000
    : null;
  const nextEpisodeNumber = animeInfo?.nextAiringEpisode?.episode;
  const countdown = useCountdown(nextAiringTime);

  const episodes: any[] = Array.isArray((allEpisodes as any)?.episodes)
    ? (allEpisodes as any).episodes
    : Array.isArray(allEpisodes)
    ? allEpisodes
    : [];

  /**
   * Navigate to an episode. Accepts the full internal episodeId (from the API)
   * and writes only the clean ep number to the URL.
   */
  const goToEpisode = useCallback(
    (episodeId: string) => {
      setSelectedEpisode(episodeId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("episode", toUrlEpisodeParam(episodeId));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [setSelectedEpisode, router, searchParams]
  );

  // Auto-select episode: resume for returning users, ep1 for new users
  useEffect(() => {
    if (!animeId || episodes.length === 0) return;
    // If an episode is already selected via URL param, sync store and bail
    if (episodeParam) {
      setSelectedEpisode(fromUrlEpisodeParam(episodeParam, animeId));
      return;
    }

    let targetEpisodeId: string | null = null;

    try {
      const raw = localStorage.getItem("watched");
      const watchedDetails: Array<IWatchedAnime> = raw ? JSON.parse(raw) : [];
      const entry = watchedDetails.find((w) => w.anime.id === animeId);
      if (entry && entry.episodes.length > 0) {
        const lastWatched = entry.episodes[entry.episodes.length - 1];
        const stillExists = episodes.find(
          (ep: any) => (ep.episodeId ?? ep.id) === lastWatched
        );
        targetEpisodeId = stillExists
          ? lastWatched
          : (episodes[0].episodeId ?? episodes[0].id);
      }
    } catch {
      // localStorage unreadable — fall through to ep1
    }

    if (!targetEpisodeId) {
      targetEpisodeId = episodes[0].episodeId ?? episodes[0].id;
    }

    goToEpisode(targetEpisodeId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes.length, animeId]);

  // Keep the store in sync whenever the URL param changes (e.g. browser back/forward)
  useEffect(() => {
    if (episodeParam && animeId) {
      setSelectedEpisode(fromUrlEpisodeParam(episodeParam, animeId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeParam, animeId]);

  const currentEpisodeNumber =
    episodes.findIndex(
      (ep: any) => ep.episodeId === fullEpisodeId || ep.id === fullEpisodeId
    ) + 1;

  const goToPreviousEpisode = useCallback(() => {
    const idx = episodes.findIndex(
      (ep: any) => (ep.episodeId ?? ep.id) === fullEpisodeId
    );
    if (idx > 0) goToEpisode(episodes[idx - 1].episodeId ?? episodes[idx - 1].id);
  }, [episodes, fullEpisodeId, goToEpisode]);

  const goToNextEpisode = useCallback(() => {
    const idx = episodes.findIndex(
      (ep: any) => (ep.episodeId ?? ep.id) === fullEpisodeId
    );
    if (idx >= 0 && idx < episodes.length - 1)
      goToEpisode(episodes[idx + 1].episodeId ?? episodes[idx + 1].id);
  }, [episodes, fullEpisodeId, goToEpisode]);

  const handleEpisodeEnd = useCallback(async () => {
    goToNextEpisode();
  }, [goToNextEpisode]);

  const updateDownloadLink = useCallback((link: string) => {
    setDownloadLink(link);
  }, []);

  if (!episodeParam || !serversData) {
    return (
      <div className="flex items-center justify-center w-full aspect-video bg-slate-900 rounded-lg animate-pulse">
        <span className="text-slate-400 text-sm">Loading episode…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <UnifiedPlayer
        episodeId={fullEpisodeId}
        animeId={animeId}
        banner={anime?.anime?.info?.poster}
        malId={undefined}
        updateDownloadLink={updateDownloadLink}
        onEpisodeEnd={handleEpisodeEnd}
        onPrevEpisode={goToPreviousEpisode}
        onNextEpisode={goToNextEpisode}
        animeTitle={anime?.anime?.info?.name}
        episodeNumber={
          currentEpisodeNumber > 0 ? String(currentEpisodeNumber) : "1"
        }
        serverName={serverName}
        language={language}
        defaultMode="advanced"
        retryKey={retryKey}
      />

      <MediaSource
        serverName={serverName}
        setServerName={setServerName}
        language={language}
        setLanguage={setLanguage}
        episodeId={
          currentEpisodeNumber > 0 ? String(currentEpisodeNumber) : undefined
        }
        airingTime={
          animeInfo?.status === "Currently Airing" ||
          animeInfo?.status === "RELEASING"
            ? countdown
            : undefined
        }
        nextEpisodenumber={nextEpisodeNumber}
        onServerSelect={handleServerSelect}
        serversData={serversData}
      />

      {episodes.length > 0 && (
        <div className="block lg:hidden mt-2">
          <EpisodeList
            animeId={animeId}
            episodes={episodes.map((ep: any) => ({
              id: ep.episodeId ?? ep.id,
              title: ep.title ?? null,
              number: ep.number ?? ep.episodeNumber ?? 1,
              image: ep.image ?? null,
            }))}
            selectedEpisodeId={fullEpisodeId}
            onEpisodeSelect={goToEpisode}
            maxListHeight="18rem"
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayerSection;
