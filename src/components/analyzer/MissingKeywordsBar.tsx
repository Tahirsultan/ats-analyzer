"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { JdKeyword } from "@/lib/scoring/types";

interface Props {
  missing: JdKeyword[];
  limit?: number;
}

/**
 * Top missing JD keywords by weight, rendered as a horizontal bar chart so
 * long phrases stay readable. Caps at `limit` items (default 10) — the
 * report is meant to be actionable, not exhaustive.
 */
export function MissingKeywordsBar({ missing, limit = 10 }: Props) {
  const data = [...missing]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((k) => ({
      surface: k.surface,
      weight: k.weight,
      classification: k.classification,
    }))
    .reverse(); // Recharts renders bottom-up; reverse so heaviest is on top.

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No missing keywords detected — every JD keyword we extracted appears
        somewhere in your resume.
      </p>
    );
  }

  const height = Math.max(180, data.length * 32 + 40);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 24 }}>
          <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "currentColor", fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="surface"
            width={140}
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-foreground"
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value, _name, item) => {
              const num = typeof value === "number" ? value : Number(value);
              const cls = (item.payload as { classification?: string })
                .classification;
              return [`${num.toFixed(2)} (${cls ?? ""})`, "weight"];
            }}
          />
          <Bar dataKey="weight" fill="currentColor" className="text-foreground" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
