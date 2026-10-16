import type { Timestamp } from "firebase/firestore";

export type PlaceType = "restaurant" | "bar" | "cafe";

export interface Search {
  center: { lat: number; lng: number };
  label: string;
  radiusM: number;
  types: PlaceType[];
  priceLevels: number[];
  openFrom: string | null;
  openHours: number;
}

export interface RankingEntry {
  placeId: string;
  likes: number;
  seen: number;
}

export interface Session {
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: "open" | "closed";
  search: Search;
  placeIds: string[];
  ranking: RankingEntry[];
  perfectMatchIds: string[];
}

export interface Member {
  id: string;
  name: string;
  joinedAt?: Timestamp;
  done: boolean;
  removed: boolean;
}

export interface Place {
  id: string;
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
}
