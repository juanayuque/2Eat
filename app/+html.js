// app/+not-found.tsx
import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { auth } from '../firebaseConfig';
import { useState, useEffect } from 'react'; // Import hooks

export default function NotFoundScreen() {
  // Use state to hold the login status
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // useEffect runs ONLY on the client (in the browser)
  useEffect(() => {
    
    const user = auth.currentUser;
    setIsLoggedIn(!!user);
  }, []); // Empty dependency array means it runs once on mount

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
        {/* This will now render correctly after the component mounts in the browser */}
        {isLoggedIn && <Text style={styles.info}>You are logged in.</Text>}
      </View>
    </>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontSize: 14, color: '#2e78b7' },
  info: { marginTop: 20 },
});