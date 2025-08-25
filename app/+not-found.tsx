// app/+not-found.tsx
import { Link, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      />

      <SafeAreaView style={styles.fill}>
        <View style={styles.center}>
          <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
            <Text style={styles.emoji}>🍽️</Text>
            <Text style={styles.title}>Page not found</Text>
            <Text style={styles.subtitle}>
              The page you’re looking for doesn’t exist or has moved.
            </Text>

            <View style={{ gap: 12, marginTop: 16 }}>
              {/* Best option: go to "/" so your index decides (splash → login/intro/home) */}
              <Link href="/" asChild>
                <Pressable style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Restart App</Text>
                </Pressable>
              </Link>

            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  btnPrimary: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnGhostText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

