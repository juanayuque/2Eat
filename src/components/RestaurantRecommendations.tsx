import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { auth } from "../../firebaseConfig";

type Coords = { latitude: number; longitude: number };

export type Restaurant = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  coords?: Coords | null;
  priceLevel?: 1 | 2 | 3 | 4;
  photoUrl?: string;
  distance?: number; // km
};

type RenderProps = {
  loading: boolean;
  error: string | null;
  items: Restaurant[];
  index: number;
  current: Restaurant | null;
  like: () => void;
  pass: () => void;
  refresh: () => void;
};

type Props = {
  location: Coords | null;
  children?: (props: RenderProps) => React.ReactNode;
  /** override path if needed, e.g. "/api/recommendations/nearby" */
  endpoint?: string;
};

/** Prefer env when available; falls back to prod domain */
const BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) || "https://2eatapp.com";

/** Haversine (km) as a fallback if backend doesn’t send distance */
function computeDistanceKm(a?: Coords | null, b?: Coords | null): number | null {
  if (!a || !b) return null;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function RestaurantRecommendations({
  location,
  children,
  endpoint = "/api/location-info",
}: Props) {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const current = useMemo(
    () => (items.length ? items[index % items.length] : null),
    [items, index]
  );

  async function fetchWithIdToken(url: string, signal: AbortSignal) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");

    // 1st try: current cached token
    let token = await user.getIdToken();
    let res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal,
    });

    // If token is expired or rejected, force refresh once and retry
    if (res.status === 401) {
      token = await user.getIdToken(true);
      res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal,
      });
    }
    return res;
  }

  const fetchData = async () => {
    if (!location) return;

    // cancel any in-flight request
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      setLoading(true);
      setError(null);

      const url = `${BASE_URL}${endpoint}?lat=${location.latitude}&lng=${location.longitude}`;
      const res = await fetchWithIdToken(url, abort.signal);

      if (!res.ok) {
        // Try to extract backend error details
        let msg = `Backend responded with ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      const raw: any[] =
        data?.nearbyRestaurants ?? data?.restaurants ?? data ?? [];

      const mapped: Restaurant[] = raw.map((r: any, i: number) => {
        // Backend now sends normalized fields
        const coords: Coords | undefined =
          r?.latitude != null && r?.longitude != null
            ? { latitude: r.latitude, longitude: r.longitude }
            : undefined;

        const dist =
          typeof r?.distance === "number"
            ? r.distance
            : computeDistanceKm(location, coords ?? null) ?? undefined;

        return {
          id: String(r?.googlePlaceId ?? r?.id ?? r?.place_id ?? i),
          name: r?.name ?? "Unknown spot",
          description:
            r?.editorialSummary ??
            r?.description ??
            r?.summary ??
            undefined,
          address: r?.formattedAddress ?? r?.address ?? r?.vicinity ?? undefined,
          coords,
          priceLevel:
            typeof r?.priceLevel === "number" ? (r.priceLevel as 1 | 2 | 3 | 4) : undefined,
          photoUrl: r?.photoUrl ?? r?.photo_url ?? r?.imageUrl ?? r?.image_url,
          distance: dist,
        };
      });

      // Optional: sort by distance if present
      mapped.sort((a, b) => {
        const da = a.distance ?? Number.POSITIVE_INFINITY;
        const db = b.distance ?? Number.POSITIVE_INFINITY;
        return da - db;
      });

      setItems(mapped);
      setIndex(0);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("Recommendations fetch error:", e);
      setError(
        e?.message ||
          "Could not fetch dining suggestions. Please try again shortly."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!location) return;
    fetchData();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, endpoint]);

  const like = () => setIndex((i) => i + 1);
  const pass = () => setIndex((i) => i + 1);
  const refresh = () => fetchData();

  const renderPayload: RenderProps = {
    loading,
    error,
    items,
    index,
    current,
    like,
    pass,
    refresh,
  };

  // Prefer render-prop rendering (Home controls the UI)
  if (typeof children === "function") {
    return <>{children(renderPayload)}</>;
  }

  // Minimal RN fallback (debug)
  if (!location) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {error ? (
        <Text style={{ color: "red" }}>{error}</Text>
      ) : loading ? (
        <Text>Loading restaurants…</Text>
      ) : !items.length ? (
        <Text>No suggestions found.</Text>
      ) : (
        items.map((r) => (
          <Text key={r.id}>
            • {r.name}
            {typeof r.distance === "number" ? ` (${r.distance.toFixed(1)} km)` : ""}
          </Text>
        ))
      )}
    </View>
  );
}
