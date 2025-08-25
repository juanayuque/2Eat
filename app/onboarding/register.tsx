// app/onboarding/register.tsx
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { showRegisterError } from "../../src/utils/authErrors";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Please enter an email and password.");
      return;
    }
    try {
      setSubmitting(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Continue your onboarding flow
      router.replace("/onboarding/intro");
    } catch (error: any) {
      console.log("Sign up Error:", error?.message);
      showRegisterError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={24}
      style={styles.kav} // <- no flex; layout centers us
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create an account</Text>
        <Text style={styles.subtitle}>
          Join 2Eat and discover great places near you.
        </Text>
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
      />

      <TouchableOpacity
        style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
        onPress={handleRegister}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => router.push("/onboarding/login")}
        activeOpacity={0.8}
      >
        <Text style={styles.linkText}>I already have an account</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Important: no flex here so the layout can center this block
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
