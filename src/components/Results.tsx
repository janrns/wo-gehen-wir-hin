import { useState } from "react";
import { closeRound, errorText, removeMember } from "../api";
import type { Member, Place, Session } from "../types";
import { PlacePhoto } from "./PlaceCard";

interface Props {
  sessionId: string;
  session: Session;
  places: Place[] | null;
  members: Member[];
  uid: string;
  isCreator: boolean;
  onOpen: (place: Place) => void;
  onError: (message: string) => void;
}

export function Results({ sessionId, session, places, members, uid, isCreator, onOpen, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const byId = new Map(places?.map((p) => [p.id, p]));
  const allDone = members.every((m) => m.done);
  const final = session.status === "closed" || allDone;
  const matches = session.perfectMatchIds.map((id) => byId.get(id)).filter((p): p is Place => !!p);
  const ranked = session.ranking.filter((e) => e.seen > 0);
  const doneCount = members.filter((m) => m.done).length;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="results">
      <p className="status-line">
        {final ? "Endergebnis" : "Zwischenstand"} · {doneCount} von {members.length} fertig
      </p>

      {matches.length > 0 && (
        <div className="match-banner">
          <div className="big-emoji">🎉</div>
          <h2>{matches.length === 1 ? "Perfect Match!" : `${matches.length} Perfect Matches!`}</h2>
          <p>Alle mögen:</p>
          {matches.map((p) => (
            <button key={p.id} className="match-place" onClick={() => onOpen(p)}>
              {p.emoji} {p.name}
            </button>
          ))}
        </div>
      )}

      {ranked.length === 0 ? (
        <p className="empty">Noch keine Stimmen. Fang an zu swipen!</p>
      ) : (
        <ol className="ranking">
          {ranked.slice(0, 10).map((e, i) => {
            const p = byId.get(e.placeId);
            if (!p) return null;
            const share = e.likes / e.seen;
            return (
              <li key={e.placeId}>
                <button className="rank-row" onClick={() => onOpen(p)}>
                  <span className="rank">{i + 1}</span>
                  <PlacePhoto place={p} className="thumb" />
                  <span className="rank-main">
                    <strong>{p.name}</strong>
                    <span className="bar" aria-hidden>
                      <span style={{ width: `${share * 100}%` }} />
                    </span>
                    <span className="muted">
                      {e.likes} von {e.seen} mögen das
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <h3>Dabei</h3>
      <ul className="members">
        {members.map((m) => (
          <li key={m.id}>
            <span>
              {m.name}
              {m.id === session.createdBy && <span className="muted"> · hat eingeladen</span>}
              {m.id === uid && <span className="muted"> · du</span>}
            </span>
            <span className="member-state">
              {m.done ? "✓ fertig" : "swipt …"}
              {isCreator && m.id !== uid && session.status === "open" && (
                <button
                  className="link danger"
                  disabled={busy}
                  onClick={() =>
                    confirm(`${m.name} aus der Runde entfernen?`) &&
                    run(() => removeMember({ sessionId, memberId: m.id }))
                  }
                >
                  entfernen
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isCreator && session.status === "open" && (
        <button
          className="btn secondary"
          disabled={busy}
          onClick={() =>
            confirm("Runde beenden? Danach kann niemand mehr swipen oder beitreten.") &&
            run(() => closeRound({ sessionId }))
          }
        >
          Runde beenden
        </button>
      )}
    </section>
  );
}
