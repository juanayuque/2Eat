// app/_layout.tsx
import { SplashScreen, Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { auth } from "../firebaseConfig";
import { Platform } from "react-native";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const BACKEND_API_BASE_URL = "https://2eatapp.com";

// Bundle icon fonts so web serves local .ttf (avoids flaky CSS/CDN path)
const ioniconsTtf = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf");
const mciTtf = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf");

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);
  const [iconsReady, setIconsReady] = useState(false);
  const router = useRouter();

  // Load vector-icon fonts on all platforms (web + native)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fonts =
          Platform.OS === "web"
            ? { Ionicons: ioniconsTtf, MaterialCommunityIcons: mciTtf }
            : { ...Ionicons.font, ...MaterialCommunityIcons.font };

        await Font.loadAsync(fonts);
      } catch (e) {
        console.warn("Icon fonts failed to load", e);
      } finally {
        if (mounted) setIconsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // (Removed the old CSS <link> injection; not needed when bundling .ttf)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch(`${BACKEND_API_BASE_URL}/api/users/sync-profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid: user.uid, email: user.email }),
            credentials: "include",
          });
          if (!response.ok) throw new Error("Backend verification failed");
          console.log("User verified and synced");
        } catch (error) {
          console.error("Auth sync error:", error);
          Toast.show({
            type: "error",
            text1: "Login Error",
            text2: "Could not verify your session. Please try again.",
          });
        }
      } else {
        console.log("No user signed in");
      }
      setAuthReady(true);
      SplashScreen.hideAsync();
    });
    return () => unsubscribe();
  }, []);

  if (!authReady || !iconsReady) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
