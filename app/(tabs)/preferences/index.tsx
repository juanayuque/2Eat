// app/(tabs)/preferences/index.tsx
import Slider from "@/src/components/SliderX";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../../firebaseConfig";

const BACKEND_API_BASE_URL = "https://2eatapp.com";

const ACCENT = "#4f46e5";
const LIGHT = "#f2f2f7";
const BORDER = "#e5e5ea";
const TEXT = "#111";
const MUTED = "#666";

const CUISINE_OPTIONS = [
  "Italian","Chinese","Indian","Thai","Japanese","Mexican","American",
  "Mediterranean","Middle Eastern","French","Korean","Vietnamese",
  "Spanish","Greek","BBQ","Burgers","Seafood","Sushi", "Fast Food"
];

const DIET_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Halal",
  "Kosher",
];

const DISTANCE_OPTIONS = [2, 5, 10, 20] as const;
type DistanceVal = number | null;

export default function Preferences() {
  const insets = useSafeAreaInsets();

  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [dietaryNeeds, setDietaryNeeds] = useState<string[]>([]);
  const [budgetMax, setBudgetMax] = useState<number>(25);
  const [searchDistance, setSearchDistance] = useState<DistanceVal>(5);

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [saving, setSaving] = useState(false);

  const starCount = useMemo(() => {
    if (budgetMax <= 0) return 0;
    if (budgetMax <= 15) return 1;
    if (budgetMax <= 30) return 2;
    if (budgetMax <= 60) return 3;
    return 4;
  }, [budgetMax]);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [])
  );

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingInitial(true);
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const res = await fetch(`${BACKEND_API_BASE_URL}/api/users/preferences`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.preferences ?? data ?? {};
        if (cancelled) return;

        setPreferredCuisines(Array.isArray(p.preferredCuisines) ? p.preferredCuisines : []);
        setDietaryNeeds(Array.isArray(p.dietaryNeeds) ? p.dietaryNeeds : []);
        setBudgetMax(typeof p.budgetMax === "number" ? p.budgetMax : 25);
        setSearchDistance(p.searchDistance === null ? null : typeof p.searchDistance === "number" ? p.searchDistance : 5);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) {
        showToast("Not signed in");
        return;
      }
      const idToken = await user.getIdToken();
      const payload = { preferredCuisines, dietaryNeeds, budgetMax, searchDistance };
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/users/preferences`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Preferences saved");
    } catch {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onClear = () => {
    setPreferredCuisines([]);
    setDietaryNeeds([]);
    setBudgetMax(0);
    setSearchDistance(null);
    showToast("Cleared");
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[styles.container, { paddingBottom: 32 + insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>⚙️ Preferences</Text>
        <Text style={styles.subtitle}>Tune what shows up in your recommendations.</Text>

        {loadingInitial && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator />
            <Text style={{ color: MUTED, marginTop: 6 }}>Loading your preferences…</Text>
          </View>
        )}

        <Section title="🍽️ Cuisines">
          <Text style={styles.hint}>Pick as many as you like</Text>
          <View style={styles.pillWrap}>
            {CUISINE_OPTIONS.map((c) => (
              <Pill
                key={c}
                label={c}
                selected={preferredCuisines.includes(c)}
                onPress={() =>
                  setPreferredCuisines(
                    preferredCuisines.includes(c)
                      ? preferredCuisines.filter((x) => x !== c)
                      : [...preferredCuisines, c]
                  )
                }
              />
            ))}
          </View>
        </Section>

        <Section title="🥦 Diet">
          <Text style={styles.hint}>Optional dietary needs</Text>
          <View style={styles.pillWrap}>
            {DIET_OPTIONS.map((d) => (
              <Pill
                key={d}
                label={d}
                selected={dietaryNeeds.includes(d)}
                onPress={() =>
                  setDietaryNeeds(
                    dietaryNeeds.includes(d)
                      ? dietaryNeeds.filter((x) => x !== d)
                      : [...dietaryNeeds, d]
                  )
                }
              />
            ))}
          </View>
        </Section>

        <Section title="💸 Budget (per person)">
          <View style={{ gap: 8 }}>
            <Text style={styles.budgetReadout}>
              £{budgetMax}  ·  {"★".repeat(starCount)}
              {"☆".repeat(4 - starCount)}
            </Text>

            <Slider
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={budgetMax}
              onValueChange={setBudgetMax}
              style={{ width: "100%", height: 40 }}
              minimumTrackTintColor={ACCENT}
              maximumTrackTintColor={BORDER}
              thumbTintColor={Platform.select({ ios: "#FFF", android: "#FFF" })}
            />

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>£0</Text>
              <Text style={styles.sliderLabelText}>£50</Text>
              <Text style={styles.sliderLabelText}>£100</Text>
            </View>

            <Text style={styles.hint}>Stars reflect a rough price band.</Text>
          </View>
        </Section>

        <Section title="📍 Distance">
          <Text style={styles.hint}>Show places up to this distance</Text>
          <View style={[styles.pillWrap, { marginTop: 12 }]}>
            {DISTANCE_OPTIONS.map((d) => (
              <Pill
                key={d}
                label={`${d} km`}
                selected={searchDistance === d}
                onPress={() => setSearchDistance(d)}
              />
            ))}
            <Pill
              label="Unlimited"
              selected={searchDistance === null}
              onPress={() => setSearchDistance(null)}
            />
          </View>

          <Text style={[styles.hint, { marginTop: 8 }]}>
            Selected:{" "}
            <Text style={styles.metricStrong}>
              {searchDistance === null ? "Unlimited" : `${searchDistance} km`}
            </Text>
          </Text>
        </Section>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ hovered, pressed }) => [
              styles.primaryBtn,
              hovered && { opacity: 0.9 },
              pressed && { transform: [{ scale: 0.98 }] },
              Platform.OS === "web" && { cursor: "pointer" },
              saving && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>

          <Pressable
            onPress={onClear}
            style={({ hovered, pressed }) => [
              styles.ghostBtn,
              hovered && { backgroundColor: "#fafafa" },
              pressed && { transform: [{ scale: 0.98 }] },
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
          >
            <Text style={styles.ghostBtnText}>Clear</Text>
          </Pressable>
        </View>
      </ScrollView>

      {toastMsg && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: 24 + insets.bottom + 56,
              opacity: toastOpacity,
              transform: [
                {
                  translateY: toastOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.pill,
        selected && { backgroundColor: ACCENT, borderColor: ACCENT },
        hovered && !selected && { backgroundColor: "#fafafa" },
        pressed && { transform: [{ scale: 0.98 }] },
        Platform.OS === "web" && { cursor: "pointer" },
      ]}
    >
      <Text style={[styles.pillText, selected && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: TEXT },
  subtitle: { marginTop: 4, fontSize: 14, color: MUTED },

  inlineLoading: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
  },

  section: {
    marginTop: 22,
    padding: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  hint: { fontSize: 13, color: MUTED },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillText: { color: TEXT, fontWeight: "700", fontSize: 13 },

  budgetReadout: { fontSize: 16, fontWeight: "800", color: TEXT },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  sliderLabelText: { fontSize: 12, color: MUTED },
  metricStrong: { color: TEXT, fontWeight: "800" },

  actionsRow: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  primaryBtn: {
    minWidth: 150,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ghostBtn: {
    minWidth: 150,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
  },
  ghostBtnText: { color: TEXT, fontWeight: "800", fontSize: 16 },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(17,17,17,0.92)",
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "700" },
});

