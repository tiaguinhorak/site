## Anchor Summary

### Goal
Integrate the Next.js/Prisma site with the C# AC system (API + WPF client) by sharing the same PostgreSQL database. Unify authentication so site users can log in on the client. Simplify the client to auto-monitor after login (no match input). Match/partida management is handled entirely on the website.

### Key Decisions
- **Shared database, separate ORMs**: API and site use the same PostgreSQL database (Neon). EF Core manages AC tables (Clients, Detections, Licenses, Logs, Matches, Games, Players) with `int` IDs. Prisma manages site tables (User, Punishment, etc.) with `cuid` string IDs.
- **API reads site's User table for auth**: No duplicated User table in EF Core. API connects to the shared DB via Npgsql, queries the Prisma `User` table with raw SQL, and verifies passwords with BCrypt.Net. JWT carries the cuid as user identifier.
- **Client is thin**: After login, client auto-starts monitoring (no "enter match" UI). All match/partida features are on the website.
- **Passwords**: Site uses bcrypt (12 rounds). API verifies with `BCrypt.Net.BCrypt.Verify`.

### Important Details
- Prisma generates case-sensitive table names in PostgreSQL → API queries `FROM "User"` (quoted).
- Prisma field names map to column names in camelCase by default → `passwordHash`, `firstName`, `isAdmin` (not snake_case).
- EF Core `EnsureCreated()` does NOT create tables when the database already has tables from other ORMs → server uses raw `CREATE TABLE IF NOT EXISTS` on startup.
- The site `PrismaClient` uses `@prisma/adapter-pg` adapter (not `datasourceUrl` constructor option, which is not supported in Prisma 7).
- Seed user: `admin@clutchclube.com` / `Test1234!`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Before UI, i18n, theme, or profile work:** read `GLOBAL.md` in this directory.
<!-- END:nextjs-agent-rules -->
