// Prüft, ob ein Ort während eines Zeitfensters durchgehend geöffnet hat.
// Datenformat wie in der Google Places API (New): Wochentag 0 = Sonntag, Zeiten in Ortszeit.

interface Point {
  day?: number;
  hour?: number;
  minute?: number;
  date?: { year: number; month: number; day: number };
}

export interface OpeningHours {
  periods?: { open?: Point; close?: Point }[];
}

export interface HoursInfo {
  utcOffsetMinutes?: number;
  regularOpeningHours?: OpeningHours;
  currentOpeningHours?: OpeningHours;
}

const WEEK = 7 * 24 * 60;
const MINUTE_MS = 60_000;

/** Standardversatz für Orte ohne Angabe: deutsche Zeit zum jeweiligen Zeitpunkt. */
export function berlinOffsetMinutes(atMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(new Date(atMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((local - Math.floor(atMs / MINUTE_MS) * MINUTE_MS) / MINUTE_MS);
}

function isAlwaysOpen(hours: OpeningHours): boolean {
  const p = hours.periods;
  return p?.length === 1 && !p[0].close && (p[0].open?.day ?? 0) === 0 && (p[0].open?.hour ?? 0) === 0;
}

function checkDated(hours: OpeningHours, startMs: number, endMs: number, offset: number): boolean | null {
  const periods = hours.periods ?? [];
  const toMs = (p: Point) =>
    p.date ? Date.UTC(p.date.year, p.date.month - 1, p.date.day, p.hour ?? 0, p.minute ?? 0) - offset * MINUTE_MS : null;
  const dated = periods.map((p) => ({ open: p.open && toMs(p.open), close: p.close && toMs(p.close) }));
  if (dated.length === 0 || dated.some((p) => p.open == null || p.close == null)) return null;
  const lastClose = Math.max(...dated.map((p) => p.close!));
  if (endMs > lastClose) return null; // Zeitfenster liegt außerhalb der bekannten 7 Tage
  return dated.some((p) => p.open! <= startMs && endMs <= p.close!);
}

function checkRegular(hours: OpeningHours, startMs: number, durationMin: number, offset: number): boolean | null {
  const periods = hours.periods ?? [];
  if (periods.length === 0) return null;
  const local = new Date(startMs + offset * MINUTE_MS);
  const ws = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes();
  const we = ws + durationMin;
  const toMin = (p?: Point) => (p?.day ?? 0) * 1440 + (p?.hour ?? 0) * 60 + (p?.minute ?? 0);
  return periods.some((p) => {
    if (!p.open || !p.close) return false;
    const o = toMin(p.open);
    let c = toMin(p.close);
    if (c <= o) c += WEEK;
    return [-WEEK, 0, WEEK].some((shift) => o + shift <= ws && we <= c + shift);
  });
}

/** `true` = durchgehend geöffnet, `false` = nicht, `null` = unbekannt. */
export function isOpenDuring(place: HoursInfo, startMs: number, hours: number): boolean | null {
  const offset = place.utcOffsetMinutes ?? berlinOffsetMinutes(startMs);
  const endMs = startMs + hours * 60 * MINUTE_MS;
  const regular = place.regularOpeningHours;
  const current = place.currentOpeningHours;
  if ((regular && isAlwaysOpen(regular)) || (current && isAlwaysOpen(current))) return true;
  // Tagesaktuelle Zeiten (inkl. Feiertage) haben Vorrang, sofern das Zeitfenster abgedeckt ist.
  if (current) {
    const result = checkDated(current, startMs, endMs, offset);
    if (result !== null) return result;
  }
  if (regular) return checkRegular(regular, startMs, hours * 60, offset);
  return null;
}
