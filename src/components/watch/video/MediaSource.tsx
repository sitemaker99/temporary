"use client";

import React, { useState } from "react";
import {
  FaMicrophone,
  FaClosedCaptioning,
  FaBell,
  FaShare,
  FaServer,
} from "react-icons/fa";
import { IEpisodeServers } from "@/types/episodes";

interface MediaSourceProps {
  serverName: string;
  setServerName: (serverName: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  episodeId?: string;
  airingTime?: string;
  nextEpisodenumber?: string;
  onServerSelect?: (server: string, lang: string) => void;
  /** Live server data from the API — drives which Sub/Dub rows are shown */
  serversData?: IEpisodeServers | null;
}

export const MediaSource: React.FC<MediaSourceProps> = ({
  serverName,
  setServerName,
  language,
  setLanguage,
  episodeId,
  airingTime,
  nextEpisodenumber,
  onServerSelect,
  serversData,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleServerClick = (server: string, lang: string) => {
    setServerName(server);
    setLanguage(lang);
    onServerSelect?.(server, lang);
  };

  const isActive = (server: string, lang: string) =>
    serverName === server && language === lang;

  // Derive available servers from live data, mirroring Kitsune's pattern:
  //   hasDub = !!(serversData?.dub ?? []).length
  //   hasSub = !!(serversData?.sub ?? []).length
  const subServers = serversData?.sub ?? [];
  const dubServers = serversData?.dub ?? [];
  const hasSub = subServers.length > 0;
  const hasDub = dubServers.length > 0;

  // Servers hidden from the UI (still supported in code/API, just not shown as buttons)
  const HIDDEN_SERVERS = ["megacloud"];

  // Normalise server entries to { id, label } — the API returns serverName strings
  const toEntries = (
    servers: { serverId: number; serverName: string }[]
  ) =>
    servers
      .map((s) => ({
        id: s.serverName.toLowerCase().replace(/\s+/g, "-"),
        label: s.serverName.toUpperCase(),
      }))
      .filter((s) => !HIDDEN_SERVERS.includes(s.id));

  const subEntries = hasSub ? toEntries(subServers) : [];
  const dubEntries = hasDub ? toEntries(dubServers) : [];

  // If neither sub nor dub is available yet (serversData not loaded), show nothing
  const hasAnyOption = hasSub || hasDub;

  return (
    <div className="flex justify-center mt-4 gap-4 max-lg:flex-col">
      {/* Episode Info */}
      <div className="flex-grow bg-card border-2 border-border rounded-lg p-3">
        {episodeId ? (
          <>
            <h4 className="text-lg font-bold mb-2 max-sm:text-base max-sm:mb-0">
              You&apos;re watching <strong>Episode {episodeId}</strong>
              <button
                onClick={handleShareClick}
                className="inline-flex items-center ml-2 p-2 gap-1 text-sm font-bold border-none rounded-lg cursor-pointer bg-card text-card-foreground transition-all duration-200 hover:bg-accent hover:scale-105 active:scale-95"
              >
                <FaShare className="text-xs" />
              </button>
            </h4>
            {isCopied && <p className="text-sm text-green-400">Copied to clipboard!</p>}
            <p className="text-sm text-muted-foreground max-sm:text-xs">
              If current servers don&apos;t work, please try other servers below.
            </p>
          </>
        ) : (
          <p className="text-sm">Loading episode information...</p>
        )}
        {airingTime && (
          <p className="text-sm mt-1 max-sm:text-xs">
            Episode <strong>{nextEpisodenumber}</strong> will air in{" "}
            <FaBell className="inline" />
            <strong> {airingTime}</strong>.
          </p>
        )}
      </div>

      {/* Server Selection — only rendered when at least one option is available */}
      {hasAnyOption && (
        <div className="bg-card border-2 border-border rounded-lg p-4 min-w-[300px]">
          <div className="flex items-center gap-2 mb-3">
            <FaServer className="text-muted-foreground text-xs" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Streaming Servers
            </span>
          </div>

          {/* Sub Row — only shown when sub servers exist */}
          {hasSub && (
            <div className="flex items-start gap-2 mb-3">
              <div className="flex items-center gap-1.5 min-w-[3.5rem] pt-1.5">
                <FaClosedCaptioning className="shrink-0" />
                <span className="font-bold text-sm">Sub</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {subEntries.map((s) => (
                  <button
                    key={"sub-" + s.id}
                    className={`px-3 py-1.5 text-xs border font-semibold rounded-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
                      isActive(s.id, "sub")
                        ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/25"
                        : "bg-card border-border text-card-foreground hover:bg-accent"
                    }`}
                    onClick={() => handleServerClick(s.id, "sub")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dub Row — only shown when dub servers exist */}
          {hasDub && (
            <div className="flex items-start gap-2">
              <div className="flex items-center gap-1.5 min-w-[3.5rem] pt-1.5">
                <FaMicrophone className="shrink-0" />
                <span className="font-bold text-sm">Dub</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dubEntries.map((s) => (
                  <button
                    key={"dub-" + s.id}
                    className={`px-3 py-1.5 text-xs border font-semibold rounded-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
                      isActive(s.id, "dub")
                        ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/25"
                        : "bg-card border-border text-card-foreground hover:bg-accent"
                    }`}
                    onClick={() => handleServerClick(s.id, "dub")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
