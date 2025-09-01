// app/_layout.tsx
import { SplashScreen, Stack, useRouter, usePathname } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import Toast from "react-native-toast-message";
import { auth } from "../firebaseConfig";
import { Platform } from "react-native";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// If you have global styles, keep them
import "./global.css";

if (Platform.OS === "web") {
  import("@expo/vector-icons/build/vendor/react-native-vector-icons/font/react-native-vector-icons.css");
}

const BACKEND_API_BASE_URL = "https://2eatapp.com";

// Keep splash visible until we're ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [iconsReady, setIconsReady] = useState(Platform.OS === "web"); // web gets fonts via CSS
  const [authChecked, setAuthChecked] = useState(false);               // initial auth resolved?
  const [userPresent, setUserPresent] = useState<boolean | null>(null); // true/false after check

  const navigatedRef = useRef(false);

  // 1) Load icon fonts on native (iOS/Android). On web, CSS import above does it.
  useEffect(() => {
    if (Platform.OS === "web") return;
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

  // 2) Resolve initial auth state (and optionally sync profile)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUserPresent(true);
          // Optional: sync with backend (non-blocking for navigation)
          try {
            const idToken = await user.getIdToken();
            await fetch(`${BACKEND_API_BASE_URL}/api/users/sync-profile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ uid: user.uid, email: user.email }),
            });
          } catch (e) {
            console.warn("sync-profile failed (continuing):", e);
          }
        } else {
          setUserPresent(false);
        }
      } finally {
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, []);

  // 3) Decide navigation once (prevents “kick out” on hard refresh)
  useEffect(() => {
    if (!iconsReady || !authChecked || navigatedRef.current) return;

    const isOnboarding = pathname?.startsWith("/onboarding");
    const isHome = pathname === "/home" || pathname?.startsWith("/(tabs)");

    if (userPresent === true) {
      // Logged in: if we’re at root or onboarding, go to home. Otherwise, stay.
      if (!isHome && !pathname) {
        router.replace("/home");
        navigatedRef.current = true;
      } else if (isOnboarding) {
        router.replace("/home");
        navigatedRef.current = true;
      } else {
        navigatedRef.current = true;
      }
    } else if (userPresent === false) {
      // Logged out: if we’re not already on onboarding, go there.
      if (!isOnboarding) {
        router.replace("/onboarding");
        navigatedRef.current = true;
      } else {
        navigatedRef.current = true;
      }
    }
  }, [iconsReady, authChecked, userPresent, pathname, router]);

  // 4) Hide splash when we’ve loaded fonts, resolved auth, and (if needed) navigated
  useEffect(() => {
    if (iconsReady && authChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [iconsReady, authChecked]);

  // While waiting for fonts/auth, keep the tree mounted but blank
  if (!iconsReady || !authChecked) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
