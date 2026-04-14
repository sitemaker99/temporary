"use client";

import Container from "@/components/container";
import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetAnimeSchedule } from "@/query/get-anime-schedule";
import Button from "@/components/common/custom-button";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Calendar, Clock, Tv2 } from "lucide-react";

const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function SchedulePage() {
  const currentDate = new Date();
  const currentDay = currentDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
  const currentDayIndex = currentDate.getDay();

  const [currentSelectedTab, setCurrentSelectedTab] = React.useState<string>(currentDay);
  const defaultTab = daysOfWeek.includes(currentDay) ? currentDay : "monday";

  function getDateForWeekday(targetDay: string) {
    const targetIndex = daysOfWeek.indexOf(targetDay);
    const date = new Date(currentDate);
    const diff = targetIndex - currentDayIndex;
    date.setDate(currentDate.getDate() + diff);
    return date;
  }

  const selectedDate = useMemo(() => {
    const date = getDateForWeekday(currentSelectedTab);
    date.setDate(date.getDate() + 1); // API offset
    return date.toLocaleDateString("en-US");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectedTab]);

  const { isLoading, data } = useGetAnimeSchedule(selectedDate);

  const selectedDayDate = getDateForWeekday(currentSelectedTab);
  const formattedSelectedDate = selectedDayDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0a0a10] pt-24 pb-16">
      {/* Page Header */}
      <div className="relative overflow-hidden border-b border-white/5 mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <Container className="py-8 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/20">
              <Calendar size={20} className="text-[var(--red)]" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--red)]">
              Airing Schedule
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Anime Schedule</h1>
          <p className="text-gray-400 text-sm">
            Stay up to date with this week&apos;s airing anime episodes
          </p>
        </Container>
      </div>

      <Container className="flex flex-col gap-6">
        <Tabs
          defaultValue={defaultTab}
          onValueChange={(val) => setCurrentSelectedTab(val)}
          value={currentSelectedTab}
          className="w-full"
        >
          <TabsList className="flex w-full overflow-x-auto gap-1 h-auto p-1 bg-[#0f0f18] border border-white/10 rounded-xl md:grid md:grid-cols-7">
            {daysOfWeek.map((day) => {
              const date = getDateForWeekday(day);
              const isToday = day === currentDay;
              return (
                <TabsTrigger
                  key={day}
                  value={day}
                  className="flex flex-col items-center gap-0.5 py-2.5 px-2 min-w-[3.5rem] shrink-0 data-[state=active]:bg-[var(--red)] data-[state=active]:text-white rounded-lg text-xs transition-all"
                >
                  <span className="font-bold uppercase tracking-wider">{day.substring(0, 3)}</span>
                  <span className="text-[10px] opacity-70">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] data-[state=active]:bg-white mt-0.5" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Selected Day Label */}
          <div className="flex items-center gap-2 mt-5 mb-2">
            <Clock size={14} className="text-gray-400" />
            <p className="text-sm text-gray-400">
              {currentSelectedTab === currentDay ? (
                <span>
                  Today &mdash; <span className="text-white">{formattedSelectedDate}</span>
                </span>
              ) : (
                <span className="text-white">{formattedSelectedDate}</span>
              )}
            </p>
          </div>

          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            daysOfWeek.map((day) => (
              <TabsContent key={day} value={day} className="mt-0">
                {day === currentSelectedTab && (
                  <>
                    {!data?.scheduledAnimes?.length ? (
                      <EmptyState />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {data.scheduledAnimes.map((anime, index) => {
                          const airingTime = new Date(anime.airingTimestamp * 1000);
                          const isAired = anime.secondsUntilAiring <= 0;
                          const hoursUntil = Math.floor(anime.secondsUntilAiring / 3600);
                          const minutesUntil = Math.floor((anime.secondsUntilAiring % 3600) / 60);

                          return (
                            <Link
                              key={anime.id}
                              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                              className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[var(--red)]/40 hover:bg-white/[0.06] transition-all duration-200"
                            >
                              {/* Episode badge */}
                              <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/20 group-hover:bg-[var(--red)]/20 transition-colors">
                                <Tv2 size={14} className="text-[var(--red)] mb-0.5" />
                                <span className="text-[10px] font-bold text-[var(--red)]">
                                  EP {anime.episode}
                                </span>
                              </div>

                              {/* Anime info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-white truncate group-hover:text-red-300 transition-colors">
                                  {anime.name}
                                </h3>
                                {anime.jname && anime.jname !== anime.name && (
                                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                    {anime.jname}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Clock size={10} className="text-gray-500" />
                                  <span className="text-[11px] text-gray-400">
                                    {airingTime.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </span>
                                  {!isAired && (
                                    <span className="text-[10px] text-emerald-400 font-medium ml-1">
                                      in {hoursUntil > 0 ? `${hoursUntil}h ` : ""}{minutesUntil}m
                                    </span>
                                  )}
                                  {isAired && (
                                    <span className="text-[10px] text-gray-500 ml-1">Aired</span>
                                  )}
                                </div>
                              </div>

                              {/* Index */}
                              <span className="flex-shrink-0 text-xs text-white/20 font-mono w-6 text-right">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            ))
          )}
        </Tabs>
      </Container>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
    {Array.from({ length: 9 }).map((_, idx) => (
      <div key={idx} className="h-[72px] w-full animate-pulse bg-white/5 rounded-xl" />
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-4 rounded-full bg-white/5 mb-4">
      <Calendar size={28} className="text-gray-500" />
    </div>
    <p className="text-gray-400 text-sm font-medium">No anime scheduled for this day</p>
    <p className="text-gray-600 text-xs mt-1">Check back later or pick another day</p>
  </div>
);
