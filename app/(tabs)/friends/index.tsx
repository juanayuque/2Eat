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
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../../firebaseConfig";

const ACCENT = "#4f46e5";
const ACCENT_DIM = "#a5b4fc";
const DANGER = "#ef4444";
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

// Match (group) requests
type GroupIncoming = {
  id: string;
  fromUserId: string;
  fromName: string;
  fromUsername?: string | null;
};
type GroupOutgoing = {
  id: string;
  toUserId: string;
  toName: string;
  toUsername?: string | null;
};

// Active sessions (Ready)
type GroupSession = {
  id: string;
  partner: { id: string; name: string; username?: string | null };
  youCount: number;
  partnerCount: number;
  limit: number;
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

  // Friends + friend requests
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Group (match) requests + sessions
  const [groupIncoming, setGroupIncoming] = useState<GroupIncoming[]>([]);
  const [groupOutgoing, setGroupOutgoing] = useState<GroupOutgoing[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]); // "Ready"

  // Add Friend modal
  const [addVisible, setAddVisible] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Remove Friend confirm modal
  const [removeVisible, setRemoveVisible] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Friend | null>(null);
  const [removing, setRemoving] = useState(false);

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
      const [rReqs, rFriends, rGReqs, rSessions] = await Promise.all([
        fetch(`${BACKEND_API_BASE_URL}/api/friends/requests`, { headers }),
        fetch(`${BACKEND_API_BASE_URL}/api/friends/list`, { headers }),
        fetch(`${BACKEND_API_BASE_URL}/api/group/requests`, { headers }),
        fetch(`${BACKEND_API_BASE_URL}/api/group/sessions`, { headers }), // only active sessions
      ]);

      if (!rReqs.ok || !rFriends.ok || !rGReqs.ok || !rSessions.ok) throw new Error("Failed to load");

      const reqJson = await rReqs.json();
      const listJson = await rFriends.json();
      const gReqJson = await rGReqs.json();
      const sessJson = await rSessions.json();

      setIncoming(reqJson?.incoming || []);
      setOutgoing(reqJson?.outgoing || []);
      setFriends(listJson?.friends || []);

      setGroupIncoming(gReqJson?.incoming || []);
      setGroupOutgoing(gReqJson?.outgoing || []);
      setSessions(sessJson?.sessions || []);
    } catch {
      showToast("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [authedHeaders]);

  // Initial load
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Refresh whenever the tab is focused (fixes stale 0/15 counts)
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const incomingEmpty = useMemo(() => !loading && incoming.length === 0, [loading, incoming]);
  const outgoingEmpty = useMemo(() => !loading && outgoing.length === 0, [loading, outgoing]);
  const friendsEmpty = useMemo(() => !loading && friends.length === 0, [loading, friends]);

  const groupPendingCombined = useMemo(() => {
    // Normalize to one array with a "kind"
    type Row =
      | ({ kind: "incoming" } & GroupIncoming)
      | ({ kind: "outgoing" } & GroupOutgoing);
    const inc = groupIncoming.map((x) => ({ kind: "incoming", ...x } as Row));
    const out = groupOutgoing.map((x) => ({ kind: "outgoing", ...x } as Row));
    // Show newest first (roughly by list order returned already sorted desc)
    return [...inc, ...out];
  }, [groupIncoming, groupOutgoing]);

  const groupPendingEmpty = useMemo(
    () => !loading && groupIncoming.length === 0 && groupOutgoing.length === 0,
    [loading, groupIncoming, groupOutgoing]
  );
  const groupReadyEmpty = useMemo(() => !loading && sessions.length === 0, [loading, sessions]);

  // Friends: send request
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

  // Friends: accept/decline
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

  // Remove friend
  const onAskRemove = useCallback((friend: Friend) => {
    setRemoveTarget(friend);
    setRemoveVisible(true);
  }, []);
  const onConfirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    try {
      setRemoving(true);
      const headers = await authedHeaders();
      const r = await fetch(`${BACKEND_API_BASE_URL}/api/friends/remove`, {
        method: "POST",
        headers,
        body: JSON.stringify({ friendId: removeTarget.id }),
      });
      if (!r.ok) throw new Error();
      setRemoveVisible(false);
      setRemoveTarget(null);
      showToast("Friend removed");
      loadAll();
    } catch {
      showToast("Failed to remove friend");
    } finally {
      setRemoving(false);
    }
  }, [removeTarget, authedHeaders, loadAll]);

  // Match (group) requests
  const onGroupRequest = useCallback(
  async (friend: Friend) => {
    try {
      const headers = await authedHeaders();
      const r = await fetch(`${BACKEND_API_BASE_URL}/api/group/request`, {
        method: "POST",
        headers,
        body: JSON.stringify({ friendId: friend.id }),
      });

      if (r.status === 409) {
        // Try to read a machine code to tailor the message
        let code = "";
        try { const j = await r.json(); code = j?.code || ""; } catch {}
        if (code === "already_active") {
          showToast("You already have a ready session with this friend.");
        } else if (code === "already_pending") {
          showToast("Match request already pending — check Pending.");
        } else {
          showToast("You already have a request/session with this friend.");
        }
        // Refresh lists so the button disables
        loadAll();
        return;
      }

      if (!r.ok) throw new Error();

      showToast("Match request sent");
      loadAll();
    } catch {
      showToast("Could not send match request");
    }
  },
  [authedHeaders, loadAll]
);

  const onAcceptGroup = useCallback(
    async (req: GroupIncoming) => {
      try {
        const headers = await authedHeaders();
        const r = await fetch(`${BACKEND_API_BASE_URL}/api/group/accept`, {
          method: "POST",
          headers,
          body: JSON.stringify({ requestId: req.id }),
        });
        if (!r.ok) throw new Error();
        showToast("Match ready");
        loadAll();
      } catch {
        showToast("Failed to accept match");
      }
    },
    [authedHeaders, loadAll]
  );

  const onCancelGroup = useCallback(
    async (req: GroupOutgoing) => {
      try {
        const headers = await authedHeaders();
        const r = await fetch(`${BACKEND_API_BASE_URL}/api/group/cancel`, {
          method: "POST",
          headers,
          body: JSON.stringify({ requestId: req.id }),
        });
        if (!r.ok) throw new Error();
        showToast("Match request canceled");
        loadAll();
      } catch {
        showToast("Failed to cancel");
      }
    },
    [authedHeaders, loadAll]
  );

  const onJoinSession = useCallback(
    (s: GroupSession) => {
      router.push(`/group-match/session/${encodeURIComponent(s.id)}`);
    },
    [router]
  );

  // Disable Group Match button if there's already a pending or active with that friend
 const isGroupMatchDisabled = useCallback(
  (friendId: string) => {
    const pend =
      groupOutgoing.some((o) => o.toUserId === friendId) ||
      groupIncoming.some((i) => i.fromUserId === friendId);
    const active = sessions.some((s) => s?.partner?.id === friendId); // 👈 safe
    return pend || active;
  },
  [groupOutgoing, groupIncoming, sessions]
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
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>Add friend</Text>
                <Text style={styles.rowValue}>Username or email</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>

          {/* Friend requests */}
          <View className="friend-requests" style={styles.card}>
            <SectionHeader title="Friend requests" />
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
                      <FriendRequestRow req={r} onAccept={() => onAccept(r)} onDecline={() => onDecline(r)} />
                    </React.Fragment>
                  ))
                )}
              </View>

              {/* Divider */}
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
                      <OutgoingFriendRow req={r} />
                    </React.Fragment>
                  ))
                )}
              </View>
            </View>
          </View>

          {/* Match requests */}
          <View style={styles.card}>
            <SectionHeader title="Match requests" />

            {/* Pending (combined incoming+outgoing) */}
            <Text style={[styles.colTitle, { paddingTop: 0 }]}>Pending</Text>
            {loading ? (
              <LoadingRow />
            ) : groupPendingEmpty ? (
              <EmptyRow text="No pending match requests." />
            ) : (
              groupPendingCombined.map((row, idx) => (
                <React.Fragment key={`${row.kind}-${row.id}`}>
                  {idx > 0 && <ItemDivider />}
                  {row.kind === "incoming" ? (
                    <MatchPendingIncomingRow
                      name={row.fromName}
                      username={row.fromUsername}
                      onAccept={() => onAcceptGroup(row)}
                    />
                  ) : (
                    <MatchPendingOutgoingRow
                      name={row.toName}
                      username={row.toUsername}
                      onCancel={() => onCancelGroup(row)}
                    />
                  )}
                </React.Fragment>
              ))
            )}

            <View style={styles.sectionDivider} />

            {/* Ready (active sessions) */}
            <Text style={styles.colTitle}>Ready</Text>
            {loading ? (
              <LoadingRow />
            ) : groupReadyEmpty ? (
              <EmptyRow text="No ready sessions." />
            ) : (
              sessions.map((s, idx) => (
                <React.Fragment key={s.id}>
                  {idx > 0 && <ItemDivider />}
                  <ReadyRow
                    s={s}
                    onJoin={() => onJoinSession(s)}
                  />
                </React.Fragment>
              ))
            )}
          </View>

          {/* Your friends */}
          <View style={styles.card}>
            <SectionHeader title="Your friends" />
            {loading ? (
              <LoadingRow />
            ) : friendsEmpty ? (
              <EmptyRow text="No friends yet. Send a request above." />
            ) : (
              friends.map((f, idx) => {
                const disabled = isGroupMatchDisabled(f.id);
                return (
                  <React.Fragment key={f.id}>
                    {idx > 0 && <ItemDivider />}
                    <FriendRow
                      friend={f}
                      onGroupMatch={() => onGroupRequest(f)}
                      onAskRemove={() => onAskRemove(f)}
                      disabledGroupMatch={disabled}
                    />
                  </React.Fragment>
                );
              })
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

      {/* Remove Friend Confirm Modal */}
      <Modal
        visible={removeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove friend</Text>
            <Text style={styles.modalHint}>
              {removeTarget
                ? `Are you sure you want to remove ${removeTarget.name}? You can add them again later.`
                : "Are you sure you want to remove this friend?"}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setRemoveVisible(false)}
                disabled={removing}
                style={({ hovered, pressed }) => [
                  styles.ghostBtn,
                  hovered && { backgroundColor: "#fafafa" },
                  pressed && { transform: [{ scale: 0.98 }] },
                  Platform.OS === "web" && { cursor: "pointer" },
                  removing && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirmRemove}
                disabled={removing}
                style={({ hovered, pressed }) => [
                  styles.dangerBtn,
                  hovered && { opacity: 0.9 },
                  pressed && { transform: [{ scale: 0.98 }] },
                  Platform.OS === "web" && { cursor: "pointer" },
                  removing && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.dangerBtnText}>{removing ? "Removing…" : "Remove"}</Text>
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

/** Friend incoming row — actions stacked below */
function FriendRequestRow({
  req,
  onAccept,
  onDecline,
}: {
  req: IncomingRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={[styles.row, { alignItems: "flex-start" }]}>
      <InitialAvatar name={req.fromName} />
      <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { flexShrink: 1 }]} numberOfLines={2}>
          {req.fromName}
        </Text>
        {!!req.fromUsername && <Text style={styles.rowValue}>@{req.fromUsername}</Text>}

        <View style={styles.actionRow}>
          <Pressable
            onPress={onAccept}
            style={({ hovered, pressed }) => [
              styles.smallPrimaryBtn,
              { marginLeft: 0 },
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
              { marginLeft: 0 },
              hovered && { backgroundColor: "#fafafa" },
              pressed && { transform: [{ scale: 0.98 }] },
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
          >
            <Text style={styles.smallGhostBtnText}>Decline</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function OutgoingFriendRow({ req }: { req: OutgoingRequest }) {
  return (
    <View style={[styles.row, { alignItems: "flex-start" }]}>
      <InitialAvatar name={req.toName} />
      <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { flexShrink: 1 }]} numberOfLines={2}>
          {req.toName}
        </Text>
        {!!req.toUsername && <Text style={styles.rowValue}>@{req.toUsername}</Text>}
        <View style={styles.actionRow}>
          <View style={styles.badgePending}>
            <Text style={styles.badgePendingText}>Pending</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Match pending — incoming (Accept) */
function MatchPendingIncomingRow({
  name,
  username,
  onAccept,
}: {
  name: string;
  username?: string | null;
  onAccept: () => void;
}) {
  return (
    <View style={[styles.row, { alignItems: "flex-start" }]}>
      <InitialAvatar name={name} />
      <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
        <Text style={[styles.rowTitle]} numberOfLines={2}>{name}</Text>
        {!!username && <Text style={styles.rowValue}>@{username}</Text>}

        <View style={styles.actionRow}>
          <Pressable
            onPress={onAccept}
            style={({ hovered, pressed }) => [
              styles.smallPrimaryBtn,
              { marginLeft: 0 },
              hovered && { opacity: 0.9 },
              pressed && { transform: [{ scale: 0.98 }] },
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
          >
            <Text style={styles.smallPrimaryBtnText}>Accept</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Match pending — outgoing (corner X to cancel) */
function MatchPendingOutgoingRow({
  name,
  username,
  onCancel,
}: {
  name: string;
  username?: string | null;
  onCancel: () => void;
}) {
  return (
    <View style={[styles.row, { alignItems: "flex-start", position: "relative" }]}>
      <Pressable
        onPress={onCancel}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        style={({ hovered, pressed }) => [
          styles.closeBtn,
          hovered && { backgroundColor: "#fafafa" },
          pressed && { transform: [{ scale: 0.96 }] },
          Platform.OS === "web" && { cursor: "pointer" },
        ]}
        accessibilityLabel="Cancel match request"
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>

      <InitialAvatar name={name} />
      <View style={{ flex: 1, marginLeft: 10, minWidth: 0, paddingRight: 36 }}>
        <Text style={[styles.rowTitle]} numberOfLines={2}>{name}</Text>
        {!!username && <Text style={styles.rowValue}>@{username}</Text>}
        <View style={styles.actionRow}>
          <View style={styles.badgePending}>
            <Text style={styles.badgePendingText}>Pending</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Ready session row */
function ReadyRow({ s, onJoin }: { s: GroupSession; onJoin: () => void }) {
  return (
    <View style={[styles.row, { alignItems: "flex-start" }]}>
      <InitialAvatar name={s.partner.name} />
      <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>{s.partner.name}</Text>
        {!!s.partner.username && <Text style={styles.rowValue}>@{s.partner.username}</Text>}
        <Text style={[styles.rowValue, { marginTop: 6 }]}>{`You ${s.youCount}/${s.limit}  •  Friend ${s.partnerCount}/${s.limit}`}</Text>

        <View style={styles.actionRow}>
          <Pressable
            onPress={onJoin}
            style={({ hovered, pressed }) => [
              styles.smallPrimaryBtn,
              { marginLeft: 0 },
              hovered && { opacity: 0.9 },
              pressed && { transform: [{ scale: 0.98 }] },
              Platform.OS === "web" && { cursor: "pointer" },
            ]}
          >
            <Text style={styles.smallPrimaryBtnText}>Join</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Friend row with corner remove "×" and Group Match button (may be disabled) */
function FriendRow({
  friend,
  onGroupMatch,
  onAskRemove,
  disabledGroupMatch,
}: {
  friend: Friend;
  onGroupMatch: () => void;
  onAskRemove: () => void;
  disabledGroupMatch?: boolean;
}) {
  return (
    <View style={[styles.row, styles.friendRow]}>
      {/* Corner “×” */}
      <Pressable
        onPress={onAskRemove}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        style={({ hovered, pressed }) => [
          styles.closeBtn,
          hovered && { backgroundColor: "#fafafa" },
          pressed && { transform: [{ scale: 0.96 }] },
          Platform.OS === "web" && { cursor: "pointer" },
        ]}
        accessibilityLabel="Remove friend"
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>

      <InitialAvatar name={friend.name} />
      <View style={{ flex: 1, marginLeft: 10, minWidth: 0, paddingRight: 36 }}>
        <Text style={[styles.rowTitle, { flexShrink: 1 }]} numberOfLines={2}>
          {friend.name}
        </Text>
        {!!friend.username && <Text style={styles.rowValue}>@{friend.username}</Text>}
        <View style={styles.actionRow}>
          <Pressable
            onPress={onGroupMatch}
            disabled={disabledGroupMatch}
            style={({ hovered, pressed }) => [
              styles.smallPrimaryBtn,
              { marginLeft: 0, backgroundColor: disabledGroupMatch ? ACCENT_DIM : ACCENT },
              hovered && !disabledGroupMatch && { opacity: 0.9 },
              pressed && !disabledGroupMatch && { transform: [{ scale: 0.98 }] },
              Platform.OS === "web" && { cursor: disabledGroupMatch ? "not-allowed" : "pointer" },
            ]}
          >
            <Text style={styles.smallPrimaryBtnText}>
              {disabledGroupMatch ? "Requested" : "Group Match"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { paddingBottom: 36 },
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: 16,
    paddingBottom: 150, 
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

  // Requests two-column layout (used by Friend requests)
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
  sectionDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 14,
    marginVertical: 8,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  friendRow: { position: "relative" },
  rowTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  rowValue: { marginTop: 2, fontSize: 13, color: MUTED },
  chevron: { fontSize: 24, color: MUTED, paddingLeft: 8, lineHeight: 24 },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 14 },

  // Corner small "×"
  closeBtn: {
    position: "absolute",
    right: 14,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  closeText: { color: MUTED, fontSize: 18, fontWeight: "800", lineHeight: 18 },

  // Modal base
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

  dangerBtn: {
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: DANGER,
  },
  dangerBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

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
  },
  smallPrimaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  smallGhostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
  },
  smallGhostBtnText: { color: TEXT, fontWeight: "800", fontSize: 13 },

  badgePending: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
