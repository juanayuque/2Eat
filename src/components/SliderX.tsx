import React from "react";
import { Platform, ViewStyle } from "react-native";

type Props = {
  value: number;
  onValueChange: (v: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  style?: ViewStyle;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
};

export default function SliderX(props: Props) {
  if (Platform.OS === "web") {
    const {
      value,
      onValueChange,
      minimumValue = 0,
      maximumValue = 100,
      step = 1,
      style,
    } = props;

    return (
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        onChange={(e) =>
          onValueChange(Number((e.target as HTMLInputElement).value))
        }
        // 
        style={{
          width: "100%",
          height: 40,
          appearance: "none",
          background: "transparent",
          ...(style as any),
        }}
      />
    );
  }

  // Native (iOS/Android): uses the community slider without touching web
  const NativeSlider = require("@react-native-community/slider").default;
  return <NativeSlider {...props} />;
}
