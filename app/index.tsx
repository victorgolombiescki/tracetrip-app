import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import * as Location from 'expo-location';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { useAppStore } from '@/src/store/useAppStore';

export default function IndexScreen() {
  const { auth } = useAppStore();
  
  useEffect(() => {
    const testGPS = async () => {
      console.log('🧪 [TEST GPS] Iniciando teste...');
      
      const providers = await Location.getProviderStatusAsync();
      console.log('🧪 [TEST GPS] ProviderStatus:', providers);

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        console.log('🧪 [TEST GPS] LOCALIZAÇÃO REAL:', loc.coords);
      } catch (err) {
        console.log('❌ [TEST GPS] ERRO ao pegar localização:', err);
      }
    };

    testGPS();
  }, []);

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