// app/(tabs)/preferences/index.tsx
import { View, Text } from "react-native";
export default function Preferences() {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#0B0B14" }}>
      <Text style={{ color:"#fff", fontSize:18, fontWeight:"800" }}>Preferences</Text>
      <Text style={{ color:"rgba(255,255,255,0.75)" }}>Cuisine, diet, price range.</Text>
    </View>
  );
}
