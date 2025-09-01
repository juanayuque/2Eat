// app/_layout.tsx
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import * as Font from "expo-font";
// Load all families you might use:
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Zocial,
} from "@expo/vector-icons";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "https://2eatapp.com/api";

export default function RootLayout() {
  const [iconsReady, setIconsReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Font.loadAsync({
          ...FontAwesome.font,
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
          ...MaterialIcons.font,
          ...Zocial.font,
        });
      } catch (e) {
        console.warn("Icon fonts failed to load", e);
      } finally {
        if (mounted) setIconsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  if (!authReady || !iconsReady) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
