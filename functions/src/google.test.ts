import { describe, expect, it, vi } from "vitest";
import { emojiFor, googleProvider, type GooglePlace } from "./google";
import type { SearchParams } from "./types";

const CENTER = { lat: 50.11, lng: 8.68 };
const search: SearchParams = {
  center: CENTER,
  label: "Test",
  radiusM: 2000,
  types: ["restaurant"],
  priceLevels: [1, 2],
  openFrom: null,
  openHours: 2,
};

function place(id: string, extra: Partial<GooglePlace> = {}): GooglePlace {
  return {
    id,
    displayName: { text: `Ort ${id}` },
    primaryType: "italian_restaurant",
    primaryTypeDisplayName: { text: "Italienisches Restaurant" },
    rating: 4.5,
    userRatingCount: 100,
    priceLevel: "PRICE_LEVEL_MODERATE",
    location: { latitude: CENTER.lat + 0.001, longitude: CENTER.lng },
    photos: [{ name: `places/${id}/photos/p1`, authorAttributions: [{ displayName: "Foto Fan" }] }],
    googleMapsUri: `https://maps.google.com/?cid=${id}`,
    businessStatus: "OPERATIONAL",
    ...extra,
  };
}

function fakeFetch(pages: { places: GooglePlace[]; nextPageToken?: string }[], single: Record<string, GooglePlace> = {}) {
  const calls: { url: string; body?: any; headers: Record<string, string> }[] = [];
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url, body, headers: init.headers as Record<string, string> });
    let payload: unknown;
    if (url.endsWith("/places:searchText")) {
      const index = body.pageToken ? Number(body.pageToken) : 0;
      payload = pages[index];
    } else if (url.includes("/media?")) {
      payload = { photoUri: "https://lh3.googleusercontent.com/photo" };
    } else {
      const id = decodeURIComponent(url.split("/places/")[1].split("?")[0]);
      if (!single[id]) return new Response("not found", { status: 404 });
      payload = single[id];
    }
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  return { fetcher, calls };
}

describe("googleProvider", () => {
  it("sucht, filtert und stoppt, sobald genug Orte gefunden sind", async () => {
    const pagePlaces = Array.from({ length: 20 }, (_, i) => place(`p${i}`));
    pagePlaces[0] = place("teuer", { priceLevel: "PRICE_LEVEL_VERY_EXPENSIVE" });
    pagePlaces[1] = place("ohnePreis", { priceLevel: undefined });
    pagePlaces[2] = place("zu", { businessStatus: "CLOSED_PERMANENTLY" });
    pagePlaces[3] = place("weit", { location: { latitude: CENTER.lat + 0.1, longitude: CENTER.lng } });
    const { fetcher, calls } = fakeFetch([{ places: pagePlaces, nextPageToken: "1" }, { places: [] }]);
    const guard = vi.fn(async () => {});
    const result = await googleProvider("KEY", guard, fetcher).search(search, 10, 5, 20_000);

    expect(result.placeIds).toHaveLength(10);
    expect(result.placeIds).not.toContain("teuer");
    expect(result.placeIds).not.toContain("zu");
    expect(result.placeIds).not.toContain("weit");
    expect(result.plan).toEqual([{ type: "restaurant", pages: 1 }]);
    expect(calls).toHaveLength(1);
    expect(guard).toHaveBeenCalledTimes(1);
    expect(calls[0].headers["X-Goog-Api-Key"]).toBe("KEY");
    expect(calls[0].headers["X-Goog-FieldMask"]).toContain("places.rating");
    expect(calls[0].body).toMatchObject({ textQuery: "Restaurant", includedType: "restaurant", languageCode: "de" });
  });

  it("behält Orte ohne Preisangabe", async () => {
    const { fetcher } = fakeFetch([{ places: [place("ohnePreis", { priceLevel: undefined })] }]);
    const result = await googleProvider("KEY", async () => {}, fetcher).search(search, 10, 1, 20_000);
    expect(result.placeIds).toEqual(["ohnePreis"]);
  });

  it("filtert nach Öffnungszeiten und markiert unbekannte", async () => {
    const openSearch = { ...search, openFrom: "2026-10-23T17:00:00.000Z", openHours: 2 };
    const hours = (closeHour: number) => ({
      utcOffsetMinutes: 120,
      regularOpeningHours: {
        periods: [{ open: { day: 5, hour: 17, minute: 0 }, close: { day: 5, hour: closeHour, minute: 0 } }],
      },
    });
    const { fetcher } = fakeFetch([
      { places: [place("offen", hours(23)), place("schliesst", hours(20)), place("unbekannt")] },
    ]);
    const provider = googleProvider("KEY", async () => {}, fetcher);
    const result = await provider.search(openSearch, 10, 1, 20_000);
    expect(result.placeIds.sort()).toEqual(["offen", "unbekannt"]);
    const details = await provider.details(openSearch, result.plan, ["offen", "unbekannt"]);
    expect(details.map((d) => [d.id, d.openingHoursUnknown])).toEqual([
      ["offen", false],
      ["unbekannt", true],
    ]);
  });

  it("vergrößert den Umkreis bei zu wenigen Treffern", async () => {
    const { fetcher, calls } = fakeFetch([{ places: [place("a")] }]);
    const result = await googleProvider("KEY", async () => {}, fetcher).search(search, 10, 5, 20_000);
    expect(result.radiusM).toBe(8000);
    expect(calls).toHaveLength(3);
  });

  it("lädt Details frisch und holt fehlende Orte einzeln nach", async () => {
    const { fetcher, calls } = fakeFetch([{ places: [place("a")] }], { b: place("b") });
    const details = await googleProvider("KEY", async () => {}, fetcher).details(
      search,
      [{ type: "restaurant", pages: 1 }],
      ["b", "a", "weg"],
    );
    expect(details.map((d) => d.id)).toEqual(["b", "a"]);
    expect(details[1]).toMatchObject({
      source: "google",
      name: "Ort a",
      cuisine: "Italienisches Restaurant",
      priceLevel: 2,
      emoji: "🍝",
      photoName: "places/a/photos/p1",
      photoAuthor: "Foto Fan",
    });
    expect(calls.filter((c) => c.url.includes("/places/")).length).toBe(2);
  });

  it("löst Fotos auf", async () => {
    const { fetcher, calls } = fakeFetch([]);
    const photos = await googleProvider("KEY", async () => {}, fetcher).photos(["places/a/photos/p1"]);
    expect(photos).toEqual({ "places/a/photos/p1": "https://lh3.googleusercontent.com/photo" });
    expect(calls[0].url).toContain("/places/a/photos/p1/media?maxWidthPx=800&skipHttpRedirect=true");
  });

  it("bricht ab, wenn die Kostenbremse greift", async () => {
    const { fetcher } = fakeFetch([{ places: [] }]);
    const guard = async () => {
      throw new Error("limit");
    };
    await expect(googleProvider("KEY", guard, fetcher).search(search, 10, 5, 20_000)).rejects.toThrow("limit");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("emojiFor", () => {
  it("wählt passende Symbole", () => {
    expect(emojiFor("sushi_restaurant", "restaurant")).toBe("🍣");
    expect(emojiFor("wine_bar", "bar")).toBe("🍷");
    expect(emojiFor(undefined, "cafe")).toBe("☕");
  });
});
