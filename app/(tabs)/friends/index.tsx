// app/(tabs)/friends/index.tsx
import { View, Text } from "react-native";
export default function Friends() {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#0B0B14" }}>
      <Text style={{ color:"#fff", fontSize:18, fontWeight:"800" }}>Friends</Text>
      <Text style={{ color:"rgba(255,255,255,0.75)" }}>Invite friends to 2Eat.</Text>
    </View>
  );
}
