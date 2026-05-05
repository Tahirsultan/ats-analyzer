import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ATS Resume Analyzer — free, private, transparent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#FAFAF7";
const FG = "#0A0A0A";
const MUTED = "#6B6B66";
const ACCENT = "#1F4434";
const BORDER = "#E6E4DD";

async function loadFont(weight: 400 | 600): Promise<ArrayBuffer> {
  // Fraunces variable font, fetched at edge render time. We use the
  // Google Fonts static `.ttf` because ImageResponse needs a TTF/OTF.
  const url = `https://fonts.gstatic.com/s/fraunces/v37/6NUh8FyLNQOQZAnv9bYXvotdNB4Y${weight === 600 ? "RaXyNw" : ""}.ttf`;
  // Fall back to a reliable OTF if the variable axis URL above changes.
  const finalUrl =
    weight === 600
      ? "https://fonts.gstatic.com/s/fraunces/v37/6NUh8FyLNQOQZAnv9bYXvotdNB4YJk0a-FaXyNw.ttf"
      : "https://fonts.gstatic.com/s/fraunces/v37/6NUh8FyLNQOQZAnv9bYXvotdNB4YJk0aXEU.ttf";
  void url;
  const res = await fetch(finalUrl);
  if (!res.ok) throw new Error(`Failed to fetch Fraunces ${weight}`);
  return await res.arrayBuffer();
}

export default async function OgImage() {
  let fonts;
  try {
    const [regular, semibold] = await Promise.all([loadFont(400), loadFont(600)]);
    fonts = [
      { name: "Fraunces", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Fraunces", data: semibold, weight: 600 as const, style: "normal" as const },
    ];
  } catch {
    fonts = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: BG,
          fontFamily: "Fraunces, serif",
          color: FG,
        }}
      >
        {/* Header strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 18,
            color: MUTED,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          <span
            style={{
              width: 32,
              height: 1,
              backgroundColor: MUTED,
              display: "block",
            }}
          />
          <span>ATS Analyzer</span>
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: FG,
            }}
          >
            Honest ATS feedback,
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: ACCENT,
              fontStyle: "italic",
            }}
          >
            without uploading your resume.
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: `1px solid ${BORDER}`,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            <span>Keyword</span>
            <span>·</span>
            <span>Semantic</span>
            <span>·</span>
            <span>Hard reqs</span>
            <span>·</span>
            <span>Parseability</span>
          </div>
          <span style={{ color: FG, fontWeight: 600 }}>Free · Private · Open source</span>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts ? { fonts } : {}),
    },
  );
}
