import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import type { Member, Session } from "./types";

export function useAnonymousUid(): { uid: string | null; error: boolean } {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [error, setError] = useState(false);
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user) setUid(user.uid);
        else signInAnonymously(auth).catch(() => setError(true));
      }),
    [],
  );
  return { uid, error };
}

export function usePath(): [string, (path: string) => void] {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to: string) => {
    history.pushState(null, "", to);
    setPath(to);
    scrollTo(0, 0);
  };
  return [path, navigate];
}

type Loadable<T> = { status: "loading" } | { status: "missing" } | { status: "ready"; data: T };

export function useSession(sessionId: string): Loadable<Session> {
  const [state, setState] = useState<Loadable<Session>>({ status: "loading" });
  useEffect(
    () =>
      onSnapshot(
        doc(db, "sessions", sessionId),
        (snap) => setState(snap.exists() ? { status: "ready", data: snap.data() as Session } : { status: "missing" }),
        () => setState({ status: "missing" }),
      ),
    [sessionId],
  );
  return state;
}

/** Teilnehmende der Runde. `null` = noch unklar, `false` = man ist (noch) nicht dabei. */
export function useMembers(sessionId: string, uid: string, retryKey: number): Member[] | null | false {
  const [members, setMembers] = useState<Member[] | null | false>(null);
  useEffect(() => {
    setMembers(null);
    return onSnapshot(
      collection(db, "sessions", sessionId, "members"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) }))
          .sort((a, b) => (a.joinedAt?.toMillis() ?? 0) - (b.joinedAt?.toMillis() ?? 0));
        const me = list.find((m) => m.id === uid);
        setMembers(me && !me.removed ? list : false);
      },
      () => setMembers(false),
    );
  }, [sessionId, uid, retryKey]);
  return members;
}

export function useOwnVotes(sessionId: string, uid: string, enabled: boolean): Record<string, boolean> | null {
  const [votes, setVotes] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      doc(db, "sessions", sessionId, "votes", uid),
      (snap) => setVotes((snap.get("votes") as Record<string, boolean>) ?? {}),
      () => setVotes({}),
    );
  }, [sessionId, uid, enabled]);
  return votes;
}
