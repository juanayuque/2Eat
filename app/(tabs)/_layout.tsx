// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View, Text, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
// Vector icons still used on native only
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const isWeb = Platform.OS === "web";

function usePalette() {
  const scheme = useColorScheme();
  const light = {
    barBg: "#fff",
    barBorder: "#eee",
    active: "#111",
    inactive: "#8e8e93",
    homeBg: "#111",
    homeFg: "#fff",
    shadow: "#000",
  };
  const dark = {
    barBg: "#0B0B14",
    barBorder: "#1d1d26",
    active: "#fff",
    inactive: "rgba(255,255,255,0.6)",
    homeBg: "#fff",
    homeFg: "#111",
    shadow: "#000",
  };
  return scheme === "dark" ? dark : light;
}

// Simple emoji icon for web
function EmojiTab({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text
        style={{
          fontSize: 22,
          lineHeight: 24,
          opacity: focused ? 1 : 0.6,
          transform: [{ scale: focused ? 1.05 : 1 }],
        }}
        {...(isWeb ? { role: "img", "aria-label": "tab" } : {})}
      >
        {glyph}
      </Text>
    </View>
  );
}

// Center Home icon inside a rounded square
function HomeSquare({ focused }: { focused: boolean }) {
  const c = usePalette();
  return (
    <View
      style={[
        styles.homeSquare,
        {
          backgroundColor: c.homeBg,
          shadowColor: c.shadow,
          transform: [{ scale: focused ? 1 : 0.98 }],
        },
      ]}
    >
      {isWeb ? (
        <Text style={{ fontSize: 22, lineHeight: 24, color: c.homeFg }}>🏠</Text>
      ) : (
        <Ionicons name={focused ? "home" : "home-outline"} size={26} color={c.homeFg} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const c = usePalette();

  return (
    <>
      <StatusBar style={c.barBg === "#fff" ? "dark" : "light"} />
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: c.active,
          tabBarInactiveTintColor: c.inactive,
          tabBarItemStyle: styles.tabItem,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: c.barBg,
              borderTopColor: c.barBorder,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              shadowColor: c.shadow,
            },
          ],
        }}
      >
        {/* Hidden parent route for Group Match */}
        <Tabs.Screen name="group-match" options={{ href: null }} />

        {/* 1 — Friends */}
        <Tabs.Screen
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ size, focused, color }) =>
              isWeb ? (
                <EmojiTab glyph="👥" focused={focused} />
              ) : (
                <MaterialCommunityIcons
                  name={focused ? "account-multiple" : "account-multiple-outline"}
                  size={size ?? 22}
                  color={color}
                />
              ),
          }}
        />

        {/* 2 — Preferences */}
        <Tabs.Screen
          name="preferences"
          options={{
            title: "Preferences",
            tabBarIcon: ({ size, focused, color }) =>
              isWeb ? (
                <EmojiTab glyph="🧭" focused={focused} />
              ) : (
                <Ionicons
                  name={focused ? "compass" : "compass-outline"}
                  size={size ?? 22}
                  color={color}
                />
              ),
          }}
        />

        {/* 3 — Home (center) */}
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => <HomeSquare focused={focused} />,
          }}
        />

        {/* 4 — List */}
        <Tabs.Screen
          name="list"
          options={{
            title: "List",
            tabBarIcon: ({ size, focused, color }) =>
              isWeb ? (
                <EmojiTab glyph="📋" focused={focused} />
              ) : (
                <Ionicons name={focused ? "list" : "list-outline"} size={size ?? 22} color={color} />
              ),
          }}
        />

        {/* 5 — Settings */}
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ size, focused, color }) =>
              isWeb ? (
                <EmojiTab glyph="⚙️" focused={focused} />
              ) : (
                <Ionicons
                  name={focused ? "settings" : "settings-outline"}
                  size={size ?? 22}
                  color={color}
                />
              ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    overflow: "visible",
    paddingTop: 8,
    height: 64, // a touch taller for web click targets
  },
  tabItem: {
    paddingTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  homeSquare: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
