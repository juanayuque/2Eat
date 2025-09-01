
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Web-only: ensure icon @font-face + assets are bundled and served
import "@expo/vector-icons/build/vendor/react-native-vector-icons/font/react-native-vector-icons.css";

// Use an env var so web can be configured at build time
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "/api";

export default function RootLayout() {
  // On web the CSS import is enough, so icons are "ready" immediately
  const [iconsReady, setIconsReady] = useState(Platform.OS === "web");
  const [authReady, setAuthReady] = useState(false);

  // Preload vector icon fonts on native only (iOS/Android)
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
        console.warn("Icon fonts failed to load", e);
      } finally {
        if (mounted) setIconsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync auth with backend
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const idToken = await user.getIdToken();
          const res = await fetch(`${API_BASE}/users/sync-profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid: user.uid, email: user.email }),
            credentials: "include",
          });
          if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
          console.log("User verified and synced");
        } else {
          console.log("No user signed in");
        }
      } catch (err) {
        console.error("Auth sync error:", err);
        Toast.show({
          type: "error",
          text1: "Login Error",
          text2: "Could not verify your session. Please try again.",
        });
      } finally {
        setAuthReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // Wait for both auth + icon fonts
  if (!authReady || !iconsReady) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}