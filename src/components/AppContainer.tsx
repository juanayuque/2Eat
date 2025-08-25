import React from 'react';
import { View } from 'react-native';

export default function AppContainer({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F2F2F7' }}>
      {/* This inner container is the "phone" layout */}
      <View style={{ flex: 1, width: 430, maxWidth: '100%', backgroundColor: '#fff' }}>
        {children}
      </View>
    </View>
  );
}
