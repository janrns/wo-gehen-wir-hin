import { useEffect } from "react";
import { MAPS_EMBED_KEY } from "../config";
import { kicker } from "../format";
import type { Place } from "../types";
import { PlaceFacts, PlacePhoto } from "./PlaceCard";

interface Props {
  place: Place;
  photoUrl?: string;
  onClose: () => void;
}

export function PlaceSheet({ place, photoUrl, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={place.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sheet-close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
        <PlacePhoto place={place} url={photoUrl} className="small" />
        <p className="kicker">
          {kicker(place)}
        </p>
        <h2>{place.name}</h2>
        <PlaceFacts place={place} />
        <p className="muted">{place.address}</p>
        {place.openingHoursUnknown && <p className="warn">Öffnungszeiten prüfen</p>}
        {place.source === "google" && (
          <iframe
            className="map"
            title={`Karte: ${place.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_EMBED_KEY}&q=place_id:${encodeURIComponent(place.id)}&language=de`}
          />
        )}
        <a className="btn primary big" href={place.mapsUrl} target="_blank" rel="noopener noreferrer">
          In Google Maps öffnen
        </a>
      </div>
    </div>
  );
}
