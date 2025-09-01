// app/_layout.tsx
import { SplashScreen, Stack, useRouter, usePathname } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import Toast from "react-native-toast-message";
import { auth } from "../firebaseConfig";
import { Platform } from "react-native";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Optional global styles
import "./global.css";

const BACKEND_API_BASE_URL = "https://2eatapp.com";

// Keep splash on until ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // On web, we use the CSS that registers the fonts; on native we load TTFs.
  const [iconsReady, setIconsReady] = useState(Platform.OS === "web");
  const [authChecked, setAuthChecked] = useState(false);
  const [userPresent, setUserPresent] = useState<boolean | null>(null);
  const navigatedRef = useRef(false);

  if (Platform.OS === "web") {
    require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts.css");
  }

  // iOS/Android: load icon fonts via expo-font
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

  // Auth init
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUserPresent(true);
          // Optional: sync with backend (don’t block navigation)
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

  // One-time routing decision (prevents “kick out” on refresh)
  useEffect(() => {
    if (!iconsReady || !authChecked || navigatedRef.current) return;

    const isOnboarding = pathname?.startsWith("/onboarding");
    const isHome = pathname === "/home" || pathname?.startsWith("/(tabs)");

    if (userPresent === true) {
      if (!isHome && isOnboarding) {
        router.replace("/home");
      }
      navigatedRef.current = true;
    } else if (userPresent === false) {
      if (!isOnboarding) {
        router.replace("/onboarding");
      }
      navigatedRef.current = true;
    }
  }, [iconsReady, authChecked, userPresent, pathname, router]);

  // Hide splash once we’re ready
  useEffect(() => {
    if (iconsReady && authChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [iconsReady, authChecked]);

  if (!iconsReady || !authChecked) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
