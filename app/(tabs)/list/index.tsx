// app/(tabs)/list/index.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../../firebaseConfig";
import AppContainer from "../../../src/components/AppContainer";

const API_BASE = "https://2eatapp.com";
const FALLBACK_IMG = require("../../../src/assets/images/2Eat-Logo.png");

type Resto = {
  id: string;
  name: string;
  address?: string | null;
  priceLevel?: 0 | 1 | 2 | 3 | 4 | null;
  primaryType?: string | null;
  types?: string[] | null;
  editorialSummary?: string | null;
  editorial_summary?: string | null;
  photoUrl?: string | null;
};

type MatchItem = {
  id: string;
  sessionId: string;
  createdAt: string;
  userComment: string | null;
  winner: Resto | null;
  top1: Resto | null;
  top2: Resto | null;
  top3: Resto | null;
  superStar: Resto | null;
};

export default function List() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState<MatchItem | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Toast
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");
      const r = await fetch(`${API_BASE}/api/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setMatches(json.matches || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh on first mount AND whenever this screen regains focus
  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [fetchMatches])
  );

  // Keep draft synced with the opened item
  useEffect(() => {
    if (open) setCommentDraft(open.userComment || "");
  }, [open?.id]);

  function budgetStars(level?: number | null) {
    if (level == null) return "☆☆☆☆  ·  Budget";
    const l = Math.max(0, Math.min(4, level));
    return `${"★".repeat(l)}${"☆".repeat(4 - l)}  ·  Budget`;
  }

  function dateLabel(iso: string) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  async function saveComment() {
    if (!open) return;
    try {
      setSaving(true);
      const token = await auth.currentUser?.getIdToken();
      const r = await fetch(`${API_BASE}/api/matches/${open.id}/comment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: commentDraft }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { userComment } = await r.json();

      // reflect in local list
      setMatches((prev) =>
        prev.map((m) => (m.id === open.id ? { ...m, userComment } : m))
      );

      // close modal + toast
      setOpen(null);
      showToast("Saved ✓");
    } catch (e: any) {
      showToast("Could not save");
    } finally {
      setSaving(false);
    }
  }

  const renderItem = ({ item }: { item: MatchItem }) => {
    const w = item.winner || item.top1;
    const uri = w?.photoUrl || null;
    return (
      <Pressable
        onPress={() => setOpen(item)}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.96, transform: [{ translateY: 1 }] },
        ]}
      >
        <View style={styles.photoWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
          ) : (
            <Image source={FALLBACK_IMG} style={styles.photo} resizeMode="cover" />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{w?.name || "Winner"}</Text>
          {!!w?.address && (
            <Text style={styles.address} numberOfLines={1}>{w.address}</Text>
          )}
          {!!(w?.editorial_summary || w?.editorialSummary) && (
            <Text style={styles.summary} numberOfLines={2}>
              {w?.editorial_summary || w?.editorialSummary}
            </Text>
          )}
          <Text style={styles.metaRow}>
            {budgetStars(w?.priceLevel ?? null)}  •  {dateLabel(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

  const keyExtractor = (m: MatchItem) => m.id;

  return (
    <AppContainer>
      <View style={styles.screen}>
        <Text style={styles.heading}>Your Matches</Text>
        <Text style={styles.sub}>Saved spots & collections.</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.dim}>Loading history…</Text>
          </View>
        ) : err ? (
          <View style={styles.center}>
            <Text style={[styles.dim, { color: "#b91c1c" }]}>{err}</Text>
            <Pressable onPress={fetchMatches} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.dim}>No matches yet.</Text>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 110, paddingTop: 6 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          />
        )}

        {/* Detail modal */}
        <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
          <View style={styles.modalWrap}>
            <View style={styles.modalCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.modalTitle}>Match details</Text>
                <Pressable onPress={() => setOpen(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </View>

              {open && (
                <View style={{ marginTop: 12, gap: 12 }}>
                  <Slot label="Winner" r={open.winner || open.top1} />
                  <View style={styles.row2}>
                    {!!open.top2 && <Slot label="#2" r={open.top2} small />}
                    {!!open.top3 && <Slot label="#3" r={open.top3} small />}
                  </View>
                  {!!open.superStar && <Slot label="Super Star" r={open.superStar} />}

                  {/* Comment box (DB-backed) */}
                  <View style={styles.commentBox}>
                    <Text style={styles.commentLabel}>Comment your experience</Text>
                    <TextInput
                      placeholder="Tastes, vibes, tips…"
                      placeholderTextColor="#9ca3af"
                      multiline
                      value={commentDraft}
                      onChangeText={setCommentDraft}
                      style={styles.commentInput}
                    />
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <Pressable disabled={saving} onPress={saveComment} style={[styles.saveBtn, saving && { opacity: 0.8 }]}>
                        <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Toast */}
        {toastMsg && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
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
    </AppContainer>
  );
}

function Slot({ label, r, small = false }: { label: string; r: Resto | null; small?: boolean }) {
  if (!r) return null;
  const uri = r.photoUrl || null;
  const title = r.name || "—";
  const summary = r.editorial_summary || r.editorialSummary || "";
  const price = r.priceLevel ?? null;

  return (
    <View style={[styles.slot, small && styles.slotSmall]}>
      <Text style={styles.slotLabel}>{label}</Text>
      <View style={styles.slotRow}>
        <View style={styles.slotPhotoWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.slotPhoto} resizeMode="cover" />
          ) : (
            <Image source={FALLBACK_IMG} style={styles.slotPhoto} resizeMode="cover" />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.slotTitle} numberOfLines={1}>{title}</Text>
          {!!summary && <Text style={styles.slotSummary} numberOfLines={2}>{summary}</Text>}
          <Text style={styles.slotMeta}>{budgetStars(price)}</Text>
        </View>
      </View>
    </View>
  );

  function budgetStars(level?: number | null) {
    if (level == null) return "☆☆☆☆  ·  Budget";
    const l = Math.max(0, Math.min(4, level));
    return `${("★").repeat(l)}${("☆").repeat(4 - l)}  ·  Budget`;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 110,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "left",
  },
  sub: { marginTop: 4, color: "#666" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  dim: { color: "#666" },

  card: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    backgroundColor: "#f7f7f8",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  photoWrap: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  photo: { width: "100%", height: "100%" },

  info: { flex: 1, gap: 4 },
  title: { color: "#111", fontWeight: "800", fontSize: 16 },
  address: { color: "#333" },
  summary: { color: "#444" },
  metaRow: { color: "#555", marginTop: 4, fontSize: 12 },

  // Modal (light)
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    padding: 14,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  modalTitle: { color: "#111", fontWeight: "800", fontSize: 18 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    backgroundColor: "#fff",
  },
  closeBtnText: { color: "#111", fontWeight: "800" },

  row2: { flexDirection: "row", gap: 10 },
  slot: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    backgroundColor: "#f8f8fb",
    padding: 10,
  },
  slotSmall: { flex: 1 },
  slotLabel: { color: "#555", marginBottom: 6, fontSize: 12, fontWeight: "700" },
  slotRow: { flexDirection: "row", gap: 10 },
  slotPhotoWrap: { width: 64, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: "#eee" },
  slotPhoto: { width: "100%", height: "100%" },
  slotTitle: { color: "#111", fontWeight: "800" },
  slotSummary: { color: "#444", fontSize: 12 },
  slotMeta: { color: "#555", fontSize: 12, marginTop: 4 },

  commentBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    backgroundColor: "#fff",
    padding: 10,
    gap: 8,
  },
  commentLabel: { color: "#111", fontWeight: "800" },
  commentInput: {
    minHeight: 70,
    color: "#111",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#4f46e5",
  },
  saveBtnText: { color: "#fff", fontWeight: "800" },

  ghostBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  ghostBtnText: { color: "#111", fontWeight: "800" },

  // Toast
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 100,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(17,17,17,0.92)",
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "700" },
});
