import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  require.resolve("sharp");
} catch {
  console.error(
    "\n[ensure-sharp] Pacote \"sharp\" não encontrado.\n" +
      "Rode na raiz do site: npm install\n" +
      "No VPS (Linux): npm install --include=optional sharp\n",
  );
  process.exit(1);
}
