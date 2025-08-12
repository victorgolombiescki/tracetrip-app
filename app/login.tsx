import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { authService } from '@/src/services/auth/AuthService';
import { useAppStore } from '@/src/store/useAppStore';
import { apiClient } from '@/src/services/api/ApiClient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido').min(1, 'E-mail é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const { auth, setAuth } = useAppStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [auth.isAuthenticated]);

  const { control, handleSubmit, formState: { errors }, watch } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'contato@traceai.com.br',
      senha: '',
    }
  });

  const emailVal = watch('email');

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      const result = await authService.login(data.email, data.senha);
      setAuth({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('network') || error.message?.includes('fetch')) {
        Toast.show({
          type: 'error',
          text1: 'Erro de Conexão',
          text2: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
          position: 'top',
          visibilityTime: 4000,
        });
      } else if (error.status === 401 || error.statusCode === 401 || error.message?.includes('unauthorized') || error.message?.includes('credenciais')) {
        Toast.show({
          type: 'error',
          text1: 'Credenciais Inválidas',
          text2: 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.',
          position: 'top',
          visibilityTime: 5000,
          topOffset: 60,
        });
        

      } else if (error.status === 500 || error.status >= 500) {
        Toast.show({
          type: 'error',
          text1: 'Erro do Servidor',
          text2: 'Ocorreu um erro interno no servidor. Tente novamente em alguns instantes.',
          position: 'top',
          visibilityTime: 4000,
        });
      } else if (error.status === 0 || error.status === 'ECONNREFUSED') {
        Toast.show({
          type: 'error',
          text1: 'Serviço Indisponível',
          text2: 'O serviço está temporariamente indisponível. Tente novamente em alguns instantes.',
          position: 'top',
          visibilityTime: 4000,
        });
      } else {
        const errorMessage = error.message || 'Ocorreu um erro inesperado. Tente novamente.';
        Toast.show({
          type: 'error',
          text1: 'Erro de Login',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (auth.isLoading || auth.isAuthenticated) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.statusBarBackground, { height: insets.top }]} />
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Bem-vindo ao TraceTrip</Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>E-mail</Text>
                    <View style={[styles.inputWrapper, emailVal ? styles.inputValid : null]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Digite seu e-mail"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                      />
                      {emailVal && (
                        <Text style={styles.validIcon}>✓</Text>
                      )}
                    </View>
                    {errors.email && (
                      <Text style={styles.errorText}>{errors.email.message}</Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="senha"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Senha</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Digite sua senha"
                        secureTextEntry
                      />
                    </View>
                    {errors.senha && (
                      <Text style={styles.errorText}>{errors.senha.message}</Text>
                    )}
                  </View>
                )}
              />

              <View style={styles.optionsContainer}>
                <TouchableOpacity onPress={() => setResetOpen(true)} style={{ marginTop: 8 }}>
                  <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Carregando...' : 'Acessar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
          <View style={styles.modalBackdrop}>
            <Pressable style={{ flex: 1 }} onPress={() => setResetOpen(false)} />
            <View style={styles.resetSheet}>
              <Text style={styles.resetTitle}>Recuperar senha</Text>
              <Text style={styles.resetHint}>Informe seu e-mail para enviarmos o link de redefinição.</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  placeholder="seuemail@dominio.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {resetError ? <Text style={styles.resetErrorText}>{resetError}</Text> : null}
              <TouchableOpacity
                style={[styles.loginButton, { marginTop: 12 }]}
                onPress={async () => {
                  try {
                    const email = resetEmail.trim();
                    if (!email) {
                      setResetError('Informe o e-mail.');
                      return;
                    }
                    
                    setResetError(null); 
                    const resp = await apiClient.solicitarTrocaSenhaLogin(email);
                    
                    if (!resp.success) {
                      const apiMsg = resp.message || (resp.data as any)?.message || 'Falha ao solicitar';
                      setResetError(apiMsg);
                      return;
                    }
                    
                    Alert.alert('Enviado', 'Se o e-mail existir, enviaremos instruções para redefinir sua senha.');
                    setResetOpen(false);
                    setResetEmail('');
                    setResetError(null);
                  } catch (e: any) {
                    if (e.code === 'NETWORK_ERROR' || e.message?.includes('network') || e.message?.includes('fetch')) {
                      setResetError('Erro de conexão. Verifique sua internet e tente novamente.');
                    } else if (e.status === 0 || e.status === 'ECONNREFUSED') {
                      setResetError('Serviço indisponível. Tente novamente em alguns instantes.');
                    } else if (e.status === 500 || e.status >= 500) {
                      setResetError('Erro interno do servidor. Tente novamente.');
                    } else {
                      setResetError(e?.message || 'Não foi possível enviar a solicitação.');
                    }
                  }
                }}
              >
                <Text style={styles.loginButtonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    backgroundColor: '#1E40AF',
    zIndex: 1,
  },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backButton: { padding: 8 },
  backIcon: { fontSize: 24, color: '#111827' },
  content: { flex: 1, paddingHorizontal: 32, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#1E40AF', textAlign: 'center', marginBottom: 40 },
  form: { gap: 24 },
  inputContainer: { gap: 8 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 12 },
  inputValid: { borderBottomColor: '#10B981' },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  validIcon: { fontSize: 16, color: '#10B981', fontWeight: '700' },
  errorText: { fontSize: 14, color: '#EF4444' },
  optionsContainer: { flexDirection: 'column', alignItems: 'flex-start' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  checkboxIcon: { fontSize: 12, color: 'white', fontWeight: '700' },
  checkboxText: { fontSize: 14, color: '#6B7280' },
  forgotPassword: { fontSize: 14, color: '#1E40AF', fontWeight: '600' },
  loginButton: { backgroundColor: '#1E40AF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  loginButtonDisabled: { backgroundColor: '#9CA3AF' },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  resetSheet: { backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  resetTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  resetHint: { color: '#6B7280', marginTop: 4, marginBottom: 10 },
  resetErrorText: { color: '#DC2626', marginTop: 4 },
});