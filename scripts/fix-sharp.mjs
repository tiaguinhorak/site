import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nodeModules = path.join(root, "node_modules");

function rmSafe(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}

console.log("[fix-sharp] Limpando instalação parcial do sharp...");

if (fs.existsSync(nodeModules)) {
  for (const entry of fs.readdirSync(nodeModules)) {
    if (entry === "sharp" || entry.startsWith(".sharp-")) {
      rmSafe(path.join(nodeModules, entry));
    }
  }

  const imgDir = path.join(nodeModules, "@img");
  if (fs.existsSync(imgDir)) {
    for (const entry of fs.readdirSync(imgDir)) {
      if (entry.startsWith("sharp")) {
        rmSafe(path.join(imgDir, entry));
      }
    }
  }
}

console.log("[fix-sharp] Reinstalando sharp (com optional deps para Linux)...");

execSync("npm install --include=optional sharp", {
  stdio: "inherit",
  cwd: root,
});

console.log("[fix-sharp] OK — sharp instalado.");
