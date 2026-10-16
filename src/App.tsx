import { Home } from "./components/Home";
import { Round } from "./components/Round";
import { useAnonymousUid, usePath } from "./hooks";

export function App() {
  const { uid, error } = useAnonymousUid();
  const [path, navigate] = usePath();
  const roundId = path.match(/^\/r\/([A-Za-z0-9]{20})\/?$/)?.[1];

  if (error) {
    return (
      <main className="page center">
        <p>Verbindung fehlgeschlagen. Bitte Seite neu laden.</p>
      </main>
    );
  }
  if (!uid) {
    return (
      <main className="page center">
        <div className="spinner" aria-label="Lädt" />
      </main>
    );
  }
  if (roundId) return <Round sessionId={roundId} uid={uid} onHome={() => navigate("/")} />;
  return <Home onCreated={(id) => navigate(`/r/${id}`)} />;
}
