// Anbindung an die Google Places API (New). Läuft nur auf dem Server; der Schlüssel verlässt ihn nie.
// Gespeichert werden ausschließlich Place-IDs (erlaubt laut Google-Bedingungen), alle Inhalte werden frisch geladen.
import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";
import { boundingBox, distanceM } from "./geo";
import { isOpenDuring, type HoursInfo } from "./openingHours";
import { selectPlaces, type Candidate } from "./select";
import type {
  LatLng,
  PlaceDetails,
  PlaceType,
  PlacesProvider,
  SearchParams,
  SearchPlan,
  Suggestion,
} from "./types";

const API = "https://places.googleapis.com/v1";
const MAX_PAGES = 3;

const PLACE_FIELDS = [
  "id",
  "displayName",
  "primaryType",
  "primaryTypeDisplayName",
  "rating",
  "userRatingCount",
  "priceLevel",
  "shortFormattedAddress",
  "location",
  "photos",
  "googleMapsUri",
  "businessStatus",
  "regularOpeningHours",
  "currentOpeningHours",
  "utcOffsetMinutes",
];

const QUERY: Record<PlaceType, string> = { restaurant: "Restaurant", bar: "Bar", cafe: "Café" };
const TYPE_LABEL: Record<PlaceType, string> = { restaurant: "Restaurant", bar: "Bar", cafe: "Café" };

const PRICE_LEVEL: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const EMOJI: [RegExp, string][] = [
  [/italian|pizza/, "🍝"],
  [/japanese|sushi|ramen/, "🍣"],
  [/chinese|asian|thai|vietnamese|korean|indian/, "🍜"],
  [/mexican/, "🌮"],
  [/burger|american|fast_food/, "🍔"],
  [/steak|barbecue/, "🥩"],
  [/seafood|fish/, "🐟"],
  [/vegan|vegetarian/, "🥗"],
  [/greek|turkish|lebanese|middle_eastern|mediterranean|kebab/, "🧆"],
  [/spanish|tapas/, "🥘"],
  [/french/, "🥐"],
  [/german|bavarian/, "🥨"],
  [/breakfast|brunch/, "🍳"],
  [/bakery|dessert|cake|confectionery|ice_cream/, "🍰"],
  [/wine/, "🍷"],
  [/pub|beer|brewery/, "🍺"],
  [/cocktail|night_club|lounge/, "🍸"],
  [/tea/, "🍵"],
  [/cafe|coffee/, "☕"],
  [/bar/, "🍹"],
];

export interface GooglePlace extends HoursInfo {
  id: string;
  displayName?: { text: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  shortFormattedAddress?: string;
  location?: { latitude: number; longitude: number };
  photos?: { name: string; authorAttributions?: { displayName?: string }[] }[];
  googleMapsUri?: string;
  businessStatus?: string;
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Vor jedem Google-Aufruf: prüft die globale Tagesgrenze (Kostenbremse). */
export type BudgetGuard = (calls: number) => Promise<void>;

export function emojiFor(primaryType: string | undefined, type: PlaceType): string {
  const t = primaryType ?? "";
  return EMOJI.find(([re]) => re.test(t))?.[1] ?? { restaurant: "🍽️", bar: "🍹", cafe: "☕" }[type];
}

function openFlag(place: GooglePlace, search: SearchParams): boolean | null {
  if (!search.openFrom) return null;
  return isOpenDuring(place, Date.parse(search.openFrom), search.openHours);
}

export function toCandidate(place: GooglePlace, type: PlaceType, search: SearchParams): Candidate {
  const loc = place.location;
  return {
    id: place.id,
    type,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    priceLevel: place.priceLevel ? (PRICE_LEVEL[place.priceLevel] ?? null) : null,
    distanceM: loc ? distanceM(search.center, { lat: loc.latitude, lng: loc.longitude }) : Infinity,
    open: openFlag(place, search),
    operational: !place.businessStatus || place.businessStatus === "OPERATIONAL",
  };
}

export function toDetails(place: GooglePlace, type: PlaceType, search: SearchParams, index: number): PlaceDetails {
  const c = toCandidate(place, type, search);
  const photo = place.photos?.[0];
  return {
    id: place.id,
    source: "google",
    name: place.displayName?.text ?? "Unbekannter Ort",
    type,
    cuisine: place.primaryTypeDisplayName?.text ?? TYPE_LABEL[type],
    rating: c.rating,
    ratingCount: c.ratingCount,
    priceLevel: c.priceLevel,
    distanceM: Number.isFinite(c.distanceM) ? c.distanceM : 0,
    address: place.shortFormattedAddress ?? "",
    mapsUrl: place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    photoHue: (index * 47) % 360,
    emoji: emojiFor(place.primaryType, type),
    openingHoursUnknown: search.openFrom !== null && c.open === null,
    photoName: photo?.name ?? null,
    photoAuthor: photo?.authorAttributions?.[0]?.displayName ?? null,
  };
}

export function googleProvider(apiKey: string, guard: BudgetGuard, fetcher: Fetcher = fetch): PlacesProvider {
  async function call<T>(path: string, init: RequestInit & { fieldMask?: string }): Promise<T> {
    await guard(1);
    const headers: Record<string, string> = { "X-Goog-Api-Key": apiKey, "Content-Type": "application/json" };
    if (init.fieldMask) headers["X-Goog-FieldMask"] = init.fieldMask;
    let res: Response;
    try {
      res = await fetcher(`${API}${path}`, { ...init, headers, signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      logger.error("Places request failed", { path, err: String(err) });
      throw new HttpsError("unavailable", "Die Google-Ortssuche ist gerade nicht erreichbar.");
    }
    if (!res.ok) {
      logger.error("Places API error", { path, status: res.status, body: (await res.text()).slice(0, 500) });
      throw new HttpsError("unavailable", "Die Google-Ortssuche ist gerade nicht erreichbar.");
    }
    return (await res.json()) as T;
  }

  function textSearch(type: PlaceType, search: SearchParams, pageToken?: string) {
    const box = boundingBox(search.center, search.radiusM);
    return call<{ places?: GooglePlace[]; nextPageToken?: string }>("/places:searchText", {
      method: "POST",
      fieldMask: [...PLACE_FIELDS.map((f) => `places.${f}`), "nextPageToken"].join(","),
      body: JSON.stringify({
        textQuery: QUERY[type],
        includedType: type,
        languageCode: "de",
        regionCode: "DE",
        pageSize: 20,
        pageToken,
        locationRestriction: {
          rectangle: {
            low: { latitude: box.low.lat, longitude: box.low.lng },
            high: { latitude: box.high.lat, longitude: box.high.lng },
          },
        },
      }),
    });
  }

  /** Führt die Suche für eine Art aus; `fixedPages` wiederholt eine frühere Suche exakt. */
  async function searchType(type: PlaceType, search: SearchParams, wanted: number, fixedPages?: number) {
    const places: GooglePlace[] = [];
    let token: string | undefined;
    let pages = 0;
    do {
      const page = await textSearch(type, search, token);
      pages++;
      places.push(...(page.places ?? []));
      token = page.nextPageToken;
      const enough =
        fixedPages !== undefined
          ? pages >= fixedPages
          : selectPlaces(places.map((p) => toCandidate(p, type, search)), { ...search, types: [type] }, wanted)
              .length >= wanted;
      if (enough) break;
    } while (token && pages < MAX_PAGES);
    return { places, pages };
  }

  return {
    async search(search, maxPlaces, minPlaces, maxRadiusM) {
      const perType = Math.ceil(maxPlaces / search.types.length) + 3;
      let current = { ...search };
      for (let attempt = 0; ; attempt++) {
        const results = await Promise.all(search.types.map((t) => searchType(t, current, perType)));
        const candidates = results.flatMap((r, i) => r.places.map((p) => toCandidate(p, search.types[i], current)));
        const placeIds = selectPlaces(candidates, current, maxPlaces);
        const plan: SearchPlan = results.map((r, i) => ({ type: search.types[i], pages: r.pages }));
        // Zu wenige Treffer: Umkreis höchstens zweimal verdoppeln.
        if (placeIds.length >= minPlaces || attempt >= 2 || current.radiusM >= maxRadiusM) {
          return { placeIds, plan, radiusM: current.radiusM };
        }
        current = { ...current, radiusM: Math.min(current.radiusM * 2, maxRadiusM) };
      }
    },

    async details(search, plan, ids) {
      const found = new Map<string, { place: GooglePlace; type: PlaceType }>();
      const results = await Promise.all(plan.map((p) => searchType(p.type, search, 0, p.pages)));
      results.forEach((r, i) => r.places.forEach((place) => found.has(place.id) || found.set(place.id, { place, type: plan[i].type })));

      // Orte, die die wiederholte Suche nicht mehr liefert, einzeln nachladen.
      const missing = ids.filter((id) => !found.has(id));
      await Promise.all(
        missing.map(async (id) => {
          try {
            const place = await call<GooglePlace>(`/places/${encodeURIComponent(id)}?languageCode=de`, {
              method: "GET",
              fieldMask: PLACE_FIELDS.join(","),
            });
            found.set(id, { place, type: plan[0]?.type ?? "restaurant" });
          } catch {
            // Ort nicht mehr verfügbar – Karte entfällt.
          }
        }),
      );
      return ids.flatMap((id, i) => {
        const hit = found.get(id);
        return hit ? [toDetails(hit.place, hit.type, search, i)] : [];
      });
    },

    async photos(names) {
      const entries = await Promise.all(
        names.map(async (name) => {
          try {
            const res = await call<{ photoUri?: string }>(`/${name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
              method: "GET",
            });
            return res.photoUri ? [[name, res.photoUri] as const] : [];
          } catch {
            return [];
          }
        }),
      );
      return Object.fromEntries(entries.flat());
    },

    async autocomplete(input, sessionToken, near): Promise<Suggestion[]> {
      const res = await call<{
        suggestions?: {
          placePrediction?: {
            placeId: string;
            structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
            text?: { text: string };
          };
        }[];
      }>("/places:autocomplete", {
        method: "POST",
        body: JSON.stringify({
          input,
          sessionToken,
          languageCode: "de",
          regionCode: "DE",
          ...(near && { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 50_000 } } }),
        }),
      });
      return (res.suggestions ?? []).flatMap((s) => {
        const p = s.placePrediction;
        if (!p) return [];
        return [
          {
            placeId: p.placeId,
            main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
            secondary: p.structuredFormat?.secondaryText?.text ?? "",
          },
        ];
      });
    },

    async location(placeId, sessionToken): Promise<LatLng> {
      const res = await call<{ location?: { latitude: number; longitude: number } }>(
        `/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
        { method: "GET", fieldMask: "location" },
      );
      if (!res.location) throw new HttpsError("not-found", "Ort nicht gefunden.");
      return { lat: res.location.latitude, lng: res.location.longitude };
    },
  };
}
