import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

/** Format an ISO date/Date in a specific IANA timezone. */
export function fmt(date: string | Date | null | undefined, pattern: string, timezone: string) {
  if (!date) return "";
  return format(new TZDate(new Date(date).getTime(), timezone), pattern);
}

/** Request-time clock helpers for Server Components (pages here are always dynamic). */
export function nowMs() {
  return Date.now();
}
export function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000);
}

export function compact(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
