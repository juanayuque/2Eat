// app/(tabs)/account/index.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { signOut, updateProfile } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

const ACCENT = "#4f46e5";
const BORDER = "#e5e5ea";
const TEXT = "#111";
const MUTED = "#666";
const BACKEND_API_BASE_URL = "https://2eatapp.com";

export default function AccountTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = auth.currentUser;
  const preferredName = useMemo(() => {
    const n = user?.displayName?.trim();
    if (n) return n;
    const base = (user?.email || "").split("@")[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
  }, [user?.displayName, user?.email]);

  const [nameVisible, setNameVisible] = useState(false);
  const [nameInput, setNameInput] = useState(preferredName);
  const [savingName, setSavingName] = useState(false);

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

  const saveName = async () => {
  const val = nameInput.trim();
  if (!val) {
    showToast("Please enter a name");
    return;
  }
  if (!auth.currentUser) {
    showToast("Not signed in");
    return;
  }
  try {
    setSavingName(true);

    // 1) Update profile on Firebase
    await updateProfile(auth.currentUser, { displayName: val });

    // 2) refresh the currentUser object so UI sees the change immediately
    await auth.currentUser?.reload();

    // 3) Keep backend in sync (no body needed for sync-profile)
    const token = await auth.currentUser.getIdToken(true);
    await fetch(`${BACKEND_API_BASE_URL}/api/users/sync-profile`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    setNameVisible(false);
    showToast("Name updated");
  } catch {
    showToast("Failed to update");
  } finally {
    setSavingName(false);
  }
};


  const onMembership = () => showToast("Our app is currently entirely free");

  const onLogout = async () => {
    await signOut(auth);
    router.replace("/onboarding");
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your profile and access</Text>

        <View style={styles.card}>
          <ItemRow
            title="Preferred name"
            value={preferredName || "Set name"}
            onPress={() => {
              setNameInput(preferredName);
              setNameVisible(true);
            }}
          />
          <ItemDivider />
          <ItemRow title="Membership" value="Free" onPress={onMembership} />
        </View>

        <Pressable
          onPress={onLogout}
          style={({ hovered, pressed }) => [
            styles.logoutBtn,
            hovered && { opacity: 0.95 },
            pressed && { transform: [{ scale: 0.98 }] },
            Platform.OS === "web" && { cursor: "pointer" },
          ]}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <Modal
        visible={nameVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setNameVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Preferred name</Text>
            <Text style={styles.modalHint}>
              This is how we’ll greet you in the app.
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={Platform.OS === "ios" ? "#8e8e93" : MUTED}
              autoFocus
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setNameVisible(false)}
                style={({ hovered, pressed }) => [
                  styles.ghostBtn,
                  hovered && { backgroundColor: "#fafafa" },
                  pressed && { transform: [{ scale: 0.98 }] },
                  Platform.OS === "web" && { cursor: "pointer" },
                ]}
              >
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveName}
                disabled={savingName}
                style={({ hovered, pressed }) => [
                  styles.primaryBtn,
                  hovered && { opacity: 0.9 },
                  pressed && { transform: [{ scale: 0.98 }] },
                  Platform.OS === "web" && { cursor: "pointer" },
                  savingName && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {savingName ? "Saving…" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  );
}

function ItemRow({
  title,
  value,
  onPress,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ hovered, pressed }) => [
        styles.row,
        hovered && { backgroundColor: "#fafafa" },
        pressed && { transform: [{ scale: 0.995 }] },
        Platform.OS === "web" && onPress ? { cursor: "pointer" } : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

function ItemDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 14, color: MUTED },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  rowValue: { marginTop: 2, fontSize: 13, color: MUTED },
  chevron: { fontSize: 24, color: MUTED, paddingLeft: 8, lineHeight: 24 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 14 },

  logoutBtn: {
    marginTop: 8,
    alignSelf: "center",
    minWidth: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  logoutText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  modalHint: { marginTop: 4, color: MUTED, fontSize: 13 },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: TEXT,
    backgroundColor: "#fff",
  },
  modalActions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  primaryBtn: {
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: ACCENT,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  ghostBtn: {
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
  },
  ghostBtnText: { color: TEXT, fontWeight: "800", fontSize: 15 },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(17,17,17,0.92)",
    alignItems: "center",
  },
  toastText: { color: "#fff", fontWeight: "700" },
});
