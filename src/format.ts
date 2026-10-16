const nf1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatRating = (r: number) => nf1.format(r);

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 50) * 50} m` : `${nf1.format(m / 1000)} km`;
}

export const TYPE_LABEL = { restaurant: "Restaurant", bar: "Bar", cafe: "Café" } as const;
