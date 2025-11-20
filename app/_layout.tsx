import React, { useEffect, useState } from 'react';
import { Stack, Redirect, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/src/config/toastConfig';
import { authService } from '@/src/services/auth/AuthService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useAppStore } from '@/src/store/useAppStore';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { handleError } from '@/src/utils/errorHandler';
import { databaseInitializer } from '@/src/services/DatabaseInitializer';
import { versionCheckService, VersaoInfo } from '@/src/services/VersionCheckService';
import { PushNotificationService } from '@/src/services/PushNotificationService';
import { apiClient } from '@/src/services/api/ApiClient';
import AtualizacaoScreen from './atualizacao';

export default function RootLayout() {
  const { auth, setAuth } = useAppStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const [versaoInfo, setVersaoInfo] = useState<VersaoInfo | null>(null);
  const [verificandoVersao, setVerificandoVersao] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🎬 RootLayout montado, iniciando app...');
    console.log('📊 Estado inicial do auth:', { isLoading: auth.isLoading, isAuthenticated: auth.isAuthenticated });
    
    initializeApp();

    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('🔗 Deep link recebido:', url);
      
      if (url.includes('tracetrip://tarefas')) {
        if (auth.isAuthenticated) {
          router.push('/tarefas');
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [auth.isAuthenticated]);

  const initializeApp = async () => {
    try {
      setAuth({ isLoading: true });
      console.log('🚀 Iniciando inicialização do app...');
      setInitializationError(null);
      
      try {
        console.log('📦 Inicializando banco de dados...');
        await Promise.race([
          databaseInitializer.initialize(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na inicialização do banco de dados')), 5000)
          )
        ]);
        console.log('✅ Banco de dados inicializado');
      } catch (dbError: any) {
        console.error('⚠️ Erro ao inicializar banco de dados (continuando mesmo assim):', dbError);
        setInitializationError('Aviso: Problema ao inicializar banco de dados local');
      }
      
      await checkAuth();
    } catch (error: any) {
      console.error('❌ Erro na inicialização do app:', error);
      setInitializationError(error?.message || 'Erro desconhecido na inicialização');
      setAuth({ isLoading: false, isAuthenticated: false });
    }
  };

  const verificarVersao = async () => {
    try {
      setVerificandoVersao(true);
      const info = await versionCheckService.verificarAtualizacao();
      
      if (info && info.precisaAtualizar) {
        setVersaoInfo(info);
        console.log('[RootLayout] Atualização necessária:', info);
      }
    } catch (error) {
      console.error('[RootLayout] Erro ao verificar versão:', error);
      // Não bloqueia o app se houver erro na verificação
    } finally {
      setVerificandoVersao(false);
    }
  };

  useEffect(() => { }, []);

  const checkAuth = async () => {
    try {
      console.log('🔐 Verificando autenticação...');
      setAuth({ isLoading: true });

      let storedAuth;
      try {
        storedAuth = await Promise.race([
          authService.getStoredAuth(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao ler autenticação armazenada')), 3000)
          )
        ]);
      } catch (authReadError) {
        console.error('⚠️ Erro ao ler autenticação armazenada:', authReadError);
        storedAuth = null;
      }

      if (storedAuth && storedAuth.token) {
        console.log('🔑 Token encontrado, validando...');
        try {
          const isValid = await Promise.race([
            authService.validateToken(storedAuth.token),
            new Promise<boolean>((resolve) => 
              setTimeout(() => {
                console.warn('⚠️ Timeout na validação do token - assumindo inválido');
                resolve(false);
              }, 8000)
            )
          ]);

          if (isValid) {
            console.log('✅ Token válido, autenticando usuário');
            setAuth({
              user: storedAuth.user,
              token: storedAuth.token,
              isAuthenticated: true,
              isLoading: false
            });
            
            apiClient.setToken(storedAuth.token);
            
            setTimeout(() => {
              verificarVersao().catch(err => {
                console.error('Erro ao verificar versão:', err);
              });
            }, 1000);
            
            setTimeout(async () => {
              try {
                console.log('📱 Inicializando push notifications (OneSignal)...');
                const token = await PushNotificationService.initialize();
                if (token) {
                  console.log('✅ Push notifications (OneSignal) inicializado com sucesso');
                  await PushNotificationService.tentarRegistrarTokenNovamente();
                  
                  if (storedAuth?.user?.id) {
                    await PushNotificationService.setExternalUserId(storedAuth.user.id.toString());
                    await PushNotificationService.diagnosticarEstado();
                  }
                } else {
                  console.log('ℹ️  Aguardando token OneSignal...');
                  if (storedAuth?.user?.id) {
                    setTimeout(async () => {
                      await PushNotificationService.setExternalUserId(storedAuth.user.id.toString());
                      await PushNotificationService.diagnosticarEstado();
                    }, 3000);
                  }
                }
              } catch (err) {
                console.error('❌ Erro ao inicializar push notifications (não bloqueante):', err);
              }
            }, 2000);
          } else {
            console.log('❌ Token inválido, fazendo logout');
            try {
              await authService.logout();
            } catch (logoutError) {
              console.error('Erro ao fazer logout:', logoutError);
            }
            setAuth({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        } catch (tokenError) {
          console.error('⚠️ Erro ao validar token (continuando sem autenticação):', tokenError);
          try {
            await authService.logout();
          } catch (logoutError) {
            console.error('Erro ao fazer logout:', logoutError);
          }
          setAuth({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      } else {
        console.log('ℹ️ Nenhum token encontrado, usuário não autenticado');
        setAuth({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
      setAuth({ isLoading: false, isAuthenticated: false });
    }
  };

  const handleGlobalError = (error: Error) => {
    handleError(error);
  };

  // Se houver atualização obrigatória, mostrar tela de atualização
  if (versaoInfo && versaoInfo.atualizacaoObrigatoria) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <AtualizacaoScreen versaoInfo={versaoInfo} />
        <StatusBar style="light" />
      </ErrorBoundary>
    );
  }

  if (auth.isLoading || verificandoVersao) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#254985" />
        <Text style={styles.loadingText}>Carregando...</Text>
        {initializationError && (
          <Text style={styles.errorText}>{initializationError}</Text>
        )}
        <Text style={styles.debugText}>
          {auth.isLoading ? 'Verificando autenticação...' : ''}
          {verificandoVersao ? 'Verificando versão...' : ''}
        </Text>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            console.log('⏭️ Usuário pulou o loading');
            setAuth({ isLoading: false, isAuthenticated: false });
            setVerificandoVersao(false);
          }}
        >
          <Text style={styles.skipButtonText}>Pular</Text>
        </TouchableOpacity>
      </View>
    );
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
        <Stack.Screen name="atualizacao" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tarefas" />
        <Stack.Screen name="nova-despesa" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nova-ocorrencia" options={{ presentation: 'modal' }} />
        <Stack.Screen name="nova-reserva" options={{ presentation: 'modal' }} />
        <Stack.Screen name="agendas/[id]" />
        <Stack.Screen name="rotas/[id]" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
      <Toast config={toastConfig} />
      {/* Modal de atualização opcional (não obrigatória) */}
      {versaoInfo && !versaoInfo.atualizacaoObrigatoria && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}>
          <AtualizacaoScreen 
            versaoInfo={versaoInfo} 
            onClose={() => setVersaoInfo(null)}
          />
        </View>
      )}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  skipButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
});