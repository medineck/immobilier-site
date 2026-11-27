// Outils communs aux visites (serveur et navigateur)

export type Weekly = Record<string, [string, string] | null>;

export const DAYS = [
  { n: "1", label: "Lundi" },
  { n: "2", label: "Mardi" },
  { n: "3", label: "Mercredi" },
  { n: "4", label: "Jeudi" },
  { n: "5", label: "Vendredi" },
  { n: "6", label: "Samedi" },
  { n: "7", label: "Dimanche" },
];

export const DEFAULT_SCHEDULE = {
  visit_minutes: 30,
  buffer_minutes: 15,
  weekly: {
    "1": ["09:00", "19:00"],
    "2": ["09:00", "19:00"],
    "3": ["09:00", "19:00"],
    "4": ["09:00", "19:00"],
    "5": ["09:00", "19:00"],
    "6": ["09:00", "13:00"],
    "7": null,
  } as Weekly,
};

// Affichage des dates à l'heure de Paris
const tz = "Europe/Paris";
export const fmtDayShort = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
export const fmtDayLong = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
export const fmtTime = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
export const dayKey = new Intl.DateTimeFormat("fr-CA", { timeZone: tz }); // AAAA-MM-JJ

const fmtHour = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "numeric", minute: "2-digit" });

// « samedi 28 novembre à 9 h 00 »
export function fmtVisit(iso: string) {
  const d = new Date(iso);
  return `${fmtDayLong.format(d)} à ${fmtHour.format(d).replace(":", " h ")}`;
}
