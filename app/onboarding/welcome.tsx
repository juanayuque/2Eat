import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Button, Text, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleContinue = async () => {
    await AsyncStorage.setItem("enrolmentComplete", "true");
    router.replace("/onboarding/login");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Welcome to the app!</Text>
      <Button title="Continue" onPress={handleContinue} />
    </View>
  );
}
