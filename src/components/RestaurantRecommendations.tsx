// src/components/RestaurantRecommendations.tsx
// Preserves original UX: current advances ONLY on user action or restart.
// Adds excludeIds + sessionCompleted handling to prevent repeats & infinite sessions.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../firebaseConfig";

export type Restaurant = {
  id: string;
  name: string;
  address?: string | null;
  priceLevel?: 0 | 1 | 2 | 3 | 4 | null;
  distance?: number;     // km – backend fills this
  photoUrl?: string | null;
  primaryType?: string | null;
  types?: string[];
};

type Coords = { latitude: number; longitude: number };

type Props = {
  location: Coords | null;
  children: (args: {
    loading: boolean;
    error: string | null;
    current: Restaurant | null;
    queue: Restaurant[];
    like: () => Promise<void>;
    pass: () => Promise<void>;
    superStar: () => Promise<void>;
    shouldMatchPrompt: boolean;
    top3CandidateIds: string[];
    superStarRestaurantId: string | null;
    finalizeMatch: (winnerRestaurantId: string) => Promise<boolean>;
    restart: () => Promise<void>;
  }) => React.ReactNode;
};

// Central API root so I don’t sprinkle URLs around the app.
const API_ROOT = "https://2eatapp.com/api";

// Helper to attach Firebase ID token to every request.
async function authedFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("no-auth");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(init?.headers as any),
  };
  return fetch(`${API_ROOT}${path}`, { ...init, headers });
}

export default function RestaurantRecommendations({ location, children }: Props) {
  // Queue + current card
  const [queue, setQueue] = useState<Restaurant[]>([]);
  const [current, setCurrent] = useState<Restaurant | null>(null);

  // Session + UI states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Like / SuperStar bookkeeping so I can show the match modal locally
  const [likes, setLikes] = useState<string[]>([]);
  const [superStarId, setSuperStarId] = useState<string | null>(null);

  // StrictMode / race guards
  const startInFlight = useRef(false);            // prevents double /start
  const bootKeyRef = useRef<string | null>(null); // tracks location snapshot I booted with
  const retriedOnceRef = useRef(false);           // one-shot auto-recovery if /next fails/empties
  const mountedRef = useRef(true);

  // Repeat prevention (server also dedupes with excludeIds; we keep a tiny local history)
  const recentSeenRef = useRef<string[]>([]);     // tail of seen/current ids

  // Session cap from server
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Derive "show match modal?"
  const shouldMatchPrompt = sessionCompleted || likes.length >= 15;
  const top3CandidateIds = useMemo(() => likes.slice(0, 3), [likes]);

  // Keep current = queue[0]. This is why the card NEVER advances unless we mutate the queue.
  useEffect(() => {
    setCurrent(queue.length ? queue[0] : null);
  }, [queue]);

  // Stable “boot key” per location so we only start once per snapshot (StrictMode-safe).
  const bootKey = location ? `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}` : null;

  // Start a session and return the new sessionId so we can immediately use it for /next.
  const startSession = useCallback(async (): Promise<string | null> => {
    if (!location) return null;
    if (startInFlight.current) return sessionId; // already starting; reuse last known

    try {
      startInFlight.current = true;
      setLoading(true);
      setError(null);

      const r = await authedFetch("/recs/start", {
        method: "POST",
        body: JSON.stringify({
          lat: location.latitude,
          lng: location.longitude,
          minPool: 100,
        }),
      });
      if (!r.ok) throw new Error(`start ${r.status}`);
      const json = await r.json();
      const newId: string = json.sessionId;

      if (mountedRef.current) {
        setSessionId(newId);
        setLikes([]);
        setSuperStarId(null);
        setQueue([]);
        setSessionCompleted(false);
        recentSeenRef.current = [];
        retriedOnceRef.current = false;
      }

      return newId;
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || "Could not start session");
      return null;
    } finally {
      startInFlight.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [location, sessionId]);

  // Helper to build excludeIds for /next to prevent repeats while feedback is in flight.
  const buildExcludeIds = useCallback(() => {
    const s = new Set<string>();
    if (current?.id) s.add(current.id);
    for (const q of queue) if (q?.id) s.add(q.id);
    for (const id of recentSeenRef.current.slice(-30)) s.add(id);
    return Array.from(s);
  }, [current, queue]);

  // Fetch the next card(s). We never mutate `current` here — only append to `queue`.
  const fetchNext = useCallback(
    async (explicitSessionId?: string, limit = 1) => {
      if (!location) return;
      const sid = explicitSessionId || sessionId;
      if (!sid || sessionCompleted) return;

      try {
        setLoading(true);
        setError(null);

        const r = await authedFetch("/recs/next", {
          method: "POST",
          body: JSON.stringify({
            sessionId: sid,
            lat: location.latitude,
            lng: location.longitude,
            limit,
            excludeIds: buildExcludeIds(),
          }),
        });

        // Bad/old session → one-shot restart
        if (r.status === 400 || r.status === 409) {
          if (!retriedOnceRef.current) {
            retriedOnceRef.current = true;
            const newSid = await startSession();
            if (newSid) await fetchNext(newSid, limit);
          }
          return;
        }

        if (!r.ok) throw new Error(`next ${r.status}`);
        const json = await r.json();

        if (json?.sessionCompleted) {
          setSessionCompleted(true);
          return;
        }

        const items: Restaurant[] = json.items || [];
        if (items.length === 0) {
          // One-shot empty recovery (ranker hiccup or hydration race).
          if (!retriedOnceRef.current) {
            retriedOnceRef.current = true;
            const newSid = await startSession();
            if (newSid) await fetchNext(newSid, limit);
          }
          return;
        }

        setQueue((q) => [...q, ...items]);
      } catch (e: any) {
        setError(e?.message || "Could not load suggestions.");
      } finally {
        setLoading(false);
      }
    },
    [location, sessionId, sessionCompleted, startSession, buildExcludeIds]
  );

  // Public: restart from the UI (e.g., after finishing a match or the user wants a fresh pool).
  const restart = useCallback(async () => {
    const newSid = await startSession();
    if (newSid) await fetchNext(newSid, 1);
  }, [startSession, fetchNext]);

  // Boot exactly once per location snapshot.
  useEffect(() => {
    (async () => {
      if (!bootKey) return;
      if (bootKeyRef.current === bootKey) return; // already booted for this snapshot
      bootKeyRef.current = bootKey;

      const newSid = await startSession();
      if (newSid) await fetchNext(newSid, 1);
    })();
  }, [bootKey, startSession, fetchNext]);

  // Send feedback → pop current → fetch one more for the tail of the queue.
  const sendFeedback = useCallback(
    async (action: "LIKE" | "PASS" | "SUPERSTAR") => {
      const curr = current;

      // Optimistic pop so the UI feels snappy (this is the ONLY place we advance the card)
      setQueue((q) => q.slice(1));

      if (!curr || !sessionId) {
        // No current/invalid session? Try to pull another silently.
        const newSid = sessionId || (await startSession());
        if (newSid) await fetchNext(newSid, 1);
        return;
      }

      try {
        // Track recent to avoid echo if /next races /feedback
        recentSeenRef.current.push(curr.id);
        if (recentSeenRef.current.length > 60) {
          recentSeenRef.current = recentSeenRef.current.slice(-60);
        }

        const r = await authedFetch("/recs/feedback", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            restaurantId: curr.id,
            action, // server normalizes, but we send uppercase
          }),
        });

        if (!r.ok) {
          // Non-fatal – we still move forward
        } else {
          const j = await r.json().catch(() => null);
          if (j?.sessionCompleted) setSessionCompleted(true);
          if (action === "LIKE") setLikes((xs) => (xs.includes(curr.id) ? xs : [...xs, curr.id]));
          if (action === "SUPERSTAR") setSuperStarId(curr.id);
        }
      } catch {
        // ignore; we still fetch another suggestion
      } finally {
        await fetchNext(sessionId, 1);
      }
    },
    [current, sessionId, startSession, fetchNext]
  );

  const like = useCallback(async () => sendFeedback("LIKE"), [sendFeedback]);
  const pass = useCallback(async () => sendFeedback("PASS"), [sendFeedback]);
  const superStar = useCallback(async () => sendFeedback("SUPERSTAR"), [sendFeedback]);

  const finalizeMatch = useCallback(
    async (winnerRestaurantId: string) => {
      if (!sessionId) return false;
      try {
        const top3 = likes.slice(0, 3);
        const r = await authedFetch("/recs/finalize-match", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            top3,
            winnerRestaurantId,
            superStarRestaurantId: superStarId,
          }),
        });
        if (r.ok) setSessionCompleted(true);
        return r.ok;
      } catch {
        return false;
      }
    },
    [sessionId, likes, superStarId]
  );

  return (
    <>
      {children({
        loading,
        error,
        current,
        queue,
        like,
        pass,
        superStar,
        shouldMatchPrompt,
        top3CandidateIds,
        superStarRestaurantId: superStarId,
        finalizeMatch,
        restart,
      })}
    </>
  );
}
