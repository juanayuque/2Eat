import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, Dimensions, Pressable, Animated } from "react-native";
import * as Location from "expo-location";
import { auth } from "../../../firebaseConfig";
// import RestaurantRecommendations from "../../../src/components/RestaurantRecommendations";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const preferredName = useMemo(() => {
    const u = auth.currentUser;
    const n = u?.displayName?.trim();
    if (n) return n.split(" ")[0];
    const email = u?.email || "";
    const base = email.split("@")[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "there";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocError("Location permission denied");
          return;
        }
        const l = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: l.coords.latitude, longitude: l.coords.longitude });
      } catch {
        setLocError("Could not get location");
      }
    })();
  }, []);

  // like/dislike micro animation
  const cardScale = useRef(new Animated.Value(1)).current;
  const nudge = () => {
    Animated.sequence([
      Animated.timing(cardScale, { toValue: 0.97, duration: 90, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const cardSize = Math.min(width * 0.7, 360);

  return (
    <View style={styles.container}>
      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <Text style={styles.greeting}>Welcome back, {preferredName},</Text>
        <Text style={styles.subtle}>Let’s find your place 2 Eat.</Text>
      </View>

      {/* DISLIKE | IMAGE | LIKE */}
      <View style={styles.row}>
        <Pressable onPress={nudge} style={({ pressed }) => [styles.sideBtn, pressed && { transform: [{ scale: 0.96 }] }]}>
          <Text style={styles.sideEmoji}>👎</Text>
        </Pressable>

        <Animated.View
          style={[
            styles.card,
            { width: cardSize, height: cardSize, borderRadius: cardSize * 0.08, transform: [{ scale: cardScale }] },
          ]}
        >
          <Image
            source={require("../../../src/assets/images/2Eat-Logo.png")}
            style={{ width: "100%", height: "100%", resizeMode: "contain" }}
          />
        </Animated.View>

        <Pressable onPress={nudge} style={({ pressed }) => [styles.sideBtn, pressed && { transform: [{ scale: 0.96 }] }]}>
          <Text style={styles.sideEmoji}>👍</Text>
        </Pressable>
      </View>

      {/* Recommendations placeholder */}
      <View style={{ marginTop: 16, width: "100%", paddingHorizontal: 20 }}>
        {/* <RestaurantRecommendations location={coords} /> */}
        <Text style={styles.placeholder}>
          Recommendations will appear here {coords ? "based on your location." : "(waiting for location…)"}{" "}
          {locError ? `• ${locError}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  subtle: {
    marginTop: 2,
    fontSize: 14,
    color: "#444",
    textAlign: "center",
  },
  row: {
    width: "100%",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sideBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f2f2f7",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    alignItems: "center",
    justifyContent: "center",
  },
  sideEmoji: {
    fontSize: 28,
  },
  card: {
    overflow: "hidden",
    backgroundColor: "#f7f7f8",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  placeholder: {
    color: "#444",
    textAlign: "center",
  },
});
