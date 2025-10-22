import React, { useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/src/config/toastConfig';
import { authService } from '@/src/services/auth/AuthService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useAppStore } from '@/src/store/useAppStore';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { handleError } from '@/src/utils/errorHandler';
import { databaseInitializer } from '@/src/services/DatabaseInitializer';

export default function RootLayout() {
  const { auth, setAuth } = useAppStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await databaseInitializer.initialize();
      
      await checkAuth();
    } catch (error) {
      console.error('❌ Erro na inicialização do app:', error);
      handleError(error, 'Erro na inicialização', true);
    }
  };

  useEffect(() => { }, []);

  const checkAuth = async () => {
    try {
      setAuth({ isLoading: true });

      const storedAuth = await authService.getStoredAuth();

      if (storedAuth && storedAuth.token) {
        const isValid = await authService.validateToken(storedAuth.token);

        if (isValid) {
          setAuth({
            user: storedAuth.user,
            token: storedAuth.token,
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          await authService.logout();
          setAuth({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      } else {
        setAuth({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      handleError(error, 'Erro ao verificar autenticação', true);
      setAuth({ isLoading: false, isAuthenticated: false });
    }
  };

  const handleGlobalError = (error: Error) => {
    handleError(error);
  };

  if (auth.isLoading) {
    return null;
  }

  if (!auth.isAuthenticated) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: '#254985',
          zIndex: 1
        }} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboard" />
          <Stack.Screen name="login" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
        <Toast config={toastConfig} />
        <Redirect href="/onboard" />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        backgroundColor: '#254985',
        zIndex: 1
      }} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash" />
        <Stack.Screen name="onboard" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nova-despesa" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nova-ocorrencia" options={{ presentation: 'modal' }} />
        <Stack.Screen name="agendas/[id]" />
        <Stack.Screen name="rotas/[id]" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
      <Toast config={toastConfig} />
    </ErrorBoundary>
  );
}