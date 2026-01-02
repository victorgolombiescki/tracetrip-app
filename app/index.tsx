import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { useAppStore } from '@/src/store/useAppStore';

export default function IndexScreen() {
  const { auth } = useAppStore();

  if (auth.isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Carregando TraceTrip..." />
      </View>
    );
  }

  if (auth.isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/splash" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});