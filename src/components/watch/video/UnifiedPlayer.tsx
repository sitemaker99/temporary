"use client";

import { useEffect, useRef, useState } from "react";
import "./PlayerStyles.css";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  type MediaPlayerInstance,
} from "@vidstack/react";
import styled from "styled-components";
import { fetchAnimeStreamingLinks, MEDIA_PROXY_URL } from "@/hooks/useApi";
import {
  DefaultAudioLayout,
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import { TbPlayerTrackPrev, TbPlayerTrackNext } from "react-icons/tb";
import { FaCheck, FaExternalLinkAlt } from "react-icons/fa";
import { RiCheckboxBlankFill } from "react-icons/ri";
import { MdSwapHoriz } from "react-icons/md";
import { CustomLoader } from "./Loader";
import dynamic from "next/dynamic";

// KitsunePlayer loaded client-side only (uses Artplayer which needs window)
const KitsunePlayer = dynamic(
  () => import("./KitsunePlayer").then((m) => m.KitsunePlayer),
  { ssr: false }
);

// ── Styled components ────────────────────────────────────────────────────────

const Button = styled.button<{ $autoskip?: boolean; $active?: boolean }>`
  padding: 0.25rem;
  font-size: 0.8rem;
  border: none;
  margin-right: 0.25rem;
  border-radius: var(--global-border-radius);
  cursor: pointer;
  background-color: var(--global-div);
  color: var(--global-text);
  transition: all 0.2s ease;
  svg { margin-bottom: -0.1rem; color: grey; }
  @media (max-width: 500px) { font-size: 0.7rem; }
  ${({ $active }) => $active && `
    background-color: var(--primary-accent);
    color: white;
    svg { color: white; }
  `}
  ${({ $autoskip }) => $autoskip && `
    color: #d69e00;
    svg { color: #d69e00; }
  `}
  &:hover { opacity: 0.8; }
`;

const PlayerContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  animation: popIn 0.25s ease-in-out;
`;

const IframeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  iframe { width: 100%; height: 100%; border: none; border-radius: 8px; }
`;

// ── Types ────────────────────────────────────────────────────────────────────

// monolithic = ArtPlayer (Kitsune-style: ambilight, quality selector, skip, resume, Firebase sync)
// advanced   = Vidstack HLS
// iframe     = iframe fallback
type PlayerMode = "monolithic" | "advanced" | "iframe";

type UnifiedPlayerProps = {
  episodeId: string;
  /** Anime's string ID (e.g. "steinsgate-3") – forwarded to KitsunePlayer for bookmark/sync */
  animeId?: string;
  category?: string;
  banner?: string;
  malId?: string;
  episodeNumber?: string;
  updateDownloadLink?: (link: string) => void;
  onEpisodeEnd: () => Promise<void>;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  animeTitle?: string;
  serverName?: string;
  language?: string;
  defaultMode?: PlayerMode;
  onRetryRequest?: () => void;
  retryKey?: number;
};

type SkipTime = {
  interval: { startTime: number; endTime: number };
  skipType: string;
};

// ── Component ────────────────────────────────────────────────────────────────

export function UnifiedPlayer({
  episodeId,
  animeId,
  category = "sub",
  banner,
  malId,
  updateDownloadLink = () => {},
  onEpisodeEnd,
  onPrevEpisode,
  onNextEpisode,
  episodeNumber,
  animeTitle,
  serverName = "hd-1",
  language = "sub",
  defaultMode = "advanced",
  onRetryRequest,
  retryKey = 0,
}: UnifiedPlayerProps) {
  const player = useRef<MediaPlayerInstance>(null);

  // ── Bug 6 Fix: reset these booleans when episode changes ──────────────────
  const [waiting,  setWaiting]  = useState(false);
  const [canPlay,  setCanPlay]  = useState(false);
  const [seeking,  setSeeking]  = useState(false);

  const [playerMode,      setPlayerMode]      = useState<PlayerMode>("monolithic");

  // ── Bug 5 Fix: reset to empty/null immediately when a new episode fetch fires
  const [src,             setSrc]             = useState<string>("");
  const [subtitles,       setSubtitles]       = useState<any[]>([]);
  const [vttUrl,          setVttUrl]          = useState<string>("");
  const vttUrlRef                             = useRef<string>("");
  const [skipTimes,       setSkipTimes]       = useState<SkipTime[]>([]);

  const [currentTime,     setCurrentTime]     = useState<number>(0);
  const [totalDuration,   setTotalDuration]   = useState<number>(0);
  const [hasValidHLSLink, setHasValidHLSLink] = useState<boolean>(false);
  const [isFetching,      setIsFetching]      = useState<boolean>(true);

  const [autoPlay,    setAutoPlay]    = useState<boolean>(true);
  const [autoNext,    setAutoNext]    = useState<boolean>(true);
  const [autoSkip,    setAutoSkip]    = useState<boolean>(false);
  const [showLoader,  setShowLoader]  = useState<boolean>(true);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resolveStreamUrl = (data: any) => {
    if (typeof data?.link === "string") return data.link;
    if (typeof data?.link?.file === "string") return data.link.file;
    if (typeof data?.link?.url === "string") return data.link.url;
    if (Array.isArray(data?.sources) && data.sources.length > 0)
      return data.sources[0]?.url || data.sources[0]?.file || "";
    return "";
  };

  const resolveSubtitleTracks = (data: any) => {
    const merged = [
      ...(Array.isArray(data?.subtitles) ? data.subtitles : []),
      ...(Array.isArray(data?.tracks)    ? data.tracks    : []),
    ];
    return merged.filter((t: any) => {
      const kind = (t?.kind || "").toLowerCase();
      return (t?.url || t?.file) && kind !== "thumbnails";
    });
  };

  const convertIntroOutroToSkipTimes = (
    intro?: { start: number; end: number },
    outro?: { start: number; end: number }
  ): SkipTime[] => {
    const out: SkipTime[] = [];
    if (intro) out.push({ interval: { startTime: intro.start, endTime: intro.end }, skipType: "op" });
    if (outro) out.push({ interval: { startTime: outro.start, endTime: outro.end }, skipType: "ed" });
    return out;
  };

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function generateWebVTT(times: SkipTime[], totalDur: number) {
    let vtt = "WEBVTT\n\n";
    let prev = 0;
    const sorted = [...times].sort((a, b) => a.interval.startTime - b.interval.startTime);
    sorted.forEach((st, i) => {
      const { startTime, endTime } = st.interval;
      const label = st.skipType.toUpperCase() === "OP" ? "Opening" : "Outro";
      if (prev < startTime) {
        vtt += `${formatTime(prev)} --> ${formatTime(startTime)}\n`;
        vtt += `${animeTitle} - Episode ${episodeNumber}\n\n`;
      }
      vtt += `${formatTime(startTime)} --> ${formatTime(endTime)}\n${label}\n\n`;
      prev = endTime;
      if (i === sorted.length - 1 && endTime < totalDur) {
        vtt += `${formatTime(endTime)} --> ${formatTime(totalDur)}\n`;
        vtt += `${animeTitle} - Episode ${episodeNumber}\n\n`;
      }
    });
    return vtt;
  }

  // ── Source fetching ───────────────────────────────────────────────────────

  async function fetchAndSetAnimeSource(isRetry = false) {
    try {
      let modId = episodeId;
      if (language === "dub") modId = episodeId.replace(/\$sub$/, "$dub");
      else if (!episodeId.endsWith("$sub")) modId = episodeId.replace(/\$dub$/, "$sub");

      const response = await fetchAnimeStreamingLinks(modId, serverName, language);

      if (response && (response as any).iframe === true) {
        setHasValidHLSLink(false); setPlayerMode("iframe"); setIsFetching(false); return;
      }
      if (!response || !response.success || !response.data) {
        if (!isRetry) { setTimeout(() => fetchAndSetAnimeSource(true), 100); return; }
        setHasValidHLSLink(false); setPlayerMode("iframe"); setIsFetching(false); return;
      }

      const data = response.data;
      const streamUrl = resolveStreamUrl(data);

      if (streamUrl && (streamUrl.includes(".m3u8") || data.linkType === "hls")) {
        // ── Bug 1 & 4 Fix ────────────────────────────────────────────────────
        // Build the proxied URL ONCE here (consistent with how Vidstack used to
        // build it in JSX). Both KitsunePlayer and Vidstack now receive the same
        // already-proxied src. KitsunePlayer must NOT re-proxy — it passes
        // whatever src it receives straight to ArtPlayer.
        // ─────────────────────────────────────────────────────────────────────
        const proxiedSrc = MEDIA_PROXY_URL
          ? `${MEDIA_PROXY_URL}fetch?url=${encodeURIComponent(streamUrl)}`
          : streamUrl;

        setSrc(proxiedSrc);
        updateDownloadLink(streamUrl); // Keep original raw URL for download link

        setHasValidHLSLink(true);
        setPlayerMode("monolithic");
        setIsFetching(false);

        // ── Bug 2 Fix: subtitle URLs are passed directly with NO proxying ───
        setSubtitles(resolveSubtitleTracks(data));

        if (data.intro || data.outro) {
          const times = convertIntroOutroToSkipTimes(data.intro, data.outro);
          setSkipTimes(times);
          if (times.length > 0) {
            const est = totalDuration || 1440;
            const blob = new Blob([generateWebVTT(times, est)], { type: "text/vtt" });
            URL.revokeObjectURL(vttUrlRef.current);
            const url = URL.createObjectURL(blob);
            vttUrlRef.current = url;
            setVttUrl(url);
          }
        }
      } else {
        if (!isRetry) { setTimeout(() => fetchAndSetAnimeSource(true), 100); return; }
        setHasValidHLSLink(false); setPlayerMode("iframe"); setIsFetching(false);
      }
    } catch {
      if (!isRetry) { setTimeout(() => fetchAndSetAnimeSource(true), 100); return; }
      setHasValidHLSLink(false); setPlayerMode("iframe"); setIsFetching(false);
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // ── Bug 5 Fix: Immediately reset stale data on episode change so the old
    // episode's src / subtitles / skipTimes / vttUrl never bleed into the new
    // episode's render while the fetch is in-flight.
    setSrc("");
    setSubtitles([]);
    setSkipTimes([]);
    setVttUrl("");

    // ── Bug 6 Fix: Reset player-state booleans so the loading overlay is
    // correct from the very first frame of the new episode.
    setCanPlay(false);
    setSeeking(false);
    setWaiting(false);

    const allTimes = JSON.parse(localStorage.getItem("all_episode_times") || "{}");
    setCurrentTime(allTimes[episodeId]?.currentTime ?? 0);
    setHasValidHLSLink(false);
    setIsFetching(true);
    setShowLoader(true);
    fetchAndSetAnimeSource();
    return () => { if (vttUrlRef.current) URL.revokeObjectURL(vttUrlRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId, serverName, language, retryKey]);

  useEffect(() => {
    if (hasValidHLSLink && autoPlay && player.current && playerMode === "advanced")
      player.current.play().catch(() => {});
  }, [autoPlay, src, playerMode, hasValidHLSLink]);

  useEffect(() => {
    if (hasValidHLSLink && player.current && currentTime && playerMode === "advanced")
      player.current.currentTime = currentTime;
  }, [currentTime, playerMode, hasValidHLSLink]);

  useEffect(() => {
    if (isFetching) { setShowLoader(true); return; }
    if (playerMode === "monolithic") {
      setShowLoader(false);
    } else if (playerMode === "advanced" && hasValidHLSLink) {
      setShowLoader(!(canPlay && !seeking && !waiting));
    } else if (playerMode === "iframe") {
      setShowLoader(true);
      const t = setTimeout(() => setShowLoader(false), 6000);
      return () => clearTimeout(t);
    }
  }, [canPlay, seeking, waiting, playerMode, hasValidHLSLink, isFetching]);

  // ── Vidstack callbacks ────────────────────────────────────────────────────

  function onLoadedMetadata() {
    if (!player.current) return;
    const dur = player.current.duration;
    setTotalDuration(dur);
    if (skipTimes.length > 0) {
      const blob = new Blob([generateWebVTT(skipTimes, dur)], { type: "text/vtt" });
      URL.revokeObjectURL(vttUrlRef.current);
      const url = URL.createObjectURL(blob);
      vttUrlRef.current = url;
      setVttUrl(url);
    }
  }

  function onVidstackTimeUpdate() {
    if (!player.current) return;
    const ct  = player.current.currentTime;
    const dur = player.current.duration || 1;
    const all = JSON.parse(localStorage.getItem("all_episode_times") || "{}");
    all[episodeId] = { currentTime: ct, playbackPercentage: (ct / dur) * 100 };
    localStorage.setItem("all_episode_times", JSON.stringify(all));
    if (autoSkip && skipTimes.length) {
      const match = skipTimes.find(({ interval }) =>
        ct >= interval.startTime && ct < interval.endTime
      );
      if (match) player.current.currentTime = match.interval.endTime;
    }
  }

  // ── iframe src ────────────────────────────────────────────────────────────

  const getIframeSrc = () => {
    const m = episodeId.match(/[?&$]?ep[=:](\d+)/i) || episodeId.match(/^(\d+)$/);
    const epNum = m ? m[1] : episodeId;
    const server = (serverName || "hd-1").toLowerCase();
    const lang   = language === "dub" ? "dub" : "sub";
    if (server === "streamsb")   return `https://streamsb.net/e/${epNum}`;
    if (server === "streamtape") return `https://streamtape.com/e/${epNum}`;
    // megacloud is aliased to hd-2 in LEGACY_SERVER_ALIAS_MAP (useApi.ts),
    // so it hits vidwish.live — redirect blocking below applies to it too.
    const domain =
      server === "hd-2" || server === "vidstreaming" || server === "megacloud"
        ? "vidwish.live" : "megaplay.buzz";
    return `https://${domain}/stream/s-2/${epNum}/${lang}`;
  };

  // ── Player mode cycling ───────────────────────────────────────────────────

  const cyclePlayerMode = () => {
    if (!hasValidHLSLink) return;
    setPlayerMode((prev) =>
      prev === "monolithic" ? "advanced" : prev === "advanced" ? "iframe" : "monolithic"
    );
  };

  const getModeLabel = () =>
    playerMode === "monolithic" ? "ArtPlayer"
    : playerMode === "advanced" ? "Vidstack"
    : "Iframe";

  const handlePlaybackEnded = async () => {
    if (!autoNext) return;
    try {
      if (player.current && hasValidHLSLink) player.current.pause();
      await new Promise((r) => setTimeout(r, 200));
      await onEpisodeEnd();
    } catch {}
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PlayerContainer>
        {isFetching && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <CustomLoader />
          </div>
        )}

        {/* ── MONOLITHIC (ArtPlayer / Kitsune-style) ── */}
        {!isFetching && playerMode === "monolithic" && hasValidHLSLink && (
          <KitsunePlayer
            // Bug 1 & 4 Fix: src is already proxied — pass it straight through.
            // KitsunePlayer will hand this directly to ArtPlayer, no re-proxying.
            src={src}
            // Bug 2 Fix: subtitle URLs passed exactly as received — no proxy wrapper.
            subtitles={subtitles}
            skipTimes={skipTimes}
            poster={banner}
            autoPlay={autoPlay}
            autoSkip={autoSkip}
            animeTitle={animeTitle}
            episodeNumber={episodeNumber}
            animeId={animeId}
            episodeId={episodeId}
            onEnded={handlePlaybackEnded}
          />
        )}

        {/* ── ADVANCED (Vidstack) ── */}
        {!isFetching && playerMode === "advanced" && hasValidHLSLink && (
          <div className="relative">
            <MediaPlayer
              className="player"
              title={`${animeTitle} - Episode ${episodeNumber}`}
              src={{
                // src is already proxied (same value as passed to KitsunePlayer)
                src,
                type: "application/x-mpegurl",
              }}
              autoPlay={autoPlay}
              crossOrigin
              playsInline
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onVidstackTimeUpdate}
              onWaiting={() => setWaiting(true)}
              onCanPlay={() => { setCanPlay(true); setWaiting(false); }}
              onSeeking={() => setSeeking(true)}
              onSeeked={() => setSeeking(false)}
              onError={() => {
                console.error("Vidstack error: falling back to iframe");
                setHasValidHLSLink(false);
                setPlayerMode("iframe");
              }}
              ref={player}
              aspectRatio="16/9"
              load="eager"
              posterLoad="eager"
              poster={banner}
              streamType="on-demand"
              storage={`player-${episodeId}`}
              keyTarget="player"
              onEnded={handlePlaybackEnded}
            >
              <MediaProvider>
                {vttUrl && <Track kind="chapters" src={vttUrl} default label="Skip Times" />}
                {subtitles.map((subtitle: any, i: number) => (
                  <Track
                    key={String(i)}
                    kind="subtitles"
                    type="vtt"
                    src={subtitle.file || subtitle.url}
                    label={subtitle.label || subtitle.lang}
                    {...(subtitle.default || subtitle.label === "English" || subtitle.lang === "English"
                      ? { default: true } : {})}
                  />
                ))}
              </MediaProvider>
              {showLoader && <CustomLoader />}
              <DefaultAudioLayout icons={defaultLayoutIcons} />
              <DefaultVideoLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
          </div>
        )}

        {/* ── IFRAME FALLBACK ── */}
        {!isFetching && playerMode === "iframe" && (
          <IframeContainer>
            {showLoader && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                <CustomLoader />
              </div>
            )}
            <iframe
              src={getIframeSrc()}
              width="100%"
              height="100%"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; pointer-lock"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-orientation-lock allow-presentation allow-fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="eager"
              onLoad={() => setShowLoader(false)}
              onLoadStart={() => setShowLoader(true)}
            />
          </IframeContainer>
        )}
      </PlayerContainer>

      {/* ── CONTROLS BAR ── */}
      <div
        id="player-menu"
        className="flex items-center md:gap-2 px-1 md:px-2 overflow-x-auto rounded bg-accent no-scrollbar mt-2"
      >
        {hasValidHLSLink ? (
          <Button
            onClick={cyclePlayerMode}
            $active={playerMode === "monolithic"}
            className="flex gap-1"
            title="Cycle player: ArtPlayer → Vidstack → Iframe"
          >
            <MdSwapHoriz className="mt-0.5" />
            {getModeLabel()}
          </Button>
        ) : (
          <Button disabled className="flex gap-1 opacity-50 cursor-not-allowed">
            <FaExternalLinkAlt className="mt-0.5" />
            Iframe Only
          </Button>
        )}

        <Button onClick={() => setAutoPlay(!autoPlay)} className="flex gap-1">
          {autoPlay ? <FaCheck className="mt-0.5" /> : <RiCheckboxBlankFill className="mt-0.5" />}
          Autoplay
        </Button>

        {(playerMode === "monolithic" || playerMode === "advanced") && hasValidHLSLink && (
          <Button $autoskip onClick={() => setAutoSkip(!autoSkip)} className="flex gap-1">
            {autoSkip ? <FaCheck className="mt-0.5" /> : <RiCheckboxBlankFill className="mt-0.5" />}
            Auto Skip
          </Button>
        )}

        <Button className="flex gap-1" onClick={onPrevEpisode}>
          <TbPlayerTrackPrev className="mt-0.5" /> Prev
        </Button>
        <Button onClick={onNextEpisode} className="flex gap-1">
          <TbPlayerTrackNext className="mt-0.5" /> Next
        </Button>

        <Button onClick={() => setAutoNext(!autoNext)} className="flex gap-1">
          {autoNext ? <FaCheck className="mt-0.5" /> : <RiCheckboxBlankFill className="mt-0.5" />}
          Auto Next
        </Button>
      </div>
    </>
  );
}

export default UnifiedPlayer;
