export interface RankingEntry {
  placeId: string;
  likes: number;
  seen: number;
}

export interface RankingResult {
  ranking: RankingEntry[];
  perfectMatchIds: string[];
}

/**
 * Rangliste nach Zustimmungsquote unter denen, die die Karte gesehen haben.
 * Nicht geswipte Karten zählen nicht als Ablehnung.
 * Gleichstand: mehr Likes, dann Position im Stapel (der ist nach Bewertung sortiert).
 * Perfect Match: alle aktiven Teilnehmenden (mind. 2) mögen den Ort.
 */
export function computeRanking(
  placeIds: string[],
  votesByMember: Record<string, Record<string, unknown>>,
  activeMemberIds: string[],
): RankingResult {
  const ranking = placeIds.map((placeId, index) => {
    let likes = 0;
    let seen = 0;
    for (const uid of activeMemberIds) {
      const vote = votesByMember[uid]?.[placeId];
      if (typeof vote !== "boolean") continue;
      seen++;
      if (vote) likes++;
    }
    return { placeId, likes, seen, index };
  });

  const quota = (e: RankingEntry) => (e.seen === 0 ? -1 : e.likes / e.seen);
  ranking.sort((a, b) => quota(b) - quota(a) || b.likes - a.likes || a.index - b.index);

  const perfectMatchIds =
    activeMemberIds.length >= 2
      ? ranking.filter((e) => e.likes === activeMemberIds.length).map((e) => e.placeId)
      : [];

  return { ranking: ranking.map(({ placeId, likes, seen }) => ({ placeId, likes, seen })), perfectMatchIds };
}
