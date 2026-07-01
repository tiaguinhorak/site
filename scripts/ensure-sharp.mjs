import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  require.resolve("sharp");
} catch {
  console.error(
    "\n[ensure-sharp] Pacote \"sharp\" não encontrado.\n" +
      "Rode na raiz do site:\n" +
      "  npm run fix:sharp\n" +
      "Ou manualmente:\n" +
      "  rm -rf node_modules/sharp node_modules/.sharp-* node_modules/@img/sharp-*\n" +
      "  npm install --include=optional sharp\n",
  );
  process.exit(1);
}
