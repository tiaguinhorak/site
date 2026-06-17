import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "app");
const generatedDir = path.join(root, "lib", "generated");

const SOURCE_LOGO = "logo-clutchclube.png";

const copies = [
  { from: "favicon.ico", to: "favicon.ico" },
  { from: "icon1.png", to: "icon.png" },
  { from: "apple-icon.png", to: "apple-icon.png" },
];

const hashedFiles = [
  SOURCE_LOGO,
  "favicon.ico",
  "icon1.png",
  "apple-icon.png",
  "logo-CB.png",
  "banner-clutchclube.png",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png",
];

function generateFaviconsFromLogo() {
  const logoPath = path.join(publicDir, SOURCE_LOGO);
  if (!fs.existsSync(logoPath)) {
    console.warn(`[sync-brand-assets] missing source: public/${SOURCE_LOGO}`);
    return;
  }

  const result = spawnSync("python", ["scripts/generate-favicons.py"], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error("generate-favicons.py failed");
  }

  if (result.stdout) console.log(result.stdout.trim());
}

function copyBrandAssets() {
  for (const { from, to } of copies) {
    const src = path.join(publicDir, from);
    const dest = path.join(appDir, to);
    if (!fs.existsSync(src)) {
      console.warn(`[sync-brand-assets] missing: public/${from}`);
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log(`[sync-brand-assets] ${from} → app/${to}`);
  }
}

function computeAssetVersion() {
  const hash = crypto.createHash("md5");
  for (const file of hashedFiles) {
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) continue;
    hash.update(fs.readFileSync(filePath));
  }
  return hash.digest("hex").slice(0, 10);
}

function writeAssetVersion(version) {
  fs.mkdirSync(generatedDir, { recursive: true });
  const out = path.join(generatedDir, "asset-version.ts");
  fs.writeFileSync(
    out,
    `/** Gerado por scripts/sync-brand-assets.mjs — não edite manualmente */\nexport const ASSET_VERSION = "${version}";\n`,
  );
  console.log(`[sync-brand-assets] ASSET_VERSION=${version}`);
}

generateFaviconsFromLogo();
copyBrandAssets();
writeAssetVersion(computeAssetVersion());
