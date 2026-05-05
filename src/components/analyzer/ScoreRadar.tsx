"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface Props {
  keyword: number;
  semantic: number;
  hardRequirements: number;
  parseability: number;
}

export function ScoreRadar({
  keyword,
  semantic,
  hardRequirements,
  parseability,
}: Props) {
  const data = [
    { dimension: "Keyword", score: keyword },
    { dimension: "Semantic", score: semantic },
    { dimension: "Hard Reqs", score: hardRequirements },
    { dimension: "Parseability", score: parseability },
  ];

  // Inline color references so the radar matches the deep-green accent
  // from the design tokens. We deliberately avoid Tailwind class names
  // here — recharts SVG primitives need raw color strings.
  const accent = "#1F4434";
  const accentSoft = "#1F443422"; // ~13% alpha
  const grid = "#E6E4DD";
  const axisColor = "#6B6B66";

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={grid} strokeDasharray="2 4" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{
              fill: axisColor,
              fontSize: 11,
              fontFamily: "var(--font-geist-sans)",
              letterSpacing: "0.04em",
            }}
            tickLine={false}
            axisLine={{ stroke: grid }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            dataKey="score"
            stroke={accent}
            strokeWidth={1.5}
            fill={accentSoft}
            fillOpacity={1}
            isAnimationActive={false}
            dot={{ fill: accent, r: 3, stroke: "transparent" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
