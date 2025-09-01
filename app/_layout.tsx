// app/_layout.tsx
import { SplashScreen, Stack, useRouter, usePathname } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import Toast from "react-native-toast-message";
import { auth } from "../firebaseConfig";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import "./global.css";

const BACKEND_API_BASE_URL = "https://2eatapp.com";

// Keep splash up until we finish init
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [iconsReady, setIconsReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userPresent, setUserPresent] = useState<boolean | null>(null);
  const navigatedRef = useRef(false);

  // 🔤 Load vector icon fonts (web + native) via expo-font (no CSS needed)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
        });
      } catch (e) {
        console.warn("Icon fonts failed to load:", e);
      } finally {
        if (mounted) setIconsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔐 Auth listener (don’t block navigation on sync)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUserPresent(true);
          try {
            const idToken = await user.getIdToken();
            fetch(`${BACKEND_API_BASE_URL}/api/users/sync-profile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ uid: user.uid, email: user.email }),
            }).catch(() => {});
          } catch {}
        } else {
          setUserPresent(false);
        }
      } finally {
        setAuthChecked(true);
      }
    });
    return unsubscribe;
  }, []);

  // 🚦 One-time routing decision to avoid “kick out” on refresh
  useEffect(() => {
    if (!iconsReady || !authChecked || navigatedRef.current) return;

    const isOnboarding = pathname?.startsWith("/onboarding");
    const isHome = pathname === "/home" || pathname?.startsWith("/(tabs)");

    if (userPresent === true) {
      if (isOnboarding) router.replace("/home");
    } else if (userPresent === false) {
      if (!isOnboarding) router.replace("/onboarding");
    }
    navigatedRef.current = true;
  }, [iconsReady, authChecked, userPresent, pathname, router]);

  // 🧼 Hide splash when ready
  useEffect(() => {
    if (iconsReady && authChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [iconsReady, authChecked]);

  // Keep UI blank until fonts + auth are ready
  if (!iconsReady || !authChecked) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
