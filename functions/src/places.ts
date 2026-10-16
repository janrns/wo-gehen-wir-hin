// Ortsdaten. In Woche 1 kommen sie aus einem festen Beispielkatalog;
// in Woche 2 wird searchPlaces/getPlaceDetails durch die Google Places API ersetzt.

export type PlaceType = "restaurant" | "bar" | "cafe";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SearchParams {
  center: LatLng;
  label: string;
  radiusM: number;
  types: PlaceType[];
  priceLevels: number[];
  openFrom: string | null;
  openHours: number;
}

export interface PlaceDetails {
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

const MAX_PLACES = 25;

const EARTH_RADIUS_M = 6_371_000;

export function distanceM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

function samplePosition(center: LatLng, [north, east]: [number, number]): LatLng {
  const lat = center.lat + north / 111_320;
  const lng = center.lng + east / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return { lat, lng };
}

function offsetDistance([north, east]: [number, number]): number {
  return Math.round(Math.hypot(north, east));
}

/** Liefert die Place-IDs für den Swipe-Stapel, beste Bewertung zuerst. */
export function searchPlaces(search: SearchParams): string[] {
  return SAMPLE_PLACES.filter((p) => search.types.includes(p.type))
    .filter((p) => p.priceLevel === null || search.priceLevels.includes(p.priceLevel))
    .filter((p) => offsetDistance(p.offsetM) <= search.radiusM)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, MAX_PLACES)
    .map((p) => p.id);
}

export function getPlaceDetails(ids: string[], center: LatLng): PlaceDetails[] {
  return ids.flatMap((id, index) => {
    const p = BY_ID.get(id);
    if (!p) return [];
    const pos = samplePosition(center, p.offsetM);
    return [
      {
        id: p.id,
        name: p.name,
        type: p.type,
        cuisine: p.cuisine,
        rating: p.rating,
        ratingCount: p.ratingCount,
        priceLevel: p.priceLevel,
        distanceM: distanceM(center, pos),
        address: p.street,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`,
        photoHue: (index * 47) % 360,
        emoji: p.emoji,
        openingHoursUnknown: p.openingHoursUnknown ?? false,
      },
    ];
  });
}
