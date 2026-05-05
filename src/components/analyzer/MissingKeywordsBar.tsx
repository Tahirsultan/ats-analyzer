"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { JdKeyword } from "@/lib/scoring/types";

interface Props {
  missing: JdKeyword[];
  limit?: number;
}

const ACCENT = "#1F4434";
const AXIS = "#6B6B66";

/**
 * Top missing JD keywords by weight, rendered as a horizontal bar chart.
 * Bar opacity scales linearly across the visible set (heaviest = full
 * opacity, lightest ≈ 50%) so the eye reads weight even before the mono
 * weight label at the bar end. Caps at `limit` items (default 10).
 */
export function MissingKeywordsBar({ missing, limit = 10 }: Props) {
  const top = [...missing].sort((a, b) => b.weight - a.weight).slice(0, limit);
  if (top.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No missing keywords detected — every JD keyword we extracted appears
        somewhere in your resume.
      </p>
    );
  }

  const maxWeight = top[0]?.weight ?? 1;
  const minWeight = top[top.length - 1]?.weight ?? 0;
  const range = Math.max(maxWeight - minWeight, 0.001);

  // Render bottom-up in recharts vertical layout, so reverse so the
  // heaviest item ends up visually on top.
  const data = [...top]
    .reverse()
    .map((k) => ({
      surface: k.surface,
      weight: k.weight,
      classification: k.classification,
      // Opacity in [0.5, 1.0] linearly interpolated by weight rank.
      opacity: 0.5 + 0.5 * ((k.weight - minWeight) / range),
    }));

  const height = Math.max(180, data.length * 36 + 24);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ left: 0, right: 56, top: 4, bottom: 4 }}
          barCategoryGap={6}
        >
          <XAxis type="number" hide domain={[0, maxWeight * 1.05]} />
          <YAxis
            type="category"
            dataKey="surface"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "#0A0A0A",
              fontSize: 13,
              fontFamily: "var(--font-geist-sans)",
            }}
          />
          <Bar dataKey="weight" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={ACCENT} fillOpacity={d.opacity} />
            ))}
            <LabelList
              dataKey="weight"
              position="right"
              formatter={(value) =>
                typeof value === "number" ? value.toFixed(1) : String(value ?? "")
              }
              style={{
                fill: AXIS,
                fontSize: 11,
                fontFamily: "var(--font-geist-mono)",
                letterSpacing: "0.02em",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
