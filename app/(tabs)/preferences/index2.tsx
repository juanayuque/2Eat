// app/(tabs)/preferences/index.tsx
import Slider from "@react-native-community/slider";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ACCENT = "#4f46e5"; // indigo
const LIGHT = "#f2f2f7";
const BORDER = "#e5e5ea";
const TEXT = "#111";
const MUTED = "#666";

const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Chinese",
  "Japanese",
  "Indian",
  "Thai",
  "American",
  "Mediterranean",
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
type DistanceVal = number | null; // null = Unlimited

export default function Preferences() {
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [diet, setDiet] = useState<string[]>([]);
  const [budgetMax, setBudgetMax] = useState<number>(25); // £0–100
  const [distanceKm, setDistanceKm] = useState<DistanceVal>(5); // null => Unlimited

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  // Stars reflect price bands:
  // £0 => 0 stars, £1–15 => ★, £16–30 => ★★, £31–60 => ★★★, £61–100 => ★★★★
  const starCount = useMemo(() => {
    if (budgetMax <= 0) return 0;
    if (budgetMax <= 15) return 1;
    if (budgetMax <= 30) return 2;
    if (budgetMax <= 60) return 3;
    return 4;
  }, [budgetMax]);

  const onSave = async () => {
    // TODO: wire to backend: /api/users/preferences (auth required)
    // payload example:
    // { cuisines, diet, budgetMax, priceLevel: starCount, distanceKm }
    console.log("Saving preferences:", {
      cuisines,
      diet,
      budgetMax,
      priceLevel: starCount,
      distanceKm,
    });
  };

  const onClear = () => {
    setCuisines([]);
    setDiet([]);
    setBudgetMax(0);
    setDistanceKm(null);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>⚙️ Preferences</Text>
      <Text style={styles.subtitle}>Tune what shows up in your recommendations.</Text>

      <Section title="🍽️ Cuisines">
        <Text style={styles.hint}>Pick as many as you like</Text>
        <View style={styles.pillWrap}>
          {CUISINE_OPTIONS.map((c) => (
            <Pill
              key={c}
              label={c}
              selected={cuisines.includes(c)}
              onPress={() => toggle(cuisines, setCuisines, c)}
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
              selected={diet.includes(d)}
              onPress={() => toggle(diet, setDiet, d)}
            />
          ))}
        </View>
      </Section>

      {/* Budget line + stars */}
      <Section title="💸 Budget (max per person)">
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
            maximumTrackTintColor={BORDER} // visible on white
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

      {/* Distance buttons + Unlimited */}
      <Section title="📍 Distance">
        <Text style={styles.hint}>Show places up to this distance</Text>
        <View style={[styles.pillWrap, { marginTop: 12 }]}>
          {DISTANCE_OPTIONS.map((d) => (
            <Pill
              key={d}
              label={`${d} km`}
              selected={distanceKm === d}
              onPress={() => setDistanceKm(d)}
            />
          ))}
          <Pill
            label="Unlimited"
            selected={distanceKm === null}
            onPress={() => setDistanceKm(null)}
          />
        </View>

        <Text style={[styles.hint, { marginTop: 8 }]}>
          Selected:{" "}
          <Text style={styles.metricStrong}>
            {distanceKm === null ? "Unlimited" : `${distanceKm} km`}
          </Text>
        </Text>
      </Section>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <PrimaryButton label="Save" onPress={onSave} />
        <GhostButton label="Clear" onPress={onClear} />
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

/* ---------- Reusable UI ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.primaryBtn,
        hovered && { opacity: 0.9 },
        pressed && { transform: [{ scale: 0.98 }] },
        Platform.OS === "web" && { cursor: "pointer" },
      ]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.ghostBtn,
        hovered && { backgroundColor: "#fafafa" },
        pressed && { transform: [{ scale: 0.98 }] },
        Platform.OS === "web" && { cursor: "pointer" },
      ]}
    >
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    maxWidth: 520, // phone-like column on wide screens
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
    textAlign: "left",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: MUTED,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  hint: {
    fontSize: 13,
    color: MUTED,
  },

  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 13,
  },

  budgetReadout: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sliderLabelText: {
    fontSize: 12,
    color: MUTED,
  },

  metricStrong: {
    color: TEXT,
    fontWeight: "800",
  },

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
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
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
  ghostBtnText: {
    color: TEXT,
    fontWeight: "800",
    fontSize: 16,
  },
});
