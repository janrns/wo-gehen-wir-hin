import { useEffect, useRef, useState } from "react";
import type { Place } from "../types";
import { PlaceCard } from "./PlaceCard";

const THRESHOLD = 90;
const EXIT_MS = 220;

interface Props {
  places: Place[];
  onVote: (placeId: string, like: boolean) => void;
  onOpen: (place: Place) => void;
  onDone: () => void;
}

export function SwipeDeck({ places, onVote, onOpen, onDone }: Props) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<"left" | "right" | null>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const top = places[0];

  function decide(like: boolean) {
    if (exit || !top) return;
    setExit(like ? "right" : "left");
    const id = top.id;
    setTimeout(() => {
      onVote(id, like);
      setExit(null);
      setDx(0);
    }, EXIT_MS);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") decide(false);
      if (e.key === "ArrowRight") decide(true);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  function onPointerDown(e: React.PointerEvent) {
    if (exit) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const d = e.clientX - start.current.x;
    if (Math.abs(d) > 6 || Math.abs(e.clientY - start.current.y) > 6) start.current.moved = true;
    setDx(d);
  }

  function onPointerUp() {
    if (!start.current) return;
    const moved = start.current.moved;
    start.current = null;
    setDragging(false);
    if (!moved) {
      setDx(0);
      onOpen(top);
    } else if (Math.abs(dx) > THRESHOLD) {
      decide(dx > 0);
    } else {
      setDx(0);
    }
  }

  const offset = exit === "right" ? 600 : exit === "left" ? -600 : dx;
  const style: React.CSSProperties = {
    transform: `translateX(${offset}px) rotate(${offset / 18}deg)`,
    transition: dragging ? "none" : `transform ${EXIT_MS}ms ease-out`,
  };
  const intent = Math.max(-1, Math.min(1, offset / THRESHOLD));

  return (
    <section className="deck-wrap">
      <div className="deck">
        {places[1] && (
          <div className="deck-card behind" aria-hidden>
            <PlaceCard place={places[1]} />
          </div>
        )}
        <div
          key={top.id}
          className="deck-card"
          style={style}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <PlaceCard place={top} />
          <div className="stamp like" style={{ opacity: Math.max(0, intent) }}>
            ♥ Gerne
          </div>
          <div className="stamp nope" style={{ opacity: Math.max(0, -intent) }}>
            ✕ Eher nicht
          </div>
        </div>
      </div>

      <div className="deck-actions">
        <button className="round-btn nope" onClick={() => decide(false)} aria-label="Eher nicht">
          ✕
        </button>
        <button className="round-btn info" onClick={() => onOpen(top)} aria-label="Details">
          i
        </button>
        <button className="round-btn like" onClick={() => decide(true)} aria-label="Gefällt mir">
          ♥
        </button>
      </div>
      <p className="hint">
        Wischen oder tippen · noch {places.length}{" "}
        <button className="link" onClick={onDone}>
          Ich bin fertig
        </button>
      </p>
    </section>
  );
}
