import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/avatars/presets");

const themes = {
  viper: { bg: "#08050f", glowInner: "#d8b4fe", glowOuter: "#7c3aed", accent: "#f3e8ff" },
  ember: { bg: "#120806", glowInner: "#fb923c", glowOuter: "#7c3aed", accent: "#fed7aa" },
  frost: { bg: "#061018", glowInner: "#67e8f9", glowOuter: "#6366f1", accent: "#cffafe" },
  neon: { bg: "#061210", glowInner: "#4ade80", glowOuter: "#0d9488", accent: "#bbf7d0" },
  gold: { bg: "#0c0a06", glowInner: "#fbbf24", glowOuter: "#a855f7", accent: "#fde68a" },
  shadow: { bg: "#030303", glowInner: "#71717a", glowOuter: "#3f3f46", accent: "#c084fc" },
  crimson: { bg: "#0f0608", glowInner: "#fb7185", glowOuter: "#7c3aed", accent: "#fecdd3" },
  aurora: { bg: "#0a0612", glowInner: "#f472b6", glowOuter: "#6366f1", accent: "#e9d5ff" },
  toxic: { bg: "#061208", glowInner: "#a3e635", glowOuter: "#7c3aed", accent: "#d9f99d" },
  royal: { bg: "#060818", glowInner: "#60a5fa", glowOuter: "#4c1d95", accent: "#bfdbfe" },
};

function buildSvg(theme) {
  const { bg, glowInner, glowOuter, accent } = theme;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Clutch avatar">
  <defs>
    <radialGradient id="glow" cx="50%" cy="40%" r="62%">
      <stop offset="0%" stop-color="${glowInner}" stop-opacity="0.92"/>
      <stop offset="48%" stop-color="${glowOuter}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${bg}"/>
    </radialGradient>
    <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${glowOuter}" stop-opacity="0.35"/>
    </linearGradient>
    <filter id="logoGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="128" height="128" fill="${bg}"/>
  <rect width="128" height="128" fill="url(#glow)"/>
  <circle cx="104" cy="22" r="20" fill="${accent}" opacity="0.1"/>
  <circle cx="18" cy="112" r="26" fill="${glowInner}" opacity="0.07"/>
  <circle cx="96" cy="96" r="14" fill="${glowOuter}" opacity="0.12"/>
  <rect x="2.5" y="2.5" width="123" height="123" rx="22" fill="none" stroke="url(#rim)" stroke-width="2.5"/>
  <image href="/logo-clutchclube.png" x="16" y="12" width="96" height="96" preserveAspectRatio="xMidYMid meet" filter="url(#logoGlow)"/>
</svg>`;
}

fs.mkdirSync(outDir, { recursive: true });
for (const [id, theme] of Object.entries(themes)) {
  fs.writeFileSync(path.join(outDir, `${id}.svg`), buildSvg(theme), "utf8");
}
console.log(`Generated ${Object.keys(themes).length} clutch avatar presets in public/avatars/presets/`);
