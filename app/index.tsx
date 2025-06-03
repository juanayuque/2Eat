import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "../firebaseConfig";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const enrolmentComplete = await AsyncStorage.getItem("enrolmentComplete");

      if (user) {
        router.replace("/onboarding/login");
      } else if (enrolmentComplete !== null) {
        router.replace("/onboarding/login");
      } else {
        router.replace("/onboarding/login");
      }
    });

    return unsubscribe;
  }, []);

  return null;
}
