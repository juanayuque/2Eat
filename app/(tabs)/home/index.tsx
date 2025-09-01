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
  ScrollView,
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

const API_BASE = "https://2eatapp.com";
const DISCOVER_ENDPOINT = `${API_BASE}/api/recs/discover-now`;
const FALLBACK_IMG = require("../../../src/assets/images/2Eat-Logo.png");

type Coords = { latitude: number; longitude: number };

function fallbackName(u: any) {
  const n = u?.displayName?.trim();
  if (n) return n;
  const base = (u?.email || "").split("@")[0];
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

async function authedHeaders() {
  const t = await auth.currentUser?.getIdToken(true);
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

function initialsFromUser(u: typeof auth.currentUser): string {
  const n = u?.displayName?.trim() || "";
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const email = u?.email || "";
  return (email[0] || "?").toUpperCase();
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

// ---------- cuisine keyword logic ----------
const norm = (s: string) => String(s || "").toLowerCase().replace(/[_\s-]+/g, " ").trim();

const CUISINE_KEYWORDS: Record<string, string[]> = {
  indian: ["indian"],
  chinese: ["chinese", "szechuan", "sichuan", "cantonese", "hunan"],
  italian: ["italian", "pizza", "pasta", "sicilian", "tuscan"],
  japanese: ["japanese", "sushi", "ramen", "izakaya"],
  thai: ["thai"],
  mexican: ["mexican", "taqueria", "taco"],
  korean: ["korean", "bbq"],
  american: ["american", "burger", "bbq", "diner"],
  vietnamese: ["vietnamese", "pho", "banh mi", "bahn mi"],
  mediterranean: ["mediterranean", "greek", "turkish", "lebanese"],
  "middle eastern": ["middle eastern", "lebanese", "turkish", "persian", "iranian"],
  spanish: ["spanish", "tapas"],
  french: ["french", "brasserie"],
  greek: ["greek"],
  turkish: ["turkish"],
  lebanese: ["lebanese"],
  persian: ["persian", "iranian"],
  "fast food": ["fast"],
  fastfood: ["fast"],
};

function expandUserCuisineKeywords(prefs: string[]): string[] {
  const set = new Set<string>();
  for (const p of prefs || []) {
    const key = norm(p);
    const arr = CUISINE_KEYWORDS[key] || [key];
    arr.forEach((a) => set.add(a));
  }
  return Array.from(set);
}

function primaryReadable(pt?: string | null) {
  if (!pt) return null;
  return pt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function highlightParts(source: string, keyword: string) {
  const idx = source.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return [{ text: source, hit: false }];
  return [
    { text: source.slice(0, idx), hit: false },
    { text: source.slice(idx, idx + keyword.length), hit: true },
    { text: source.slice(idx + keyword.length), hit: false },
  ];
}

function highlightAllParts(source: string, keyword: string) {
  if (!keyword) return [{ text: source, hit: false }];
  const lower = source.toLowerCase();
  const k = keyword.toLowerCase();
  const out: { text: string; hit: boolean }[] = [];
  let i = 0;
  while (i < source.length) {
    const j = lower.indexOf(k, i);
    if (j < 0) {
      out.push({ text: source.slice(i), hit: false });
      break;
    }
    if (j > i) out.push({ text: source.slice(i, j), hit: false });
    out.push({ text: source.slice(j, j + k.length), hit: true });
    i = j + k.length;
  }
  if (out.length === 0) return [{ text: source, hit: false }];
  return out;
}



// ---------- small helpers ----------

function pickDeterministic<T>(arr: T[], seed: string, count = 2): T[] {
  if (!arr?.length) return [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    let idx = (h + i * 97) % arr.length;
    while (used.has(idx) && used.size < arr.length) idx = (idx + 1) % arr.length;
    used.add(idx);
    out.push(arr[idx]);
  }
  return out;
}
// ---------- matches for comments ----------
type MatchRow = {
  id: string;
  userComment: string | null;
  winner: { id: string } | null;
  top1: { id: string } | null;
  top2: { id: string } | null;
  top3: { id: string } | null;
};

export default function HomeScreen() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  // Preferred name pulled from DB (/api/users/me)
  const [preferredName, setPreferredName] = useState<string>(fallbackName(auth.currentUser));
  const userInitials = initialsFromUser(auth.currentUser);

  const [winnerCard, setWinnerCard] = useState<Restaurant | null>(null);

  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [commentsByRestaurant, setCommentsByRestaurant] = useState<Record<string, string[]>>({});

  // Guard so discovery runs once per mount when data is ready
  const discoveryRanRef = useRef(false);

  const loadPreferredNameFromDB = useCallback(async () => {
    if (!auth.currentUser) {
      setPreferredName("");
      return;
    }
    try {
      const headers = await authedHeaders();
      const r = await fetch(`${API_BASE}/api/users/me`, { headers, cache: "no-store" as any });
      if (!r.ok) throw new Error("me failed");
      const j = await r.json();
      const dbName = (j?.user?.displayName || "").trim();
      setPreferredName(dbName || fallbackName(auth.currentUser));
    } catch {
      setPreferredName(fallbackName(auth.currentUser));
    }
  }, []);

  // When auth state changes (login/logout), pull name from DB
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => {
      loadPreferredNameFromDB();
    });
    return unsub;
  }, [loadPreferredNameFromDB]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try { await auth.currentUser?.reload(); } catch {}
        if (!cancelled) loadPreferredNameFromDB();
      })();
      return () => { cancelled = true; };
    }, [loadPreferredNameFromDB])
  );

  // Location + city
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

        const cityName = await fetchCityFromBackend(loc.latitude, loc.longitude, token, API_BASE);
        if (!cancelled) setCity(cityName ?? "Unavailable");
      } catch (e: any) {
        if (!cancelled) {
          setLocError(e?.message === "perm-denied" ? "Location permission denied" : "Location temporarily unavailable");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pull preferences (we only need preferredCuisines for discovery bias)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const r = await fetch(`${API_BASE}/api/users/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const j = await r.json();
        const p = j?.preferences ?? j ?? {};
        if (!cancelled) {
          setPreferredCuisines(Array.isArray(p.preferredCuisines) ? p.preferredCuisines : []);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 🔎 Kick off discovery once when we have coords + preferred cuisines
  useEffect(() => {
    const run = async () => {
      if (discoveryRanRef.current) return;
      if (!coords) return;
      if (!auth.currentUser) return;

      // Only bias when user has prefs; if none, skip per your requirement
      if (!preferredCuisines || preferredCuisines.length === 0) return;

      discoveryRanRef.current = true;

      try {
        const headers = await authedHeaders();
        const bias = expandUserCuisineKeywords(preferredCuisines);
        console.log("[discover] preferred cuisines:", preferredCuisines);
        console.log("[discover] expanded keywords:", bias);

        const body = {
          lat: coords.latitude,
          lng: coords.longitude,
          maxNew: 20,               // ask for up to 20 new restaurants
          // optional: pass cuisines so server can log/override (server can also read from DB)
          preferredCuisines,
        };

        const resp = await fetch(DISCOVER_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          console.log("[discover] server responded", resp.status);
          return;
        }
        const json = await resp.json();
        // Flexible logging depending on what server returns
        const found = json?.found ?? json?.discovered ?? 0;
        const created = json?.created ?? json?.new ?? 0;
        const tried = json?.tried ?? json?.attempts ?? undefined;
        const serverCuisines = json?.cuisinesUsed || json?.cuisines || preferredCuisines;

        console.log("[discover] cuisines used:", serverCuisines);
        console.log(
          `[discover] result: found=${found}, created=${created}${typeof tried === "number" ? `, attempts=${tried}` : ""}`
        );
      } catch (e) {
        console.log("[discover] failed:", e);
      }
    };
    run();
  }, [coords?.latitude, coords?.longitude, preferredCuisines?.join("|")]);

  // Pull matches -> build comments map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const r = await fetch(`${API_BASE}/api/matches`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const j = await r.json();
        const rows: MatchRow[] = j?.matches || [];
        const map: Record<string, string[]> = {};
        for (const m of rows) {
          const c = (m.userComment || "").trim();
          if (!c) continue;
          const ids = [m.winner?.id, m.top1?.id, m.top2?.id, m.top3?.id].filter(Boolean) as string[];
          for (const id of ids) {
            if (!map[id]) map[id] = [];
            map[id].push(c);
          }
        }
        if (!cancelled) setCommentsByRestaurant(map);
      } catch {}
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
  const [actionBusy, setActionBusy] = useState(false);

  return (
    <AppContainer>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {preferredName}</Text>
          <Text style={styles.location}>
            Your current location:{" "}
            <Text style={styles.locationStrong}>
              {city ? city : locError ? "Unavailable" : "Detecting…"}
            </Text>
          </Text>
          <Text style={styles.subtitle}>Like, Pass, or Super Star to shape your match!</Text>
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

              // Resolve names for the match modal
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
                    const resp = await fetch(`${API_BASE}/api/recs/lookup`, {
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
              }, [top3CandidateIds.join("|"), superStarRestaurantId]);

              const nameFor = (id: string) => {
                if (namesById[id]) return namesById[id];
                if (current?.id === id) return current.name;
                const fromQueue = queue.find((r) => r.id === id);
                return fromQueue?.name ?? `Restaurant ${id.slice(0, 6)}`;
              };

              const fetchWinnerFromBackend = async (): Promise<Restaurant | null> => {
                try {
                  const token = await auth.currentUser?.getIdToken();
                  if (!token) return null;
                const r = await fetch(`${API_BASE}/api/recs/winner`, {
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
                  const result = await finalizeMatch(id);
                  let winner: Restaurant | null = null;
                  if (result && typeof result === "object" && "winner" in (result as any)) {
                    winner = (result as any).winner as Restaurant;
                  }
                  if (!winner) winner = await fetchWinnerFromBackend();
                  if (winner) {
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
                setWinnerCard(null);
                await restart();
              };

              const summaryText =
                (displayCard as any)?.editorial_summary ??
                (displayCard as any)?.editorialSummary ??
                "";

              // Indicators
              const petFriendly = Boolean((displayCard as any)?.allowsDogs);
              const parking = hasParkingHeuristic(displayCard);

              // Preference reflection
              const { keyword: matchedKeyword, inWhere } = findMatchedKeyword(displayCard, preferredCuisines);

              // Comments for this restaurant
              const commentList = useMemo(() => {
                if (!displayCard) return [];
                const id = displayCard.id;
                return commentsByRestaurant[id] || [];
              }, [displayCard?.id, commentsByRestaurant]);

              const twoComments = useMemo(
                () => pickDeterministic(commentList, displayCard?.id || "seed", 2),
                [commentList, displayCard?.id]
              );

              return (
                <>
                  <View style={styles.cardInteractionContainer}>
                    {/* PASS | IMAGE | LIKE */}
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
                        style={[styles.card, styles.cardSquare, { transform: [{ scale: cardScale }] }]}
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
                              {error ? "Could not load suggestions." : "No more suggestions."}
                            </Text>
                            <Pressable onPress={onMatchAgain} style={styles.refreshBtn}>
                              <Text style={styles.refreshBtnText}>Refresh</Text>
                            </Pressable>
                          </View>
                        )}
                      </Animated.View>

                      {!winnerCard ? (
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
                      ) : (
                        <View style={{ width: 64, height: 64 }} />
                      )}
                    </View>

                    {/* Superlike Button OR Match Again Button */}
                    {!winnerCard ? (
                      <Pressable
                        onPress={onSuper}
                        disabled={actionBusy || loading}
                        style={({ pressed }) => [
                          styles.superlikeButton,
                          (pressed || actionBusy) && styles.sideBtnPressed,
                          (actionBusy || loading) && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={styles.superlikeButtonText}>★</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={onMatchAgain} style={styles.matchAgainButton}>
                        <Text style={styles.refreshBtnText}>Match again</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Details */}
                  {displayCard && (
                    <View style={styles.details}>
                      <Text style={styles.name}>{displayCard.name}</Text>

                      {!!displayCard.address && (
                        <Text style={styles.address}>
                          {displayCard.address}{"  "}
                          {typeof displayCard.distance === "number" && (
                            <Text style={styles.distance}>• {displayCard.distance.toFixed(1)} km away</Text>
                          )}
                        </Text>
                      )}

                      {/* Preference reflection */}
                      {matchedKeyword && (
                        <Text style={styles.prefReflect}>
                          Matches your preference:{" "}
                          <Text style={styles.typeMatch}>{matchedKeyword}</Text>
                          {inWhere === "summary" && <Text style={styles.prefHint}> (editorial summary)</Text>}
                          {inWhere === "type" && <Text style={styles.prefHint}> (type metadata)</Text>}
                        </Text>
                      )}

                      {/* Type line (only if available) with inline highlight */}
                      {(displayCard.primaryType || (displayCard.types && displayCard.types.length)) && (
                        <View style={styles.typeRow}>
                          <Text style={styles.typeLabel}>Type: </Text>
                          <Text style={styles.typeFallback}>
                            {(() => {
                              const pt = primaryReadable(displayCard.primaryType) || "Restaurant";
                              if (matchedKeyword) {
                                return (
                                  <>
                                    {highlightParts(pt, matchedKeyword).map((p, i) => (
                                      <Text key={`pt-${i}`} style={p.hit ? styles.typeMatch : undefined}>
                                        {p.text}
                                      </Text>
                                    ))}
                                  </>
                                ) as any;
                              }
                              return pt;
                            })()}
                            {Array.isArray(displayCard.types) && displayCard.types.length > 0 && (
                              <>
                                {"  ·  "}
                                {displayCard.types.slice(0, 3).map((t, i) => {
                                  const nice = String(t).replace(/_/g, " ");
                                  const parts = matchedKeyword ? highlightParts(nice, matchedKeyword) : [{ text: nice, hit: false }];
                                  return (
                                    <Text key={`t-${i}`}>
                                      {parts.map((p, j) => (
                                        <Text key={`tp-${i}-${j}`} style={p.hit ? styles.typeMatch : undefined}>
                                          {j === 0 && i > 0 && ", "}
                                          {p.text}
                                        </Text>
                                      ))}
                                    </Text>
                                  );
                                })}
                              </>
                            )}
                          </Text>
                        </View>
                      )}

                      {/* Always show indicators with ✓ / ✗ */}
                      <View style={styles.indicatorsRow}>
                        <View style={[styles.indicator, petFriendly ? styles.indicatorOn : styles.indicatorOff]}>
                          <Text style={petFriendly ? styles.indicatorTextOn : styles.indicatorTextOff}>
                            🐶 Pet friendly: {petFriendly ? "✓" : "✗"}
                          </Text>
                        </View>
                        <View style={[styles.indicator, parking ? styles.indicatorOn : styles.indicatorOff]}>
                          <Text style={parking ? styles.indicatorTextOn : styles.indicatorTextOff}>
                            🅿️ Parking: {parking ? "✓" : "✗"}
                          </Text>
                        </View>
                      </View>

                      {/* Editorial summary (with keyword highlight if present) */}
                      {summaryText ? (
                        matchedKeyword ? (
                          <Text style={styles.summary}>
                            {highlightAllParts(summaryText, matchedKeyword).map((p, i) => (
                              <Text key={`sum-${i}`} style={p.hit ? styles.typeMatch : undefined}>
                                {p.text}
                              </Text>
                            ))}
                          </Text>
                        ) : (
                          <Text style={styles.summary}>{summaryText}</Text>
                        )
                      ) : null}

                      <Text style={styles.budget}>{renderBudgetStars(displayCard.priceLevel)}</Text>

                      {/* Comments */}
                      <View style={styles.commentsBox}>
                        <Text style={styles.commentsTitle}>Comments from users</Text>
                        <View style={{ height: 10 }} />
                        {twoComments.length ? (
                          twoComments.map((c, idx) => (
                            <View key={`${displayCard.id}-c-${idx}`} style={styles.commentRow}>
                              <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{userInitials}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.commentName}>{preferredName}</Text>
                                <Text style={styles.commentText}>{c}</Text>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noComments}>— No comments yet</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Errors */}
                  {error && (
                    <Text style={{ color: "red", marginTop: 8, textAlign: "center" }}>
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
                        <Text style={styles.modalHint}>Pick tonight’s winner from your top choices.</Text>

                        <View style={{ marginTop: 12, gap: 8 }}>
                          {top3CandidateIds.length > 0 || !!superStarRestaurantId ? (
                            <>
                              {top3CandidateIds.map((id) => (
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
                              ))}
                              {!!superStarRestaurantId && (
                                <Pressable
                                  key={superStarRestaurantId}
                                  onPress={() => onPickWinner(superStarRestaurantId)}
                                  disabled={finalizing}
                                  style={({ pressed }) => [
                                    styles.choiceBtn,
                                    styles.superStarChoiceBtn,
                                    pressed && { opacity: 0.9 },
                                    finalizing && { opacity: 0.6 },
                                  ]}
                                >
                                  <Text style={[styles.choiceBtnText, styles.superStarChoiceBtnText]}>
                                    ★ {nameFor(superStarRestaurantId)}
                                  </Text>
                                </Pressable>
                              )}
                            </>
                          ) : (
                            <Text style={{ color: "#555" }}>
                              Not enough picks yet—keep swiping a bit more.
                            </Text>
                          )}
                        </View>

                        {finalizeError && (
                          <Text style={{ color: "#b91c1c", marginTop: 8 }}>
                            {finalizeError}
                          </Text>
                        )}

                        <View style={styles.modalActions}>
                          <Pressable onPress={() => setMatchOpen(false)} style={styles.ghostBtn}>
                            <Text style={styles.ghostBtnText}>Close</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Modal>

                  {/* Winner state banner */}
                  {winnerPicked && (
                    <View style={{ marginTop: 12, alignItems: "center", gap: 8 }}>
                      <Text style={{ fontWeight: "800", color: "#0f766e", paddingBottom: 150, }}>
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
      </ScrollView>
    </AppContainer>
  );
}

function hasParkingHeuristic(r: any): boolean {
  const po = r?.parkingOptions;
  const summary = String(r?.editorial_summary || r?.editorialSummary || "").toLowerCase();
  const hint =
    summary.includes("parking") ||
    summary.includes("car park") ||
    summary.includes("parking lot");
  if (po && typeof po === "object") {
    return Object.values(po).some(Boolean) || hint;
  }
  return Boolean(po) || hint;
}

function findMatchedKeyword(
  r: any,
  userPrefs: string[]
): { keyword: string | null; inWhere: "summary" | "type" | null } {
  if (!r) return { keyword: null, inWhere: null };
  const needles = expandUserCuisineKeywords(userPrefs);
  if (!needles.length) return { keyword: null, inWhere: null };

  const summary = String(r?.editorial_summary || r?.editorialSummary || "");
  const primary = String(r?.primaryType || "");
  const types: string[] = Array.isArray(r?.types) ? r.types.map(String) : [];
  const primaryDN = String(r?.primaryTypeDisplayName || r?.name || "");

  for (const k of needles) {
    if (summary.toLowerCase().includes(k.toLowerCase())) return { keyword: k, inWhere: "summary" };
  }
  for (const k of needles) {
    const needle = k.replace(/\s+/g, "_").toLowerCase();
    if (primary.toLowerCase().includes(needle)) return { keyword: k, inWhere: "type" };
    if (types.some((t) => t.toLowerCase().includes(needle))) return { keyword: k, inWhere: "type" };
    if (primaryDN.toLowerCase().includes(k.toLowerCase())) return { keyword: k, inWhere: "type" };
  }
  return { keyword: null, inWhere: null };
}

function renderBudgetStars(level?: 0 | 1 | 2 | 3 | 4) {
  if (level == null) return "☆☆☆☆  ·  Budget";
  const full = "★".repeat(level);
  const empty = "☆".repeat(4 - level);
  return `${full}${empty}  ·  Budget`;
}

const ACCENT = "#4f46e5";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingTop: 75,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  header: { gap: 6, marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: "800", color: "#111", textAlign: "left" },
  location: { fontSize: 14, color: "#555", textAlign: "left" },
  locationStrong: { color: "#111", fontWeight: "700" },
  subtitle: { marginTop: 2, fontSize: 14, color: "#666", textAlign: "left" },

  cardInteractionContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  cardRow: {
    width: "100%",
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  sideBtnPressed: { transform: [{ scale: 0.97 }] },
  sideLabel: { fontSize: 16, fontWeight: "700", color: "#111" },

  superlikeButton: {
    marginTop: -20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: ACCENT,
    borderColor: "#fff",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 1,
  },
  superlikeButtonText: {
    fontSize: 24,
    color: "#fff",
    lineHeight: 28,
  },
  matchAgainButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111",
    alignSelf: "center",
  },

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

  details: { marginTop: 0, gap: 10, paddingHorizontal: 8 },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 4,
  },
  address: { marginTop: 2, fontSize: 14, color: "#333", textAlign: "center" },
  distance: { color: "#666" },

  // Preference reflection & type
  prefReflect: {
    marginTop: 2,
    color: "#333",
    textAlign: "center",
  },
  prefHint: { color: "#666", fontSize: 12 },
  typeRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    gap: 6,
  },
  typeLabel: { color: "#666", fontSize: 13 },
  typeMatch: { color: ACCENT, fontWeight: "800", fontSize: 13 },
  typeFallback: { color: "#111", fontWeight: "700", fontSize: 13 },

  // Indicators always visible
  indicatorsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  indicator: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  indicatorOn: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  indicatorOff: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  indicatorTextOn: { color: "#065f46", fontWeight: "700", fontSize: 12 },
  indicatorTextOff: { color: "#7f1d1d", fontWeight: "700", fontSize: 12 },

  budget: { marginTop: 6, fontSize: 14, color: "#111", fontWeight: "700", textAlign: "center" },

  // Comments section
  commentsBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f5f7ff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingBottom:50,
    marginBottom:75,
    gap: 8,
  },
  commentsTitle: { color: "#111", fontWeight: "800", fontSize: 14, textAlign: "left" },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#3730a3", fontWeight: "800", fontSize: 12 },
  commentName: { color: "#111", fontWeight: "800", fontSize: 12 },
  commentText: { color: "#333", fontSize: 12, marginTop: 2 },
  noComments: { color: "#666", fontSize: 12, textAlign: "left" },

  // Modal
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
  superStarChoiceBtn: {
    backgroundColor: "#eef2ff",
    borderColor: ACCENT,
  },
  superStarChoiceBtnText: {
    color: ACCENT,
  },
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
