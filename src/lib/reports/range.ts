/** Report date ranges, in whole days of Sri Lanka time (UTC+05:30, no daylight saving). */

export const PRESETS = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "12m", label: "12 months", days: 365 },
] as const;

export type Bucket = "day" | "week" | "month";

export type ReportRange = {
  preset: string;
  /** Inclusive first day and last day, YYYY-MM-DD (Sri Lanka). */
  fromDay: string;
  toDay: string;
  /** ISO instants: from inclusive, to exclusive. */
  from: string;
  to: string;
  bucket: Bucket;
  label: string;
};

const OFFSET = "+05:30";
const DAY_MS = 86_400_000;
const isDay = (s: string | undefined): s is string => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00${OFFSET}`)));

export function todayInColombo(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00${OFFSET}`);
  return new Date(d.getTime() + n * DAY_MS).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

export function parseRange(params: { range?: string; from?: string; to?: string }): ReportRange {
  const today = todayInColombo();
  let fromDay: string;
  let toDay: string;
  let preset = params.range ?? "30d";

  if (preset === "custom" && isDay(params.from) && isDay(params.to) && params.from <= params.to) {
    fromDay = params.from;
    toDay = params.to > today ? today : params.to;
    // Reports cover at most three years.
    if (Date.parse(toDay) - Date.parse(fromDay) > 3 * 365 * DAY_MS) fromDay = addDays(toDay, -3 * 365);
  } else {
    const p = PRESETS.find((x) => x.value === preset) ?? PRESETS[1];
    preset = p.value;
    toDay = today;
    fromDay = addDays(today, -(p.days - 1));
  }

  const days = Math.round((Date.parse(toDay) - Date.parse(fromDay)) / DAY_MS) + 1;
  const bucket: Bucket = days <= 45 ? "day" : days <= 200 ? "week" : "month";
  return {
    preset,
    fromDay,
    toDay,
    from: new Date(`${fromDay}T00:00:00${OFFSET}`).toISOString(),
    to: new Date(`${addDays(toDay, 1)}T00:00:00${OFFSET}`).toISOString(),
    bucket,
    label: `${fmt.format(new Date(`${fromDay}T12:00:00${OFFSET}`))} – ${fmt.format(new Date(`${toDay}T12:00:00${OFFSET}`))}`,
  };
}

export function rangeQuery(r: Pick<ReportRange, "preset" | "fromDay" | "toDay">) {
  return r.preset === "custom" ? `range=custom&from=${r.fromDay}&to=${r.toDay}` : `range=${r.preset}`;
}
