import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Button, Text, View } from "react-native";
import { auth } from "../../firebaseConfig";

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/onboarding/login");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>You're logged in ✅</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
