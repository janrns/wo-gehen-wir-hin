import { useEffect } from "react";
import { TYPE_LABEL } from "../format";
import type { Place } from "../types";
import { PlaceFacts, PlacePhoto } from "./PlaceCard";

export function PlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
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
        <PlacePhoto place={place} className="small" />
        <p className="kicker">
          {TYPE_LABEL[place.type]} · {place.cuisine}
        </p>
        <h2>{place.name}</h2>
        <PlaceFacts place={place} />
        <p className="muted">{place.address}</p>
        {place.openingHoursUnknown && <p className="warn">Öffnungszeiten prüfen</p>}
        <a className="btn primary big" href={place.mapsUrl} target="_blank" rel="noopener noreferrer">
          In Google Maps öffnen
        </a>
      </div>
    </div>
  );
}
