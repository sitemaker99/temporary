"use client";

import React from "react";
import { ROUTES } from "@/constants/routes";
import AnimeCard from "@/components/anime-card";
import BlurFade from "@/components/ui/blur-fade";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetSearchAnimeResults } from "@/query/get-search-results";
import Pagination from "@/components/common/pagination";
import { useAnimeSearchParams } from "@/hooks/use-anime-search-params";
import Select from "@/components/common/select";
import { statuses, types, ratings, seasons, languages, sort, genres } from "@/constants/search-filters";
import { SearchAnimeParams } from "@/types/anime";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, X, Search } from "lucide-react";

const SearchResults = () => {
  const params = useAnimeSearchParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayPhrase = params.q.replace(/^"+|"+$/g, "").trim();

  const { data: searchResults, isLoading } = useGetSearchAnimeResults(params);

  const [filters, setFilters] = React.useState<SearchAnimeParams>({
    q: params.q,
    page: params.page,
    type: params.type,
    status: params.status,
    rated: params.rated,
    season: params.season,
    language: params.language,
    sort: params.sort,
    genres: params.genres,
  });

  // Sync local filter state when URL params change (e.g. user searches from nav while on /search)
  React.useEffect(() => {
    setFilters({
      q: params.q,
      page: params.page,
      type: params.type,
      status: params.status,
      rated: params.rated,
      season: params.season,
      language: params.language,
      sort: params.sort,
      genres: params.genres,
    });
  }, [
    params.q,
    params.page,
    params.type,
    params.status,
    params.rated,
    params.season,
    params.language,
    params.sort,
    params.genres,
  ]);

  const handleNextPage = () => {
    if (searchResults?.hasNextPage) {
      handlePageChange((params.page || 1) + 1);
    }
  };

  const handlePreviousPage = () => {
    if ((params.page || 1) > 1) {
      handlePageChange((params.page || 1) - 1);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1) return;
    const _params = new URLSearchParams(searchParams.toString());
    _params.set("page", pageNumber.toString());
    router.push(`/search?${_params.toString()}`);
  };

  const onChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    // Use a fresh URLSearchParams — Kitsunee's exact approach
    const newParams = new URLSearchParams();

    // Always carry the current URL query (not stale filters.q)
    const currentQ = params.q;

    // Build params from current filter state
    const merged: SearchAnimeParams = { ...filters, q: currentQ };

    Object.entries(merged).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim() !== "") {
        newParams.set(key, value);
      } else if (typeof value === "number" && !isNaN(value)) {
        newParams.set(key, value.toString());
      }
    });

    newParams.delete("page");

    router.push(`/search?${newParams.toString()}`);
  };

  const resetFilters = () => {
    setLocalQuery("");
    setFilters({
      q: "",
      page: 1,
      type: "",
      status: "",
      rated: "",
      season: "",
      language: "",
      sort: "",
      genres: "",
    });
    router.push('/search?q=""');
  };

  const [localQuery, setLocalQuery] = React.useState(displayPhrase);

  // Keep local query in sync if URL changes (e.g. searching from navbar)
  React.useEffect(() => {
    setLocalQuery(params.q.replace(/^"+|"+$/g, "").trim());
  }, [params.q]);

  const applyFiltersWithQuery = () => {
    const newParams = new URLSearchParams();
    const merged: SearchAnimeParams = { ...filters, q: localQuery || '""' };
    Object.entries(merged).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim() !== "") {
        newParams.set(key, value);
      } else if (typeof value === "number" && !isNaN(value)) {
        newParams.set(key, value.toString());
      }
    });
    newParams.delete("page");
    router.push(`/search?${newParams.toString()}`);
  };

  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") applyFiltersWithQuery();
  };

  return (
    <div className="flex flex-col gap-6 pt-20 md:pt-28 pb-20 min-h-[75vh]">
      {/* Filter Panel */}
      <div className="bg-white/[0.03] border border-white/8 backdrop-blur-sm rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-red-400" />
          <p className="text-sm font-bold tracking-wide text-gray-200">Search & Filter</p>
        </div>

        {/* Inline search input */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleQueryKeyDown}
            placeholder="Search anime name..."
            className="w-full h-10 pl-9 pr-4 text-sm text-white bg-white/5 border border-white/10 rounded-lg focus:border-[var(--red)] focus:outline-none transition-colors placeholder:text-gray-600"
          />
          {localQuery && (
            <button
              onClick={() => setLocalQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Select options={types} placeholder="Type" value={filters.type} onChange={(val) => onChange("type", val)} />
          <Select options={statuses} placeholder="Status" value={filters.status} onChange={(val) => onChange("status", val)} />
          <Select options={ratings} placeholder="Rated" value={filters.rated} onChange={(val) => onChange("rated", val)} />
          <Select options={seasons} placeholder="Season" value={filters.season} onChange={(val) => onChange("season", val)} />
          <Select options={languages} placeholder="Language" value={filters.language} onChange={(val) => onChange("language", val)} />
          <Select options={sort} placeholder="Sort" value={filters.sort} onChange={(val) => onChange("sort", val)} />
        </div>

        <div>
          <p className="text-xs font-semibold mb-2.5 text-gray-400 uppercase tracking-wider">Genres</p>
          <ToggleGroup
            type="multiple"
            className="flex flex-wrap justify-start gap-1.5"
            value={filters.genres?.split(",").filter(Boolean) || []}
            onValueChange={(value) => {
              onChange("genres", value.filter(Boolean).join(","));
            }}
          >
            {genres.map((genre) => (
              <ToggleGroupItem
                value={genre.value}
                key={genre.value}
                size="sm"
                className={cn(
                  "border border-white/10 hover:border-red-400 hover:text-red-400 hover:bg-transparent text-xs h-7 px-2.5 rounded-full",
                  "data-[state=on]:border-red-500 data-[state=on]:text-white data-[state=on]:bg-red-500",
                  filters.genres?.split(",").includes(genre.value)
                    ? "bg-red-500 text-white"
                    : "",
                )}
              >
                {genre.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={applyFiltersWithQuery}
            className="px-5 py-2 text-sm bg-[var(--red)] hover:bg-[var(--pink)] text-white rounded-lg transition-colors font-semibold btn-press"
          >
            Search
          </button>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
          >
            <X size={12} /> Reset all
          </button>
        </div>
      </div>

      {/* Results heading */}
      <div className="text-lg font-bold section-header">
        {displayPhrase === "" ? (
          <span className="text-gray-300">Filter Results</span>
        ) : (
          <>
            Results for{" "}
            <span className="text-white font-extrabold">&quot;{displayPhrase}&quot;</span>
          </>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 sm:gap-4">
          {Array.from({ length: 14 }).map((_, idx) => (
            <div key={idx} className="rounded-xl h-[14rem] min-w-[9rem] animate-pulse bg-white/5" />
          ))}
        </div>
      )}

      {/* Results grid */}
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 sm:gap-4">
        {searchResults?.animes?.map((anime, idx) => (
          <BlurFade key={idx} delay={idx * 0.03} inView>
            <AnimeCard
              title={anime.name}
              subTitle={anime.type}
              poster={anime.poster}
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="self-center justify-self-center"
              showGenre={false}
              episodeCard
              sub={anime?.episodes?.sub}
              dub={anime?.episodes?.dub}
            />
          </BlurFade>
        ))}
      </div>

      {/* No results */}
      {!isLoading && searchResults?.animes?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-bold text-white">No results found</h2>
          <p className="text-gray-400 text-sm max-w-xs">
            Try different search terms or adjust your filters.
          </p>
        </div>
      )}

      {/* Pagination */}
      {searchResults && searchResults.totalPages > 1 && (
        <Pagination
          totalPages={searchResults.totalPages}
          currentPage={params.page}
          handleNextPage={handleNextPage}
          handlePageChange={handlePageChange}
          handlePreviousPage={handlePreviousPage}
        />
      )}
    </div>
  );
};

export default SearchResults;
