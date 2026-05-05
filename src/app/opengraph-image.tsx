import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ATS Resume Analyzer — free, private, transparent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#a3a3a3",
            marginBottom: 32,
          }}
        >
          Free · Private · Transparent
        </div>
        <div style={{ fontSize: 80, fontWeight: 600, lineHeight: 1.05 }}>
          Honest ATS feedback
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 600,
            lineHeight: 1.05,
            color: "#a3a3a3",
          }}
        >
          without uploading your resume
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 24,
            color: "#a3a3a3",
            display: "flex",
            gap: 24,
          }}
        >
          <span>Keyword</span>
          <span>·</span>
          <span>Semantic</span>
          <span>·</span>
          <span>Hard reqs</span>
          <span>·</span>
          <span>Parseability</span>
        </div>
      </div>
    ),
    size,
  );
}
