import { describe, expect, it } from "vitest";
import { computeRanking } from "./ranking";

describe("computeRanking", () => {
  it("sortiert nach Zustimmungsquote und erkennt Perfect Matches", () => {
    const result = computeRanking(
      ["a", "b", "c"],
      { u1: { a: true, b: true, c: false }, u2: { a: true, b: false, c: false } },
      ["u1", "u2"],
    );
    expect(result.ranking.map((e) => e.placeId)).toEqual(["a", "b", "c"]);
    expect(result.ranking[0]).toEqual({ placeId: "a", likes: 2, seen: 2 });
    expect(result.perfectMatchIds).toEqual(["a"]);
  });

  it("wertet nicht geswipte Karten nicht als Ablehnung", () => {
    const result = computeRanking(["a", "b"], { u1: { a: true, b: true }, u2: { b: false } }, ["u1", "u2"]);
    expect(result.ranking.map((e) => e.placeId)).toEqual(["a", "b"]);
    expect(result.ranking[0]).toEqual({ placeId: "a", likes: 1, seen: 1 });
    expect(result.perfectMatchIds).toEqual([]);
  });

  it("ignoriert entfernte Personen und ungültige Stimmen", () => {
    const result = computeRanking(
      ["a"],
      { u1: { a: true }, u2: { a: true }, removed: { a: false }, u3: { a: "ja" } },
      ["u1", "u2"],
    );
    expect(result.ranking[0]).toEqual({ placeId: "a", likes: 2, seen: 2 });
    expect(result.perfectMatchIds).toEqual(["a"]);
  });

  it("löst Gleichstand über Likes und dann die Stapel-Reihenfolge auf", () => {
    const result = computeRanking(
      ["first", "second", "more"],
      { u1: { first: true, second: true, more: true }, u2: { more: true } },
      ["u1", "u2"],
    );
    expect(result.ranking.map((e) => e.placeId)).toEqual(["more", "first", "second"]);
  });

  it("vergibt kein Perfect Match bei nur einer Person", () => {
    expect(computeRanking(["a"], { u1: { a: true } }, ["u1"]).perfectMatchIds).toEqual([]);
  });
});
