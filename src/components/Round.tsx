import { doc, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { errorText, getPhotos, getRoundPlaces } from "../api";
import { db } from "../firebase";
import { useMembers, useOwnVotes, useSession } from "../hooks";
import type { Place } from "../types";
import { JoinScreen } from "./JoinScreen";
import { PlaceSheet } from "./PlaceSheet";
import { Results } from "./Results";
import { SwipeDeck } from "./SwipeDeck";

interface Props {
  sessionId: string;
  uid: string;
  onHome: () => void;
}

export function Round({ sessionId, uid, onHome }: Props) {
  const session = useSession(sessionId);
  const [joinKey, setJoinKey] = useState(0);
  const members = useMembers(sessionId, uid, joinKey);
  const isMember = Array.isArray(members);
  const votes = useOwnVotes(sessionId, uid, isMember);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [placesError, setPlacesError] = useState("");
  const [tab, setTab] = useState<"swipe" | "results">("swipe");
  const [detail, setDetail] = useState<Place | null>(null);
  const [toast, setToast] = useState("");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const requestedPhotos = useRef(new Set<string>());

  useEffect(() => {
    if (!isMember || places) return;
    getRoundPlaces({ sessionId })
      .then((r) => setPlaces(r.places))
      .catch((err) => setPlacesError(errorText(err)));
  }, [isMember, places, sessionId]);

  // Fotos erst laden, wenn eine Karte gleich sichtbar wird – jedes Foto kostet einen Google-Aufruf.
  const upcoming = places?.filter((p) => votes && !(p.id in votes)).slice(0, 3) ?? [];
  const photoNeeds = [...upcoming, ...(detail ? [detail] : [])]
    .map((p) => p.photoName)
    .filter((n): n is string => !!n && !requestedPhotos.current.has(n));
  const photoKey = photoNeeds.join("|");
  useEffect(() => {
    if (!photoKey) return;
    const names = photoKey.split("|");
    names.forEach((n) => requestedPhotos.current.add(n));
    getPhotos({ sessionId, photoNames: names })
      .then((r) => setPhotos((prev) => ({ ...prev, ...r.photos })))
      .catch(() => undefined);
  }, [photoKey, sessionId]);
  const photoUrl = (p: Place) => (p.photoName ? photos[p.photoName] : undefined);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  if (session.status === "loading" || members === null) {
    return (
      <main className="page center">
        <div className="spinner" aria-label="Lädt" />
      </main>
    );
  }
  if (session.status === "missing") {
    return (
      <main className="page center">
        <h1>Runde nicht gefunden</h1>
        <p>Der Link ist falsch oder die Runde ist abgelaufen.</p>
        <button className="btn primary" onClick={onHome}>
          Neue Runde starten
        </button>
      </main>
    );
  }

  const s = session.data;
  if (members === false) {
    return <JoinScreen sessionId={sessionId} session={s} onJoined={() => setJoinKey((k) => k + 1)} onHome={onHome} />;
  }

  const me = members.find((m) => m.id === uid)!;
  const active = members.filter((m) => !m.removed);
  const isCreator = s.createdBy === uid;
  const closed = s.status === "closed";
  const remaining = places?.filter((p) => votes && !(p.id in votes)) ?? [];

  async function vote(placeId: string, like: boolean) {
    try {
      await setDoc(doc(db, "sessions", sessionId, "votes", uid), { votes: { [placeId]: like } }, { merge: true });
      if (remaining.length === 1 && remaining[0].id === placeId) await setDone(true);
    } catch {
      setToast("Swipe konnte nicht gespeichert werden.");
    }
  }

  async function setDone(done: boolean) {
    await updateDoc(doc(db, "sessions", sessionId, "members", uid), { done }).catch(() => undefined);
    if (done) setTab("results");
  }

  async function share() {
    const url = location.href;
    const text = "Wo gehen wir hin? Swipe mit, wo wir uns treffen:";
    try {
      if (navigator.share) await navigator.share({ title: "Wo gehen wir hin?", text, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link kopiert");
      }
    } catch {
      // Teilen abgebrochen
    }
  }

  return (
    <main className="page round">
      <header className="topbar">
        <button className="icon-btn" onClick={onHome} aria-label="Zur Startseite">
          <img src="/favicon.svg" alt="" width={32} height={32} />
        </button>
        <div className="topbar-title">
          <strong>Wo gehen wir hin?</strong>
          <span>
            📍 {s.search.label || "Ausgangspunkt"} · {s.search.radiusM / 1000} km
          </span>
        </div>
        <button className="btn secondary small" onClick={share}>
          Einladen
        </button>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "swipe"} onClick={() => setTab("swipe")}>
          Swipen{places && votes ? ` (${remaining.length})` : ""}
        </button>
        <button role="tab" aria-selected={tab === "results"} onClick={() => setTab("results")}>
          {s.perfectMatchIds.length > 0 ? "Ergebnis 🎉" : "Ergebnis"}
        </button>
      </nav>

      {tab === "swipe" &&
        (closed ? (
          <section className="empty">
            <p>Diese Runde ist beendet.</p>
            <button className="btn primary" onClick={() => setTab("results")}>
              Zum Ergebnis
            </button>
          </section>
        ) : placesError ? (
          <p className="error">{placesError}</p>
        ) : !places || !votes ? (
          <div className="center grow">
            <div className="spinner" aria-label="Lädt" />
          </div>
        ) : remaining.length === 0 || me.done ? (
          <section className="empty">
            <div className="big-emoji">{remaining.length === 0 ? "🎉" : "✋"}</div>
            <p>{remaining.length === 0 ? "Du hast alle Lokale geswipt." : "Du bist fertig."}</p>
            {!me.done && remaining.length === 0 ? (
              <button className="btn primary" onClick={() => setDone(true)}>
                Fertig – zum Ergebnis
              </button>
            ) : (
              <button className="btn primary" onClick={() => setTab("results")}>
                Zum Ergebnis
              </button>
            )}
            {me.done && remaining.length > 0 && (
              <button className="link" onClick={() => setDone(false)}>
                Doch weiterswipen ({remaining.length} übrig)
              </button>
            )}
          </section>
        ) : (
          <SwipeDeck places={remaining} photoUrl={photoUrl} onVote={vote} onOpen={setDetail} onDone={() => setDone(true)} />
        ))}

      {tab === "results" && (
        <Results
          sessionId={sessionId}
          session={s}
          places={places}
          photoUrl={photoUrl}
          members={active}
          uid={uid}
          isCreator={isCreator}
          onOpen={setDetail}
          onError={setToast}
        />
      )}

      {detail && <PlaceSheet place={detail} photoUrl={photoUrl(detail)} onClose={() => setDetail(null)} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
