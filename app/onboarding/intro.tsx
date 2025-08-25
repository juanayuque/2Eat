// app/onboarding/intro.tsx
import { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const NEXT_ROUTE = "/onboarding/preferences"; 
// ^ change if your next step differs (e.g., "/onboarding/permissions")

export default function OnboardingIntro() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const startSetup = useCallback(async () => {
    // Optional: explicitly mark not-complete yet
    // await AsyncStorage.setItem("enrolmentComplete", "false");
    router.push(NEXT_ROUTE);
  }, [router]);

  const finishNow = useCallback(async () => {
    try {
      setBusy(true);
      await AsyncStorage.setItem("enrolmentComplete", "true");
      router.replace("/(tabs)/home/home"); // or "/(tabs)/home" if your file is index.tsx
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to 2Eat</Text>
        <Text style={styles.subtitle}>
          Let’s personalize your experience so we can recommend great places near you.
        </Text>
      </View>

      <View style={styles.bullets}>
        <Bullet>Choose your cuisine and dietary preferences</Bullet>
        <Bullet>Set your typical price range</Bullet>
        <Bullet>Enable location for nearby suggestions</Bullet>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={startSetup}
          disabled={busy}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: busy ? 0.6 : 1, transform: [{ translateY: pressed ? 1 : 0 }] },
          ]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Start setup</Text>}
        </Pressable>

        <Pressable
          onPress={finishNow}
          disabled={busy}
          style={({ pressed }) => [
            styles.btnGhost,
            { opacity: busy ? 0.6 : 1, transform: [{ translateY: pressed ? 1 : 0 }] },
          ]}
        >
          <Text style={styles.btnGhostText}>Skip for now</Text>
        </Pressable>

        <Text style={styles.smallprint}>You can change preferences anytime in Settings.</Text>
      </View>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.95)",
          marginTop: 7,
        }}
      />
      <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.92)" }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout centers this block and constrains width; we just stack content
  wrap: {
    alignSelf: "stretch",
    gap: 16,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  bullets: {
    marginTop: 8,
    gap: 10,
  },
  actions: {
    marginTop: 16,
    gap: 12,
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
  smallprint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 4,
  },
});
