const nf1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatRating = (r: number) => nf1.format(r);

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 50) * 50} m` : `${nf1.format(m / 1000)} km`;
}

export const TYPE_LABEL = { restaurant: "Restaurant", bar: "Bar", cafe: "Café" } as const;

/** „Bar · Cocktailbar“ – doppelte Angaben wie „Restaurant · Italienisches Restaurant“ werden gekürzt. */
export function kicker(place: { type: keyof typeof TYPE_LABEL; cuisine: string }): string {
  const label = TYPE_LABEL[place.type];
  return place.cuisine.toLowerCase().includes(label.toLowerCase()) ? place.cuisine : `${label} · ${place.cuisine}`;
}
