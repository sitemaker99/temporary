"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";

import { ArrowLeft, ArrowRight, Captions, Info, Mic, Play } from "lucide-react";
import { ButtonLink } from "./common/button-link";
import { SpotlightAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import React from "react";
import { Badge } from "./ui/badge";

type IHeroSectionProps = {
  spotlightAnime: SpotlightAnime[];
  isDataLoading: boolean;
};

const HeroSection = ({ spotlightAnime, isDataLoading }: IHeroSectionProps) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
    // Auto-advance every 6s
    const timer = setInterval(() => api.scrollNext(), 6000);
    return () => clearInterval(timer);
  }, [api]);

  if (isDataLoading) return <LoadingSkeleton />;

  return (
    <div className="relative w-full" style={{ height: "clamp(400px, 75vw, 88vh)" }}>
      <Carousel className="w-full h-full" setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="h-full">
          {spotlightAnime?.map((anime, index) => (
            <CarouselItem key={index} className="h-full">
              <HeroCarouselItem anime={anime} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Navigation arrows — desktop only */}
      <div className="absolute hidden md:flex items-center gap-2 right-6 bottom-14 z-50">
        <button
          onClick={() => api?.scrollPrev()}
          className="glass rounded-full h-9 w-9 flex items-center justify-center hover:bg-[var(--red)]/60 transition-all btn-press"
        >
          <ArrowLeft size={14} className="text-white" />
        </button>
        <button
          onClick={() => api?.scrollNext()}
          className="glass rounded-full h-9 w-9 flex items-center justify-center hover:bg-[var(--red)]/60 transition-all btn-press"
        >
          <ArrowRight size={14} className="text-white" />
        </button>
      </div>

      {/* Dot indicators — visible on all screen sizes */}
      {spotlightAnime && (
        <div className="absolute flex items-center gap-1.5 left-1/2 -translate-x-1/2 bottom-4 z-50">
          {spotlightAnime.slice(0, 8).map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              style={{ minHeight: "auto", minWidth: "auto" }}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-2 bg-[var(--red)]"
                  : "w-2 h-2 bg-white/25 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HeroCarouselItem = ({ anime }: { anime: SpotlightAnime }) => (
  <div
    className="w-full h-full relative bg-cover bg-no-repeat bg-center"
    style={{ backgroundImage: `url(${anime?.poster})` }}
  >
    {/* Cinematic gradients */}
    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a10] via-[#0a0a10]/65 to-transparent z-10" />
    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a10] via-[#0a0a10]/20 to-transparent z-10" />
    {/* Subtle vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)] z-10" />

    {/* Content */}
    <div className="absolute inset-0 z-20 flex items-end md:items-center">
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-14 pb-12 md:pb-16 max-w-2xl fade-up">
        {/* Rank badge */}
        {anime.rank && (
          <div className="inline-flex items-center gap-1.5 mb-3 bg-[var(--red)]/15 border border-[var(--red)]/30 rounded-full px-3 py-0.5 fade-up">
            <span className="text-[var(--red)] font-bold text-[10px] tracking-widest uppercase">
              #{anime.rank} Spotlight
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-2xl mb-2.5 line-clamp-2 fade-up-1">
          {anime?.name}
        </h1>

        {/* Episode count badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5 fade-up-2">
          {anime.episodes?.sub && (
            <Badge className="bg-red-600/80 backdrop-blur-sm text-white text-xs flex items-center gap-1 px-2 py-1 border-0">
              <Captions size={10} />
              <span>SUB {anime.episodes.sub}</span>
            </Badge>
          )}
          {anime.episodes?.dub && (
            <Badge className="bg-emerald-600/80 backdrop-blur-sm text-white text-xs flex items-center gap-1 px-2 py-1 border-0">
              <Mic size={10} />
              <span>DUB {anime.episodes.dub}</span>
            </Badge>
          )}
        </div>

        {/* Description — hidden on xs, capped at 2 lines / 160 chars */}
        <p className="hidden sm:block text-sm text-gray-300/90 line-clamp-2 leading-relaxed mb-5 fade-up-3 max-w-lg">
          {(() => {
            const raw = (anime?.description as string) || "";
            const plain = raw.replace(/<[^>]*>/g, "");
            return plain.length > 160 ? plain.slice(0, 157).trimEnd() + "…" : plain;
          })()}
        </p>

        {/* CTA buttons */}
        <div className="flex items-center gap-2.5 fade-up-4">
          <ButtonLink
            href={`${ROUTES.WATCH}?anime=${anime.id}`}
            className="h-10 sm:h-11 px-4 sm:px-6 text-sm font-bold bg-[var(--red)] hover:bg-[var(--pink)] text-white border-0 gap-2 rounded-xl btn-press transition-all shadow-lg"
            style={{ boxShadow: "0 4px 20px var(--red-glow)" } as React.CSSProperties}
          >
            <Play size={14} className="fill-white" />
            Watch Now
          </ButtonLink>
          <ButtonLink
            href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
            className="h-10 sm:h-11 px-4 sm:px-6 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 gap-2 rounded-xl btn-press transition-all backdrop-blur-sm"
          >
            <Info size={14} />
            <span className="hidden xs:inline">Details</span>
            <span className="xs:hidden">Info</span>
          </ButtonLink>
        </div>
      </div>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div
    style={{ height: "clamp(400px, 75vw, 88vh)" }}
    className="w-full bg-[#0f0f18] relative overflow-hidden"
  >
    <div className="absolute inset-0 shimmer opacity-40" />
    <div className="absolute inset-0 flex flex-col justify-end px-4 pb-10 space-y-3">
      <div className="h-4 w-28 shimmer rounded-full" />
      <div className="h-8 w-56 shimmer rounded-xl" />
      <div className="h-4 w-72 shimmer rounded" />
      <div className="flex gap-2">
        <div className="h-11 w-32 shimmer rounded-xl" />
        <div className="h-11 w-28 shimmer rounded-xl" />
      </div>
    </div>
  </div>
);

export default HeroSection;
