// app/onboarding/login.tsx
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import { showLoginError } from "../../src/utils/authErrors";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      return showLoginError({ code: "auth/invalid-credentials" } as any);
    }
    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // Decide where to go based on enrolment flag
      const flag = await AsyncStorage.getItem("enrolmentComplete"); // "true" | "false" | null
      if (flag === "true") {
        router.replace("/(tabs)/home"); // or "/(tabs)/home" if your file is index.tsx
      } else {
        router.replace("/onboarding/intro");
      }
    } catch (error: any) {
      console.log("Login error:", error?.message);
      showLoginError(error);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={24}
      style={styles.kav} // no flex; layout centers us
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue discovering places to 2Eat.</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="rgba(255,255,255,0.7)"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        selectionColor="#fff"
        returnKeyType="next"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="rgba(255,255,255,0.7)"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        selectionColor="#fff"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => router.push("/onboarding/register")}
        activeOpacity={0.8}
      >
        <Text style={styles.linkText}>I need an account</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Important: let the layout center this block
  kav: {
    alignSelf: "stretch",
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.10)", // glassy on the gradient
    color: "#fff",
    marginTop: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    marginTop: 16,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  linkText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

