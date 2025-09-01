// app/_layout.tsx
import { SplashScreen, Stack } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { auth } from "../firebaseConfig";
import { Platform } from "react-native";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import "./global.css";


const BACKEND_API_BASE_URL = "https://2eatapp.com";

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);
  const [iconsReady, setIconsReady] = useState(Platform.OS === "web"); // web: ready immediately

  // Native: load icon fonts; Web: Expo Web handles fonts via CSS in the export
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const idToken = await user.getIdToken();
          const response = await fetch(`${BACKEND_API_BASE_URL}/api/users/sync-profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid: user.uid, email: user.email }),
          });
          if (!response.ok) throw new Error(`Backend verification failed: ${response.status}`);
          console.log("User verified and synced");
        } else {
          console.log("No user signed in");
        }
      } catch (error) {
        console.error("Auth sync error:", error);
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
