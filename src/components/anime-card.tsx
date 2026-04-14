import React from "react";
import Link from "next/link";
import Image from "next/image";

import { cn, formatSecondsToMMSS } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Captions, Mic, Play } from "lucide-react";
import { WatchHistory } from "@/hooks/use-get-bookmark";
import { Progress } from "./ui/progress";

type Props = {
  className?: string;
  poster: string;
  title: string;
  episodeCard?: boolean;
  sub?: number | null;
  dub?: number | null;
  subTitle?: string;
  displayDetails?: boolean;
  variant?: "sm" | "lg";
  href?: string;
  showGenre?: boolean;
  watchDetail?: WatchHistory | null;
};

const AnimeCard = ({
  displayDetails = true,
  variant = "sm",
  ...props
}: Props) => {
  const safeCurrent =
    typeof props.watchDetail?.current === "number" ? props.watchDetail.current : 0;
  const safeTotal =
    typeof props.watchDetail?.timestamp === "number" && props.watchDetail.timestamp > 0
      ? props.watchDetail.timestamp
      : 0;
  const clampedCurrent = Math.min(safeCurrent, safeTotal);
  const percentage = safeTotal > 0 ? (clampedCurrent / safeTotal) * 100 : 0;

  return (
    <Link href={props.href as string}>
      <div
        className={cn([
          "group rounded-xl overflow-hidden relative cursor-pointer transition-all duration-300",
          "hover:scale-105 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:ring-1 hover:ring-red-500/30",
          variant === "sm" &&
            "h-[11rem] min-[360px]:h-[14rem] sm:h-[17rem] max-w-[11.5rem] md:min-w-[11rem]",
          variant === "lg" &&
            "max-w-[12.625rem] md:max-w-[18.75rem] h-auto md:h-[25rem] shrink-0 lg:w-[18.75rem]",
          props.className,
        ])}
      >
        {/* Poster image */}
        <Image
          src={props.poster}
          alt={props.title || "anime"}
          height={100}
          width={100}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />

        {/* Hover play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <div className="bg-red-600/90 rounded-full p-3 shadow-lg shadow-red-900/50">
            <Play size={20} className="text-white fill-white ml-0.5" />
          </div>
        </div>

        {displayDetails && (
          <>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080a10] via-[#080a10]/30 to-transparent z-10" />

            <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-1 px-3 pb-3">
              <h5 className="line-clamp-2 text-sm font-semibold text-white leading-tight drop-shadow-lg">
                {props.title}
              </h5>

              {props.watchDetail && (
                <>
                  <p className="text-[10px] text-gray-400">
                    Ep {props.watchDetail.episodeNumber} · {formatSecondsToMMSS(props.watchDetail.current)} / {formatSecondsToMMSS(props.watchDetail.timestamp)}
                  </p>
                  <Progress value={percentage} className="h-1 bg-white/20 [&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-pink-500" />
                </>
              )}

              {props.episodeCard ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {props.sub && (
                    <Badge className="bg-red-600/80 text-white text-[10px] px-1.5 py-0 h-5 flex items-center gap-0.5">
                      <Captions size={10} />
                      <span>{props.sub}</span>
                    </Badge>
                  )}
                  {props.dub && (
                    <Badge className="bg-emerald-600/80 text-white text-[10px] px-1.5 py-0 h-5 flex items-center gap-0.5">
                      <Mic size={10} />
                      <span>{props.dub}</span>
                    </Badge>
                  )}
                  {props.subTitle && (
                    <p className="text-[10px] text-gray-300">{props.subTitle}</p>
                  )}
                </div>
              ) : (
                props.subTitle && (
                  <span className="text-[11px] text-gray-400 line-clamp-1">{props.subTitle}</span>
                )
              )}
            </div>
          </>
        )}
      </div>
    </Link>
  );
};

export default AnimeCard;
