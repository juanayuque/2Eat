// src/components/RestaurantRecommendations.tsx
// I own the recs session lifecycle here. Important changes:
// - I only start ONE session per location snapshot (StrictMode-safe).
// - startSession returns the new sessionId so I can immediately use it for /next.
// - If /next says "bad/old session", I auto-restart once and retry (no spam).
// - I always pass lat/lng to both /start and /next so distance + ranking stay correct.

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
  const startInFlight = useRef(false);           // prevents double /start
  const bootKeyRef = useRef<string | null>(null); // tracks the last location snapshot I booted with
  const retriedOnceRef = useRef(false);          // one-shot auto-recovery if /next fails/empties
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Derive "show match modal?" from how many likes we have
  const shouldMatchPrompt = likes.length >= 15;
  const top3CandidateIds = useMemo(() => likes.slice(0, 3), [likes]);

  // Keep current = queue[0]
  useEffect(() => {
    setCurrent(queue.length ? queue[0] : null);
  }, [queue]);

  // I compute a stable “boot key” per location so I only start once per snapshot.
  const bootKey = location ? `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}` : null;

  // Start a session and return the *new* sessionId so I can immediately use it for /next.
  const startSession = useCallback(async (): Promise<string | null> => {
    if (!location) return null;
    if (startInFlight.current) return sessionId; // already starting; reuse the last known id if any

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

      // Reset my local state for a clean run.
      if (mountedRef.current) {
        setSessionId(newId);
        setLikes([]);
        setSuperStarId(null);
        setQueue([]);
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

  // Fetch the next card. I allow passing a specific session to avoid stale-state races.
  const fetchNext = useCallback(
    async (explicitSessionId?: string) => {
      if (!location) return;
      const sid = explicitSessionId || sessionId;
      if (!sid) return; // no valid session to use yet

      try {
        setLoading(true);
        setError(null);

        const r = await authedFetch("/recs/next", {
          method: "POST",
          body: JSON.stringify({
            sessionId: sid,
            lat: location.latitude,
            lng: location.longitude,
            limit: 1,
          }),
        });

        // If the server signals bad session or missing params, I’ll do a one-shot restart.
        if (r.status === 400 || r.status === 409) {
          if (!retriedOnceRef.current) {
            retriedOnceRef.current = true;
            const newSid = await startSession();
            if (newSid) await fetchNext(newSid);
          }
          return;
        }

        if (!r.ok) throw new Error(`next ${r.status}`);
        const json = await r.json();
        const items: Restaurant[] = json.items || [];

        if (items.length === 0) {
          // One-shot empty recovery (ranker hiccup or hydration race).
          if (!retriedOnceRef.current) {
            retriedOnceRef.current = true;
            const newSid = await startSession();
            if (newSid) await fetchNext(newSid);
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
    [location, sessionId, startSession]
  );

  // Public: restart from the UI (e.g., after finishing a match or the user wants a fresh pool).
  const restart = useCallback(async () => {
    const newSid = await startSession();
    if (newSid) await fetchNext(newSid);
  }, [startSession, fetchNext]);

  // On first usable location (or when location snapshot changes), I boot exactly once.
  useEffect(() => {
    (async () => {
      if (!bootKey) return;

      // StrictMode-safe: if we already booted for this location snapshot, do nothing.
      if (bootKeyRef.current === bootKey) return;
      bootKeyRef.current = bootKey;

      const newSid = await startSession();
      if (newSid) await fetchNext(newSid);
    })();
  }, [bootKey, startSession, fetchNext]);

  // Send feedback and then pull the next card
  const sendFeedback = useCallback(
    async (action: "LIKE" | "PASS" | "SUPERSTAR") => {
      const curr = current;

      // Optimistic pop so the UI feels snappy
      setQueue((q) => q.slice(1));

      if (!curr || !sessionId) {
        // No current/invalid session? Try to pull another silently.
        const newSid = sessionId || (await startSession());
        if (newSid) await fetchNext(newSid);
        return;
      }

      try {
        await authedFetch("/recs/feedback", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            restaurantId: curr.id,
            action,
          }),
        });
        if (action === "LIKE") setLikes((xs) => (xs.includes(curr.id) ? xs : [...xs, curr.id]));
        if (action === "SUPERSTAR") setSuperStarId(curr.id);
      } catch {
        // Non-fatal – I still move forward
      } finally {
        await fetchNext(sessionId);
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
