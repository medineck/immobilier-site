// Calculs de dates pour l'agenda, toujours à l'heure de Paris

const tz = "Europe/Paris";
const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: tz,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Jour (AAAA-MM-JJ) et minutes depuis minuit, à Paris
export function paris(d: Date | string) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const asUTC = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const toKey = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(key: string, n: number) {
  const d = asUTC(key);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
}

// Lundi de la semaine contenant ce jour
export function mondayOf(key: string) {
  const dow = (asUTC(key).getUTCDay() + 6) % 7; // 0 = lundi
  return addDays(key, -dow);
}

export function weekDays(monday: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const dayLabel = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const dayLabelLong = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
export const labelDay = (key: string) => dayLabel.format(asUTC(key));
export const labelDayLong = (key: string) => dayLabelLong.format(asUTC(key));
export const isValidKey = (k: unknown): k is string => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k) && !isNaN(asUTC(k).getTime());

export const fmtHM = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;

// Portion d'un intervalle tombant sur un jour donné (en minutes depuis minuit), ou null
export function segmentOnDay(start: string, end: string, day: string) {
  const s = paris(start);
  const e = paris(end);
  if (s.key > day || e.key < day) return null;
  const from = s.key === day ? s.minutes : 0;
  const to = e.key === day ? e.minutes : 24 * 60;
  return to > from ? { from, to } : null;
}
