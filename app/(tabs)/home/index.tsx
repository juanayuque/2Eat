// app/(tabs)/home/index.tsx
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth } from "../../../firebaseConfig";
import AppContainer from "../../../src/components/AppContainer";
import RestaurantRecommendations from "../../../src/components/RestaurantRecommendations";

const FALLBACK_IMG = require("../../../src/assets/images/2Eat-Logo.png");

type Coords = { latitude: number; longitude: number };

export default function HomeScreen() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [city, setCity] = useState<string | null>(null);
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
        const c: Coords = {
          latitude: l.coords.latitude,
          longitude: l.coords.longitude,
        };
        setCoords(c);

        const geo = await Location.reverseGeocodeAsync(c);
        const first = geo?.[0];
        const cityName =
          first?.city || first?.subregion || first?.region || first?.name;
        if (cityName) setCity(cityName);
      } catch {
        setLocError("Could not get location");
      }
    })();
  }, []);

  // tiny bump animation (disable native driver on web to avoid warnings)
  const cardScale = useRef(new Animated.Value(1)).current;
  const bump = () => {
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.97,
        duration: 90,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  return (
    <AppContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {preferredName}</Text>
          <Text style={styles.location}>
            Your current location:{" "}
            <Text style={styles.locationStrong}>
              {city ? city : locError ? "Unavailable" : "Detecting…"}
            </Text>
          </Text>
          <Text style={styles.subtitle}>
            Like or Pass on the following suggestions!
          </Text>
        </View>

        {/* Data provider + UI */}
        <RestaurantRecommendations location={coords}>
          {({ loading, error, current, like, pass, refresh }) => {
            const imgSource = current?.photoUrl
              ? { uri: current.photoUrl }
              : FALLBACK_IMG;

            const onPass = () => {
              bump();
              pass();
            };
            const onLike = () => {
              bump();
              like();
            };

            return (
              <>
                {/* PASS | IMAGE | LIKE */}
                <View style={styles.cardRow}>
                  <Pressable
                    onPress={onPass}
                    style={({ pressed }) => [
                      styles.sideBtn,
                      pressed && styles.sideBtnPressed,
                    ]}
                  >
                    <Text style={styles.sideLabel}>Pass</Text>
                  </Pressable>

                  <Animated.View
                    style={[
                      styles.card,
                      styles.cardSquare,
                      { transform: [{ scale: cardScale }] },
                    ]}
                  >
                    {loading ? (
                      <View style={styles.centerFill}>
                        <ActivityIndicator />
                      </View>
                    ) : current ? (
                      <Image
                        source={imgSource}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.centerFill}>
                        <Text style={{ color: "#666", textAlign: "center" }}>
                          {error
                            ? "Could not load suggestions."
                            : "No more suggestions."}
                        </Text>
                        <Pressable onPress={refresh} style={styles.refreshBtn}>
                          <Text style={styles.refreshBtnText}>Refresh</Text>
                        </Pressable>
                      </View>
                    )}
                  </Animated.View>

                  <Pressable
                    onPress={onLike}
                    style={({ pressed }) => [
                      styles.sideBtn,
                      pressed && styles.sideBtnPressed,
                    ]}
                  >
                    <Text style={styles.sideLabel}>Like</Text>
                  </Pressable>
                </View>

                {/* Details */}
                {current && (
                  <View style={styles.details}>
                    <Text style={styles.name}>{current.name}</Text>

                    {!!current.description && (
                      <Text style={styles.description}>
                        {current.description}
                      </Text>
                    )}

                    {(!!current.address ||
                      typeof current.distance === "number") && (
                      <Text style={styles.address}>
                        {current.address ?? "Address unavailable"}
                        {"  "}
                        {typeof current.distance === "number" && (
                          <Text style={styles.distance}>
                            • {current.distance.toFixed(1)} km away
                          </Text>
                        )}
                      </Text>
                    )}

                    {/* Budget on its own row */}
                    <Text style={styles.budget}>
                      {renderBudgetStars(current.priceLevel)}
                    </Text>

                    {/* Daily Feedback moved to a separate row below */}
                    <Text style={styles.dailyFeedback}>
                      Weekly Feedback: <Text style={styles.feedbackValue}>Coming soon!</Text>
                    </Text>
                  </View>
                )}

                {/* Errors */}
                {error && (
                  <Text
                    style={{ color: "red", marginTop: 8, textAlign: "center" }}
                  >
                    {error}
                  </Text>
                )}
              </>
            );
          }}
        </RestaurantRecommendations>
      </View>
    </AppContainer>
  );
}

function renderBudgetStars(level?: 1 | 2 | 3 | 4) {
  if (!level) return "☆☆☆☆  ·  Budget";
  const full = "★".repeat(level);
  const empty = "☆".repeat(4 - level);
  return `${full}${empty}  ·  Budget`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 110, // avoid the tab bar
  },
  header: {
    gap: 6,
    marginBottom: 24, // more space before the card row
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "left",
  },
  location: {
    fontSize: 14,
    color: "#555",
    textAlign: "left",
  },
  locationStrong: {
    color: "#111",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#666",
    textAlign: "left",
  },

  // row containing pass | image card | like
  cardRow: {
    width: "100%",
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 28, // more space after the card row before details
  },

  sideBtn: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#f2f2f7",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    alignItems: "center",
    justifyContent: "center",
  },
  sideBtnPressed: { transform: [{ scale: 0.97 }] },
  sideLabel: { fontSize: 16, fontWeight: "700", color: "#111" },

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
  cardSquare: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 380,
    minWidth: 180,
    borderRadius: 24,
  },
  cardImage: { width: "100%", height: "100%" },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  refreshBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  refreshBtnText: {
    color: "#fff",
    fontWeight: "700",
  },

  details: {
    marginTop: 0, // already spaced via cardRow marginBottom
    gap: 8,
    paddingHorizontal: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    textAlign: "center", // centered name
    marginBottom: 8, // extra space before description
  },
  description: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
  },
  address: {
    marginTop: 2,
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  distance: { color: "#666" },

  budget: {
    marginTop: 8,
    fontSize: 14,
    color: "#111",
    fontWeight: "700",
    textAlign: "center",
  },

  dailyFeedback: {
    marginTop: 12, // separate row below the other details
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  feedbackValue: {
    fontWeight: "700",
    color: "#111",
  },
});

