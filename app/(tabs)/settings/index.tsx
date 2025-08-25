// app/(tabs)/account/index.tsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

export default function AccountTab() {
  const router = useRouter();
  return (
    <View style={styles.v}>
      <Text style={styles.t}>Account</Text>
      <Pressable
        onPress={async () => {
          await signOut(auth);
          router.replace("/onboarding"); // back to onboarding welcome
        }}
        style={({ pressed }) => [
          styles.btn,
          { transform: [{ translateY: pressed ? 1 : 0 }] },
        ]}
      >
        <Text style={styles.btnText}>Log out</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  v: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0B14", gap: 16 },
  t: { fontSize: 22, fontWeight: "800", color: "#fff" },
  btn: { backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  btnText: { color: "#111", fontWeight: "800" },
});
