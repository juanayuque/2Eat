// app/(tabs)/preferences/index.tsx
import Slider from "@/src/components/SliderX";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth } from "../../../firebaseConfig";

type Prefs = {
  preferredCuisines: string[];
  dietaryNeeds: string[];
  budgetRange?: number[];   // legacy: [1..4]
  budgetMax?: number;       // new: 0..100 £
  searchDistance: number;   // km
};

const CUISINE_OPTIONS = [
  "Italian","Chinese","Indian","Thai","Japanese","Mexican","American",
  "Mediterranean","Middle Eastern","French","Korean","Vietnamese",
  "Spanish","Greek","BBQ","Burgers","Seafood","Sushi",
];

const DIET_OPTIONS = [
  "Vegetarian","Vegan","Gluten-Free","Halal","Kosher","Dairy-Free",
];

const DISTANCE_OPTIONS = [1, 3, 5, 10]; // km

const BACKEND_API_BASE_URL = "https://2eatapp.com";

/** Maps pounds to stars for display: simple, intuitive thresholds. */
function starsFromBudgetPounds(pounds: number): 1 | 2 | 3 | 4 {
  if (pounds <= 15) return 1;
  if (pounds <= 30) return 2;
  if (pounds <= 60) return 3;
  return 4;
}
/** If only legacy stars arrive, pick a representative £ for the slider. */
function poundsFromStars(stars: number[]): number {
  const max = Math.max(0, ...stars);
  if (max <= 1) return 15;
  if (max === 2) return 30;
  if (max === 3) return 60;
  return 100;
}

export default function Preferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [dietaryNeeds, setDietaryNeeds] = useState<string[]>([]);
  const [budgetMax, setBudgetMax] = useState<number>(30); // £
  const [searchDistance, setSearchDistance] = useState<number>(3);

  const isSignedIn = useMemo(() => Boolean(auth.currentUser), [auth.currentUser?.uid]);

  const loadPrefs = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth.currentUser) {
        setError("Sign in to view and edit preferences.");
        setLoading(false);
        return;
      }
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/users/preferences`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (res.status === 404) {
        setPreferredCuisines([]);
        setDietaryNeeds([]);
        setBudgetMax(30);
        setSearchDistance(3);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: Partial<Prefs> = await res.json();
      setPreferredCuisines(Array.isArray(data.preferredCuisines) ? data.preferredCuisines : []);
      setDietaryNeeds(Array.isArray(data.dietaryNeeds) ? data.dietaryNeeds : []);
      if (typeof data.budgetMax === "number") {
        setBudgetMax(Math.min(100, Math.max(0, Math.round(data.budgetMax))));
      } else if (Array.isArray(data.budgetRange)) {
        setBudgetMax(poundsFromStars(data.budgetRange.map(Number)));
      } else {
        setBudgetMax(30);
      }
      setSearchDistance(typeof data.searchDistance === "number" ? data.searchDistance : 3);
    } catch (e: any) {
      console.error("Load prefs error:", e);
      setError("Could not load preferences.");
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      if (!auth.currentUser) {
        Alert.alert("Not signed in", "Sign in to save preferences.");
        setSaving(false);
        return;
      }
      const idToken = await auth.currentUser.getIdToken();

      // Keep legacy compatibility: also send stars derived from pounds.
      const stars = starsFromBudgetPounds(budgetMax);
      const payload: Prefs = {
        preferredCuisines,
        dietaryNeeds,
        budgetMax,
        budgetRange: Array.from({ length: stars }, (_, i) => i + 1),
        searchDistance,
      };

      const res = await fetch(`${BACKEND_API_BASE_URL}/api/users/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      Alert.alert("Saved", "Preferences updated.");
    } catch (e: any) {
      console.error("Save prefs error:", e);
      Alert.alert("Save failed", "Could not save preferences right now.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const toggleFromArray = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

  const cardMax = Math.min(480, Dimensions.get("window").width - 24);
  const starCount = starsFromBudgetPounds(budgetMax);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.card, { maxWidth: cardMax }]}>
        <Text style={styles.title}>Preferences</Text>
        <Text style={styles.sub}>Tune cuisine, diet, price & distance</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading your preferences…</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {/* Cuisines */}
            <Section title="🍽️ Preferred cuisines">
              <ChipGroup
                options={CUISINE_OPTIONS}
                selected={preferredCuisines}
                onToggle={(v) => setPreferredCuisines(prev => toggleFromArray(prev, v))}
              />
            </Section>

            {/* Dietary needs */}
            <Section title="🥗 Dietary needs">
              <ChipGroup
                options={DIET_OPTIONS}
                selected={dietaryNeeds}
                onToggle={(v) => setDietaryNeeds(prev => toggleFromArray(prev, v))}
              />
            </Section>

            <Section title="💸 Budget (max per person)">
  <View style={{ gap: 8 }}>
    <Text style={styles.budgetReadout}>
      £{budgetMax}  ·  {"★".repeat(starCount)}{"☆".repeat(4 - starCount)}
    </Text>

    <Slider
      minimumValue={0}
      maximumValue={100}
      step={1}
      value={budgetMax}
      onValueChange={setBudgetMax}
      style={{ width: "100%", height: 40 }}
      minimumTrackTintColor="#4F46E5"
      maximumTrackTintColor="rgba(255,255,255,0.15)"
      thumbTintColor={Platform.select({ ios: "#FFF", android: "#FFF" })}
    />

    <View style={styles.sliderLabels}>
      <Text style={styles.sliderLabelText}>£0</Text>
      <Text style={styles.sliderLabelText}>£50</Text>
      <Text style={styles.sliderLabelText}>£100</Text>
    </View>

    <Text style={styles.hint}>
      Stars reflect a rough price band: £0–15 (★), £16–30 (★★), £31–60 (★★★), £61–100 (★★★★).
    </Text>
  </View>
</Section>


            {/* Distance */}
            <Section title="📍 Search distance">
              <View style={styles.rowWrap}>
                {DISTANCE_OPTIONS.map((km) => {
                  const active = km === searchDistance;
                  return (
                    <Pressable
                      key={km}
                      onPress={() => setSearchDistance(km)}
                      style={({ hovered, pressed }) => [
                        styles.distChip,
                        active && styles.distChipActive,
                        hovered && styles.hovered,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.distText, active && styles.distTextActive]}>{km} km</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Pressable
                onPress={loadPrefs}
                disabled={loading || saving}
                style={({ hovered, pressed }) => [
                  styles.secondaryBtn,
                  hovered && styles.hovered,
                  pressed && styles.pressed,
                  (loading || saving) && styles.disabled,
                ]}
              >
                <Text style={styles.secondaryBtnText}>Reset</Text>
              </Pressable>
              <Pressable
                onPress={savePrefs}
                disabled={saving}
                style={({ hovered, pressed }) => [
                  styles.primaryBtn,
                  hovered && styles.hoveredPrimary,
                  pressed && styles.pressed,
                  saving && styles.disabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save changes"}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ height: 14 }} />
      {children}
    </View>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.rowWrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            style={({ hovered, pressed }) => [
              styles.chip,
              active && styles.chipActive,
              hovered && styles.hovered,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0B14",
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 18,
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#10101B",
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  sub: {
    marginTop: 6,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  loadingRow: {
    marginTop: 18,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  muted: { color: "rgba(255,255,255,0.75)" },
  error: { marginTop: 14, color: "#ff6b6b" },

  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#141427",
    transitionDuration: "120ms" as any, // web only; ignored natively
  },
  chipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  chipText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  hovered: {
    backgroundColor: "#1A1C2B",
  },
  pressed: { opacity: 0.9 },

  distChip: {
    minWidth: 72,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#141427",
    transitionDuration: "120ms" as any,
  },
  distChipActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  distText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },
  distTextActive: { color: "#fff" },

  budgetReadout: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  sliderLabels: {
    marginTop: -6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderLabelText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },

  hint: { marginTop: 8, color: "rgba(255,255,255,0.55)", fontSize: 12 },

  actionsRow: {
    marginTop: 28,
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  primaryBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    transitionDuration: "120ms" as any,
  },
  hoveredPrimary: { backgroundColor: "#4338CA" },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  secondaryBtn: {
    backgroundColor: "#181B2A",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    transitionDuration: "120ms" as any,
  },
  secondaryBtnText: { color: "rgba(255,255,255,0.9)", fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
