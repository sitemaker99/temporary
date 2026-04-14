"use client";

import ContinueWatching from "@/components/continue-watching";
import FeaturedCollection from "@/components/featured-collection";
import { useGetHomePageData } from "@/query/get-home-page-data";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useAuthStore } from "@/store/auth-store";
import { IAnime, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";

// Dynamically import heavy components for faster initial load
const HeroSection = dynamic(() => import("@/components/hero-section"));
const LatestEpisodesAnime = dynamic(() => import("@/components/latest-episodes-section"));
const AnimeSchedule = dynamic(() => import("@/components/anime-schedule"));
const AnimeSections = dynamic(() => import("@/components/anime-sections"));

export default function Home() {
  const { data, isLoading } = useGetHomePageData();
  const { auth } = useAuthStore();
  const { recent } = useRecentlyViewed();

  return (
    <div className="flex flex-col bg-[#0a0a10]">
      <HeroSection
        spotlightAnime={data?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
      />
      <LatestEpisodesAnime
        loading={isLoading}
        latestEpisodes={data?.latestEpisodeAnimes as LatestCompletedAnime[]}
      />

      <ContinueWatching loading={isLoading} />

      {!auth && recent.length > 0 && (
        <AnimeSections
          title="Recently Viewed"
          trendingAnime={recent.map((a) => ({ id: a.id, name: a.name, poster: a.poster })) as any}
          loading={false}
        />
      )}

      <FeaturedCollection
        loading={isLoading}
        featuredAnime={[
          { title: "Most Favorite Anime", anime: data?.mostFavoriteAnimes as IAnime[] },
          { title: "Most Popular Anime", anime: data?.mostPopularAnimes as IAnime[] },
          { title: "Latest Completed Anime", anime: data?.latestCompletedAnimes as LatestCompletedAnime[] },
        ]}
      />
      <AnimeSections
        title="Trending Anime"
        trendingAnime={data?.trendingAnimes as IAnime[]}
        loading={isLoading}
      />

      <AnimeSchedule />

      <AnimeSections
        title="Upcoming Animes"
        trendingAnime={data?.topUpcomingAnimes as IAnime[]}
        loading={isLoading}
      />
    </div>
  );
}
