import type { LatLng } from "./types";

const EARTH_RADIUS_M = 6_371_000;

export function distanceM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

export function offsetPosition(center: LatLng, northM: number, eastM: number): LatLng {
  return {
    lat: center.lat + northM / 111_320,
    lng: center.lng + eastM / (111_320 * Math.cos((center.lat * Math.PI) / 180)),
  };
}

/** Rechteck, das den Kreis mit `radiusM` um `center` umschließt. */
export function boundingBox(center: LatLng, radiusM: number): { low: LatLng; high: LatLng } {
  return { low: offsetPosition(center, -radiusM, -radiusM), high: offsetPosition(center, radiusM, radiusM) };
}
