import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@/src/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardScreen() {
  const { auth } = useAppStore();
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [auth.isAuthenticated]);
  
  const handleLogin = () => {
    router.replace('/login');
  };
  
  if (auth.isLoading || auth.isAuthenticated) {
    return null;
  }
  
  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.statusBarBackground, { height: insets.top }]} />
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.content}>
          <Image source={require('../assets/tracetrip.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.modal}>
          <Text style={styles.modalText}>
            Organize suas viagens, despesas e agendas com praticidade. Registre comprovantes,
            acompanhe rotas e mantenha tudo seguro no TraceTrip.
          </Text>
          <View style={styles.pagination}>
            <View style={[styles.dot, styles.activeDot]} />
          </View>
          <View style={styles.navigationButtons}>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#254985',
    zIndex: 1,
  },
  container: { flex: 1, backgroundColor: '#254985' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 260, height: 110 },
  modal: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  modalText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#254985' },
  navigationButtons: { flexDirection: 'row' },
  loginButton: { flex: 1, backgroundColor: '#254985', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
}); 