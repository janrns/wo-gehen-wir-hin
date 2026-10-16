export interface RankingEntry {
  placeId: string;
  likes: number;
  seen: number;
}

export interface TieBreak {
  rating: number | null;
  distanceM: number;
}

export interface RankingResult {
  ranking: RankingEntry[];
  perfectMatchIds: string[];
}

/**
 * Rangliste nach Zustimmungsquote unter denen, die die Karte gesehen haben.
 * Nicht geswipte Karten zählen nicht als Ablehnung.
 * Gleichstand: mehr Likes, dann bessere Bewertung, dann geringere Entfernung.
 * Perfect Match: alle aktiven Teilnehmenden (mind. 2) mögen den Ort.
 */
export function computeRanking(
  placeIds: string[],
  votesByMember: Record<string, Record<string, unknown>>,
  activeMemberIds: string[],
  tieBreak: Record<string, TieBreak> = {},
): RankingResult {
  const ranking = placeIds.map((placeId) => {
    let likes = 0;
    let seen = 0;
    for (const uid of activeMemberIds) {
      const vote = votesByMember[uid]?.[placeId];
      if (typeof vote !== "boolean") continue;
      seen++;
      if (vote) likes++;
    }
    return { placeId, likes, seen };
  });

  const quota = (e: RankingEntry) => (e.seen === 0 ? -1 : e.likes / e.seen);
  ranking.sort(
    (a, b) =>
      quota(b) - quota(a) ||
      b.likes - a.likes ||
      (tieBreak[b.placeId]?.rating ?? 0) - (tieBreak[a.placeId]?.rating ?? 0) ||
      (tieBreak[a.placeId]?.distanceM ?? Infinity) - (tieBreak[b.placeId]?.distanceM ?? Infinity),
  );

  const perfectMatchIds =
    activeMemberIds.length >= 2
      ? ranking.filter((e) => e.likes === activeMemberIds.length).map((e) => e.placeId)
      : [];

  return { ranking, perfectMatchIds };
}
