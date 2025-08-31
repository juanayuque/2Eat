// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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

// Center Home icon inside a rounded square (NOT a circle)
function HomeSquare({ focused }: { focused: boolean }) {
  const c = usePalette();
  return (
    <View
      style={[
        styles.homeSquare,
        {
          backgroundColor: c.homeBg,
          shadowColor: c.shadow,
        },
      ]}
    >
      <Ionicons name={focused ? "home" : "home-outline"} size={26} color={c.homeFg} />
    </View>
  );
}

export default function TabsLayout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();

  const baseHeight = 60;
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 10 : 12);
  const tabBarHeight = baseHeight + bottomPad;

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
              height: tabBarHeight,
              paddingBottom: bottomPad,
              backgroundColor: c.barBg,
              borderTopColor: c.barBorder,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              shadowColor: c.shadow,
            },
          ],
        }}
      >
        {/* Hidden parent route for Group Match (keeps tab bar visible, no tab button) */}
        <Tabs.Screen
          name="group-match"
          options={{
            href: null,        // hide from tab bar & linking; still navigable via router.push
            headerShown: false,
          }}
        />

        {/* 1 — Friends */}
        <Tabs.Screen
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ size, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "account-multiple" : "account-multiple-outline"}
                size={size ?? 22}
                color={focused ? c.active : c.inactive}
              />
            ),
          }}
        />

        {/* 2 — Preferences */}
        <Tabs.Screen
          name="preferences"
          options={{
            title: "Preferences",
            tabBarIcon: ({ size, focused }) => (
              <Ionicons
                name={focused ? "compass" : "compass-outline"}
                size={size ?? 22}
                color={focused ? c.active : c.inactive}
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
            tabBarIcon: ({ size, focused }) => (
              <Ionicons
                name={focused ? "list" : "list-outline"}
                size={size ?? 22}
                color={focused ? c.active : c.inactive}
              />
            ),
          }}
        />

        {/* 5 — Settings */}
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ size, focused }) => (
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={size ?? 22}
                color={focused ? c.active : c.inactive}
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
