// app/_layout.tsx
import { SplashScreen, Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from "react";
import Toast from 'react-native-toast-message';
import { auth } from '../firebaseConfig';

const BACKEND_API_BASE_URL = 'https://2eatapp.com'; 
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();

          const response = await fetch(`${BACKEND_API_BASE_URL}/api/users/sync-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
            }),
          });

          if (!response.ok) {
            throw new Error("Backend verification failed");
          }

          console.log("User verified and synced");
        } catch (error) {
          console.error("Auth sync error:", error);
          Toast.show({
            type: 'error',
            text1: 'Login Error',
            text2: 'Could not verify your session. Please try again.',
          });
        }
      } else {
        console.log("No user signed in");
      }

      setIsReady(true);
      SplashScreen.hideAsync();
    });

    return () => unsubscribe();
  }, []);

  if (!isReady) {
    return null; // Optional: show loading spinner here
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <Toast />
    </>
  );
}
