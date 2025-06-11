import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { auth } from '../../firebaseConfig'; // Replace with your actual path

interface Props {
  location: { latitude: number; longitude: number } | null;
}

interface Restaurant {
  name: string;
  distance: number;
}

const BACKEND_API_BASE_URL = 'https://2EatApp.com';

export default function RestaurantRecommendations({ location }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!location) return;

  const fetchData = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setError("User not authenticated.");
        return;
      }

      const idToken = await user.getIdToken(); // Get Firebase ID token

      const res = await fetch(
        `${BACKEND_API_BASE_URL}/api/location-info?lat=${location.latitude}&lng=${location.longitude}`,
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Backend responded with status ${res.status}`);
      }

      const data = await res.json();
      setRestaurants(data.nearbyRestaurants || []);
    } catch (err) {
      console.error("Failed to fetch from backend:", err);
      setError("Could not fetch dining suggestions.");
    }
  };

  fetchData();
}, [location]);

  if (!location) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontWeight: "bold" }}>📍 Your Location (Debugging):</Text>
      <Text>Latitude: {location.latitude.toFixed(4)}</Text>
      <Text>Longitude: {location.longitude.toFixed(4)}</Text>

      <Text style={{ fontWeight: "bold", marginTop: 10 }}>
        🍴 Nearby Dining Options:
      </Text>
      {error && <Text style={{ color: "red" }}>{error}</Text>}
      {restaurants.length === 0 && !error && <Text>Loading restaurants...</Text>}
      {restaurants.map((r, idx) => (
        <Text key={idx}>• {r.name} ({r.distance} km)</Text>
      ))}
    </View>
  );
}
