import type { PlaceType, SearchParams } from "./types";

export interface Candidate {
  id: string;
  type: PlaceType;
  rating: number | null;
  ratingCount: number;
  priceLevel: number | null;
  distanceM: number;
  /** Ergebnis der Öffnungszeiten-Prüfung; `null` = unbekannt oder kein Zeitpunkt gewählt. */
  open: boolean | null;
  operational: boolean;
}

/** Gute Bewertung mit vielen Stimmen schlägt eine 5,0 mit drei Stimmen. */
export function score(c: Pick<Candidate, "rating" | "ratingCount">): number {
  if (c.rating === null) return 0;
  return c.rating * Math.log10(10 + c.ratingCount);
}

export function passesFilters(c: Candidate, search: SearchParams): boolean {
  return (
    c.operational &&
    c.distanceM <= search.radiusM &&
    (c.priceLevel === null || search.priceLevels.includes(c.priceLevel)) &&
    c.open !== false
  );
}

/**
 * Filtert, entfernt Doppelte und mischt die Arten reihum (beste zuerst),
 * damit der Stapel nicht mit zehn Restaurants am Stück beginnt.
 */
export function selectPlaces(candidates: Candidate[], search: SearchParams, maxPlaces: number): string[] {
  const seen = new Set<string>();
  const byType = new Map<PlaceType, Candidate[]>(search.types.map((t) => [t, []]));
  for (const c of candidates) {
    if (seen.has(c.id) || !passesFilters(c, search)) continue;
    seen.add(c.id);
    byType.get(c.type)?.push(c);
  }
  const queues = [...byType.values()].map((list) => list.sort((a, b) => score(b) - score(a)));
  const result: string[] = [];
  while (result.length < maxPlaces && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && result.length < maxPlaces) result.push(next.id);
    }
  }
  return result;
}
