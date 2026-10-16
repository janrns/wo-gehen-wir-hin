import { initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { googleProvider } from "./google";
import { budgetGuard, consumeUserLimit } from "./limits";
import { computeRanking } from "./ranking";
import { sampleProvider } from "./sample";
import type { LatLng, PlaceType, PlacesProvider, SearchParams, SearchPlan } from "./types";

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "europe-west3", maxInstances: 5 });

// Schlüssel liegt im Secret Manager. Wert "sample" = Beispiel-Lokale (lokale Entwicklung).
const PLACES_API_KEY = defineSecret("PLACES_API_KEY");

const ROUND_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PLACES = 25;
const MIN_PLACES = 10;
const MAX_RADIUS_M = 20_000;
const MAX_PHOTOS_PER_CALL = 6;
const PLACE_TYPES: PlaceType[] = ["restaurant", "bar", "cafe"];

// TODO: enforceAppCheck auf true setzen, sobald App Check eingerichtet ist.
const callableOptions = { enforceAppCheck: false };
const placesOptions = { ...callableOptions, secrets: [PLACES_API_KEY] };

function places(): PlacesProvider {
  const key = PLACES_API_KEY.value();
  return !key || key === "sample" ? sampleProvider : googleProvider(key, budgetGuard(db));
}

function requireUid(auth: { uid: string } | undefined): string {
  if (!auth) throw new HttpsError("unauthenticated", "Bitte neu laden.");
  return auth.uid;
}

function cleanName(value: unknown): string {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (name.length < 1 || name.length > 30) {
    throw new HttpsError("invalid-argument", "Der Name muss 1–30 Zeichen lang sein.");
  }
  return name;
}

function cleanSessionId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9]{20}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Ungültiger Link.");
  }
  return value;
}

function cleanSessionToken(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Ungültige Anfrage.");
  }
  return value;
}

function cleanLatLng(raw: any): LatLng | null {
  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Rundet auf ca. 200 m, damit keine genaue (Wohn-)Adresse gespeichert wird. */
function roundCenter({ lat, lng }: LatLng): LatLng {
  const step = 0.002;
  return { lat: Math.round(lat / step) * step, lng: Math.round(lng / (step * 1.5)) * step * 1.5 };
}

function cleanSearch(raw: any): SearchParams {
  const center = cleanLatLng(raw?.center);
  if (!center) throw new HttpsError("invalid-argument", "Ungültiger Ausgangspunkt.");
  const types = PLACE_TYPES.filter((t) => Array.isArray(raw?.types) && raw.types.includes(t));
  const priceLevels = [1, 2, 3, 4].filter((p) => Array.isArray(raw?.priceLevels) && raw.priceLevels.includes(p));
  if (types.length === 0) throw new HttpsError("invalid-argument", "Bitte mindestens eine Art wählen.");
  if (priceLevels.length === 0) throw new HttpsError("invalid-argument", "Bitte mindestens ein Preisniveau wählen.");
  const radiusM = Math.min(Math.max(Number(raw?.radiusM) || 2000, 500), MAX_RADIUS_M);
  const openFrom = typeof raw?.openFrom === "string" && !Number.isNaN(Date.parse(raw.openFrom)) ? raw.openFrom : null;
  const openHours = Math.min(Math.max(Number(raw?.openHours) || 2, 1), 6);
  const label = typeof raw?.label === "string" ? raw.label.trim().slice(0, 60) : "";
  return { center: roundCenter(center), label, radiusM, types, priceLevels, openFrom, openHours };
}

async function requireMember(uid: string, sessionId: string) {
  const sessionRef = db.doc(`sessions/${sessionId}`);
  const [session, member] = await Promise.all([sessionRef.get(), sessionRef.collection("members").doc(uid).get()]);
  if (!session.exists) throw new HttpsError("not-found", "Diese Runde gibt es nicht (mehr).");
  if (!member.exists || member.get("removed")) throw new HttpsError("permission-denied", "Du bist nicht in dieser Runde.");
  return session;
}

export const createRound = onCall(placesOptions, async (request) => {
  const uid = requireUid(request.auth);
  const name = cleanName(request.data?.name);
  const search = cleanSearch(request.data?.search);
  await consumeUserLimit(db, uid, "rounds");

  const result = await places().search(search, MAX_PLACES, MIN_PLACES, MAX_RADIUS_M);
  if (result.placeIds.length === 0) {
    throw new HttpsError("not-found", "Keine passenden Lokale gefunden. Versuch es mit weniger Filtern oder größerem Umkreis.");
  }
  search.radiusM = result.radiusM;

  const sessionRef = db.collection("sessions").doc();
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(sessionRef, {
    createdBy: uid,
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + ROUND_LIFETIME_MS),
    status: "open",
    search,
    searchPlan: result.plan,
    placeIds: result.placeIds,
    ranking: result.placeIds.map((placeId) => ({ placeId, likes: 0, seen: 0 })),
    perfectMatchIds: [],
  });
  batch.set(sessionRef.collection("members").doc(uid), { name, joinedAt: now, done: false, removed: false });
  await batch.commit();
  return { sessionId: sessionRef.id, radiusM: search.radiusM, placeCount: result.placeIds.length };
});

export const joinRound = onCall(callableOptions, async (request) => {
  const uid = requireUid(request.auth);
  const sessionId = cleanSessionId(request.data?.sessionId);
  const name = cleanName(request.data?.name);
  const reclaim = request.data?.reclaim === true;
  const sessionRef = db.doc(`sessions/${sessionId}`);

  return db.runTransaction(async (tx) => {
    const session = await tx.get(sessionRef);
    if (!session.exists) throw new HttpsError("not-found", "Diese Runde gibt es nicht (mehr).");
    const members = await tx.get(sessionRef.collection("members"));
    const own = members.docs.find((d) => d.id === uid);
    if (own?.get("removed")) throw new HttpsError("permission-denied", "Du wurdest aus dieser Runde entfernt.");
    if (own) {
      tx.update(own.ref, { name });
      return { status: "joined" };
    }
    if (session.get("status") !== "open") throw new HttpsError("failed-precondition", "Diese Runde ist schon beendet.");

    const sameName = members.docs.find((d) => (d.get("name") as string).toLowerCase() === name.toLowerCase());
    if (sameName && !reclaim) return { status: "nameTaken", name: sameName.get("name") };
    if (sameName?.get("removed")) throw new HttpsError("permission-denied", "Diese Person wurde aus der Runde entfernt.");

    if (sameName) {
      // Gerät/Browser gewechselt: Teilnahme und Swipes auf die neue Identität übertragen.
      const oldVotesRef = sessionRef.collection("votes").doc(sameName.id);
      const oldVotes = await tx.get(oldVotesRef);
      tx.set(sessionRef.collection("members").doc(uid), sameName.data());
      tx.delete(sameName.ref);
      if (oldVotes.exists) {
        tx.set(sessionRef.collection("votes").doc(uid), oldVotes.data()!);
        tx.delete(oldVotesRef);
      }
      if (session.get("createdBy") === sameName.id) tx.update(sessionRef, { createdBy: uid });
      return { status: "joined" };
    }

    tx.set(sessionRef.collection("members").doc(uid), {
      name,
      joinedAt: Timestamp.now(),
      done: false,
      removed: false,
    });
    return { status: "joined" };
  });
});

async function requireCreator(uid: string, sessionId: string) {
  const sessionRef = db.doc(`sessions/${sessionId}`);
  const session = await sessionRef.get();
  if (!session.exists) throw new HttpsError("not-found", "Diese Runde gibt es nicht (mehr).");
  if (session.get("createdBy") !== uid) {
    throw new HttpsError("permission-denied", "Nur wer die Runde erstellt hat, darf das.");
  }
  return sessionRef;
}

export const closeRound = onCall(callableOptions, async (request) => {
  const uid = requireUid(request.auth);
  const sessionRef = await requireCreator(uid, cleanSessionId(request.data?.sessionId));
  await sessionRef.update({ status: "closed" });
  return { status: "closed" };
});

export const removeMember = onCall(callableOptions, async (request) => {
  const uid = requireUid(request.auth);
  const sessionRef = await requireCreator(uid, cleanSessionId(request.data?.sessionId));
  const memberId = request.data?.memberId;
  if (typeof memberId !== "string" || memberId === uid) {
    throw new HttpsError("invalid-argument", "Diese Person kann nicht entfernt werden.");
  }
  const memberRef = sessionRef.collection("members").doc(memberId);
  if (!(await memberRef.get()).exists) throw new HttpsError("not-found", "Person nicht gefunden.");
  await memberRef.update({ removed: true });
  return { status: "removed" };
});

/** Details für die Karten einer Runde – jedes Mal frisch von Google, nichts davon wird gespeichert. */
export const getRoundPlaces = onCall(placesOptions, async (request) => {
  const uid = requireUid(request.auth);
  const session = await requireMember(uid, cleanSessionId(request.data?.sessionId));
  await consumeUserLimit(db, uid, "placeLoads");
  const search = session.get("search") as SearchParams;
  const plan = (session.get("searchPlan") as SearchPlan | undefined) ?? search.types.map((type) => ({ type, pages: 1 }));
  const placeIds = session.get("placeIds") as string[];
  // Runden aus der Testphase enthalten Beispiel-Lokale.
  const provider = placeIds[0]?.startsWith("sample-") ? sampleProvider : places();
  return { places: await provider.details(search, plan, placeIds) };
});

/** Foto-Adressen für einzelne Karten (wird erst geladen, wenn die Karte gleich sichtbar wird). */
export const getPhotos = onCall(placesOptions, async (request) => {
  const uid = requireUid(request.auth);
  const session = await requireMember(uid, cleanSessionId(request.data?.sessionId));
  const placeIds = new Set(session.get("placeIds") as string[]);
  const raw: unknown[] = Array.isArray(request.data?.photoNames) ? request.data.photoNames : [];
  const names = [...new Set(raw)]
    .filter((n): n is string => typeof n === "string")
    .filter((n) => {
      const m = n.match(/^places\/([A-Za-z0-9_-]+)\/photos\/[A-Za-z0-9_-]+$/);
      return m !== null && placeIds.has(m[1]);
    })
    .slice(0, MAX_PHOTOS_PER_CALL);
  if (names.length === 0) return { photos: {} };
  await consumeUserLimit(db, uid, "photos", names.length);
  return { photos: await places().photos(names) };
});

/** Adress-Vorschläge beim Erstellen einer Runde. */
export const autocomplete = onCall(placesOptions, async (request) => {
  const uid = requireUid(request.auth);
  const input = typeof request.data?.input === "string" ? request.data.input.trim().slice(0, 100) : "";
  if (input.length < 3) return { suggestions: [] };
  const sessionToken = cleanSessionToken(request.data?.sessionToken);
  await consumeUserLimit(db, uid, "autocomplete");
  return { suggestions: await places().autocomplete(input, sessionToken, cleanLatLng(request.data?.near)) };
});

/** Koordinaten zu einem gewählten Adress-Vorschlag. */
export const resolveLocation = onCall(placesOptions, async (request) => {
  const uid = requireUid(request.auth);
  const placeId = typeof request.data?.placeId === "string" ? request.data.placeId : "";
  if (!/^[A-Za-z0-9_:.,-]{1,300}$/.test(placeId)) throw new HttpsError("invalid-argument", "Ungültiger Ort.");
  const sessionToken = cleanSessionToken(request.data?.sessionToken);
  await consumeUserLimit(db, uid, "autocomplete");
  return { location: await places().location(placeId, sessionToken) };
});

async function recomputeRanking(sessionId: string): Promise<void> {
  const sessionRef = db.doc(`sessions/${sessionId}`);
  await db.runTransaction(async (tx) => {
    const session = await tx.get(sessionRef);
    if (!session.exists) return;
    const [members, votes] = await Promise.all([
      tx.get(sessionRef.collection("members")),
      tx.get(sessionRef.collection("votes")),
    ]);
    const activeIds = members.docs.filter((d) => !d.get("removed")).map((d) => d.id);
    const votesByMember = Object.fromEntries(votes.docs.map((d) => [d.id, (d.get("votes") ?? {}) as Record<string, unknown>]));
    tx.update(sessionRef, computeRanking(session.get("placeIds"), votesByMember, activeIds));
  });
}

export const onVotesWritten = onDocumentWritten("sessions/{sessionId}/votes/{uid}", (event) =>
  recomputeRanking(event.params.sessionId),
);

export const onMemberWritten = onDocumentWritten("sessions/{sessionId}/members/{uid}", (event) =>
  recomputeRanking(event.params.sessionId),
);

/** Löscht abgelaufene Runden inklusive Teilnehmenden und Swipes sowie alte Zähler. */
export const cleanupRounds = onSchedule({ schedule: "every day 04:00", timeZone: "Europe/Berlin" }, async () => {
  const expired = await db.collection("sessions").where("expiresAt", "<", Timestamp.now()).limit(200).get();
  for (const doc of expired.docs) await db.recursiveDelete(doc.ref);
  const staleLimits = await db
    .collection("rateLimits")
    .where("lastUsed", "<", Date.now() - 2 * 24 * 60 * 60 * 1000)
    .limit(500)
    .get();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const oldUsage = await db.collection("usage").where("__name__", "<", db.doc(`usage/${cutoff}`)).limit(100).get();
  await Promise.all([...staleLimits.docs, ...oldUsage.docs].map((d) => d.ref.delete()));
});
