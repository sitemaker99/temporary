"use client";

import Container from "./container";
import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useGetAnimeSchedule } from "@/query/get-anime-schedule";
import Button from "./common/custom-button";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const daysOfWeek = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function AnimeSchedule() {
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

  return (
    <Container id="schedule" className="flex flex-col gap-5 py-8 items-center lg:items-start scroll-mt-20">
      <h5 className="text-xl sm:text-2xl font-bold section-header">Schedule</h5>
      <Tabs
        defaultValue={defaultTab}
        onValueChange={(val) => setCurrentSelectedTab(val)}
        value={currentSelectedTab}
        className="w-full"
      >
        {/* Mobile: horizontal scroll; Desktop: grid-cols-7 */}
        <TabsList className="flex w-full overflow-x-auto gap-1 h-auto p-1 bg-[#0f0f18] border border-white/8 rounded-xl md:grid md:grid-cols-7 no-scrollbar">
          {daysOfWeek.map((day) => {
            const date = getDateForWeekday(day);
            const isToday = day === currentDay;
            return (
              <TabsTrigger
                key={day}
                value={day}
                className="flex flex-col items-center gap-0.5 py-2.5 px-2 min-w-[3.25rem] shrink-0 data-[state=active]:bg-[var(--red)] data-[state=active]:text-white rounded-lg text-xs transition-all duration-200"
              >
                <span className="font-bold uppercase tracking-wider text-[11px]">{day.substring(0, 3)}</span>
                <span className="text-[9px] opacity-60">
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {isToday && <span className="w-1 h-1 rounded-full bg-[var(--red)] data-[state=active]:bg-white mt-0.5" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          daysOfWeek.map((day) => (
            <TabsContent key={day} value={day} className="mt-4">
              {day === currentSelectedTab && (
                <div className="flex flex-col gap-3 w-full">
                  {!data?.scheduledAnimes?.length ? (
                    <p className="text-gray-400 text-sm py-6 text-center">No anime scheduled for this day.</p>
                  ) : (
                    data.scheduledAnimes.map((anime) => (
                      <div
                        key={anime.id}
                        className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-[var(--red)] font-bold shrink-0 w-14 sm:w-16 tabular-nums">
                            {new Date(anime.airingTimestamp).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                          <h3 className="text-sm font-semibold truncate leading-tight">{anime.name}</h3>
                        </div>
                        <Link href={`${ROUTES.ANIME_DETAILS}/${anime.id}`} className="shrink-0">
                          <Button
                            className="bg-[var(--red)] text-white hover:bg-[var(--pink)] text-xs px-3 h-8 rounded-lg transition-colors btn-press"
                            size="sm"
                          >
                            Ep {anime.episode}
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          ))
        )}
      </Tabs>
    </Container>
  );
}

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-3 mt-4">
    {[1, 2, 3, 4, 5].map((_, idx) => (
      <div key={idx} className="h-12 w-full animate-pulse bg-white/5 rounded-lg" />
    ))}
  </div>
);

export default AnimeSchedule;
