import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { Place, Search, Suggestion } from "./types";

function call<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (data: Req) => (await fn(data)).data;
}

export const createRound = call<
  { name: string; search: Omit<Search, "label"> & { label: string } },
  { sessionId: string; radiusM: number; placeCount: number }
>("createRound");

export const joinRound = call<
  { sessionId: string; name: string; reclaim?: boolean },
  { status: "joined" } | { status: "nameTaken"; name: string }
>("joinRound");

export const getRoundPlaces = call<{ sessionId: string }, { places: Place[] }>("getRoundPlaces");
export const getPhotos = call<{ sessionId: string; photoNames: string[] }, { photos: Record<string, string> }>(
  "getPhotos",
);
export const autocomplete = call<
  { input: string; sessionToken: string; near: { lat: number; lng: number } | null },
  { suggestions: Suggestion[] }
>("autocomplete");
export const resolveLocation = call<
  { placeId: string; sessionToken: string },
  { location: { lat: number; lng: number } }
>("resolveLocation");
export const closeRound = call<{ sessionId: string }, unknown>("closeRound");
export const removeMember = call<{ sessionId: string; memberId: string }, unknown>("removeMember");

/** Fehlermeldung für die Anzeige; Server-Meldungen sind schon auf Deutsch. */
export function errorText(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e?.code?.startsWith("functions/") && e.message && e.code !== "functions/internal") return e.message;
  if (e?.code === "functions/unavailable" || !navigator.onLine) return "Keine Verbindung. Bitte später nochmal versuchen.";
  return "Da ist etwas schiefgelaufen. Bitte nochmal versuchen.";
}
