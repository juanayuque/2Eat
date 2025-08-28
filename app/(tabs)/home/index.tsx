// app/(tabs)/home/index.tsx
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth } from "../../../firebaseConfig";
import { useFocusEffect } from "@react-navigation/native";
import AppContainer from "../../../src/components/AppContainer";
import RestaurantRecommendations, {
  type Restaurant,
} from "../../../src/components/RestaurantRecommendations";
import {
  fetchCityFromBackend,
  getLocationResilient,
} from "../../../src/utils/location";

const FALLBACK_IMG = require("../../../src/assets/images/2Eat-Logo.png");

type Coords = { latitude: number; longitude: number };

function nameFromUser(u: typeof auth.currentUser): string {
  const n = u?.displayName?.trim();
  if (n) return n.split(" ")[0];
  const email = u?.email || "";
  const base = email.split("@")[0];
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "there";
}

function HeroImage({ uri, altKey }: { uri?: string | null; altKey: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const source = useMemo(() => {
    if (!uri || failed) return FALLBACK_IMG;
    return { uri };
  }, [uri, failed]);

  return (
    <Image
      key={uri ? `${altKey}:${uri}` : `fallback:${altKey}`}
      source={source as any}
      style={styles.cardImage}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function HomeScreen() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [preferredName, setPreferredName] = useState<string>(
    nameFromUser(auth.currentUser)
  );

  // NEW: when a winner is picked, we store its full card here and render it in place of the current one
  const [winnerCard, setWinnerCard] = useState<Restaurant | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setPreferredName(nameFromUser(u));
    });
    return unsub;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          await auth.currentUser?.reload();
          if (!cancelled) setPreferredName(nameFromUser(auth.currentUser));
        } catch {}
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLocError(null);
        const loc = await getLocationResilient();
        if (cancelled) return;
        setCoords(loc);

        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          setCity(null);
          return;
        }

        const cityName = await fetchCityFromBackend(
          loc.latitude,
          loc.longitude,
          token,
          "https://2eatapp.com"
        );
        if (!cancelled) setCity(cityName ?? "Unavailable");
      } catch (e: any) {
        if (!cancelled) {
          setLocError(
            e?.message === "perm-denied"
              ? "Location permission denied"
              : "Location temporarily unavailable"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cardScale = useRef(new Animated.Value(1)).current;
  const bump = () => {
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.97,
        duration: 90,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  const [matchOpen, setMatchOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [winnerPicked, setWinnerPicked] = useState<string | null>(null);

  // NEW: gate button taps to avoid 429s from spamming
  const [actionBusy, setActionBusy] = useState(false);

  return (
    <AppContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {preferredName}</Text>
          <Text style={styles.location}>
            Your current location:{" "}
            <Text style={styles.locationStrong}>
              {city ? city : locError ? "Unavailable" : "Detecting…"}
            </Text>
          </Text>
          <Text style={styles.subtitle}>
            Like, Pass, or Super Star to shape your match!
          </Text>
        </View>

        {coords ? (
          <RestaurantRecommendations location={coords}>
            {({
              loading,
              error,
              current,
              queue,
              like,
              pass,
              superStar,
              shouldMatchPrompt,
              top3CandidateIds,
              superStarRestaurantId,
              finalizeMatch,
              restart,
            }) => {
              // If we have a winnerCard, show *that* instead of the current suggestion.
              const displayCard = winnerCard || current || null;
              const heroUri = displayCard?.photoUrl ?? null;

              const guarded = async (fn: () => Promise<any>) => {
                if (actionBusy || finalizing || !!winnerCard) return;
                try {
                  setActionBusy(true);
                  bump();
                  await fn();
                } finally {
                  setActionBusy(false);
                }
              };

              const onPass = () => guarded(() => pass());
              const onLike = () => guarded(() => like());
              const onSuper = () => guarded(() => superStar());

              useEffect(() => {
                if (shouldMatchPrompt && !winnerPicked && !winnerCard) {
                  setMatchOpen(true);
                }
              }, [shouldMatchPrompt, winnerPicked, winnerCard]);

              // Resolve names for the match modal (same approach you already added)
              const [namesById, setNamesById] = useState<Record<string, string>>({});
              useEffect(() => {
                const missing = [
                  ...top3CandidateIds,
                  ...(superStarRestaurantId ? [superStarRestaurantId] : []),
                ]
                  .filter(Boolean)
                  .filter((id) => !namesById[id as string]);
                if (!missing.length) return;

                (async () => {
                  try {
                    const token = await auth.currentUser?.getIdToken();
                    if (!token) return;
                    const resp = await fetch("https://2eatapp.com/api/recs/lookup", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ ids: missing }),
                    });
                    if (!resp.ok) return;
                    const json = await resp.json();
                    setNamesById((prev) => {
                      const next = { ...prev };
                      for (const it of json.items || []) {
                        if (it?.id && it?.name) next[it.id] = it.name;
                      }
                      return next;
                    });
                  } catch {}
                })();
                // eslint-disable-next-line react-hooks/exhaustive-deps
              }, [top3CandidateIds.join("|"), superStarRestaurantId]);

              const nameFor = (id: string) => {
                if (namesById[id]) return namesById[id];
                if (current?.id === id) return current.name;
                const fromQueue = queue.find((r) => r.id === id);
                return fromQueue?.name ?? `Restaurant ${id.slice(0, 6)}`;
              };

              // Fetch winner payload from backend if finalizeMatch didn't return it
              const fetchWinnerFromBackend = async (): Promise<Restaurant | null> => {
                try {
                  const token = await auth.currentUser?.getIdToken();
                  if (!token) return null;
                  const r = await fetch("https://2eatapp.com/api/recs/winner", {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!r.ok) return null;
                  const j = await r.json();
                  return j?.winner ?? null;
                } catch {
                  return null;
                }
              };

              const onPickWinner = async (id: string) => {
                try {
                  setFinalizing(true);
                  setFinalizeError(null);

                  // Many backends just return {ok:true}; try both flows.
                  const result = await finalizeMatch(id);

                  let winner: Restaurant | null = null;
                  if (result && typeof result === "object" && "winner" in result) {
                    winner = (result as any).winner as Restaurant;
                  }
                  if (!winner) {
                    winner = await fetchWinnerFromBackend();
                  }

                  if (winner) {
                    // 🔥 Replace the current card with the actual winner
                    setWinnerCard(winner);
                    setWinnerPicked(id);
                    setMatchOpen(false);
                  } else {
                    setWinnerPicked(id);
                    setMatchOpen(false);
                  }
                } catch (e: any) {
                  setFinalizeError(e?.message || "Could not finalize match.");
                } finally {
                  setFinalizing(false);
                }
              };

              const onMatchAgain = async () => {
                setWinnerPicked(null);
                setFinalizeError(null);
                setMatchOpen(false);
                setWinnerCard(null); // clear winner display
                await restart();
              };

              const summaryText =
                (displayCard as any)?.editorial_summary ??
                (displayCard as any)?.editorialSummary ??
                null;

              return (
                <>
                  {/* PASS | IMAGE | LIKE/SUPER — hide swipe buttons once we are showing a winner */}
                  <View style={styles.cardRow}>
                    {!winnerCard ? (
                      <Pressable
                        onPress={onPass}
                        disabled={actionBusy || loading}
                        style={({ pressed }) => [
                          styles.sideBtn,
                          (pressed || actionBusy) && styles.sideBtnPressed,
                          (actionBusy || loading) && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={styles.sideLabel}>Pass</Text>
                      </Pressable>
                    ) : (
                      <View style={{ width: 64, height: 64 }} />
                    )}

                    <Animated.View
                      style={[
                        styles.card,
                        styles.cardSquare,
                        { transform: [{ scale: cardScale }] },
                      ]}
                    >
                      {loading && !displayCard ? (
                        <View style={styles.centerFill}>
                          <ActivityIndicator />
                        </View>
                      ) : displayCard ? (
                        <HeroImage uri={heroUri} altKey={displayCard.id} />
                      ) : (
                        <View style={styles.centerFill}>
                          <Text style={{ color: "#666", textAlign: "center" }}>
                            {error
                              ? "Could not load suggestions."
                              : "No more suggestions."}
                          </Text>
                          <Pressable onPress={onMatchAgain} style={styles.refreshBtn}>
                            <Text style={styles.refreshBtnText}>Refresh</Text>
                          </Pressable>
                        </View>
                      )}
                    </Animated.View>

                    {!winnerCard ? (
                      <View style={{ gap: 10 }}>
                        <Pressable
                          onPress={onLike}
                          disabled={actionBusy || loading}
                          style={({ pressed }) => [
                            styles.sideBtn,
                            (pressed || actionBusy) && styles.sideBtnPressed,
                            (actionBusy || loading) && { opacity: 0.6 },
                          ]}
                        >
                          <Text style={styles.sideLabel}>Like</Text>
                        </Pressable>
                        <Pressable
                          onPress={onSuper}
                          disabled={actionBusy || loading}
                          style={({ pressed }) => [
                            styles.sideBtn,
                            styles.superBtn,
                            (pressed || actionBusy) && styles.sideBtnPressed,
                            (actionBusy || loading) && { opacity: 0.6 },
                          ]}
                        >
                          <Text style={[styles.sideLabel, { color: "#fff" }]}>★</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        <Pressable onPress={onMatchAgain} style={styles.refreshBtn}>
                          <Text style={styles.refreshBtnText}>Match again</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Details (winnerCard takes precedence) */}
                  {displayCard && (
                    <View style={styles.details}>
                      <Text style={styles.name}>{displayCard.name}</Text>

                      {!!displayCard.address && (
                        <Text style={styles.address}>
                          {displayCard.address}{"  "}
                          {typeof displayCard.distance === "number" && (
                            <Text style={styles.distance}>
                              • {displayCard.distance.toFixed(1)} km away
                            </Text>
                          )}
                        </Text>
                      )}

                      {!!summaryText && (
                        <Text style={styles.summary}>{summaryText}</Text>
                      )}

                      <Text style={styles.budget}>
                        {renderBudgetStars(displayCard.priceLevel)}
                      </Text>

                      {!winnerCard && (
                        <Text style={styles.dailyFeedback}>
                          Weekly Feedback:{" "}
                          <Text style={styles.feedbackValue}>Coming soon!</Text>
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Errors */}
                  {error && (
                    <Text
                      style={{ color: "red", marginTop: 8, textAlign: "center" }}
                    >
                      {error}
                    </Text>
                  )}

                  {/* Match Modal */}
                  <Modal
                    visible={matchOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setMatchOpen(false)}
                  >
                    <View style={styles.modalWrap}>
                      <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Your Match</Text>
                        <Text style={styles.modalHint}>
                          Pick tonight’s winner from your top choices.
                        </Text>

                        <View style={{ marginTop: 12, gap: 8 }}>
                          {top3CandidateIds.length ? (
                            top3CandidateIds.map((id) => (
                              <Pressable
                                key={id}
                                onPress={() => onPickWinner(id)}
                                disabled={finalizing}
                                style={({ pressed }) => [
                                  styles.choiceBtn,
                                  pressed && { opacity: 0.9 },
                                  finalizing && { opacity: 0.6 },
                                ]}
                              >
                                <Text style={styles.choiceBtnText}>{nameFor(id)}</Text>
                              </Pressable>
                            ))
                          ) : (
                            <Text style={{ color: "#555" }}>
                              Not enough picks yet—keep swiping a bit more.
                            </Text>
                          )}
                          {!!superStarRestaurantId && (
                            <Text style={{ color: "#111", fontWeight: "700" }}>
                              Super Star: {nameFor(superStarRestaurantId)}
                            </Text>
                          )}
                        </View>

                        {finalizeError && (
                          <Text style={{ color: "#b91c1c", marginTop: 8 }}>
                            {finalizeError}
                          </Text>
                        )}

                        <View style={styles.modalActions}>
                          <Pressable
                            onPress={() => setMatchOpen(false)}
                            style={styles.ghostBtn}
                          >
                            <Text style={styles.ghostBtnText}>Close</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Modal>

                  {/* Winner state banner */}
                  {winnerPicked && (
                    <View style={{ marginTop: 12, alignItems: "center", gap: 8 }}>
                      <Text style={{ fontWeight: "800", color: "#0f766e" }}>
                        Winner saved! 🎉
                      </Text>
                    </View>
                  )}
                </>
              );
            }}
          </RestaurantRecommendations>
        ) : (
          <View style={styles.centerFill}>
            <ActivityIndicator />
            <Text style={{ color: "#666" }}>Getting your location…</Text>
          </View>
        )}
      </View>
    </AppContainer>
  );
}

function renderBudgetStars(level?: 0 | 1 | 2 | 3 | 4) {
  if (level == null) return "☆☆☆☆  ·  Budget";
  const full = "★".repeat(level);
  const empty = "☆".repeat(4 - level);
  return `${full}${empty}  ·  Budget`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  header: { gap: 6, marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: "800", color: "#111", textAlign: "left" },
  location: { fontSize: 14, color: "#555", textAlign: "left" },
  locationStrong: { color: "#111", fontWeight: "700" },
  subtitle: { marginTop: 6, fontSize: 14, color: "#666", textAlign: "left" },

  cardRow: {
    width: "100%",
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 28,
  },
  sideBtn: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#f2f2f7",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    alignItems: "center",
    justifyContent: "center",
  },
  superBtn: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  sideBtnPressed: { transform: [{ scale: 0.97 }] },
  sideLabel: { fontSize: 16, fontWeight: "700", color: "#111" },

  card: {
    overflow: "hidden",
    backgroundColor: "#f7f7f8",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardSquare: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 380,
    minWidth: 180,
    borderRadius: 24,
  },
  cardImage: { width: "100%", height: "100%" },

  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  refreshBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  refreshBtnText: { color: "#fff", fontWeight: "700" },

  details: { marginTop: 0, gap: 8, paddingHorizontal: 8 },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
  },
  address: { marginTop: 2, fontSize: 14, color: "#333", textAlign: "center" },
  distance: { color: "#666" },

  budget: { marginTop: 8, fontSize: 14, color: "#111", fontWeight: "700", textAlign: "center" },

  dailyFeedback: { marginTop: 12, fontSize: 14, color: "#555", textAlign: "center" },
  feedbackValue: { fontWeight: "700", color: "#111" },

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
    borderColor: "#e5e5ea",
    padding: 16,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalHint: { marginTop: 4, color: "#666", fontSize: 13 },
  choiceBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5ea",
    backgroundColor: "#f8f8fb",
  },
  choiceBtnText: { fontWeight: "800", color: "#111" },
  modalActions: { marginTop: 14, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  ghostBtn: {
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  ghostBtnText: { color: "#111", fontWeight: "800", fontSize: 15 },

  summary: {
    marginTop: 6,
    color: "#444",
    fontSize: 14,
    textAlign: "center",
  },
});
