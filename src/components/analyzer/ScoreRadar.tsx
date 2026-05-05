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
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="currentColor" className="text-border" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-muted-foreground"
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "currentColor", fontSize: 10 }}
            className="text-muted-foreground"
          />
          <Radar
            dataKey="score"
            stroke="currentColor"
            fill="currentColor"
            fillOpacity={0.2}
            className="text-foreground"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
