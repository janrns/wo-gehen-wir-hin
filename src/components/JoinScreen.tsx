import { useState } from "react";
import { errorText, joinRound } from "../api";
import { loadName, saveName } from "../storage";
import type { Session } from "../types";

interface Props {
  sessionId: string;
  session: Session;
  onJoined: () => void;
  onHome: () => void;
}

export function JoinScreen({ sessionId, session, onJoined, onHome }: Props) {
  const [name, setName] = useState(loadName);
  const [takenName, setTakenName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join(reclaim: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await joinRound({ sessionId, name: name.trim(), reclaim });
      if (result.status === "nameTaken") {
        setTakenName(result.name);
      } else {
        saveName(name.trim());
        onJoined();
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (session.status === "closed") {
    return (
      <main className="page center">
        <h1>Runde beendet</h1>
        <p>Bei dieser Runde kann man nicht mehr mitmachen.</p>
        <button className="btn primary" onClick={onHome}>
          Eigene Runde starten
        </button>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="hero">
        <img src="/favicon.svg" alt="" width={56} height={56} />
        <h1>Du bist eingeladen!</h1>
        <p>
          Swipe durch Lokale rund um <strong>{session.search.label || "den Treffpunkt"}</strong>. Am Ende seht ihr, was
          der Gruppe am besten gefällt.
        </p>
      </header>

      {takenName ? (
        <section className="card form">
          <h2>Bist du {takenName}?</h2>
          <p>Jemand mit diesem Namen ist schon dabei. Wenn du das bist (z. B. auf einem anderen Gerät), machst du einfach dort weiter, wo du aufgehört hast.</p>
          <button className="btn primary big" disabled={busy} onClick={() => join(true)}>
            Ja, ich bin {takenName} – weitermachen
          </button>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => {
              setTakenName(null);
              setName("");
            }}
          >
            Nein, anderen Namen wählen
          </button>
          {error && <p className="error">{error}</p>}
        </section>
      ) : (
        <form
          className="card form"
          onSubmit={(e) => {
            e.preventDefault();
            join(false);
          }}
        >
          <label className="field">
            <span>Dein Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              required
              autoFocus
              autoComplete="given-name"
              placeholder="z. B. Ben"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary big" disabled={busy || !name.trim()}>
            {busy ? "Einen Moment …" : "Mitmachen"}
          </button>
        </form>
      )}
    </main>
  );
}
