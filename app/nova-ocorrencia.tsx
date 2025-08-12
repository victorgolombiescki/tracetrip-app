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
import { ArrowLeft, Mic, Square, Settings } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { RotasApi } from '@/src/services/api/modules/rotas';
import { OcorrenciasApi } from '@/src/services/api/modules/ocorrencias';
import Toast from 'react-native-toast-message';

interface RotaSimples {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  status: string;
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

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const isRecording = !!recording;

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

      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

        if (hasPermission) {
          setPermissionStatus('granted');
          return;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permissão de Microfone',
            message: 'O TraceTrip precisa acessar o microfone para gravar áudio das ocorrências.',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );


        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('granted');
        } else {
          setPermissionStatus('denied');
        }
      } else {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.granted) {
          setPermissionStatus('granted');
        } else {
          setPermissionStatus('denied');
        }
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
        const rotas = resp.data || [];

        setRotas(rotas);

        if (rotas.length > 0) {
          setValue('rotaId', rotas[0].id);
        }
      }
    } catch (e) {
      console.error('🔍 Erro ao carregar rotas', e);
    }
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

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const { Recording } = Audio;
      const rec = new Recording();

      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      await rec.startAsync();

      setRecording(rec);
      setAudioUri(null);
    } catch (e) {
      console.error('🔍 Error details:', JSON.stringify(e, null, 2));
      Alert.alert('Erro', 'Não foi possível iniciar a gravação. Verifique as permissões.');
    }
  };

  const stopRecording = async () => {
    try {

      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setAudioUri(uri || null);

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (uri) {
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
          console.error('🔍 Transcription error:', error);
          Toast.show({ type: 'error', text1: 'Erro na transcrição', text2: 'Ocorreu um erro durante a transcrição.' });
        } finally {
          setTranscribing(false);
        }
      }
    } catch (e) {
      console.error('🔍 Error stopping recording:', e);
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
      console.error('🔍 Erro ao registrar ocorrência:', e);
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
            <Settings size={16} color="#1E40AF" />
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
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text style={styles.processingTitle}>Aguarde...</Text>
            <Text style={styles.processingSubtitle}>Processando transcrição do áudio</Text>
          </View>
        </View>
      )}

      <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
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
              {isRecording ? <Square size={18} color="#fff" /> : <Mic size={18} color={permissionStatus === 'granted' ? "#1E40AF" : "#9CA3AF"} />}
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
              <Text style={styles.audioInfo}>Arquivo: {audioUri.split('/').pop()}</Text>
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
                  <Text style={value ? styles.selectText : styles.selectPlaceholder}>
                    {value ? `${rotas.find(r => r.id === value)?.nome}` : 'Selecione uma rota'}
                  </Text>
                </TouchableOpacity>
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
                    style={styles.optionRow}
                    onPress={() => {
                      setValue('rotaId', rota.id);
                      setRoutePickerOpen(false);
                    }}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionText}>
                        {rota.nome}
                      </Text>
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
  hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomRightRadius: 28 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)' },

  content: { flex: 1, padding: 16, paddingBottom: 96 },
  formSection: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  selectBox: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 12 },
  selectText: { color: '#111827', fontSize: 16 },
  selectPlaceholder: { color: '#9CA3AF', fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#DC2626', marginTop: 4 },

  audioRow: { flexDirection: 'row', gap: 12 },
  audioBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1E40AF', backgroundColor: '#EEF2FF' },
  audioBtnActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  audioBtnDisabled: { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB', opacity: 0.7 },
  audioText: { color: '#1E40AF', fontWeight: '700' },
  audioInfo: { marginTop: 8, color: '#6B7280' },
  audioInfoContainer: {
    marginTop: 8,
  },

  fixedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  optionRow: { paddingVertical: 12 },
  optionText: { fontSize: 16, color: '#111827' },
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
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 2,
  },
  optionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noRotasContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noRotasText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  noRotasSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  permissionContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
  },

  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});