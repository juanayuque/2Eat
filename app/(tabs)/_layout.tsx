// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";

// SVG icons for web (no fonts, fully colorable)
import { Users, Compass, Home as HomeIcon, List as ListIcon, Settings as SettingsIcon } from "lucide-react-native";

const isWeb = Platform.OS === "web";

function usePalette() {
  const scheme = useColorScheme();
  const light = {
    barBg: "#fff",
    barBorder: "#eee",
    active: "#111", // dark icons requested
    inactive: "#8e8e93",
    homeBg: "#111",
    homeFg: "#fff", // white house requested
    shadow: "#000",
  };
  const dark = {
    barBg: "#0B0B14",
    barBorder: "#1d1d26",
    active: "#fff",
    inactive: "rgba(255,255,255,0.6)",
    homeBg: "#111", // keep dark so the house can be white even in dark mode
    homeFg: "#fff",
    shadow: "#000",
  };
  return scheme === "dark" ? dark : light;
}

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
        <HomeIcon size={24} color={c.homeFg} />
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
        <Tabs.Screen name="group-match" options={{ href: null }} />

        <Tabs.Screen
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ size = 22, focused, color }) =>
              isWeb ? <Users size={size} color={focused ? c.active : c.inactive} /> : (
                <MaterialCommunityIcons
                  name={focused ? "account-multiple" : "account-multiple-outline"}
                  size={size}
                  color={color}
                />
              ),
          }}
        />

        <Tabs.Screen
          name="preferences"
          options={{
            title: "Preferences",
            tabBarIcon: ({ size = 22, focused, color }) =>
              isWeb ? <Compass size={size} color={focused ? c.active : c.inactive} /> : (
                <Ionicons
                  name={focused ? "compass" : "compass-outline"}
                  size={size}
                  color={color}
                />
              ),
          }}
        />

        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => <HomeSquare focused={focused} />,
          }}
        />

        <Tabs.Screen
          name="list"
          options={{
            title: "List",
            tabBarIcon: ({ size = 22, focused, color }) =>
              isWeb ? <ListIcon size={size} color={focused ? c.active : c.inactive} /> : (
                <Ionicons name={focused ? "list" : "list-outline"} size={size} color={color} />
              ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ size = 22, focused, color }) =>
              isWeb ? <SettingsIcon size={size} color={focused ? c.active : c.inactive} /> : (
                <Ionicons
                  name={focused ? "settings" : "settings-outline"}
                  size={size}
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
    height: 64,
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

