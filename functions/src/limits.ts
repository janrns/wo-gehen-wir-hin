import type { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Harte Obergrenze für Google-Aufrufe pro Tag über alle Nutzer hinweg.
 * Ersatz für API-Kontingente, die im Testzeitraum nicht einstellbar sind.
 */
export const GOOGLE_CALLS_PER_DAY = 1500;

/** Grenzen pro Person und Tag. */
export const USER_LIMITS = {
  rounds: 10,
  placeLoads: 40,
  photos: 400,
  autocomplete: 150,
} as const;

export type UserLimit = keyof typeof USER_LIMITS;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function budgetGuard(db: Firestore) {
  return async (calls: number) => {
    const ref = db.doc(`usage/${today()}`);
    await db.runTransaction(async (tx) => {
      const used: number = (await tx.get(ref)).get("googleCalls") ?? 0;
      if (used + calls > GOOGLE_CALLS_PER_DAY) {
        throw new HttpsError("resource-exhausted", "Das Tageslimit für die Ortssuche ist erreicht. Morgen geht's weiter!");
      }
      tx.set(ref, { googleCalls: used + calls }, { merge: true });
    });
  };
}

export async function consumeUserLimit(db: Firestore, uid: string, kind: UserLimit, amount = 1): Promise<void> {
  const ref = db.doc(`rateLimits/${uid}`);
  await db.runTransaction(async (tx) => {
    const entry = (await tx.get(ref)).get(kind) as { windowStart: number; count: number } | undefined;
    const now = Date.now();
    const fresh = !entry || now - entry.windowStart > DAY_MS;
    const count = (fresh ? 0 : entry.count) + amount;
    if (count > USER_LIMITS[kind]) {
      throw new HttpsError("resource-exhausted", "Für heute ist das Limit erreicht. Morgen geht's weiter!");
    }
    tx.set(ref, { [kind]: { windowStart: fresh ? now : entry.windowStart, count }, lastUsed: now }, { merge: true });
  });
}
