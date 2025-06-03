import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import * as Location from "expo-location";
import { auth } from "../../firebaseConfig";
import RestaurantRecommendations from "../../src/components/RestaurantRecommendations";

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserName(currentUser.email || "User");
    }
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/onboarding/login");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Welcome, {userName} 👋
      </Text>
      <Text style={{ marginBottom: 10 }}>
        This app will use your location to recommend nearby dining options 🍽️.
      </Text>

      {errorMsg && <Text style={{ color: "red" }}>{errorMsg}</Text>}
      {!location && !errorMsg && <Text>Getting your location...</Text>}

      {/* Inject the recommendation component here */}
      <RestaurantRecommendations location={location} />

      <View style={{ marginTop: 20 }}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
    </View>
  );
}
