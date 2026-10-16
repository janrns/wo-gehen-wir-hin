export type PlaceType = "restaurant" | "bar" | "cafe";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SearchParams {
  center: LatLng;
  label: string;
  radiusM: number;
  types: PlaceType[];
  priceLevels: number[];
  openFrom: string | null;
  openHours: number;
}

/** Welche Suchseiten pro Art abgefragt wurden – nötig, um die Suche später identisch zu wiederholen. */
export type SearchPlan = { type: PlaceType; pages: number }[];

/** Was die App für eine Karte braucht. Wird nie in Firestore gespeichert. */
export interface PlaceDetails {
  id: string;
  source: "google" | "sample";
  name: string;
  type: PlaceType;
  cuisine: string;
  rating: number | null;
  ratingCount: number;
  priceLevel: number | null;
  distanceM: number;
  address: string;
  mapsUrl: string;
  photoHue: number;
  emoji: string;
  openingHoursUnknown: boolean;
  photoName: string | null;
  photoAuthor: string | null;
}

export interface SearchResult {
  placeIds: string[];
  plan: SearchPlan;
  radiusM: number;
}

export interface Suggestion {
  placeId: string;
  main: string;
  secondary: string;
}

export interface PlacesProvider {
  search(search: SearchParams, maxPlaces: number, minPlaces: number, maxRadiusM: number): Promise<SearchResult>;
  details(search: SearchParams, plan: SearchPlan, ids: string[]): Promise<PlaceDetails[]>;
  photos(names: string[]): Promise<Record<string, string>>;
  autocomplete(input: string, sessionToken: string, near: LatLng | null): Promise<Suggestion[]>;
  location(placeId: string, sessionToken: string): Promise<LatLng>;
}
