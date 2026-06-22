import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");
const files = [
  "app/api/ranked/party/chat/route.ts",
  "app/api/ranked/party/activity/route.ts",
  "app/api/ranked/party/kick/route.ts",
  "app/api/ranked/party/route.ts",
  "app/api/ranked/rooms/[id]/join/route.ts",
  "app/api/ranked/rooms/route.ts",
  "app/api/ranked/session/route.ts",
  "app/api/ranked/queue/route.ts",
  "app/api/ranked/challenges/[id]/respond/route.ts",
  "app/api/ranked/challenges/route.ts",
  "app/api/ranked/parties/route.ts",
  "app/api/ranked/party/leave/route.ts",
  "app/api/ranked/party/join/route.ts",
  "app/api/lobby/rooms/[id]/start-match/route.ts",
  "app/api/lobby/rooms/[id]/join/route.ts",
  "app/api/lobby/auto/route.ts",
  "app/api/lobby/rooms/[id]/leave/route.ts",
  "app/api/lobby/rooms/[id]/route.ts",
  "app/api/lobby/route.ts",
];

const catchPattern =
  /} catch \(err\) \{[\s\S]*?return NextResponse\.json\(\{ error: message \}, \{ status \}\);\s*\}/g;

for (const rel of files) {
  const path = join(root, rel);
  let content = readFileSync(path, "utf8");
  if (!content.includes("handleApiError")) {
    content = content.replace(
      /from "@\/lib\/security\/api-guard";/,
      'from "@/lib/security/api-guard";\nimport { handleApiError } from "@/lib/i18n/api-route";',
    );
  }
  const newContent = content.replace(
    catchPattern,
    "} catch (err) {\n    return handleApiError(request, err);\n  }",
  );
  if (newContent !== content) {
    writeFileSync(path, newContent);
    console.log("Updated", rel);
  }
}
