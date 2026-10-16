import { initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getPlaceDetails, searchPlaces, type LatLng, type PlaceType, type SearchParams } from "./places";
import { computeRanking, type TieBreak } from "./ranking";

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "europe-west3", maxInstances: 5 });

const ROUND_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ROUNDS_PER_DAY = 10;
const MIN_PLACES = 10;
const MAX_RADIUS_M = 20_000;
const PLACE_TYPES: PlaceType[] = ["restaurant", "bar", "cafe"];

// TODO(Woche 2): enforceAppCheck auf true setzen, sobald App Check eingerichtet ist.
const callableOptions = { enforceAppCheck: false };

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

/** Rundet auf ca. 200 m, damit keine genaue (Wohn-)Adresse gespeichert wird. */
function roundCenter({ lat, lng }: LatLng): LatLng {
  const step = 0.002;
  return { lat: Math.round(lat / step) * step, lng: Math.round(lng / (step * 1.5)) * step * 1.5 };
}

function cleanSearch(raw: any): SearchParams {
  const lat = Number(raw?.center?.lat);
  const lng = Number(raw?.center?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new HttpsError("invalid-argument", "Ungültiger Ausgangspunkt.");
  }
  const types = PLACE_TYPES.filter((t) => Array.isArray(raw?.types) && raw.types.includes(t));
  const priceLevels = [1, 2, 3, 4].filter((p) => Array.isArray(raw?.priceLevels) && raw.priceLevels.includes(p));
  if (types.length === 0) throw new HttpsError("invalid-argument", "Bitte mindestens eine Art wählen.");
  if (priceLevels.length === 0) throw new HttpsError("invalid-argument", "Bitte mindestens ein Preisniveau wählen.");
  const radiusM = Math.min(Math.max(Number(raw?.radiusM) || 2000, 500), MAX_RADIUS_M);
  const openFrom = typeof raw?.openFrom === "string" && !Number.isNaN(Date.parse(raw.openFrom)) ? raw.openFrom : null;
  const openHours = Math.min(Math.max(Number(raw?.openHours) || 2, 1), 6);
  const label = typeof raw?.label === "string" ? raw.label.trim().slice(0, 60) : "";
  return { center: roundCenter({ lat, lng }), label, radiusM, types, priceLevels, openFrom, openHours };
}

async function checkRateLimit(uid: string): Promise<void> {
  const ref = db.doc(`rateLimits/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const windowStart: number = snap.get("windowStart") ?? 0;
    const count: number = snap.get("count") ?? 0;
    if (now - windowStart > 24 * 60 * 60 * 1000) {
      tx.set(ref, { windowStart: now, count: 1 });
    } else if (count >= MAX_ROUNDS_PER_DAY) {
      throw new HttpsError("resource-exhausted", "Für heute wurden genug Runden erstellt.");
    } else {
      tx.update(ref, { count: count + 1 });
    }
  });
}

export const createRound = onCall(callableOptions, async (request) => {
  const uid = requireUid(request.auth);
  const name = cleanName(request.data?.name);
  const search = cleanSearch(request.data?.search);
  await checkRateLimit(uid);

  // Zu wenige Treffer: Umkreis schrittweise verdoppeln.
  let placeIds = searchPlaces(search);
  while (placeIds.length < MIN_PLACES && search.radiusM < MAX_RADIUS_M) {
    search.radiusM = Math.min(search.radiusM * 2, MAX_RADIUS_M);
    placeIds = searchPlaces(search);
  }
  if (placeIds.length === 0) {
    throw new HttpsError("not-found", "Keine passenden Lokale gefunden. Versuch es mit weniger Filtern.");
  }

  const sessionRef = db.collection("sessions").doc();
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(sessionRef, {
    createdBy: uid,
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + ROUND_LIFETIME_MS),
    status: "open",
    search,
    placeIds,
    ranking: placeIds.map((placeId) => ({ placeId, likes: 0, seen: 0 })),
    perfectMatchIds: [],
  });
  batch.set(sessionRef.collection("members").doc(uid), { name, joinedAt: now, done: false, removed: false });
  await batch.commit();
  return { sessionId: sessionRef.id, radiusM: search.radiusM, placeCount: placeIds.length };
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

/** Details für die Karten einer Runde. Nur für Teilnehmende. */
export const getRoundPlaces = onCall(callableOptions, async (request) => {
  const uid = requireUid(request.auth);
  const sessionRef = db.doc(`sessions/${cleanSessionId(request.data?.sessionId)}`);
  const [session, member] = await Promise.all([sessionRef.get(), sessionRef.collection("members").doc(uid).get()]);
  if (!session.exists) throw new HttpsError("not-found", "Diese Runde gibt es nicht (mehr).");
  if (!member.exists || member.get("removed")) throw new HttpsError("permission-denied", "Du bist nicht in dieser Runde.");
  return { places: getPlaceDetails(session.get("placeIds"), session.get("search.center")) };
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
    const placeIds: string[] = session.get("placeIds");
    const tieBreak: Record<string, TieBreak> = Object.fromEntries(
      getPlaceDetails(placeIds, session.get("search.center")).map((p) => [p.id, { rating: p.rating, distanceM: p.distanceM }]),
    );
    tx.update(sessionRef, computeRanking(placeIds, votesByMember, activeIds, tieBreak));
  });
}

export const onVotesWritten = onDocumentWritten("sessions/{sessionId}/votes/{uid}", (event) =>
  recomputeRanking(event.params.sessionId),
);

export const onMemberWritten = onDocumentWritten("sessions/{sessionId}/members/{uid}", (event) =>
  recomputeRanking(event.params.sessionId),
);

/** Löscht abgelaufene Runden inklusive Teilnehmenden und Swipes. */
export const cleanupRounds = onSchedule({ schedule: "every day 04:00", timeZone: "Europe/Berlin" }, async () => {
  const expired = await db.collection("sessions").where("expiresAt", "<", Timestamp.now()).limit(200).get();
  for (const doc of expired.docs) await db.recursiveDelete(doc.ref);
  const staleLimits = await db
    .collection("rateLimits")
    .where("windowStart", "<", Date.now() - 2 * 24 * 60 * 60 * 1000)
    .limit(500)
    .get();
  await Promise.all(staleLimits.docs.map((d) => d.ref.delete()));
});

