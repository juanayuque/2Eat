import { View, Text, Pressable, Image, Animated, Easing, Dimensions } from "react-native";
import { useRef, useEffect } from "react";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function OnboardingWelcome() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const logoSize = Math.min(width * 0.38, 220);

  return (
    <Animated.View style={{ alignItems: "center", opacity: fade }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize * 0.24,
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
        >
          <Image
            source={require("../../src/assets/images/2Eat-Logo.png")}
            accessibilityLabel="2 Eat logo"
            style={{ width: "100%", height: "100%", resizeMode: "contain" }}
          />
        </View>
      </Animated.View>

      <Text
        style={{
          marginTop: 14,
          fontSize: 16,
          color: "rgba(255,255,255,0.9)",
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 420,
        }}
      >
        Discover great places near you — tailored to your taste.
      </Text>

      <View style={{ width: "100%", gap: 12, marginTop: 16 }}>
        <Pressable
          onPress={() => router.push("/onboarding/register")}
          style={({ pressed }) => ({
            backgroundColor: "rgba(255,255,255,0.14)",
            borderColor: "rgba(255,255,255,0.22)",
            borderWidth: 1,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            transform: [{ translateY: pressed ? 1 : 0 }],
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          })}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Create account</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/onboarding/login")} // or /onboarding/login
          style={({ pressed }) => ({
            backgroundColor: "transparent",
            borderColor: "rgba(255,255,255,0.35)",
            borderWidth: 1,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            transform: [{ translateY: pressed ? 1 : 0 }],
          })}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>I already have an account</Text>
        </Pressable>
      </View>

      <Text style={{ marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
        By continuing you agree to our Terms and Privacy Policy.
      </Text>
    </Animated.View>
  );
}
