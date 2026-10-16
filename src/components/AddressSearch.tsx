import { useEffect, useRef, useState } from "react";
import { autocomplete, errorText, resolveLocation } from "../api";
import type { Suggestion } from "../types";

interface Props {
  onPick: (center: { lat: number; lng: number; label: string }) => void;
  onError: (message: string) => void;
}

const newToken = () => crypto.randomUUID();

export function AddressSearch({ onPick, onError }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  // Ein Sitzungs-Token bündelt Eingabe und Auswahl zu einer (günstigeren) Google-Abrechnung.
  const token = useRef(newToken());
  const latest = useRef("");

  useEffect(() => {
    const query = input.trim();
    latest.current = query;
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      autocomplete({ input: query, sessionToken: token.current, near: null })
        .then((r) => latest.current === query && setSuggestions(r.suggestions))
        .catch((err) => onError(errorText(err)));
    }, 350);
    return () => clearTimeout(t);
  }, [input, onError]);

  async function pick(s: Suggestion) {
    setBusy(true);
    try {
      const { location } = await resolveLocation({ placeId: s.placeId, sessionToken: token.current });
      onPick({ ...location, label: s.main });
    } catch (err) {
      onError(errorText(err));
    } finally {
      token.current = newToken();
      setBusy(false);
    }
  }

  return (
    <div className="address">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="oder Adresse, Stadtteil, Stadt …"
        aria-label="Adresse suchen"
        autoComplete="off"
        disabled={busy}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions" role="listbox">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button type="button" role="option" aria-selected="false" onClick={() => pick(s)} disabled={busy}>
                <strong>{s.main}</strong>
                {s.secondary && <span>{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
