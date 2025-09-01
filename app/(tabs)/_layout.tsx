// app/(tabs)/_layout.tsx (or wherever your TabsLayout lives)
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

// Native-only “Home” square button
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
      <Ionicons
        name={focused ? "home" : "home-outline"}
        size={26}
        color={c.homeFg}
      />
    </View>
  );
}

// On web we keep it simple (regular icon), on native we show the square
function HomeIcon({ focused }: { focused: boolean }) {
  if (isWeb) {
    const c = usePalette();
    return (
      <Ionicons
        name={focused ? "home" : "home-outline"}
        size={24}
        color={focused ? c.active : c.inactive}
      />
    );
  }
  return <HomeSquare focused={focused} />;
}

export default function TabsLayout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();

  // Compact, fixed bar on web; padded bar on native
  const nativeBaseHeight = 60;
  const nativeBottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 10 : 12);
  const nativeTabBarHeight = nativeBaseHeight + nativeBottomPad;

  const webBarHeight = 56; // nice default
  const webBottomPad = 8;

  return (
    <>
      <StatusBar style={c.barBg === "#fff" ? "dark" : "light"} />
      <Tabs
        initialRouteName="home"
        sceneContainerStyle={
          isWeb
            ? { paddingBottom: webBarHeight + webBottomPad } // keep content above fixed bar
            : undefined
        }
        screenOptions={{
          headerShown: false,

          // Labels help on desktop; hide on phones to save space
          tabBarShowLabel: isWeb,
          tabBarLabelStyle: isWeb ? { fontSize: 12, marginTop: 2 } : undefined,

          tabBarActiveTintColor: c.active,
          tabBarInactiveTintColor: c.inactive,

          tabBarItemStyle: [
            styles.tabItem,
            isWeb ? { paddingVertical: 6, cursor: "pointer" as any } : { paddingTop: 4 },
          ],

          tabBarStyle: [
            styles.tabBarBase,
            isWeb
              ? {
                  // Web: fixed full-width bar
                  position: "fixed",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: webBarHeight,
                  paddingBottom: webBottomPad,
                  paddingTop: 6,
                  zIndex: 1000,
                }
              : {
                  // Native: floating rounded bar
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: nativeTabBarHeight,
                  paddingBottom: nativeBottomPad,
                  paddingTop: 8,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                },
            {
              backgroundColor: c.barBg,
              borderTopColor: c.barBorder,
              shadowColor: c.shadow,
            },
          ],
        }}
      >
        {/* Hidden parent route for Group Match */}
        <Tabs.Screen name="group-match" options={{ href: null }} />

        {/* Friends */}
        <Tabs.Screen
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ size, focused, color }) => (
              <MaterialCommunityIcons
                name={focused ? "account-multiple" : "account-multiple-outline"}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />

        {/* Preferences */}
        <Tabs.Screen
          name="preferences"
          options={{
            title: "Preferences",
            tabBarIcon: ({ size, focused, color }) => (
              <Ionicons
                name={focused ? "compass" : "compass-outline"}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />

        {/* Home (center) */}
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
          }}
        />

        {/* List */}
        <Tabs.Screen
          name="list"
          options={{
            title: "List",
            tabBarIcon: ({ size, focused, color }) => (
              <Ionicons
                name={focused ? "list" : "list-outline"}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />

        {/* Settings */}
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ size, focused, color }) => (
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
  tabBarBase: {
    borderTopWidth: StyleSheet.hairlineWidth,
    // Subtle shadow that works cross-platform enough
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    overflow: "visible",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
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
