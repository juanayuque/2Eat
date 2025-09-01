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





export default function RootLayout() {


  const [authReady, setAuthReady] = useState(false);
  const [iconsReady, setIconsReady] = useState(false);
  const router = useRouter();

  // Load vector-icon fonts on all platforms (web + native)
  useEffect(() => {

    let mounted = true;
    (async () => {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
        });
        if (mounted) setIconsReady(true);
      } catch (e) {
        console.warn("Icon fonts failed to load", e);
        if (mounted) setIconsReady(true); // don't block app

      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Optional: also inject CSS on web as a fallback
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const id = "expo-vector-icons-css";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/npm/@expo/vector-icons@latest/build/vendor/react-native-vector-icons/Fonts.css";
    document.head.appendChild(link);
  }, []);

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

  // Wait for both auth + icon fonts before rendering the app tree
  if (!authReady || !iconsReady) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}