import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Linking, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Ocorrencia, Rota } from '@/src/types';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Mic, Square, Settings, AlertCircle } from 'lucide-react-native';
import { AudioModule, useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { RotasApi } from '@/src/services/api/modules/rotas';
import { OcorrenciasApi } from '@/src/services/api/modules/ocorrencias';
import Toast from 'react-native-toast-message';
import { useAppStore } from '@/src/store/useAppStore';

interface RotaSimples {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  isCurrent?: boolean;
}

const ocorrenciaSchema = z.object({
  descricao: z.string().min(5, 'Descreva brevemente a ocorrência'),
  rotaId: z.string().min(1, 'Rota é obrigatória'),
});

type OcorrenciaForm = z.infer<typeof ocorrenciaSchema>;

export default function NovaOcorrenciaScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [rotas, setRotas] = useState<RotaSimples[]>([]);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'checking'>('checking');
  const [transcribing, setTranscribing] = useState(false);
  const { currentRoute } = useAppStore();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<OcorrenciaForm>({
    resolver: zodResolver(ocorrenciaSchema),
    defaultValues: {
      descricao: '',
      rotaId: '',
    }
  });

  useEffect(() => {
    checkPermissions();
    loadRotas();
  }, []);

  const checkPermissions = async () => {
    try {
      setPermissionStatus('checking');

      const status = await AudioModule.requestRecordingPermissionsAsync();

      if (status.granted) {
        setPermissionStatus('granted');

        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      setPermissionStatus('denied');
    }
  };

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Permissão Necessária',
        'Para gravar áudio, o TraceTrip precisa de permissão para acessar o microfone.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Configurações',
            onPress: () => {
              Linking.openSettings();
            }
          },
          {
            text: 'Tentar Novamente',
            onPress: checkPermissions
          }
        ]
      );
    } else {
      Alert.alert(
        'Permissão Necessária',
        'Para gravar áudio, vá em Configurações > TraceTrip > Microfone e ative a permissão.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Configurações',
            onPress: () => {
              Linking.openSettings();
            }
          }
        ]
      );
    }
  };

  const handleClose = () => {
    if (routePickerOpen) {
      setRoutePickerOpen(false);
      return;
    }
    if ((router as any).canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const loadRotas = async () => {
    try {
      const resp = await RotasApi.getRotasSimples();

      if (resp.success) {
        const rotas = (resp.data || []) as RotaSimples[];

        setRotas(rotas);

        const rotaAtual = rotas.find(rota => rota.isCurrent === true);
        
        if (rotaAtual) {
          setValue('rotaId', rotaAtual.id);
        } 
        else if (rotas.length > 0) {
          setValue('rotaId', rotas[0].id);
        }
      }
    } catch (e) {}
  };

  const startRecording = async () => {
    try {
      if (permissionStatus !== 'granted') {
        await checkPermissions();
        await new Promise(resolve => setTimeout(resolve, 500));

        if (permissionStatus === 'denied' || permissionStatus === 'checking') {
          requestPermission();
          return;
        }
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setAudioUri(null);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível iniciar a gravação. Verifique as permissões.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!isRecording) {
        return;
      }

      await audioRecorder.stop();

      const recorderState = audioRecorder.getStatus();

      setIsRecording(false);

      if (recorderState && recorderState.url) {
        const uri = recorderState.url;
        setAudioUri(uri);
        setTranscribing(true);

        try {
          const resp = await OcorrenciasApi.transcribeAudio(uri);
          if (resp.success && resp.data?.text) {
            const current = getValues('descricao') || '';
            const transcriptionText = resp.data.text;

            const next = current ? `${current}\n\nTranscrição do áudio:\n${transcriptionText}` : transcriptionText;

            setValue('descricao', next, { shouldDirty: true });
            Toast.show({ type: 'success', text1: 'Transcrição concluída', text2: 'Texto inserido na descrição.' });
          } else {
            Toast.show({ type: 'error', text1: 'Erro na transcrição', text2: resp.message || 'Não foi possível transcrever o áudio.' });
          }
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Erro na transcrição', text2: 'Ocorreu um erro durante a transcrição.' });
        } finally {
          setTranscribing(false);
        }
      } else {
        Toast.show({ type: 'error', text1: 'Erro na gravação', text2: 'Não foi possível obter o arquivo de áudio.' });
      }
    } catch (e) {
      setTranscribing(false);
      Alert.alert('Erro', 'Erro ao parar a gravação.');
    }
  };

  const onSubmit = async (data: OcorrenciaForm) => {
    try {
      setLoading(true);

      const resp = await OcorrenciasApi.create(Number(data.rotaId), data.descricao);
      if (!resp.success) {
        Toast.show({ type: 'error', text1: 'Erro ao registrar', text2: resp.message || 'Não foi possível registrar a ocorrência.' });
        return;
      }

      Toast.show({ type: 'success', text1: 'Ocorrência registrada' });
      setTimeout(() => router.back(), 300);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Erro ao registrar', text2: 'Não foi possível registrar a ocorrência.' });
    } finally {
      setLoading(false);
    }
  };

  const renderPermissionStatus = () => {
    if (permissionStatus === 'checking') {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Verificando permissões...</Text>
        </View>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Permissão de microfone negada</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Settings size={16} color="#2563EB" />
            <Text style={styles.permissionButtonText}>Configurar Permissão</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {transcribing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingModal}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.processingTitle}>Aguarde...</Text>
            <Text style={styles.processingSubtitle}>Processando transcrição do áudio</Text>
          </View>
        </View>
      )}

      <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.heroTitle}>Nova Ocorrência</Text>
            <Text style={styles.heroSubtitle}>Grave o áudio e descreva o ocorrido</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.formSection}>
          <Text style={styles.sectionTitle}>Áudio</Text>

          {renderPermissionStatus()}

          <View style={styles.audioRow}>
            <TouchableOpacity
              style={[
                styles.audioBtn,
                isRecording && styles.audioBtnActive,
                permissionStatus !== 'granted' && styles.audioBtnDisabled
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={permissionStatus !== 'granted'}
            >
              {isRecording ? <Square size={18} color="#fff" /> : <Mic size={18} color={permissionStatus === 'granted' ? "#2563EB" : "#9CA3AF"} />}
              <Text style={[
                styles.audioText,
                isRecording && { color: '#fff' },
                permissionStatus !== 'granted' && { color: '#9CA3AF' }
              ]}>
                {isRecording ? 'Parar' : 'Gravar áudio'}
              </Text>
            </TouchableOpacity>
          </View>

          {audioUri ? (
            <View style={styles.audioInfoContainer}>
              <Text style={styles.audioInfo}>Arquivo: {typeof audioUri === 'string' ? audioUri.split('/').pop() : 'gravação'}</Text>
            </View>
          ) : null}
        </Card>

        <Card style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informações</Text>

          <Controller
            control={control}
            name="rotaId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Rota</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setRoutePickerOpen(true)}>
                  <View style={styles.selectContent}>
                    <Text style={value ? styles.selectText : styles.selectPlaceholder}>
                      {value ? `${rotas.find(r => r.id === value)?.nome}` : 'Selecione uma rota'}
                    </Text>
                    {value && rotas.find(r => r.id === value)?.isCurrent && (
                      <View style={styles.currentBadgeSmall}>
                        <Text style={styles.currentBadgeTextSmall}>Atual</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                {!value && rotas.length > 0 && (
                  <View style={styles.noRouteSelectedWarning}>
                    <AlertCircle size={16} color="#F59E0B" />
                    <Text style={styles.noRouteSelectedText}>
                      Selecione uma rota para continuar
                    </Text>
                  </View>
                )}
                {!value && rotas.length === 0 && (
                  <View style={styles.noRouteSelectedWarning}>
                    <AlertCircle size={16} color="#F59E0B" />
                    <Text style={styles.noRouteSelectedText}>
                      Nenhuma rota disponível. Defina uma rota atual na tela de Rotas.
                    </Text>
                  </View>
                )}
                {errors.rotaId && <Text style={styles.errorText}>{errors.rotaId.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="descricao"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.descricao?.message}
                placeholder="Descreva o que aconteceu..."
                multiline
                numberOfLines={4}
                style={styles.textArea}
                required
              />
            )}
          />
        </Card>
      </ScrollView>

      <View style={[
        styles.fixedFooter,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
        }
      ]}>
        <Button
          title={loading ? 'Registrando...' : 'Registrar Ocorrência'}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          variant="danger"
        />
      </View>

      <Modal visible={routePickerOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Selecione a rota</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {rotas.length > 0 ? (
                rotas.map((rota) => (
                  <TouchableOpacity
                    key={rota.id}
                    style={[
                      styles.optionRow,
                      rota.isCurrent && styles.optionRowCurrent
                    ]}
                    onPress={() => {
                      setValue('rotaId', rota.id);
                      setRoutePickerOpen(false);
                    }}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.optionTextContainer}>
                        <Text style={[
                          styles.optionText,
                          rota.isCurrent && styles.optionTextCurrent
                        ]}>
                          {rota.nome}
                        </Text>
                        {rota.isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Atual</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.optionDetails}>
                        <Text style={styles.optionStatus}>
                          Status: {rota.status === 'em_andamento' ? 'Em Andamento' : 'Concluída'}
                        </Text>
                        <Text style={styles.optionDate}>
                          {rota.dataInicio ? new Date(rota.dataInicio).toLocaleDateString('pt-BR') : 'Data não definida'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noRotasContainer}>
                  <Text style={styles.noRotasText}>
                    Nenhuma rota disponível para ocorrência
                  </Text>
                  <Text style={styles.noRotasSubtext}>
                    As rotas devem estar em andamento ou concluídas
                  </Text>
                </View>
              )}
            </ScrollView>
            <Button title="Fechar" onPress={() => setRoutePickerOpen(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { 
    paddingHorizontal: 20, 
    paddingTop: 8, 
    paddingBottom: 16, 
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { 
    padding: 7, 
    borderRadius: 10, 
    backgroundColor: 'rgba(255,255,255,0.15)' 
  },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },

  content: { flex: 1, padding: 20, paddingBottom: 100 },
  formSection: { 
    marginTop: 16, 
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333333', 
    marginBottom: 12,
    letterSpacing: -0.3,
    textTransform: 'uppercase'
  },

  inputContainer: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  selectBox: { 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 8, 
    backgroundColor: 'white', 
    paddingVertical: 10, 
    paddingHorizontal: 12 
  },
  selectText: { color: '#333333', fontSize: 14 },
  selectPlaceholder: { color: '#94A3B8', fontSize: 14 },
  textArea: { height: 100, textAlignVertical: 'top' },
  errorText: { fontSize: 11, color: '#DC2626', marginTop: 4 },

  audioRow: { flexDirection: 'row', gap: 10 },
  audioBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 10, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#2563EB', 
    backgroundColor: 'rgba(37,99,235,0.06)' 
  },
  audioBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  audioBtnDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', opacity: 0.7 },
  audioText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  audioInfo: { marginTop: 8, color: '#64748B', fontSize: 12 },
  audioInfoContainer: {
    marginTop: 8,
  },

  fixedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#333333', marginBottom: 12, textAlign: 'center' },
  optionRow: { paddingVertical: 10, paddingHorizontal: 4 },
  optionText: { fontSize: 14, color: '#333333' },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionDetails: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  optionStatus: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  optionDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  noRotasContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noRotasText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 6,
  },
  noRotasSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  permissionContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  permissionText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },

  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingModal: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%'
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
  },
  processingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  noRouteSelectedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  noRouteSelectedText: {
    fontSize: 11,
    color: '#F59E0B',
    marginLeft: 6,
  },
  optionRowCurrent: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  optionTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTextCurrent: {
    color: '#2563EB',
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentBadgeSmall: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeTextSmall: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});