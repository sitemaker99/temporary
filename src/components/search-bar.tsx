"use client";

import React, { useState, useRef } from "react";
import { Input } from "./ui/input";
import { SearchIcon, SlidersHorizontal } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { useSearchAnime } from "@/query/search-anime";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import Tooltip from "./common/tooltip";

const SearchBar = ({
  className,
  onAnimeClick,
}: {
  className?: string;
  onAnimeClick?: () => void;
}) => {
  const [searchValue, setSearchValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const debouncedValue = useDebounce(searchValue, 700);
  // Separate refs for desktop and mobile dropdowns
  const desktopResultsRef = useRef<HTMLDivElement | null>(null);
  const mobileResultsRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const { data: searchResults, isLoading } = useSearchAnime(debouncedValue);

  const handleBlur = () => {
    setTimeout(() => {
      const active = document.activeElement;
      const inDesktop = desktopResultsRef.current?.contains(active);
      const inMobile = mobileResultsRef.current?.contains(active);
      if (!inDesktop && !inMobile) {
        setIsFocused(false);
      }
    }, 150);
  };

  const handleAnimeClick = () => {
    setSearchValue("");
    setIsFocused(false);
    if (onAnimeClick) onAnimeClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = searchValue.trim();
      router.push(q ? `${ROUTES.SEARCH}?q=${encodeURIComponent(q)}` : `${ROUTES.SEARCH}?q=""`);
      setIsFocused(false);
      if (onAnimeClick) onAnimeClick();
      setSearchValue("");
    }
    if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const showDropdown = isFocused && searchValue.trim().length > 0;

  return (
    <div className={cn("relative w-full min-h-fit", className)}>
      <SearchIcon
        suppressHydrationWarning
        className="absolute inset-y-0 left-2 m-auto h-4 w-4 text-gray-400 pointer-events-none z-10"
      />
      <Input
        className="w-full h-10 pl-8 pr-10 text-white border-white/20 bg-white/5 focus:border-[var(--red)] focus:bg-white/8 transition-all"
        placeholder="Search anime..."
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        value={searchValue}
        onKeyDown={handleKeyDown}
      />
      {/* Filter / Advanced search button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
        onClick={() => {
          const q = searchValue.trim() || "";
          router.push(q ? `${ROUTES.SEARCH}?q=${encodeURIComponent(q)}` : `${ROUTES.SEARCH}?q=""`);
          setIsFocused(false);
          if (onAnimeClick) onAnimeClick();
        }}
      >
        <Tooltip side="bottom" content="Advanced Filters">
          <SlidersHorizontal suppressHydrationWarning className="h-4 w-4" />
        </Tooltip>
      </Button>

      {/* ── Desktop dropdown ── */}
      {showDropdown && (
        <div
          ref={desktopResultsRef}
          className="absolute w-full max-h-[50vh] hidden lg:flex overflow-y-auto flex-col gap-3 px-4 py-4 bg-[#0f0f18] border border-white/10 top-[110%] rounded-lg shadow-2xl z-50"
        >
          {(isLoading || (!searchResults && !!searchValue)) &&
            [1, 2, 3].map((_, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-md p-2 bg-white/5 animate-pulse">
                <div className="h-16 w-12 bg-white/10 rounded-md shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}

          {searchResults?.map((anime) => (
            <a key={anime.id} href={ROUTES.ANIME_DETAILS + "/" + anime.id} onClick={handleAnimeClick}>
              <div className="flex items-start gap-3 hover:bg-white/5 rounded-md p-2 cursor-pointer transition-colors">
                <div className="h-16 w-12 overflow-hidden rounded-md flex-shrink-0">
                  <Image
                    src={anime.poster}
                    alt={anime.name}
                    height={100}
                    width={100}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="line-clamp-1 text-sm font-medium text-white">
                    {anime.name || anime.jname}
                  </h3>
                  <div className="text-xs text-gray-400">{anime.type}</div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {anime.moreInfo?.join(" · ")}
                  </p>
                </div>
              </div>
            </a>
          ))}

          {searchResults && searchResults.length > 0 && (
            <Link
              href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue)}`}
              onClick={handleAnimeClick}
            >
              <Button className="w-full bg-[var(--red)] hover:bg-[var(--pink)] text-white text-sm">
                Show All Results
              </Button>
            </Link>
          )}

          {searchResults?.length === 0 && !isLoading && (
            <p className="text-sm text-gray-400 text-center py-4">No results for &quot;{searchValue}&quot;</p>
          )}
        </div>
      )}

      {/* ── Mobile dropdown ── */}
      {showDropdown && (
        <div
          ref={mobileResultsRef}
          className="absolute w-full max-h-[50vh] lg:hidden flex flex-col overflow-y-auto gap-1 px-2 py-2 bg-[#0f0f18] border border-white/10 top-[110%] rounded-lg shadow-2xl z-50"
        >
          {(isLoading || (!searchResults && !!searchValue)) &&
            [1, 2, 3, 4].map((_, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-md p-2 bg-white/5 animate-pulse">
                <div className="h-10 w-8 bg-white/10 rounded-md shrink-0" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            ))}

          {searchResults?.slice(0, 6).map((anime) => (
            <Link key={anime.id} href={ROUTES.ANIME_DETAILS + "/" + anime.id} onClick={handleAnimeClick}>
              <div className="flex items-center gap-2 hover:bg-white/5 rounded-md p-2 cursor-pointer transition-colors">
                <div className="h-10 w-8 overflow-hidden rounded-md shrink-0">
                  <Image
                    src={anime.poster}
                    alt={anime.name}
                    height={100}
                    width={100}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm font-medium text-white line-clamp-1">
                    {anime.name || anime.jname}
                  </h3>
                  <span className="text-xs text-gray-400">{anime.type}</span>
                </div>
              </div>
            </Link>
          ))}

          {/* Mobile Show More — was missing entirely */}
          {searchResults && searchResults.length > 0 && (
            <Link
              href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue)}`}
              onClick={handleAnimeClick}
            >
              <Button className="w-full mt-1 bg-[var(--red)] hover:bg-[var(--pink)] text-white text-xs h-8">
                Show All Results
              </Button>
            </Link>
          )}

          {searchResults?.length === 0 && !isLoading && (
            <p className="text-xs text-gray-400 text-center py-3">No results for &quot;{searchValue}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
