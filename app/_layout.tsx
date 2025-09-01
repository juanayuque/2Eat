// app/_layout.tsx
import { SplashScreen, Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { auth } from "../firebaseConfig";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Keep CSS import if you have global styles
import "./global.css";

const BACKEND_API_BASE_URL = "https://2eatapp.com";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepareApp() {
      try {
        // 1. Load fonts
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
        });

        // 2. Set up auth listener
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted) {
            unsubscribe();
            return;
          }

          try {
            if (user) {
              // Sync profile with backend (optional, but good to have)
              const idToken = await user.getIdToken();
              await fetch(`${BACKEND_API_BASE_URL}/api/users/sync-profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ uid: user.uid, email: user.email }),
              });
              
              // Decide where to navigate
              const enrolmentComplete = await AsyncStorage.getItem("enrolmentComplete");
              if (enrolmentComplete === "true") {
                router.replace("/home");
              } else {
                router.replace("/onboarding/intro");
              }
            } else {
              // If no user, go to onboarding/login
              router.replace("/onboarding");
            }
          } catch (e) {
            console.error("Auth sync or navigation error:", e);
            // On error, still navigate to a safe place
            router.replace("/onboarding");
          } finally {
            // App is now ready to be shown
            if (mounted) setAppReady(true);
          }
        });

      } catch (e) {
        console.warn("App preparation error:", e);
        // If fonts fail, we can still show the app, maybe with a fallback
        if (mounted) setAppReady(true);
      }
    }

    prepareApp();





    return () => {
      mounted = false;
    };
  }, []);



  // Hide the splash screen ONLY when the app is ready and the router has navigated
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);


  // The Stack navigator will render the correct screen based on the router's state
  // It will be blank until the router navigates from the useEffect hook above.
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}