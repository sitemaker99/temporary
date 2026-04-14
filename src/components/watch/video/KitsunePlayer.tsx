"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  HTMLAttributes,
} from "react";
import Artplayer from "artplayer";
import type { Option } from "artplayer";
import Hls from "hls.js";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import artplayerPluginAmbilight from "artplayer-plugin-ambilight";
import { cn } from "@/lib/utils";
import useBookMarks from "@/hooks/use-get-bookmark";
import { useAuthStore } from "@/store/auth-store";

// ── Types ────────────────────────────────────────────────────────────────────

interface SubtitleTrack {
  url?: string;
  file?: string;
  lang?: string;
  label?: string;
  kind?: string;
}

export interface SkipTime {
  interval: { startTime: number; endTime: number };
  skipType: string; // "op" | "ed"
}

export interface KitsunePlayerProps extends HTMLAttributes<HTMLDivElement> {
  /** Already-proxied (or direct) HLS m3u8 URL – constructed by UnifiedPlayer */
  src: string;
  subtitles?: SubtitleTrack[];
  skipTimes?: SkipTime[];
  poster?: string;
  autoPlay?: boolean;
  autoSkip?: boolean;
  onEnded?: () => void;
  getInstance?: (art: Artplayer) => void;
  animeTitle?: string;
  episodeNumber?: string;
  /** Anime string ID used for Firebase bookmark/progress sync */
  animeId?: string;
  /** Episode string ID used for Firebase progress sync */
  episodeId?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WATCH_PROGRESS_UPDATE_INTERVAL = 10000; // ms between Firebase syncs
const WATCH_PROGRESS_MIN_WATCH_TIME  = 10;    // seconds before creating a record

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateHighlights(
  startTime: number | undefined,
  endTime: number | undefined,
  label: string
): { time: number; text: string }[] {
  if (startTime == null || endTime == null || startTime >= endTime) return [];
  const out: { time: number; text: string }[] = [];
  for (let t = Math.floor(startTime); t <= Math.floor(endTime); t++) {
    out.push({ time: t, text: label });
  }
  return out;
}

// ── Component ────────────────────────────────────────────────────────────────

export function KitsunePlayer({
  src,
  subtitles = [],
  skipTimes = [],
  poster,
  autoPlay = true,
  autoSkip = false,
  onEnded,
  getInstance,
  animeTitle,
  episodeNumber,
  animeId,
  episodeId,
  ...rest
}: KitsunePlayerProps): JSX.Element {
  const artContainerRef = useRef<HTMLDivElement>(null);
  const artInstanceRef  = useRef<Artplayer | null>(null);
  const hlsInstanceRef  = useRef<Hls | null>(null);

  // ── Auth & Firebase hooks ─────────────────────────────────────────────────
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark, syncWatchProgress } = useBookMarks({ populate: false });

  // Stable refs so the ArtPlayer timeupdate closure never goes stale
  const authRef                = useRef(auth);
  const syncWatchProgressRef   = useRef(syncWatchProgress);
  const createOrUpdateBMRef    = useRef(createOrUpdateBookMark);
  const episodeIdRef           = useRef(episodeId);
  const episodeNumberRef       = useRef(episodeNumber);
  const animeIdRef             = useRef(animeId);
  const animeTitleRef          = useRef(animeTitle);
  const posterRef              = useRef(poster);
  const onEndedRef             = useRef(onEnded);

  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => { syncWatchProgressRef.current = syncWatchProgress; }, [syncWatchProgress]);
  useEffect(() => { createOrUpdateBMRef.current = createOrUpdateBookMark; }, [createOrUpdateBookMark]);
  useEffect(() => { episodeIdRef.current = episodeId; }, [episodeId]);
  useEffect(() => { episodeNumberRef.current = episodeNumber; }, [episodeNumber]);
  useEffect(() => { animeIdRef.current = animeId; }, [animeId]);
  useEffect(() => { animeTitleRef.current = animeTitle; }, [animeTitle]);
  useEffect(() => { posterRef.current = poster; }, [poster]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  // ── Watch progress refs ───────────────────────────────────────────────────
  const bookmarkIdRef           = useRef<string | null>(null);
  const watchedRecordIdRef      = useRef<string | null>(null);
  const hasMetMinWatchTimeRef   = useRef<boolean>(false);
  const initialSeekTimeRef      = useRef<number | null>(null);
  const lastUpdateTimeRef       = useRef<number>(0);

  // ── Auto-skip ref (always fresh inside closures) ──────────────────────────
  const autoSkipRef = useRef(autoSkip);
  useEffect(() => { autoSkipRef.current = autoSkip; }, [autoSkip]);

  // ── skipTimes ref ─────────────────────────────────────────────────────────
  const skipTimesRef = useRef<SkipTime[]>(skipTimes);
  useEffect(() => { skipTimesRef.current = skipTimes; }, [skipTimes]);

  // ── Progress-bar highlights ────────────────────────────────────────────────
  const highlights = useMemo(() => {
    const h: { time: number; text: string }[] = [];
    skipTimes.forEach((st) => {
      const label = st.skipType?.toUpperCase() === "OP" ? "Intro" : "Outro";
      h.push(...generateHighlights(st.interval.startTime, st.interval.endTime, label));
    });
    return h;
  }, [skipTimes]);

  // ── Subtitle track options for ArtPlayer settings panel ──────────────────
  // Subtitles are passed directly — Aniflix does NOT proxy subtitle URLs
  const trackOptions = useMemo(
    () =>
      subtitles
        .filter((t) => t.kind !== "thumbnails" && (t.url || t.file))
        .map((track) => ({
          html: track.label || track.lang || "Unknown",
          url: track.url || track.file || "",
          default: track.label === "English" || track.lang === "English",
        })),
    [subtitles]
  );

  const defaultSubtitleUrl = useMemo(() => {
    const en = subtitles.find((t) => t.label === "English" || t.lang === "English");
    return en?.url || en?.file || subtitles[0]?.url || subtitles[0]?.file || "";
  }, [subtitles]);

  // ── Firebase bookmark init + resume position ───────────────────────────────
  // Runs when episode changes (episodeId / animeId change)
  useEffect(() => {
    // Reset progress refs for the new episode
    bookmarkIdRef.current         = null;
    watchedRecordIdRef.current    = null;
    hasMetMinWatchTimeRef.current = false;
    initialSeekTimeRef.current    = null;

    if (!auth || !animeId || !episodeId || !animeTitle) return;

    let mounted = true;

    const init = async () => {
      // 1. Ensure bookmark exists and store its ID
      const bmId = await createOrUpdateBMRef.current(
        animeId, animeTitle, poster || "", "watching", false
      );
      if (!mounted || !bmId) return;
      bookmarkIdRef.current = bmId;

      // 2. Read last saved position from localStorage for resume
      try {
        const allTimes = JSON.parse(localStorage.getItem("all_episode_times") || "{}");
        const saved = allTimes[episodeId]?.currentTime ?? 0;
        if (mounted && saved > 0) {
          initialSeekTimeRef.current    = saved;
          hasMetMinWatchTimeRef.current = saved >= WATCH_PROGRESS_MIN_WATCH_TIME;
        }
      } catch {
        initialSeekTimeRef.current = null;
      }
    };

    init();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, animeId, episodeId]);

  // ── Manual skip button ────────────────────────────────────────────────────
  // Defined as a stable object; uses skipTimesRef so it always reads fresh skip times
  const manualSkipControl: any = {
    name: "manual-skip",
    position: "right",
    html: `
      <div style="display:flex;align-items:center;gap:4px;padding:0 6px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>
        </svg>
        <span class="art-skip-text">Skip</span>
      </div>`,
    tooltip: "Skip",
    style: {
      display: "none", cursor: "pointer",
      borderRadius: "4px", marginRight: "10px", padding: "3px 0",
    },
    click(controlItem: any) {
      const art = artInstanceRef.current;
      if (!art) return;
      const { currentTime, duration } = art;
      let seekTarget: number | null = null;
      for (const st of skipTimesRef.current) {
        const { startTime, endTime } = st.interval;
        const resolved = endTime === 0 && duration > 0 ? duration : endTime;
        if (currentTime >= startTime && currentTime < resolved) {
          seekTarget = resolved === duration ? duration - 0.1 : resolved;
          break;
        }
      }
      if (seekTarget !== null) art.seek = Math.min(seekTarget, duration);
      if (controlItem.style) controlItem.style.display = "none";
    },
  };

  // ── ArtPlayer init/teardown ───────────────────────────────────────────────
  // Re-runs when src OR defaultSubtitleUrl changes (covers episode change + subtitle availability)
  useEffect(() => {
    if (!artContainerRef.current || !src) {
      hlsInstanceRef.current?.destroy();
      hlsInstanceRef.current = null;
      artInstanceRef.current?.destroy(true);
      artInstanceRef.current = null;
      return;
    }

    let currentHlsForCleanup: Hls | null = null;

    const finalOptions: Option = {
      container: artContainerRef.current,
      url: src,   // src is already proxied by UnifiedPlayer (same as Vidstack path)
      type: "m3u8",

      // ── HLS via hls.js ───────────────────────────────────────────────────
      customType: {
        m3u8(videoEl: HTMLMediaElement, url: string, artInst: Artplayer) {
          if (Hls.isSupported()) {
            hlsInstanceRef.current?.destroy();
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoEl);
            hlsInstanceRef.current = hls;
            currentHlsForCleanup = hls;
            artInst.on("destroy", () => {
              if (hlsInstanceRef.current === hls) {
                hls.destroy();
                hlsInstanceRef.current = null;
                currentHlsForCleanup = null;
              }
            });
          } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
            videoEl.src = url; // Safari native HLS
          } else {
            artInst.notice.show = "HLS is not supported on this browser.";
          }
        },
      },

      // ── Plugins ──────────────────────────────────────────────────────────
      plugins: [
        artplayerPluginHlsControl({
          quality: {
            control: true,
            setting: true,
            getName: (level: { height?: number }) =>
              level.height ? `${level.height}P` : "Auto",
            title: "Quality",
            auto: "Auto",
          },
          audio: {
            control: true,
            setting: true,
            getName: (track: { name?: string }) => track.name ?? "Unknown",
            title: "Audio",
            auto: "Auto",
          },
        }),
        artplayerPluginAmbilight({
          blur: "30",
          opacity: 0.8,
          frequency: 10,
          duration: 0.3,
          zIndex: -1,
        }),
      ],

      // ── Settings panel ────────────────────────────────────────────────────
      settings: [
        {
          width: 250,
          html: "Subtitle",
          tooltip: "Subtitle",
          selector: [
            {
              html: "Display",
              tooltip: defaultSubtitleUrl ? "Hide" : "Show",
              switch: !!defaultSubtitleUrl,
              onSwitch(item: any) {
                const show = !item.switch;
                if (artInstanceRef.current) artInstanceRef.current.subtitle.show = show;
                item.tooltip = show ? "Hide" : "Show";
                return show;
              },
            },
            ...trackOptions,
          ],
          onSelect(item: any) {
            if (item.url && artInstanceRef.current) {
              artInstanceRef.current.subtitle.switch(item.url, { name: item.html });
            }
            return item.html ?? "Subtitle";
          },
        },
      ],

      // ── Skip button control ───────────────────────────────────────────────
      controls: [manualSkipControl],

      // ── Intro/outro markers on the progress bar ───────────────────────────
      highlight: highlights,

      // ── Default subtitle ──────────────────────────────────────────────────
      subtitle: defaultSubtitleUrl
        ? {
            url: defaultSubtitleUrl,
            type: "vtt",
            style: {
              color: "#FFFFFF",
              fontSize: "22px",
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            },
            encoding: "utf-8",
            escape: false,
          }
        : {},

      // ── Player options ────────────────────────────────────────────────────
      poster:           poster || "",
      volume:           0.8,
      isLive:           false,
      muted:            false,
      autoplay:         autoPlay,
      autoOrientation:  true,
      pip:              true,
      autoSize:         false,
      autoMini:         false,
      screenshot:       true,
      setting:          true,
      loop:             false,
      flip:             false,
      playbackRate:     true,
      aspectRatio:      true,
      fullscreen:       true,
      fullscreenWeb:    true,
      subtitleOffset:   true,
      miniProgressBar:  false,
      mutex:            true,
      backdrop:         true,
      playsInline:      true,
      autoPlayback:     true,
      airplay:          true,
      theme:            "#F5316F",
      moreVideoAttr:    { crossOrigin: "anonymous" },
    };

    const art = new Artplayer(finalOptions);
    artInstanceRef.current = art;

    // ── ready: resize subtitles + seek to saved position ─────────────────
    art.on("ready", () => {
      if (artInstanceRef.current) {
        artInstanceRef.current.subtitle.style({
          fontSize: artInstanceRef.current.height * 0.04 + "px",
        });
      }
      const seekTime = initialSeekTimeRef.current;
      if (seekTime !== null && seekTime > 0 && art.duration > 0 && seekTime < art.duration - 5) {
        setTimeout(() => {
          if (artInstanceRef.current) artInstanceRef.current.seek = seekTime;
        }, 100);
      }
      initialSeekTimeRef.current = null;
    });

    // ── resize: responsive subtitle size ─────────────────────────────────
    art.on("resize", () => {
      if (!artInstanceRef.current) return;
      const size = Math.max(14, Math.min(32, artInstanceRef.current.height * 0.04));
      artInstanceRef.current.subtitle.style({ fontSize: `${size}px` });
    });

    // ── timeupdate: auto-skip + manual skip button + progress tracking ────
    const handleTimeUpdate = () => {
      const a = artInstanceRef.current;
      if (!a || a.loading.show) return;

      const currentTime = a.currentTime;
      const duration    = a.duration;
      if (!duration || duration <= 0) return;

      // Find active skip range
      let inSkipRange: SkipTime | null = null;
      for (const st of skipTimesRef.current) {
        const { startTime, endTime } = st.interval;
        const resolved = endTime === 0 && duration > 0 ? duration : endTime;
        if (currentTime >= startTime && currentTime < resolved) {
          inSkipRange = st;
          break;
        }
      }

      const manualSkip = art.controls["manual-skip"] as any;

      if (autoSkipRef.current && inSkipRange) {
        // ── Auto skip ─────────────────────────────────────────────────────
        const { endTime } = inSkipRange.interval;
        const resolved = endTime === 0 && duration > 0 ? duration : endTime;
        a.seek = Math.min(resolved === duration ? duration - 0.1 : resolved, duration);
        if (manualSkip?.style) manualSkip.style.display = "none";
      } else if (manualSkip) {
        // ── Manual skip button ────────────────────────────────────────────
        if (inSkipRange) {
          if (manualSkip.style?.display === "none") manualSkip.style.display = "inline-flex";
          const label  = inSkipRange.skipType?.toUpperCase() === "OP" ? "Intro" : "Outro";
          const textEl = manualSkip.querySelector?.(".art-skip-text");
          if (textEl && textEl.textContent !== `Skip ${label}`) textEl.textContent = `Skip ${label}`;
        } else {
          if (manualSkip.style?.display !== "none") manualSkip.style.display = "none";
        }
      }

      // ── Save to localStorage (always, all users) ──────────────────────
      try {
        const allTimes = JSON.parse(localStorage.getItem("all_episode_times") || "{}");
        allTimes[episodeIdRef.current || ""] = {
          currentTime,
          playbackPercentage: (currentTime / duration) * 100,
        };
        localStorage.setItem("all_episode_times", JSON.stringify(allTimes));
      } catch { /* ignore */ }

      // ── Firebase sync (logged-in users only) ──────────────────────────
      const currentAuth = authRef.current;
      const currentBmId = bookmarkIdRef.current;
      const currentEpId = episodeIdRef.current;

      if (currentAuth && currentBmId && currentEpId) {
        const epNum = parseInt(episodeNumberRef.current || "0");

        // First threshold: create the watched record after min watch time
        if (!hasMetMinWatchTimeRef.current && currentTime >= WATCH_PROGRESS_MIN_WATCH_TIME) {
          hasMetMinWatchTimeRef.current = true;
          if (!watchedRecordIdRef.current) {
            syncWatchProgressRef.current(currentBmId, null, {
              episodeId: currentEpId, episodeNumber: epNum,
              current: currentTime, duration,
            }).then((newId) => { if (newId) watchedRecordIdRef.current = newId; });
            lastUpdateTimeRef.current = Date.now();
          }
        }

        // Throttled periodic sync
        if (
          (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current) &&
          Date.now() - lastUpdateTimeRef.current > WATCH_PROGRESS_UPDATE_INTERVAL
        ) {
          syncWatchProgressRef.current(currentBmId, watchedRecordIdRef.current, {
            episodeId: currentEpId, episodeNumber: epNum,
            current: currentTime, duration,
          }).then((id) => { if (id) watchedRecordIdRef.current = id; });
          lastUpdateTimeRef.current = Date.now();
        }
      }
    };

    art.on("video:timeupdate", handleTimeUpdate);

    // ── pause/seeked: immediate Firebase sync ────────────────────────────
    const handleInteractionUpdate = () => {
      const a = artInstanceRef.current;
      const currentAuth = authRef.current;
      const currentBmId = bookmarkIdRef.current;
      const currentEpId = episodeIdRef.current;
      if (!a || !a.duration || !currentAuth || !currentBmId || !currentEpId) return;
      if (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current) {
        syncWatchProgressRef.current(currentBmId, watchedRecordIdRef.current, {
          episodeId: currentEpId,
          episodeNumber: parseInt(episodeNumberRef.current || "0"),
          current: a.currentTime,
          duration: a.duration,
        }).then((id) => { if (id) watchedRecordIdRef.current = id; });
        lastUpdateTimeRef.current = Date.now();
      }
    };
    art.on("video:pause",  handleInteractionUpdate);
    art.on("video:seeked", handleInteractionUpdate);

    // ── ended ────────────────────────────────────────────────────────────
    art.on("video:ended", () => { onEndedRef.current?.(); });

    // ── error ─────────────────────────────────────────────────────────────
    art.on("error", (error: any) => {
      console.error("ArtPlayer Error:", error);
      if (artInstanceRef.current) {
        artInstanceRef.current.notice.show = `Error: ${error?.message || "Playback failed"}`;
      }
    });

    if (getInstance) getInstance(art);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      const a   = artInstanceRef.current;
      const hls = hlsInstanceRef.current;

      // Final sync on unmount
      const currentAuth = authRef.current;
      const currentBmId = bookmarkIdRef.current;
      const currentEpId = episodeIdRef.current;
      if (a && a.duration > 0 && currentAuth && currentBmId && currentEpId &&
          (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current)) {
        syncWatchProgressRef.current(currentBmId, watchedRecordIdRef.current, {
          episodeId: currentEpId,
          episodeNumber: parseInt(episodeNumberRef.current || "0"),
          current: a.currentTime,
          duration: a.duration,
        });
      }

      if (hls) {
        if (hls.media) hls.detachMedia();
        hls.destroy();
        hlsInstanceRef.current = null;
      }
      if (a) {
        a.off("video:timeupdate", handleTimeUpdate);
        a.off("video:pause",     handleInteractionUpdate);
        a.off("video:seeked",    handleInteractionUpdate);
        a.pause();
        if (a.video) { a.video.removeAttribute("src"); a.video.load(); }
        if (currentHlsForCleanup) {
          currentHlsForCleanup.destroy();
          if (hlsInstanceRef.current === currentHlsForCleanup) hlsInstanceRef.current = null;
          currentHlsForCleanup = null;
        }
        a.destroy(true);
        if (artInstanceRef.current === a) artInstanceRef.current = null;
      }
    };
  // Re-run only when src or default subtitle changes (episode change triggers src change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, defaultSubtitleUrl]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "relative w-full h-auto aspect-video min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] max-h-[500px] lg:max-h-[calc(100vh-150px)] bg-black overflow-hidden",
        rest.className ?? ""
      )}
    >
      <div ref={artContainerRef} className="w-full h-full">
        {!src && poster && (
          <div
            className="w-full h-full flex items-center justify-center bg-cover bg-center"
            style={{ backgroundImage: `url(${poster})` }}
          >
            <div className="animate-spin w-12 h-12 border-4 border-[#F5316F] border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

export default KitsunePlayer;
