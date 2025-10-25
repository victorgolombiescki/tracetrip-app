import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, useWindowDimensions, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, X, ArrowLeft, CheckSquare, Square, RotateCcw } from 'lucide-react-native';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { RotasApi } from '@/src/services/api/modules/rotas';
import { DespesasApi } from '@/src/services/api/modules/despesas';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppStore } from '@/src/store/useAppStore';

interface RotaSimples {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  isCurrent?: boolean;
}

const despesaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  categoria: z.string().transform((v) => (v && v.trim().length > 0 ? v : 'outros')),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  moeda: z.string(),
  data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data no formato dd/mm/aaaa'),
  rotaId: z.string().min(1, 'Rota é obrigatória'),
});

type DespesaForm = z.infer<typeof despesaSchema>;

export default function NovaDespesaScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [keyComprovante, setKeyComprovante] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [rotas, setRotas] = useState<RotaSimples[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [canEditCategory, setCanEditCategory] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const { currentRoute } = useAppStore();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleClose = () => {
    if (cameraOpen) {
      setCameraOpen(false);
      return;
    }
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

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<DespesaForm>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      titulo: '',
      categoria: '',
      valor: 0,
      moeda: 'BRL',
      data: new Date().toLocaleDateString('pt-BR'),
      rotaId: '',
    }
  });

  React.useEffect(() => {
    loadRotas();
    const timer = setTimeout(() => {
      if (!manualMode && !imageUri) {
        openCamera();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const loadRotas = async () => {
    try {
      const response = await RotasApi.getRotasSimples();
      console.log('response', response);
      if (response.success) {
        const rotas = (response.data || []) as RotaSimples[];
        
        const activeRotas = rotas.filter((rota) => 
          rota.status === 'em_andamento' || rota.status === 'concluida' || rota.status === 'ativa' || rota.status === 'passada'
        );
        
        setRotas(activeRotas);
        
        const rotaAtual = activeRotas.find(rota => rota.isCurrent === true);
        
        if (rotaAtual) {
          setValue('rotaId', rotaAtual.id);
        } 
        else if (activeRotas.length > 0) {
          setValue('rotaId', activeRotas[0].id);
        }
      }
    } catch (e) {
    }
  };


  const requestLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para anexar comprovantes.');
      return false;
    }
    return true;
  };

  const openCamera = async () => {
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
        return;
      }
    }
    setCameraOpen(true);
  };

  const captureImage = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setCameraOpen(false);
        setImageUri(photo.uri);
        await processOCR(photo.uri);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível capturar a foto.');
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestLibraryPermission();
    if (!hasPermission) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      await processOCR(result.assets[0].uri);
    }
  };

  const formatDateMask = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    return parts.join('/');
  };

  const toISODate = (ddmmyyyy: string) => {
    const [dd, mm, yyyy] = ddmmyyyy.split('/');
    if (!dd || !mm || !yyyy) return ddmmyyyy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  };

  const parseDDMMYYYYtoDate = (ddmmyyyy: string): Date => {
    const [dd, mm, yyyy] = (ddmmyyyy || '').split('/');
    if (!dd || !mm || !yyyy) return new Date();
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formatDateToDDMMYYYY = (d: Date): string => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };

  const normalizeCategoria = (c: string): 'alimentacao' | 'transporte' | 'hospedagem' | 'combustivel' | 'outros' => {
    const name = (c || '').toLowerCase();
    if (name.includes('almo') || name.includes('rest') || name.includes('lanche') || name.includes('food')) return 'alimentacao';
    if (name.includes('uber') || name.includes('99') || name.includes('taxi') || name.includes('transp')) return 'transporte';
    if (name.includes('hotel') || name.includes('hosp')) return 'hospedagem';
    if (name.includes('post') || name.includes('comb') || name.includes('gas')) return 'combustivel';
    return 'outros';
  };

  const mapTipoToCategoria = (t: string): 'alimentacao' | 'transporte' | 'hospedagem' | 'combustivel' | 'outros' => {
    if (!t) return 'outros';
    const s = t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    if (s.includes('aliment') || s === 'alimentacao') return 'alimentacao';
    if (s.includes('transp') || s === 'transporte') return 'transporte';
    if (s.includes('hosped') || s === 'hospedagem') return 'hospedagem';
    if (s.includes('combust') || s === 'combustivel') return 'combustivel';
    return 'outros';
  };

  const mapCategoriaToTipoDisplay = (cat: 'alimentacao' | 'transporte' | 'hospedagem' | 'combustivel' | 'outros'): string => {
    switch (cat) {
      case 'alimentacao': return 'ALIMENTAÇÃO';
      case 'transporte': return 'TRANSPORTE';
      case 'hospedagem': return 'HOSPEDAGEM';
      case 'combustivel': return 'COMBUSTÍVEL';
      default: return 'OUTROS';
    }
  };

  const processOCR = async (imageUri: string) => {
    try {
      setOcrLoading(true);

      const form = new FormData();
      form.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'comprovante.jpg',
      } as any);

      const resp = await DespesasApi.processImage(form);
      if (resp.success && resp.data) {
        const result = resp.data as any;

        if (result.keyComprovante) {
          setKeyComprovante(String(result.keyComprovante));
        }

        const valorStr = result.valor ?? result.amount;
        if (valorStr) {
          const parsed = Number(String(valorStr).replace(',', '.'));
          if (!isNaN(parsed)) setValue('valor', parsed);
        }

        const dataStr = result.data ?? result.date;
        if (dataStr) {
          const d = new Date(dataStr);
          if (!isNaN(d.getTime())) setValue('data', d.toLocaleDateString('pt-BR'));
        }

        const nome = result.nome ?? result.merchant;
        if (nome) setValue('titulo', String(nome));

        const tipo = result.tipo ?? result.category;
        if (tipo) setValue('categoria', mapTipoToCategoria(String(tipo)));
      }
    } catch (error) {
    } finally {
      setOcrLoading(false);
    }
  };

  const onSubmit = async (data: DespesaForm) => {
    try {
      setLoading(true);

      const categoriaInterna = normalizeCategoria(data.categoria || '');
      const tipoDisplay = mapCategoriaToTipoDisplay(categoriaInterna);

      const despesa = {
        valor: Number(data.valor),
        nome: data.titulo,
        data: toISODate(data.data),
        hora: new Date().toTimeString().slice(0, 5),
        tipo: tipoDisplay,
        keyComprovante: keyComprovante || undefined,
      };

      const viagemId = Number(data.rotaId);
      const response = await DespesasApi.createWithViagem(viagemId, despesa);

      if (!response.success) {
        throw new Error(response.message || 'Erro ao criar despesa');
      }

      Toast.show({ type: 'success', text1: 'Despesa salva', text2: 'Registro concluído com sucesso.' });
      setTimeout(() => router.back(), 900);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a despesa');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyBRL = (input: number | string): string => {
    if (typeof input === 'number' && !isNaN(input)) {
      return input.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    const raw = String(input ?? '');

    if (/[\.,]/.test(raw)) {
      const normalized = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(normalized)) {
        return normalized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
    }

    const digits = raw.replace(/\D/g, '');
    const intVal = parseInt(digits || '0', 10);
    const value = intVal / 100;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrencyBRLToNumber = (text: string): number => {
    if (!text) return 0;
    const normalizedStr = text
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.');
    const asNumber = parseFloat(normalizedStr);
    if (!isNaN(asNumber)) return asNumber;

    const digits = (text || '').replace(/\D/g, '');
    const intVal = parseInt(digits || '0', 10);
    return intVal / 100;
  };

  const categorias = [
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'hospedagem', label: 'Hospedagem' },
    { value: 'combustivel', label: 'Combustível' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {ocrLoading && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingSpinner}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        </View>
      )}
      <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.heroTitle}>Nova Despesa</Text>
            <Text style={styles.heroSubtitle}>Registre seu comprovante</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: footerHeight + Math.max(insets.bottom, 16) + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Comprovante</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, manualMode && styles.actionBtnDisabled]}
              onPress={openCamera}
              disabled={manualMode}
            >
              <Camera size={20} color={manualMode ? '#94A3B8' : '#2563EB'} />
              <Text style={[styles.actionText, manualMode && styles.actionTextDisabled]}>Fotografar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, manualMode && styles.actionBtnDisabled]}
              onPress={pickFromGallery}
              disabled={manualMode}
            >
              <Upload size={20} color={manualMode ? '#94A3B8' : '#2563EB'} />
              <Text style={[styles.actionText, manualMode && styles.actionTextDisabled]}>Anexar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.manualRow} onPress={() => setManualMode((v) => !v)}>
            {manualMode ? <CheckSquare size={18} color="#2563EB" /> : <Square size={18} color="#64748B" />}
            <Text style={[styles.manualText, manualMode && { color: '#2563EB', fontWeight: '600' }]}>Não tenho acesso ao comprovante (preencher manualmente)</Text>
          </TouchableOpacity>

          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity 
                onPress={() => setImageUri(null)}
                style={styles.removeImageButton}
              >
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : null}
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informações da Despesa</Text>

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
                {errors.rotaId && (
                  <Text style={styles.errorText}>{errors.rotaId.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="titulo"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Título"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.titulo?.message}
                placeholder="Ex: Almoço de negócios"
                required
              />
            )}
          />

          <Controller
            control={control}
            name="categoria"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Categoria</Text>
                <Input
                  label=""
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.categoria?.message}
                  placeholder="(preenchido automaticamente)"
                  editable={canEditCategory}
                />
                <TouchableOpacity style={styles.manualRow} onPress={() => setCanEditCategory((v) => !v)}>
                  {canEditCategory ? <CheckSquare size={18} color="#2563EB" /> : <Square size={18} color="#64748B" />}
                  <Text style={[styles.manualText, canEditCategory && { color: '#2563EB', fontWeight: '600' }]}>Alterar categoria</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={[styles.inputRow, width < 420 && styles.inputRowStack]}>
            <Controller
              control={control}
              name="valor"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Valor"
                  value={formatCurrencyBRL(value)}
                  onChangeText={(text) => onChange(parseCurrencyBRLToNumber(text))}
                  onBlur={onBlur}
                  error={errors.valor?.message}
                  placeholder="R$ 0,00"
                  keyboardType="numeric"
                  required
                  style={styles.halfInput}
                />
              )}
            />

            <Controller
              control={control}
              name="data"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setShowDatePicker(true)}>
                    <Input
                      label="Data"
                      value={value}
                      editable={false}
                      onBlur={onBlur}
                      error={errors.data?.message}
                      placeholder="dd/mm/aaaa"
                      required
                      style={styles.halfInput}
                    />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={parseDDMMYYYYtoDate(value)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                      onChange={(event: any, selectedDate?: Date) => {
                        if (Platform.OS !== 'ios') setShowDatePicker(false);
                        if (selectedDate) {
                          onChange(formatDateToDDMMYYYY(selectedDate));
                        } 
                      }}
                    />
                  )}
                </>
              )}
            />
          </View>
        </Card>
      </ScrollView>

      <View onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)} style={[
        styles.fixedFooter,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
        }
      ]}>
        <Button
          title={loading ? 'Salvando...' : 'Salvar Despesa'}
          onPress={handleSubmit(onSubmit as any)}
          loading={loading}
          disabled={loading}
        />
      </View>

      <Modal visible={cameraOpen} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <TouchableOpacity style={styles.cameraClose} onPress={() => setCameraOpen(false)}>
                <X size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.cameraActions}>
                <TouchableOpacity style={styles.shutterButton} onPress={captureImage} />
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      <Modal visible={routePickerOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Selecione a rota</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {rotas.map((rota) => {
                return (
                  <TouchableOpacity 
                    key={rota.id} 
                    style={[
                      styles.optionRow,
                      rota.isCurrent && styles.optionRowCurrent
                    ]} 
                    onPress={() => { setValue('rotaId', rota.id); setRoutePickerOpen(false); }}
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
                          Status: {rota.status === 'em_andamento' || rota.status === 'ativa' ? 'Em Andamento' : 'Concluída'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  processingSpinner: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 16,
    borderRadius: 12,
  },
  hero: { 
    paddingHorizontal: 20, 
    paddingTop: 8, 
    paddingBottom: 16, 
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    marginBottom: 16,
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputRowStack: { flexDirection: 'column' },
  halfInput: { flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37,99,235,0.06)',
  },
  actionBtnDisabled: { borderColor: '#E2E8F0', backgroundColor: '#F1F5F9' },
  actionText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  actionTextDisabled: { color: '#94A3B8', fontWeight: '500', fontSize: 13 },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  manualText: { color: '#64748B', fontSize: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    letterSpacing: -0.3,
    textTransform: 'uppercase'
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  selectBox: { 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 8, 
    backgroundColor: 'white', 
    paddingVertical: 10, 
    paddingHorizontal: 12 
  },
  selectContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { color: '#333333', fontSize: 14 },
  selectPlaceholder: { color: '#94A3B8', fontSize: 14 },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedFooter: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'white', 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraClose: { alignSelf: 'flex-end', margin: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999, padding: 8 },
  cameraActions: { alignItems: 'center', marginBottom: 24 },
  shutterButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#333333', marginBottom: 12, textAlign: 'center' },
  optionRow: { paddingVertical: 10, paddingHorizontal: 4 },
  optionText: { fontSize: 14, color: '#333333' },
  optionRowCurrent: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 8,
    padding: 8,
  },
  optionTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTextCurrent: {
    color: '#2563EB',
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
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
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  optionDetails: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  optionStatus: {
    fontSize: 11,
    color: '#64748B',
  },
});