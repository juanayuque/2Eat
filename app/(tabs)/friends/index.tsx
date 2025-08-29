// app/(tabs)/friends/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { auth } from "../../../firebaseConfig";

const ACCENT = "#4f46e5";
const BORDER = "#e5e5ea";
const TEXT = "#111";
const MUTED = "#666";
const BACKEND_API_BASE_URL = "https://2eatapp.com";

type Friend = {
  id: string;
  name: string;
  username?: string | null;
};

type IncomingRequest = {
  id: string;
  fromUserId: string;
  fromName: string;
  fromUsername?: string | null;
};

type OutgoingRequest = {
  id: string;
  toUserId: string;
  toName: string;
  toUsername?: string | null;
};

export default function FriendsTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Toast
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

  const [loading, setLoading] = useState(true);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Add Friend modal
  const [addVisible, setAddVisible] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const authedHeaders = useCallback(async () => {
    const t = await auth.currentUser?.getIdToken(true);
    return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
  }, []);

  const loadAll = useCallback(async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return showToast("Not signed in");
    }
    setLoading(true);
    try {
      const headers = await authedHeaders();
      const [rReqs, rFriends] = await Promise.all([
        fetch(`${BACKEND_API_BASE_URL}/api/friends/requests`, { headers }),
        fetch(`${BACKEND_API_BASE_URL}/api/friends/list`, { headers }),
      ]);
      if (!rReqs.ok || !rFriends.ok) throw new Error("Failed to load");
      const reqJson = await rReqs.json();
      const listJson = await rFriends.json();
      setIncoming(reqJson?.incoming || []);
      setOutgoing(reqJson?.outgoing || []);
      setFriends(listJson?.friends || []);
    } catch {
      showToast("Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, [authedHeaders]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const incomingEmpty = useMemo(() => !loading && incoming.length === 0, [loading, incoming]);
  const outgoingEmpty = useMemo(() => !loading && outgoing.length === 0, [loading, outgoing]);
  const friendsEmpty  = useMemo(() => !loading && friends.length === 0,  [loading, friends]);

  const onSendRequest = useCallback(async () => {
    const q = addQuery.trim();
    if (!q) {
      showToast("Enter a username or email");
      return;
    }
    try {
      setSubmittingAdd(true);
      const headers = await authedHeaders();
      const r = await fetch(`${BACKEND_API_BASE_URL}/api/friends/request`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: q }),
      });
      if (!r.ok) throw new Error();
      setAddVisible(false);
      setAddQuery("");
      showToast("Request sent");
      loadAll();
    } catch {
      showToast("Could not send request");
    } finally {
      setSubmittingAdd(false);
    }
  }, [addQuery, authedHeaders, loadAll]);

  const onAccept = useCallback(
    async (req: IncomingRequest) => {
      try {
        const headers = await authedHeaders();
        const r = await fetch(`${BACKEND_API_BASE_URL}/api/friends/accept`, {
          method: "POST",
          headers,
          body: JSON.stringify({ requestId: req.id }),
        });
        if (!r.ok) throw new Error();
        showToast("Request accepted");
        loadAll();
      } catch {
        showToast("Failed to accept");
      }
    },
    [authedHeaders, loadAll]
  );

  const onDecline = useCallback(
    async (req: IncomingRequest) => {
      try {
        const headers = await authedHeaders();
        const r = await fetch(`${BACKEND_API_BASE_URL}/api/friends/decline`, {
          method: "POST",
          headers,
          body: JSON.stringify({ requestId: req.id }),
        });
        if (!r.ok) throw new Error();
        showToast("Request declined");
        loadAll();
      } catch {
        showToast("Failed to decline");
      }
    },
    [authedHeaders, loadAll]
  );

  const onGroupMatch = useCallback(
    (friend: Friend) => {
      router.push(`/group-match/new?friendId=${encodeURIComponent(friend.id)}`);
    },
    [router]
  );

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 24 }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>Invite friends and start a Group Match</Text>

          {/* Add friend card */}
          <View style={styles.card}>
            <Pressable
              onPress={() => setAddVisible(true)}
              style={({ hovered, pressed }) => [
                styles.row,
                hovered && { backgroundColor: "#fafafa" },
                pressed && { transform: [{ scale: 0.995 }] },
                Platform.OS === "web" ? { cursor: "pointer" } : null,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Add friend</Text>
                <Text style={styles.rowValue}>Username or email</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>

          {/* Requests (two columns) */}
          <View style={styles.card}>
            <SectionHeader title="Requests" />
            <View style={styles.requestsRow}>
              {/* Incoming column */}
              <View style={styles.requestsCol}>
                <Text style={styles.colTitle}>Incoming</Text>
                {loading ? (
                  <LoadingRow />
                ) : incomingEmpty ? (
                  <EmptyRow text="No incoming requests." />
                ) : (
                  incoming.map((r, idx) => (
                    <React.Fragment key={r.id}>
                      {idx > 0 && <ItemDivider />}
                      <RequestRow req={r} onAccept={() => onAccept(r)} onDecline={() => onDecline(r)} />
                    </React.Fragment>
                  ))
                )}
              </View>

              {/* Divider between columns */}
              <View style={styles.verticalDivider} />

              {/* Outgoing column */}
              <View style={styles.requestsCol}>
                <Text style={styles.colTitle}>Outgoing</Text>
                {loading ? (
                  <LoadingRow />
                ) : outgoingEmpty ? (
                  <EmptyRow text="No outgoing requests." />
                ) : (
                  outgoing.map((r, idx) => (
                    <React.Fragment key={r.id}>
                      {idx > 0 && <ItemDivider />}
                      <OutgoingRow req={r} />
                    </React.Fragment>
                  ))
                )}
              </View>
            </View>
          </View>

          {/* Your friends */}
          <View style={styles.card}>
            <SectionHeader title="Your friends" />
            {loading ? (
              <LoadingRow />
            ) : friendsEmpty ? (
              <EmptyRow text="No friends yet. Send a request above." />
            ) : (
              friends.map((f, idx) => (
                <React.Fragment key={f.id}>
                  {idx > 0 && <ItemDivider />}
                  <FriendRow friend={f} onGroupMatch={() => onGroupMatch(f)} />
                </React.Fragment>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add friend</Text>
            <Text style={styles.modalHint}>Search by username or email.</Text>
            <TextInput
              value={addQuery}
              onChangeText={setAddQuery}
              placeholder="e.g. johndoe or john@doe.com"
              placeholderTextColor={Platform.OS === "ios" ? "#8e8e93" : MUTED}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={onSendRequest}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setAddVisible(false)}
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
                onPress={onSendRequest}
                disabled={submittingAdd}
                style={({ hovered, pressed }) => [
                  styles.primaryBtn,
                  hovered && { opacity: 0.9 },
                  pressed && { transform: [{ scale: 0.98 }] },
                  Platform.OS === "web" && { cursor: "pointer" },
                  submittingAdd && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.primaryBtnText}>{submittingAdd ? "Sending…" : "Send request"}</Text>
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

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
      <Text style={{ fontSize: 14, color: MUTED, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}

function ItemDivider() {
  return <View style={styles.divider} />;
}

function LoadingRow() {
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 16, flexDirection: "row", gap: 10, alignItems: "center" }}>
      <ActivityIndicator />
      <Text style={{ color: MUTED }}>Loading…</Text>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
      <Text style={{ color: MUTED }}>{text}</Text>
    </View>
  );
}

function InitialAvatar({ name }: { name: string }) {
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f4f4f5",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: BORDER,
      }}
    >
      <Text style={{ color: TEXT, fontWeight: "800" }}>{initial}</Text>
    </View>
  );
}

function RequestRow({
  req,
  onAccept,
  onDecline,
}: {
  req: IncomingRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={styles.row}>
      <InitialAvatar name={req.fromName} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.rowTitle}>{req.fromName}</Text>
        {!!req.fromUsername && <Text style={styles.rowValue}>@{req.fromUsername}</Text>}
      </View>
      <Pressable
        onPress={onAccept}
        style={({ hovered, pressed }) => [
          styles.smallPrimaryBtn,
          hovered && { opacity: 0.9 },
          pressed && { transform: [{ scale: 0.98 }] },
          Platform.OS === "web" && { cursor: "pointer" },
        ]}
      >
        <Text style={styles.smallPrimaryBtnText}>Accept</Text>
      </Pressable>
      <Pressable
        onPress={onDecline}
        style={({ hovered, pressed }) => [
          styles.smallGhostBtn,
          hovered && { backgroundColor: "#fafafa" },
          pressed && { transform: [{ scale: 0.98 }] },
          Platform.OS === "web" && { cursor: "pointer" },
        ]}
      >
        <Text style={styles.smallGhostBtnText}>Decline</Text>
      </Pressable>
    </View>
  );
}

function OutgoingRow({ req }: { req: OutgoingRequest }) {
  return (
    <View style={styles.row}>
      <InitialAvatar name={req.toName} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.rowTitle}>{req.toName}</Text>
        {!!req.toUsername && <Text style={styles.rowValue}>@{req.toUsername}</Text>}
      </View>
      <View style={styles.badgePending}>
        <Text style={styles.badgePendingText}>Pending</Text>
      </View>
      {/* If you later add a cancel endpoint, place a ghost button here */}
    </View>
  );
}

function FriendRow({ friend, onGroupMatch }: { friend: Friend; onGroupMatch: () => void }) {
  return (
    <View style={styles.row}>
      <InitialAvatar name={friend.name} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.rowTitle}>{friend.name}</Text>
        {!!friend.username && <Text style={styles.rowValue}>@{friend.username}</Text>}
      </View>
      <Pressable
        onPress={onGroupMatch}
        style={({ hovered, pressed }) => [
          styles.smallPrimaryBtn,
          hovered && { opacity: 0.9 },
          pressed && { transform: [{ scale: 0.98 }] },
          Platform.OS === "web" && { cursor: "pointer" },
        ]}
      >
        <Text style={styles.smallPrimaryBtnText}>Group Match</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { paddingBottom: 16 },
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

  // Requests two-column layout
  requestsRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  requestsCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  colTitle: {
    paddingHorizontal: 10,
    paddingBottom: 6,
    color: TEXT,
    fontWeight: "800",
    fontSize: 15,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginVertical: 6,
    marginHorizontal: 4,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  rowValue: { marginTop: 2, fontSize: 13, color: MUTED },
  chevron: { fontSize: 24, color: MUTED, paddingLeft: 8, lineHeight: 24 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 14 },

  // Modal (same language as Account)
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
    minWidth: 130,
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

  smallPrimaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: ACCENT,
    marginLeft: 8,
  },
  smallPrimaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  smallGhostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    marginLeft: 8,
  },
  smallGhostBtnText: { color: TEXT, fontWeight: "800", fontSize: 13 },

  badgePending: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  badgePendingText: { color: MUTED, fontWeight: "800", fontSize: 12 },

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
