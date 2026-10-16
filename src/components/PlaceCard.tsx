import { TYPE_LABEL, formatDistance, formatRating } from "../format";
import type { Place } from "../types";

export function PlacePhoto({ place, className = "" }: { place: Place; className?: string }) {
  const h = place.photoHue;
  return (
    <div
      className={`photo ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 75% 90%), hsl(${(h + 35) % 360} 70% 82%))` }}
    >
      <span aria-hidden>{place.emoji}</span>
    </div>
  );
}

export function Price({ level }: { level: number | null }) {
  if (level === null) return <span className="muted">Preis k. A.</span>;
  return (
    <span aria-label={`Preisniveau ${level} von 4`}>
      {"€".repeat(level)}
      <span className="faded">{"€".repeat(4 - level)}</span>
    </span>
  );
}

export function PlaceFacts({ place }: { place: Place }) {
  return (
    <ul className="facts">
      <li>
        {place.rating !== null ? (
          <>
            ★ {formatRating(place.rating)} <span className="muted">({place.ratingCount})</span>
          </>
        ) : (
          <span className="muted">Noch keine Bewertung</span>
        )}
      </li>
      <li>
        <Price level={place.priceLevel} />
      </li>
      <li>{formatDistance(place.distanceM)}</li>
    </ul>
  );
}

export function PlaceCard({ place }: { place: Place }) {
  return (
    <article className="place-card">
      <PlacePhoto place={place} />
      <div className="place-body">
        <p className="kicker">
          {TYPE_LABEL[place.type]} · {place.cuisine}
        </p>
        <h2>{place.name}</h2>
        <PlaceFacts place={place} />
        {place.openingHoursUnknown && <p className="warn">Öffnungszeiten prüfen</p>}
      </div>
    </article>
  );
}
