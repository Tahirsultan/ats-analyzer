/**
 * Recolor the navy/cyan brand mark to harmonize with the deep-green accent
 * used across the rest of the app.
 *
 * Approach: walk the raw RGBA buffer. For every non-white pixel, compute
 * HSL, then remap any pixel whose hue lives in the blue/cyan range
 * (hue 160°–260°) to the green family — preserving the original lightness
 * so anti-aliased edges and gradient transitions stay smooth.
 *
 * Two mappings:
 *   blue  (hue 200-260°)  → deep forest green hue
 *   cyan  (hue 160-200°)  → score-strong green hue (a touch brighter)
 *
 * Run with:  node scripts/recolor-logo.mjs
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Source PNGs are the original navy/cyan assets the user supplied. We
// keep the recolor inputs separate from the deployed outputs so re-runs
// always operate on the source, not on a previously-recolored result.
const INPUT_LOGO = "/Users/p21product/Downloads/ChatGPT Image May 5, 2026, 08_19_32 PM.png";
const OUTPUT_LOGO = resolve(ROOT, "public/logo.png");
const INPUT_ICON = "/Users/p21product/Downloads/ChatGPT Image May 5, 2026, 01_35_56 PM.png";
const OUTPUT_ICON = resolve(ROOT, "src/app/icon.png");

// Target hue (degrees) and saturation multiplier for the two source ranges.
// Hue values are intentionally a touch yellow-leaning so the green reads
// as forest, not emerald.
const TARGET_DARK_GREEN_HUE = 148; // forest, matches accent #1F4434 (~152° HSL)
const TARGET_BRIGHT_GREEN_HUE = 152; // a touch shifted for cyan→teal-green

async function recolor(input, output, size) {
  // Trim the white padding off the source so the rendered image at small
  // display sizes is mostly content, not whitespace. Threshold 12 handles
  // the off-white edges that JPEG-style chroma compression leaves behind.
  const trimmed = await sharp(input)
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 1 }, threshold: 12 })
    .toBuffer();

  const { data, info } = await sharp(trimmed)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  const channels = info.channels;
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    // Compute "whiteness" so we can fade the alpha smoothly across the
    // anti-aliased ring of pixels around glyph edges. Pure white → fully
    // transparent. A neutral gray ramp between (240,240,240) and pure
    // white slides alpha 255 → 0 so glyph edges stay smooth on the
    // off-white app background.
    if (r >= 240 && g >= 240 && b >= 240) {
      const minWhite = Math.min(r, g, b);
      // 240 → alpha 255 (fully opaque); 255 → alpha 0 (fully transparent)
      const alpha = Math.max(0, 255 - Math.round(((minWhite - 240) / 15) * 255));
      out[i + 3] = alpha;
      // For pixels we made fully transparent, skip the recolor branch.
      if (alpha === 0) continue;
    }
    // Skip near-black anti-alias seams (rare in this asset).
    if (r < 8 && g < 8 && b < 8) continue;

    const [h, s, l] = rgbToHsl(r, g, b);

    let newH = h;
    if (h >= 200 && h <= 260) {
      newH = TARGET_DARK_GREEN_HUE;
    } else if (h >= 160 && h < 200) {
      newH = TARGET_BRIGHT_GREEN_HUE;
    } else {
      // Out of the blue/cyan band — leave it alone (some text glyphs may
      // render with subpixel hues outside the band).
      continue;
    }

    // Forest green reads muted, not vibrant. Cap saturation so the spring-
    // green emerald the naive hue rotation produces shifts toward sage.
    // Also nudge lightness down a hair so the dark elements stay dark in
    // perceived brightness (greens look lighter than blues at equal HSL L).
    const newS = Math.min(s, 0.5);
    const newL = Math.max(0, l - 0.05);
    const [nr, ng, nb] = hslToRgb(newH, newS, newL);
    out[i] = nr;
    out[i + 1] = ng;
    out[i + 2] = nb;
  }

  await sharp(out, {
    raw: { width: info.width, height: info.height, channels },
  })
    .png()
    .toFile(output);

  console.log(`  recolored ${output} (${info.width}x${info.height})`);
}

/** Standard sRGB → HSL conversion. h ∈ [0,360), s,l ∈ [0,1]. */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      default: h = ((r - g) / d + 4) * 60;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

await recolor(INPUT_LOGO, OUTPUT_LOGO, 384);
await recolor(INPUT_ICON, OUTPUT_ICON, 256);
console.log("done");
