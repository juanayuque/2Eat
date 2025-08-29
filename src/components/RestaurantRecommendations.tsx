// src/components/RestaurantRecommendations.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../firebaseConfig";

/* ───────────── Types ───────────── */

export type Restaurant = {
  id: string;
  name: string;
  address?: string | null;
  distance?: number | null;      // km
  photoUrl?: string | null;
  primaryType?: string | null;
  types?: string[] | null;
  priceLevel?: number | null;    // 0..4
  editorialSummary?: string | null;
  editorial_summary?: string | null;
  servesVegetarianFood?: boolean | null;
  allowsDogs?: boolean | null;
  hasParking?: boolean | null;
};

type Coords = { latitude: number; longitude: number };

type FeedbackResp = {
  ok: boolean;
  shouldRerank?: boolean;
  shouldSuggestMatch?: boolean;
  sessionCompleted?: boolean;
};

type FinalizeResponse = {
  ok?: boolean;
  winner?: Restaurant | null;
};

type Props = {
  location: Coords;
  children: (ctx: {
    loading: boolean;
    error: string | null;

    current: Restaurant | null;
    queue: Restaurant[];

    like: () => Promise<void>;
    pass: () => Promise<void>;
    superStar: () => Promise<void>;

    shouldMatchPrompt: boolean;
    top3CandidateIds: string[];         // derived client-side from likes/queue
    superStarRestaurantId: string | null;

    finalizeMatch: (id: string) => Promise<FinalizeResponse | null>;
    restart: () => Promise<void>;
  }) => React.ReactNode;
};

/* ───────────── Config ───────────── */

const API_BASE = "https://2eatapp.com";  // keep consistent with app
const PAGE_SIZE = 8;                     // uses `limit` on /recs/next
const MIN_QUEUE = 2;                     // keep queue topped up for snappy UX

/* ───────────── Helpers ───────────── */

async function authedFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers });
  return res;
}

/* ───────────── Component ───────────── */

export default function RestaurantRecommendations({ location, children }: Props) {
  // Session
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Presentation state
  const [current, setCurrent] = useState<Restaurant | null>(null);
  const [queue, setQueue] = useState<Restaurant[]>([]);
  const likesRef = useRef<string[]>([]);
  const [superStarRestaurantId, setSuperStarRestaurantId] = useState<string | null>(null);

  // UI flags
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldMatchPrompt, setShouldMatchPrompt] = useState(false);

  // lifecycle guards
  const mountedRef = useRef(true);
  const startInFlight = useRef<Promise<string | null> | null>(null);
  const nextInFlight = useRef<Promise<void> | null>(null);
  const feedbackBusy = useRef(false);

  useEffect(() => () => { mountedRef.current = false; }, []);

  /* Build a small client-side “exclude list” so /next doesn’t send
     items we’re already showing or prefetched locally. The server
     already excludes swiped items. */
  const buildExcludeIds = useCallback(() => {
    const s = new Set<string>();
    if (current?.id) s.add(current.id);
    for (const q of queue) if (q?.id) s.add(q.id);
    return Array.from(s);
  }, [current?.id, queue]);

  const promoteNext = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) {
        setCurrent(null);
        return prev;
      }
      const [head, ...rest] = prev;
      setCurrent(head);
      return rest;
    });
  }, []);

  /* ───────────── Session start/reset ───────────── */

  const startSession = useCallback(async (): Promise<string | null> => {
    if (startInFlight.current) return startInFlight.current;

    const task = (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch("/recs/start", {
          method: "POST",
          body: JSON.stringify({
            lat: location.latitude,
            lng: location.longitude,
            minPool: 100,
          }),
        });
        if (!res.ok) throw new Error(`start ${res.status}`);
        const json = await res.json();
        const newId: string = json.sessionId;

        if (mountedRef.current) {
          setSessionId(newId);
          setCurrent(null);
          setQueue([]);
          setShouldMatchPrompt(false);
          likesRef.current = [];
          setSuperStarRestaurantId(null);
        }
        return newId;
      } catch (e: any) {
        if (mountedRef.current) setError(e?.message || "Could not start session");
        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    startInFlight.current = task.finally(() => { startInFlight.current = null; });
    return task;
  }, [location.latitude, location.longitude]);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    return startSession();
  }, [sessionId, startSession]);

  const restart = useCallback(async () => {
    const id = await startSession();
    if (id && mountedRef.current) {
      await fetchMore(true);
    }
  }, [startSession]);

  /* ───────────── Fetch next page ───────────── */

  const fetchMore = useCallback(async (force = false) => {
    if (nextInFlight.current) return nextInFlight.current;
    if (!force && queue.length >= MIN_QUEUE) return;

    const task = (async () => {
      const id = await ensureSession();
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch("/recs/next", {
          method: "POST",
          body: JSON.stringify({
            sessionId: id,
            lat: location.latitude,
            lng: location.longitude,
            limit: PAGE_SIZE,
            excludeIds: buildExcludeIds(),
          }),
        });
        if (!res.ok) throw new Error(`next ${res.status}`);
        const json = await res.json();
        const items: Restaurant[] = Array.isArray(json.items) ? json.items : [];

        if (!mountedRef.current) return;
        setQueue((prev) => {
          const combined = prev.concat(items);
          if (!current && combined.length > 0) {
            const [head, ...rest] = combined;
            setCurrent(head);
            return rest;
          }
          return combined;
        });
      } catch (e: any) {
        if (mountedRef.current) setError(e?.message || "Could not load more suggestions");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    nextInFlight.current = task.finally(() => { nextInFlight.current = null; });
    return task;
  }, [ensureSession, location.latitude, location.longitude, buildExcludeIds, current, queue.length]);

  useEffect(() => {
    (async () => {
      if (!location) return;
      if (!sessionId) {
        await restart();
      } else {
        await fetchMore();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    if (sessionId && queue.length < MIN_QUEUE) {
      void fetchMore();
    }
  }, [sessionId, queue.length, fetchMore]);

  /* ───────────── Feedback (LIKE / PASS / SUPERSTAR) ───────────── */

  const sendFeedback = useCallback(
    async (actionUpper: "LIKE" | "PASS" | "SUPERSTAR") => {
      if (feedbackBusy.current) return;
      if (!current?.id) return;

      feedbackBusy.current = true;
      setError(null);

      try {
        const id = await ensureSession();
        if (!id) throw new Error("no session");

        // optimistic client-side bookkeeping
        if (actionUpper === "LIKE") {
          likesRef.current = [...likesRef.current, current.id];
        }
        if (actionUpper === "SUPERSTAR") {
          setSuperStarRestaurantId(current.id);
        }

        const res = await authedFetch("/recs/feedback", {
          method: "POST",
          body: JSON.stringify({
            sessionId: id,
            restaurantId: current.id,
            action: actionUpper, // server expects uppercase
          }),
        });

        let resp: FeedbackResp | null = null;
        try { resp = await res.json(); } catch {}
        if (!res.ok) throw new Error(resp?.error || `feedback ${res.status}`);

        // server tells us when to prompt
        if (mountedRef.current) {
          const prompt = Boolean(resp?.shouldSuggestMatch || resp?.sessionCompleted);
          if (prompt) setShouldMatchPrompt(true);
        }

        // advance UI and keep prefetching
        promoteNext();
        void fetchMore();
      } catch (e: any) {
        if (mountedRef.current) setError(e?.message || "Could not submit feedback");
      } finally {
        feedbackBusy.current = false;
      }
    },
    [current?.id, ensureSession, promoteNext, fetchMore]
  );

  const like = useCallback(async () => sendFeedback("LIKE"), [sendFeedback]);
  const pass = useCallback(async () => sendFeedback("PASS"), [sendFeedback]);
  const superStar = useCallback(async () => sendFeedback("SUPERSTAR"), [sendFeedback]);

  /* ───────────── Finalize ───────────── */

  const top3CandidateIds = useMemo(() => {
    // Prefer last 3 likes (most recent first), else fall back to current+queue
    const liked = likesRef.current.slice(-3).reverse();
    if (liked.length === 3) return liked;
    const fill: string[] = [];
    if (current?.id) fill.push(current.id);
    for (const q of queue) {
      if (fill.length >= 3) break;
      if (q?.id && !fill.includes(q.id) && !liked.includes(q.id)) fill.push(q.id);
    }
    return [...liked, ...fill].slice(0, 3);
  }, [current?.id, queue]);

  const finalizeMatch = useCallback(
    async (winnerId: string): Promise<FinalizeResponse | null> => {
      try {
        const id = await ensureSession();
        if (!id) throw new Error("no session");

        const res = await authedFetch("/recs/finalize-match", {
          method: "POST",
          body: JSON.stringify({
            sessionId: id,
            top3: top3CandidateIds,
            winnerRestaurantId: winnerId,
            superStarRestaurantId: superStarRestaurantId,
          }),
        });
        if (!res.ok) throw new Error(`finalize ${res.status}`);
        const json: FinalizeResponse = await res.json();

        // After finalize, the session is completed server-side.
        if (mountedRef.current) {
          setShouldMatchPrompt(false);
        }
        return json;
      } catch (e: any) {
        if (mountedRef.current) setError(e?.message || "Could not finalize match");
        return null;
      }
    },
    [ensureSession, top3CandidateIds, superStarRestaurantId]
  );

  /* ───────────── Expose to children ───────────── */

  const ctx = useMemo(
    () => ({
      loading,
      error,

      current,
      queue,

      like,
      pass,
      superStar,

      shouldMatchPrompt,
      top3CandidateIds,
      superStarRestaurantId,

      finalizeMatch,
      restart,
    }),
    [
      loading,
      error,
      current,
      queue,
      like,
      pass,
      superStar,
      shouldMatchPrompt,
      top3CandidateIds,
      superStarRestaurantId,
      finalizeMatch,
      restart,
    ]
  );

  return <>{children(ctx)}</>;
}
