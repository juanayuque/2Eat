import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "expo-router";
import { auth } from "../firebaseConfig";
import MinimalSplashGif from "../src/components/AnimatedSplashGif";

export default function Index() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [nextRoute, setNextRoute] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const decide = async (user: User | null) => {
      const flag = await AsyncStorage.getItem("enrolmentComplete");
      if (!mounted) return;

      let target = "/onboarding"; // index
      if (user && flag === "true") target = "/(tabs)/home";
      else if (user && flag !== "true") target = "/onboarding/intro";

      setNextRoute(target);
      setBooting(false);
    };
    const unsub = onAuthStateChanged(auth, (user) => decide(user));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (splashDone && !booting && nextRoute) router.replace(nextRoute);
  }, [splashDone, booting, nextRoute, router]);

  return (
    <MinimalSplashGif
      gifSource={require("../src/assets/animations/2eat_landing.gif")}
      gifDurationMs={3000}
      onFinish={() => setSplashDone(true)}
    />
  );
}
