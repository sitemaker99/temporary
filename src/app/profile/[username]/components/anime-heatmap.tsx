"use client";

import React, { useEffect, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import styles from "../heatmap.module.css";
import { useAuthStore } from "@/store/auth-store";
import { getDbInstance } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Tooltip } from "react-tooltip";

type HeatmapValue = {
  date: string;
  count: number;
};

function AnimeHeatmap() {
  const { auth } = useAuthStore();
  const [heatmapData, setHeatmapData] = useState<HeatmapValue[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const startDate = new Date(new Date().setMonth(0, 1));
  const endDate = new Date(new Date().setMonth(11, 31));

  useEffect(() => {
    if (!auth?.id) return;

    const fetchWatchHistory = async () => {
      try {
        // Fetch all watched records for this user from Firestore
        const q = query(
          collection(getDbInstance(), "watched"),
          where("user", "==", auth.id)
        );
        const snapshot = await getDocs(q);

        const dailyCounts: Record<string, number> = {};
        let total = 0;

        snapshot.docs.forEach((d) => {
          const data = d.data();
          const created = data.created?.toDate?.() || new Date(data.created);
          const dateStr = created.toISOString().substring(0, 10);
          dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
          total += 1;
        });

        setHeatmapData(
          Object.entries(dailyCounts).map(([date, count]) => ({ date, count }))
        );
        setTotalCount(total);
      } catch (err) {
        console.error("Heatmap fetch error:", err);
      }
    };

    fetchWatchHistory();
  }, [auth?.id]);

  const getClassForValue = (value: HeatmapValue | null): string => {
    if (!value || value.count === 0) return styles.colorEmpty;
    if (value.count >= 10) return styles.colorScale4;
    if (value.count >= 5) return styles.colorScale3;
    if (value.count >= 2) return styles.colorScale2;
    return styles.colorScale1;
  };

  const getTooltipAttrs = (value: HeatmapValue | null): Record<string, string> => {
    if (!value?.date) {
      return { "data-tooltip-id": "heatmap-tooltip", "data-tooltip-content": "No episodes watched" };
    }
    const formatted = new Date(value.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      "data-tooltip-id": "heatmap-tooltip",
      "data-tooltip-content": `Watched ${value.count} episode${value.count !== 1 ? "s" : ""} on ${formatted}`,
    } as Record<string, string>;
  };

  return (
    <div>
      <p className="text-base font-bold mb-4 text-white">
        Watched{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">
          {totalCount} episodes
        </span>{" "}
        this year
      </p>
      <CalendarHeatmap
        weekdayLabels={["", "M", "", "W", "", "F", ""]}
        showWeekdayLabels
        showOutOfRangeDays
        startDate={startDate}
        endDate={endDate}
        classForValue={(v) => getClassForValue(v as unknown as HeatmapValue)}
        values={heatmapData}
        gutterSize={2}
        tooltipDataAttrs={(v) => getTooltipAttrs(v as HeatmapValue)}
      />
      <Tooltip id="heatmap-tooltip" />
    </div>
  );
}

export default AnimeHeatmap;
