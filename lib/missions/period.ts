import type { MissionPeriod } from "@/lib/generated/prisma/client";

const TIMEZONE = "America/Sao_Paulo";

type DateParts = { year: number; month: number; day: number };

function getZonedParts(date: Date): DateParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const lookup = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { year: lookup("year"), month: lookup("month"), day: lookup("day") };
}

/** ISO-8601 week number from Y/M/D (treated as a calendar date). */
function isoWeek({ year, month, day }: DateParts): { year: number; week: number } {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return { year: isoYear, week };
}

/** Stable key identifying the active window for a mission period. */
export function periodKeyFor(period: MissionPeriod, at: Date = new Date()): string {
  const parts = getZonedParts(at);
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");

  switch (period) {
    case "DAILY":
      return `${parts.year}-${mm}-${dd}`;
    case "WEEKLY": {
      const { year, week } = isoWeek(parts);
      return `${year}-W${String(week).padStart(2, "0")}`;
    }
    case "MONTHLY":
      return `${parts.year}-${mm}`;
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}
