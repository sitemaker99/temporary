"use client";
import React, { useState } from "react";
import Image from "next/image";

import Container from "@/components/container";
import AnimeCard from "@/components/anime-card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import WatchButton from "@/components/watch-button";
import { IAnime } from "@/types/anime";
import AnimeCarousel from "@/components/anime-carousel";
import AnimeEpisodes from "@/components/anime-episodes";
import CharacterCard from "@/components/common/character-card";
import { ROUTES } from "@/constants/routes";
import WatchTrailer from "@/components/watch-trailer";
import Select, { ISelectOptions } from "@/components/common/select";
import {
  Ban,
  BookmarkCheck,
  CheckCheck,
  Hand,
  Heart,
  TvMinimalPlay,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import Loading from "@/app/loading";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import useBookMarks from "@/hooks/use-get-bookmark";
import { useGetAnimeBanner } from "@/query/get-banner-anime";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";

const SelectOptions: ISelectOptions[] = [
  {
    value: "plan to watch",
    label: "Plan to Watch",
    icon: BookmarkCheck,
  },
  {
    value: "watching",
    label: "Watching",
    icon: TvMinimalPlay,
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCheck,
  },
  {
    value: "on hold",
    label: "On Hold",
    icon: Hand,
  },
  {
    value: "dropped",
    label: "Dropped",
    icon: Ban,
  },
];

const Page = () => {
  const { slug } = useParams();
  const { data: anime, isLoading } = useGetAnimeDetails(slug as string);
  const { auth } = useAuthStore();
  const { bookmarks, createOrUpdateBookMark } = useBookMarks({
    animeID: slug as string,
    page: 1,
    per_page: 1,
  });
  const [selected, setSelected] = useState("");

  // Sync selected state once bookmarks load from Firestore
  React.useEffect(() => {
    if (bookmarks?.[0]?.status) {
      setSelected(bookmarks[0].status);
    }
  }, [bookmarks]);

  const { addRecentlyViewed } = useRecentlyViewed();

  // Track this page view for "Recently Viewed" on home page
  React.useEffect(() => {
    if (anime?.anime?.info) {
      addRecentlyViewed({
        id: anime.anime.info.id,
        name: anime.anime.info.name,
        poster: anime.anime.info.poster,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime?.anime?.info?.id]);

  const { data: banner, isLoading: bannerLoading } = useGetAnimeBanner(
    anime?.anime.info.anilistId!,
  );

  const handleSelect = async (value: string) => {
    if (!auth) {
      toast.error("Login to save your watchlist 🎌");
      return;
    }
    const previousSelected = selected;
    setSelected(value);

    try {
      await createOrUpdateBookMark(
        slug as string,
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

  return isLoading || !anime ? (
    <Loading />
  ) : (
    <div className="w-full z-50">
      {/* Banner */}
      <div className="h-[28vh] md:h-[38vh] w-full relative">
        {bannerLoading ? (
          <div className="absolute inset-0 m-auto w-full h-full bg-slate-900 animate-pulse"></div>
        ) : (
          <Image
            src={
              (banner?.Media.bannerImage as string) || anime.anime.info.poster
            }
            alt={anime.anime.info.name}
            height={100}
            width={100}
            className="h-full w-full object-cover"
            unoptimized
          />
        )}

        <WatchTrailer
          videoHref={anime.anime.info.promotionalVideos[0]?.source}
        />
        <div className="absolute h-full w-full inset-0 m-auto bg-gradient-to-t from-[#0a0a10] via-[#0a0a10]/40 to-transparent"></div>
        <div className="absolute h-full w-full inset-0 m-auto bg-gradient-to-r from-[#0a0a10]/60 to-transparent"></div>
      </div>

      <Container className="z-50 md:space-y-8 pb-20">
        {/* Hero info row */}
        <div className="flex md:mt-[-9.375rem] mt-[-5rem] md:flex-row flex-col md:items-end md:gap-8 gap-4">
          <AnimeCard
            title={anime.anime.info.name}
            poster={anime.anime.info.poster}
            href={`${ROUTES.ANIME_DETAILS}/${anime.anime.info.id}`}
            displayDetails={false}
            variant="lg"
            className="shrink-0 shadow-2xl shadow-black/50"
          />
          <div className="flex flex-col md:gap-4 gap-3 pb-2 md:pb-10">
            <h1 className="md:text-4xl lg:text-5xl text-xl md:font-black font-extrabold z-[9] leading-tight">
              {anime.anime.info.name}
            </h1>
            {/* Stats pills */}
            <div className="flex items-center flex-wrap gap-2">
              {anime.anime.info.stats.rating && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 font-semibold border border-yellow-500/20">
                  ★ {anime.anime.info.stats.rating}
                </span>
              )}
              {anime.anime.info.stats.type && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 font-medium border border-white/10">
                  {anime.anime.info.stats.type}
                </span>
              )}
              {anime.anime.moreInfo.status && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 font-medium border border-white/10">
                  {anime.anime.moreInfo.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <WatchButton />
              {auth && (
                <Select
                  placeholder="Add to list"
                  value={bookmarks?.[0]?.status || selected}
                  options={SelectOptions}
                  onChange={handleSelect}
                  placeholderIcon={Heart}
                />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex items-center justify-start w-full overflow-x-auto no-scrollbar gap-1 h-fit bg-transparent border-b border-white/8 rounded-none pb-0 px-0">
            <TabsTrigger
              value="overview"
              className="text-base md:text-lg font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--red)] data-[state=active]:text-white data-[state=active]:bg-transparent bg-transparent text-gray-400 shrink-0"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="episodes"
              className="text-base md:text-lg font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--red)] data-[state=active]:text-white data-[state=active]:bg-transparent bg-transparent text-gray-400 shrink-0"
            >
              Episodes
            </TabsTrigger>
            {anime.anime.info.charactersVoiceActors.length > 0 && (
              <TabsTrigger
                value="characters"
                className="text-base md:text-lg font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--red)] data-[state=active]:text-white data-[state=active]:bg-transparent bg-transparent text-gray-400 shrink-0"
              >
                Characters
              </TabsTrigger>
            )}
            {anime.seasons.length > 0 && (
              <TabsTrigger
                value="relations"
                className="text-base md:text-lg font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--red)] data-[state=active]:text-white data-[state=active]:bg-transparent bg-transparent text-gray-400 shrink-0"
              >
                Relations
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent
            value="overview"
            className="w-full grid md:grid-cols-5 grid-cols-1 gap-x-12 gap-y-6 mt-8"
          >
            <div className="col-span-1 flex flex-col gap-4 w-full">
              <h3 className="text-base font-bold text-gray-200 section-header">Details</h3>
              <div className="flex flex-col gap-2.5 w-full text-sm">
                {[
                  ["Aired", anime.anime.moreInfo.aired],
                  ["Rating", anime.anime.info.stats.rating],
                  ["Genres", anime.anime.moreInfo.genres.join(", ")],
                  ["Type", anime.anime.info.stats.type],
                  ["Status", anime.anime.moreInfo.status],
                  ["Season", anime.anime.moreInfo.season || "—"],
                  ["Studios", anime.anime.moreInfo.studios],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-2 items-start">
                    <span className="text-gray-500 shrink-0 w-16">{label}</span>
                    <span className="text-gray-200 capitalize leading-tight">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-4 flex flex-col gap-4">
              <h3 className="text-base font-bold text-gray-200 section-header">Description</h3>
              <p className="text-sm md:text-base leading-7 text-gray-300">
                {anime.anime.info.description}
              </p>
            </div>
          </TabsContent>

          <TabsContent
            value="relations"
            className="w-full flex flex-col gap-5 mt-8"
          >
            <h3 className="text-xl font-semibold section-header">Relations</h3>
            <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 sm:gap-4 lg:gap-5 content-center">
              {anime.seasons.map((relation, idx) => {
                return (
                  !relation.isCurrent && (
                    <AnimeCard
                      key={idx}
                      title={relation.name}
                      subTitle={relation.title}
                      poster={relation.poster}
                      className="self-center justify-self-center"
                      href={`${ROUTES.ANIME_DETAILS}/${relation.id}`}
                    />
                  )
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="episodes" className="flex flex-col gap-5 mt-8">
            <AnimeEpisodes animeId={anime.anime.info.id} />
          </TabsContent>
          {!!anime.anime.info.charactersVoiceActors.length && (
            <TabsContent
              value="characters"
              className="w-full flex flex-col gap-5 mt-8"
            >
              <h3 className="text-xl font-semibold section-header">Anime Characters</h3>
              <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 sm:gap-4 lg:gap-5 content-center">
                {anime.anime.info.charactersVoiceActors.map(
                  (character, idx) => {
                    return (
                      <CharacterCard
                        key={idx}
                        character={character}
                        className="self-center justify-self-center"
                      />
                    );
                  },
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {!!anime.recommendedAnimes.length && (
          <AnimeCarousel
            anime={anime.recommendedAnimes as IAnime[]}
            title="Recommended"
            className="pt-10"
          />
        )}
      </Container>
    </div>
  );
  //eslint-disable-next-line
};

export default Page;
