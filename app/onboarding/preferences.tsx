// app/onboarding/preferences.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth } from "../../firebaseConfig";

const API_BASE = "https://2eatapp.com";

const ACCENT = "#4f46e5";
const ACCENT_DIM = "#a5b4fc";
const TEXT = "#111";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG = "#f8fafc";

const GENDERS = [
  { key: "MALE", label: "Male" },
  { key: "FEMALE", label: "Female" },
  { key: "NON_BINARY", label: "Non-binary" },
  { key: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

const CUISINE_OPTIONS = [
  "Italian","Chinese","Indian","Thai","Japanese","Mexican","American",
  "Mediterranean","Middle Eastern","French","Korean","Vietnamese",
  "Spanish","Greek","Turkish","Lebanese","Fast Food",
] as const;

type PrefsResponse = {
  preferences: {
    displayName?: string | null;
    gender?: string | null;
    preferredCuisines?: string[] | null;
  } | null;
};

export default function OnboardingPreferences() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // toast
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  // state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);

  // helpers
  const authedHeaders = useCallback(async () => {
    const t = await auth.currentUser?.getIdToken(true);
    return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } as Record<string, string>;
  }, []);

  const toggleCuisine = useCallback((c: string) => {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }, []);

  const canSave = useMemo(() => !saving && (displayName.trim().length > 0 || gender || cuisines.length > 0), [saving, displayName, gender, cuisines.length]);

  // load existing
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const headers = await authedHeaders();
        const r = await fetch(`${API_BASE}/api/users/preferences`, { headers, cache: "no-store" as any });
        const j = (await r.json()) as PrefsResponse;
        if (cancel) return;

        const p = j?.preferences || {};
        setDisplayName(p.displayName || "");
        setGender(
          typeof p.gender === "string" && GENDERS.some((g) => g.key === p.gender)
            ? p.gender
            : null
        );
        const existing = Array.isArray(p.preferredCuisines) ? p.preferredCuisines : [];
        // only keep known options
        setCuisines(existing.filter((x) => CUISINE_OPTIONS.includes(x as any)));
      } catch {
        // ignore
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [authedHeaders]);

  // save
  const onSave = useCallback(async () => {
    try {
      setSaving(true);
      const headers = await authedHeaders();
      const body = {
        displayName: displayName.trim() || null,
        gender: gender ?? "PREFER_NOT_TO_SAY",
        preferredCuisines: cuisines,
      };
      const r = await fetch(`${API_BASE}/api/users/preferences`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      toast("Saved!");
      // small pause for toast then go Home (tabs)
      setTimeout(() => router.replace("/home"), 500);
    } catch {
      toast("Couldn’t save. Try again.");
    } finally {
      setSaving(false);
    }
  }, [authedHeaders, displayName, gender, cuisines, router, toast]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about you</Text>
          <Text style={styles.subtitle}>This helps us personalize your matches.</Text>
        </View>

        {/* Preferred name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferred name</Text>
          <TextInput
            placeholder="What should we call you?"
            placeholderTextColor={Platform.OS === "ios" ? "#8e8e93" : MUTED}
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Text style={styles.hint}>Shown to friends in Group Match.</Text>
        </View>

        {/* Gender (segmented) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gender</Text>
          <View style={styles.segmentWrap}>
            {GENDERS.map((g) => {
              const selected = gender === g.key;
              return (
                <Pressable
                  key={g.key}
                  onPress={() => setGender(g.key)}
                  style={({ pressed }) => [
                    styles.segmentBtn,
                    selected && styles.segmentBtnSelected,
                    (pressed || selected) && { transform: [{ scale: 0.98 }] },
                    Platform.OS === "web" && { cursor: "pointer" },
                  ]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Optional. You can skip this now.</Text>
        </View>

        {/* Cuisine chips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferred cuisines</Text>
          <Text style={styles.hint}>Pick as many as you like.</Text>

          <View style={styles.chipsWrap}>
            {CUISINE_OPTIONS.map((c) => {
              const selected = cuisines.includes(c);
              return (
                <Pressable
                  key={c}
                  onPress={() => toggleCuisine(c)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && { transform: [{ scale: 0.98 }] },
                    Platform.OS === "web" && { cursor: "pointer" },
                  ]}
                >
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 6 }} />}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          {!!cuisines.length && (
            <Text style={styles.selectedCount}>{cuisines.length} selected</Text>
          )}
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && { backgroundColor: ACCENT_DIM },
            pressed && canSave && { transform: [{ scale: 0.99 }] },
            Platform.OS === "web" && { cursor: canSave ? "pointer" : "not-allowed" },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Continue</Text>
          )}
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      )}

      {toastMsg && (
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 120,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: 14,
  },
  header: { gap: 4, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 14, color: MUTED },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: TEXT, marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: TEXT,
    backgroundColor: "#fff",
  },
  hint: { marginTop: 8, color: MUTED, fontSize: 12 },

  // segmented gender
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: BORDER,
  },
  segmentBtnSelected: {
    backgroundColor: "#eef2ff",
    borderColor: ACCENT,
  },
  segmentText: { color: TEXT, fontWeight: "700", fontSize: 13 },
  segmentTextSelected: { color: ACCENT },

  // cuisine chips
  chipsWrap: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: { color: TEXT, fontWeight: "700", fontSize: 13 },
  chipTextSelected: { color: "#fff" },

  selectedCount: { marginTop: 10, color: MUTED, fontSize: 12 },

  // footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // overlays
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },

  // toast
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(17,17,17,0.92)",
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "700" },
});
