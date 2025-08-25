// app/components/MinimalSplashGif.tsx
import React, { useEffect } from "react";
import { View, StatusBar } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  gifSource: any;          // require("...gif")
  gifDurationMs?: number;  // e.g., 3000
  holdAfterGifMs?: number; // optional
  onFinish: () => void;
};

const FILL = { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };

export default function MinimalSplashGif({
  gifSource,
  gifDurationMs = 3000,
  holdAfterGifMs = 0,
  onFinish,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onFinish, gifDurationMs + holdAfterGifMs);
    return () => clearTimeout(t);
  }, [gifDurationMs, holdAfterGifMs, onFinish]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0f0c29" }}>
      <StatusBar hidden animated />

      {/* 1) Blurred background fills the whole screen (no letterboxing visible) */}
      <ExpoImage
        source={gifSource}
        style={FILL}
        contentFit="cover"
        blurRadius={50}
      />

      {/* Optional vignette to soften edges */}
      <LinearGradient
        colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.45)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={FILL}
      />

      {/* 2) Foreground GIF kept intact (no cropping) */}
      <ExpoImage
        source={gifSource}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"      // keeps full GIF visible
        contentPosition="center"
        // transition={0}          // uncomment to disable fade
      />
    </View>
  );
}

