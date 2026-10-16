// Ausgedachte Beispiel-Lokale für Tests und die lokale Entwicklung (Emulator, PLACES_API_KEY=sample).
import { distanceM, offsetPosition } from "./geo";
import { selectPlaces, type Candidate } from "./select";
import type { PlaceDetails, PlacesProvider, PlaceType } from "./types";

interface SamplePlace {
  id: string;
  name: string;
  type: PlaceType;
  cuisine: string;
  rating: number | null;
  ratingCount: number;
  priceLevel: number | null;
  // Versatz zum Suchmittelpunkt in Metern (Nord, Ost)
  offsetM: [number, number];
  street: string;
  emoji: string;
  openingHoursUnknown?: boolean;
}

// Fiktive Lokale – Namen und Adressen sind ausgedacht.
const SAMPLE_PLACES: SamplePlace[] = [
  { id: "sample-01", name: "Trattoria Pfirsichblüte", type: "restaurant", cuisine: "Italienisch", rating: 4.6, ratingCount: 812, priceLevel: 2, offsetM: [300, 200], street: "Lindenstraße 4", emoji: "🍝" },
  { id: "sample-02", name: "Sakura Garden", type: "restaurant", cuisine: "Japanisch", rating: 4.4, ratingCount: 455, priceLevel: 3, offsetM: [-500, 700], street: "Am Markt 12", emoji: "🍣" },
  { id: "sample-03", name: "Zum Goldenen Anker", type: "restaurant", cuisine: "Deutsch", rating: 4.2, ratingCount: 1290, priceLevel: 2, offsetM: [900, -300], street: "Hafenweg 3", emoji: "🥨" },
  { id: "sample-04", name: "Taco Loco", type: "restaurant", cuisine: "Mexikanisch", rating: 4.5, ratingCount: 377, priceLevel: 1, offsetM: [-200, -400], street: "Bahnhofstraße 21", emoji: "🌮" },
  { id: "sample-05", name: "Le Petit Bistro", type: "restaurant", cuisine: "Französisch", rating: 4.7, ratingCount: 268, priceLevel: 3, offsetM: [1200, 800], street: "Rosengasse 9", emoji: "🥐" },
  { id: "sample-06", name: "Curry Corner", type: "restaurant", cuisine: "Indisch", rating: 4.3, ratingCount: 621, priceLevel: 1, offsetM: [-800, 100], street: "Weberstraße 17", emoji: "🍛" },
  { id: "sample-07", name: "Burgerei Nordend", type: "restaurant", cuisine: "Burger", rating: 4.1, ratingCount: 980, priceLevel: 2, offsetM: [1500, -900], street: "Nordring 2", emoji: "🍔" },
  { id: "sample-08", name: "Mezze Haus", type: "restaurant", cuisine: "Libanesisch", rating: 4.8, ratingCount: 190, priceLevel: 2, offsetM: [400, -1100], street: "Gartenstraße 30", emoji: "🧆" },
  { id: "sample-09", name: "Pho Saigon", type: "restaurant", cuisine: "Vietnamesisch", rating: 4.5, ratingCount: 702, priceLevel: 1, offsetM: [-1300, -600], street: "Kirchplatz 5", emoji: "🍜" },
  { id: "sample-10", name: "Steakhaus Glut", type: "restaurant", cuisine: "Steak", rating: 4.0, ratingCount: 340, priceLevel: 4, offsetM: [2200, 300], street: "Schillerallee 44", emoji: "🥩" },
  { id: "sample-11", name: "Grüne Gabel", type: "restaurant", cuisine: "Vegetarisch", rating: 4.6, ratingCount: 288, priceLevel: 2, offsetM: [-600, 1500], street: "Parkweg 8", emoji: "🥗" },
  { id: "sample-12", name: "Pizzeria Da Lina", type: "restaurant", cuisine: "Pizza", rating: 4.4, ratingCount: 1530, priceLevel: 1, offsetM: [100, 600], street: "Mühlenstraße 1", emoji: "🍕" },
  { id: "sample-13", name: "Seoul Kitchen", type: "restaurant", cuisine: "Koreanisch", rating: 4.3, ratingCount: 240, priceLevel: 2, offsetM: [3100, -1800], street: "Ostendstraße 63", emoji: "🍲", openingHoursUnknown: true },
  { id: "sample-14", name: "Fischhalle", type: "restaurant", cuisine: "Fisch", rating: null, ratingCount: 0, priceLevel: null, offsetM: [-2600, 2000], street: "Kai 7", emoji: "🐟" },
  { id: "sample-15", name: "Tapas y Vino", type: "restaurant", cuisine: "Spanisch", rating: 4.5, ratingCount: 410, priceLevel: 3, offsetM: [700, 1300], street: "Theaterplatz 2", emoji: "🥘" },
  { id: "sample-16", name: "Bar Peach", type: "bar", cuisine: "Cocktailbar", rating: 4.7, ratingCount: 530, priceLevel: 3, offsetM: [250, -150], street: "Lindenstraße 19", emoji: "🍑" },
  { id: "sample-17", name: "Die Kneipe", type: "bar", cuisine: "Kneipe", rating: 4.2, ratingCount: 860, priceLevel: 1, offsetM: [-350, 250], street: "Brunnengasse 6", emoji: "🍺" },
  { id: "sample-18", name: "Weinstube Rebe", type: "bar", cuisine: "Weinbar", rating: 4.6, ratingCount: 310, priceLevel: 2, offsetM: [1000, 500], street: "Kellerweg 11", emoji: "🍷" },
  { id: "sample-19", name: "Dachterrasse 12", type: "bar", cuisine: "Rooftop-Bar", rating: 4.3, ratingCount: 1210, priceLevel: 3, offsetM: [-900, -900], street: "Hochhausplatz 12", emoji: "🌇" },
  { id: "sample-20", name: "Irish Pub O'Malley", type: "bar", cuisine: "Pub", rating: 4.4, ratingCount: 690, priceLevel: 2, offsetM: [1800, -400], street: "Domstraße 3", emoji: "☘️" },
  { id: "sample-21", name: "Gin & Jazz", type: "bar", cuisine: "Cocktailbar", rating: 4.8, ratingCount: 150, priceLevel: 4, offsetM: [-1700, 600], street: "Klaviergasse 1", emoji: "🎷" },
  { id: "sample-22", name: "Craft Beer Depot", type: "bar", cuisine: "Bierbar", rating: 4.5, ratingCount: 420, priceLevel: 2, offsetM: [2500, 1500], street: "Brauereihof 4", emoji: "🍻", openingHoursUnknown: true },
  { id: "sample-23", name: "Strandbar Sand", type: "bar", cuisine: "Strandbar", rating: 4.0, ratingCount: 980, priceLevel: 2, offsetM: [-3000, -1200], street: "Uferpromenade", emoji: "🏖️" },
  { id: "sample-24", name: "Café Milchschaum", type: "cafe", cuisine: "Café", rating: 4.6, ratingCount: 640, priceLevel: 1, offsetM: [150, 350], street: "Lindenstraße 27", emoji: "☕" },
  { id: "sample-25", name: "Kuchenzeit", type: "cafe", cuisine: "Konditorei", rating: 4.7, ratingCount: 380, priceLevel: 2, offsetM: [-450, -250], street: "Zuckerbäckergasse 2", emoji: "🍰" },
  { id: "sample-26", name: "Bohne & Buch", type: "cafe", cuisine: "Café", rating: 4.5, ratingCount: 215, priceLevel: 1, offsetM: [800, -700], street: "Bibliotheksplatz 1", emoji: "📚" },
  { id: "sample-27", name: "Matcha Mood", type: "cafe", cuisine: "Teehaus", rating: 4.3, ratingCount: 170, priceLevel: 2, offsetM: [-1100, 1100], street: "Gartenstraße 2", emoji: "🍵" },
  { id: "sample-28", name: "Frühstückshaus Sonne", type: "cafe", cuisine: "Frühstück", rating: 4.4, ratingCount: 900, priceLevel: 2, offsetM: [1400, 1400], street: "Sonnenallee 10", emoji: "🍳" },
];

const BY_ID = new Map(SAMPLE_PLACES.map((p) => [p.id, p]));

function candidate(p: SamplePlace): Candidate {
  return {
    id: p.id,
    type: p.type,
    rating: p.rating,
    ratingCount: p.ratingCount,
    priceLevel: p.priceLevel,
    distanceM: Math.round(Math.hypot(...p.offsetM)),
    open: null,
    operational: true,
  };
}

export const sampleProvider: PlacesProvider = {
  async search(search, maxPlaces, minPlaces, maxRadiusM) {
    let current = { ...search };
    let placeIds = selectPlaces(SAMPLE_PLACES.map(candidate), current, maxPlaces);
    while (placeIds.length < minPlaces && current.radiusM < maxRadiusM) {
      current = { ...current, radiusM: Math.min(current.radiusM * 2, maxRadiusM) };
      placeIds = selectPlaces(SAMPLE_PLACES.map(candidate), current, maxPlaces);
    }
    return { placeIds, plan: search.types.map((type) => ({ type, pages: 1 })), radiusM: current.radiusM };
  },

  async details(search, _plan, ids) {
    return ids.flatMap((id, index): PlaceDetails[] => {
      const p = BY_ID.get(id);
      if (!p) return [];
      const pos = offsetPosition(search.center, p.offsetM[0], p.offsetM[1]);
      return [
        {
          id: p.id,
          source: "sample",
          name: p.name,
          type: p.type,
          cuisine: p.cuisine,
          rating: p.rating,
          ratingCount: p.ratingCount,
          priceLevel: p.priceLevel,
          distanceM: distanceM(search.center, pos),
          address: p.street,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`,
          photoHue: (index * 47) % 360,
          emoji: p.emoji,
          openingHoursUnknown: search.openFrom !== null && (p.openingHoursUnknown ?? false),
          photoName: null,
          photoAuthor: null,
        },
      ];
    });
  },

  async photos() {
    return {};
  },

  async autocomplete(input) {
    const cities: [string, number, number][] = [
      ["Frankfurt am Main", 50.1109, 8.6821],
      ["Berlin", 52.52, 13.405],
      ["Hamburg", 53.5511, 9.9937],
      ["München", 48.1351, 11.582],
      ["Köln", 50.9375, 6.9603],
    ];
    const q = input.toLowerCase();
    return cities
      .filter(([name]) => name.toLowerCase().includes(q))
      .map(([name, lat, lng]) => ({ placeId: `sample-city:${lat},${lng}`, main: name, secondary: "Deutschland" }));
  },

  async location(placeId) {
    const [lat, lng] = placeId.replace("sample-city:", "").split(",").map(Number);
    return { lat, lng };
  },
};
