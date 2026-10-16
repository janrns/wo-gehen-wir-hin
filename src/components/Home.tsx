import { useCallback, useState } from "react";
import { createRound, errorText } from "../api";
import { TYPE_LABEL } from "../format";
import { loadName, saveName } from "../storage";
import type { PlaceType } from "../types";
import { AddressSearch } from "./AddressSearch";
import { Chips } from "./Chips";

const RADII = [1000, 2000, 5000, 10000];
// Beispielort nur für die lokale Entwicklung mit Emulatoren.
const DEMO_CENTER = { lat: 50.1109, lng: 8.6821, label: "Beispielort (Frankfurt)" };
const IS_EMULATOR = import.meta.env.MODE === "emulator";

type Center = { lat: number; lng: number; label: string };

function defaultOpenFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() + (d.getHours() >= 19 ? 1 : 0));
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

export function Home({ onCreated }: { onCreated: (sessionId: string) => void }) {
  const [name, setName] = useState(loadName);
  const [center, setCenter] = useState<Center | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusM, setRadiusM] = useState(2000);
  const [types, setTypes] = useState<PlaceType[]>(["restaurant", "bar"]);
  const [priceLevels, setPriceLevels] = useState<number[]>([1, 2, 3]);
  const [withTime, setWithTime] = useState(false);
  const [openFrom, setOpenFrom] = useState(defaultOpenFrom);
  const [openHours, setOpenHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const showError = useCallback((message: string) => setError(message), []);

  function locate() {
    if (!("geolocation" in navigator)) {
      setError("Dein Browser kann den Standort nicht bestimmen.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Mein Standort" });
        setLocating(false);
      },
      () => {
        setError("Standort nicht verfügbar. Bitte Freigabe prüfen oder eine Adresse eingeben.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!center) return setError("Bitte einen Ausgangspunkt wählen.");
    if (types.length === 0) return setError("Bitte mindestens eine Art wählen.");
    if (priceLevels.length === 0) return setError("Bitte mindestens ein Preisniveau wählen.");
    setBusy(true);
    setError("");
    saveName(name.trim());
    try {
      const result = await createRound({
        name: name.trim(),
        search: {
          center: { lat: center.lat, lng: center.lng },
          label: center.label,
          radiusM,
          types,
          priceLevels,
          openFrom: withTime ? new Date(openFrom).toISOString() : null,
          openHours,
        },
      });
      onCreated(result.sessionId);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <img src="/favicon.svg" alt="" width={56} height={56} />
        <h1>Wo gehen wir hin?</h1>
        <p>Starte eine Runde, schick den Link an deine Freunde und swipt gemeinsam, bis ihr wisst, wo es hingeht.</p>
      </header>

      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Dein Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
            autoComplete="given-name"
            placeholder="z. B. Anna"
          />
        </label>

        <fieldset className="field">
          <legend>Wo?</legend>
          {center ? (
            <div className="picked">
              <span>📍 {center.label}</span>
              <button type="button" className="link" onClick={() => setCenter(null)}>
                ändern
              </button>
            </div>
          ) : (
            <div className="stack">
              <button type="button" className="btn secondary" onClick={locate} disabled={locating}>
                {locating ? "Standort wird bestimmt …" : "📍 Meinen Standort verwenden"}
              </button>
              <AddressSearch
                onPick={(c) => {
                  setError("");
                  setCenter(c);
                }}
                onError={showError}
              />
              {IS_EMULATOR && (
                <button type="button" className="link" onClick={() => setCenter(DEMO_CENTER)}>
                  Testmodus: Beispielort verwenden
                </button>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="field">
          <legend>Umkreis</legend>
          <Chips
            single
            options={RADII.map((r) => ({ value: r, label: `${r / 1000} km` }))}
            selected={[radiusM]}
            onChange={([r]) => setRadiusM(r)}
          />
        </fieldset>

        <fieldset className="field">
          <legend>Was?</legend>
          <Chips
            options={(Object.keys(TYPE_LABEL) as PlaceType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
            selected={types}
            onChange={setTypes}
          />
        </fieldset>

        <fieldset className="field">
          <legend>Preisniveau</legend>
          <Chips
            options={[1, 2, 3, 4].map((p) => ({ value: p, label: "€".repeat(p) }))}
            selected={priceLevels}
            onChange={setPriceLevels}
          />
        </fieldset>

        <fieldset className="field">
          <legend>Wann?</legend>
          <label className="toggle">
            <input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} />
            <span>Nur Lokale, die zu unserer Zeit geöffnet haben</span>
          </label>
          {withTime && (
            <div className="row">
              <label className="field grow">
                <span>ab</span>
                <input type="datetime-local" value={openFrom} onChange={(e) => setOpenFrom(e.target.value)} required />
              </label>
              <label className="field">
                <span>für</span>
                <select value={openHours} onChange={(e) => setOpenHours(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((h) => (
                    <option key={h} value={h}>
                      {h} Std.
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </fieldset>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="btn primary big" disabled={busy || !name.trim()}>
          {busy ? "Wir suchen Lokale …" : "Runde starten"}
        </button>
      </form>

      <p className="note">Lokale, Bewertungen und Fotos: Google Maps</p>
    </main>
  );
}
