// src/utils/location.ts
import * as Location from "expo-location";

export type Coords = { latitude: number; longitude: number };

/**
 * Resilient location getter:
 * - tries last known (instant)
 * - tries a bounded one-shot fix
 * - falls back to a short watch if needed
 */
export async function getLocationResilient(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("perm-denied");
  }

  // 1) last known (may be stale but instant)
  const last = await Location.getLastKnownPositionAsync();
  if (last?.coords) {
    return { latitude: last.coords.latitude, longitude: last.coords.longitude };
  }

  // 2) one-shot with timeout
  const oneShot = (await Promise.race([
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,     // quicker than BestForNavigation
      maximumAge: 15_000,
      mayShowUserSettingsDialog: true,
    }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
  ]).catch(() => null)) as Location.LocationObject | null;

  if (oneShot?.coords) {
    return { latitude: oneShot.coords.latitude, longitude: oneShot.coords.longitude };
  }

  // 3) short live watch; resolve on first fix or time out
  return new Promise<Coords>((resolve, reject) => {
    let cleaned = false as boolean;
    let sub: Location.LocationSubscription | null = null;

    const stop = () => {
      if (cleaned) return;
      cleaned = true;
      sub?.remove();
      sub = null;
    };

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 2000,
        distanceInterval: 0,
      },
      (p) => {
        stop();
        resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      }
    ).then(s => { sub = s; }).catch(err => { stop(); reject(err); });

    setTimeout(() => { stop(); reject(new Error("watch-timeout")); }, 15_000);
  });
}

/**
 * Reverse geocode via your backend (free providers behind the server).
 * Pass an idToken from Firebase to satisfy your auth middleware.
 */
export async function fetchCityFromBackend(
  lat: number,
  lng: number,
  idToken: string,
  baseUrl = "https://2eatapp.com"
): Promise<string | null> {
  const res = await fetch(`${baseUrl}/api/reverse-geocode?lat=${lat}&lng=${lng}`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  // Expecting { city, country, ... }
  return j?.city ?? null;
}
