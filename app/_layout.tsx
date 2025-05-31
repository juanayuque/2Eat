// app/_layout.tsx
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import Toast from 'react-native-toast-message'; // Import Toast

export default function RootLayout() {
  useEffect(() => {
    // This hides the splash screen as soon as the root layout is mounted.
    // It's generally good practice to hide it after your initial data is loaded
    // if you have any, but for now, this is fine.
    SplashScreen.hideAsync();
  }, []);

  return (
    <> {/* Use a React Fragment to wrap multiple top-level elements */}
      <Stack
        screenOptions={{
          headerShown: false, // Hides the header for all screens by default
        }}
      />
      {/* Render the Toast component */}
      <Toast />
    </>
  );
}