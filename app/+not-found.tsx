import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not available' }} />
      <View style={styles.container}>
        <Link href="/">
          <Text style={styles.buttonText}>Go back to Home screen!</Text> {/* <--- Wrapped with Text */}
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { // <--- New style for the text inside the button
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff',
  },
});
