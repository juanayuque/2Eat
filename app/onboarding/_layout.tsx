// app/onboarding/_layout.tsx
import { Slot } from "expo-router";
import { SafeAreaView, View, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function OnboardingLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Center everything vertically & horizontally */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          {/* Constrain content width */}
          <View style={{ width: "100%", maxWidth: 480 }}>
            <Slot />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
