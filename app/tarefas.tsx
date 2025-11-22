import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ClipboardList,
  Car,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Upload,
} from 'lucide-react-native';
import { PendenciasApi, Pendencia } from '@/src/services/api/modules/pendencias';
import { apiClient } from '@/src/services/api/ApiClient';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

export default function TarefasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<Pendencia | null>(null);
  const [kmValue, setKmValue] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ultimoKm, setUltimoKm] = useState<number | null>(null);
  const [carregandoUltimoKm, setCarregandoUltimoKm] = useState(false);
  const [fotosCarro, setFotosCarro] = useState<Array<{ uri: string; key?: string }>>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    loadPendencias();
  }, []);

  const loadPendencias = async () => {
    try {
      setLoading(true);
      const response = await PendenciasApi.getPendencias('PENDENTE');

      if (response.success && response.data) {
        setPendencias(response.data);
      } else {
        setError(response.message || 'Erro ao carregar pendências');
      }
    } catch (err) {
      setError('Erro ao carregar pendências');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarKm = async (pendencia: Pendencia) => {
    setPendenciaSelecionada(pendencia);
    setKmValue('');
    setImageUri(null);
    setOcrLoading(false);
    setUltimoKm(null);
    setFotosCarro([]);
    setObservacoes('');
    setCarregandoUltimoKm(true);
    setModalVisible(true);

    try {
      const veiculoId = pendencia.dadosAdicionais?.veiculoId || 
                       pendencia.reservaVeiculo?.veiculoId;

      if (veiculoId) {
        const historicosResponse = await apiClient.getHistoricosKm(veiculoId);
        const historicos = historicosResponse.success && historicosResponse.data ? historicosResponse.data : [];
        
        if (historicos.length > 0) {
          const historicosOrdenadosPorKm = [...historicos].sort((a: any, b: any) => 
            parseFloat(b.kmRegistrado) - parseFloat(a.kmRegistrado)
          );
          setUltimoKm(parseFloat(historicosOrdenadosPorKm[0].kmRegistrado));
        } else {
          const kmInicial = (pendencia.dadosAdicionais as any)?.kmInicial || 
                           (pendencia.reservaVeiculo?.veiculo as any)?.kmInicial || 
                           (pendencia.reservaVeiculo?.veiculo as any)?.kmAtual || 0;
          setUltimoKm(typeof kmInicial === 'number' ? kmInicial : parseFloat(String(kmInicial || 0)));
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar o último KM',
      });
    } finally {
      setCarregandoUltimoKm(false);
    }
  };

  const processarOcrDaImagem = async (uri: string) => {
    try {
      setOcrLoading(true);
      setImageUri(uri);

      const formData = new FormData();
      const filename = uri.split('/').pop() || 'foto.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type,
      } as any);

      const response = await apiClient.processarOcrKm(formData);

      if (response.success && response.data?.km) {
        setKmValue(response.data.km.toString());
        Toast.show({
          type: 'success',
          text1: 'KM extraído',
          text2: `KM detectado: ${response.data.km.toLocaleString('pt-BR')}`,
        });
      } else {
        Toast.show({
          type: 'info',
          text1: 'KM não encontrado',
          text2: 'Digite o KM manualmente',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao processar',
        text2: 'Não foi possível extrair o KM. Digite manualmente.',
      });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleTirarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar a câmera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processarOcrDaImagem(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera');
    }
  };

  const handleSelecionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar a galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processarOcrDaImagem(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria');
    }
  };

  const handleAdicionarFotoCarro = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFotosCarro([...fotosCarro, { uri: result.assets[0].uri }]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a foto');
    }
  };

  const handleTirarFotoCarro = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar a câmera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFotosCarro([...fotosCarro, { uri: result.assets[0].uri }]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível tirar a foto');
    }
  };

  const handleRemoverFotoCarro = (index: number) => {
    setFotosCarro(fotosCarro.filter((_, i) => i !== index));
  };

  const handleSalvarKm = async () => {
    if (!pendenciaSelecionada) return;

    const km = parseFloat(kmValue.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(km) || km <= 0) {
      Alert.alert('Erro', 'Por favor, informe um valor de KM válido');
      return;
    }

    try {
      setSalvando(true);
      setUploadingFotos(true);

      const veiculoId = pendenciaSelecionada.dadosAdicionais?.veiculoId || 
                       pendenciaSelecionada.reservaVeiculo?.veiculoId;

      if (!veiculoId) {
        throw new Error('ID do veículo não encontrado');
      }

      if (ultimoKm !== null && km < ultimoKm) {
        Alert.alert(
          'Erro',
          `KM registrado não pode ser menor que o último KM registrado (${ultimoKm.toLocaleString('pt-BR')})`
        );
        setSalvando(false);
        setUploadingFotos(false);
        return;
      }

      const reservaId = pendenciaSelecionada.reservaVeiculoId;

      let fotoOdometroUrl: string | undefined;

      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'odometro.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('file', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          name: filename,
          type,
        } as any);

        const uploadResult = await apiClient.uploadFotoOdometro(veiculoId, formData);
        if (uploadResult.success) {
          fotoOdometroUrl = uploadResult.data.key;
        }
      }

      if (fotosCarro.length > 0 && reservaId) {
        for (const foto of fotosCarro) {
          if (!foto.key) {
            const formData = new FormData();
            const filename = foto.uri.split('/').pop() || 'foto.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            
            formData.append('file', {
              uri: foto.uri,
              name: filename,
              type,
            } as any);

            const uploadResult = await apiClient.uploadFotoReserva(reservaId, formData);
            if (uploadResult.success) {
              foto.key = uploadResult.data.key;
            }
          }
        }
      }

      if (observacoes.trim() && reservaId) {
        await apiClient.atualizarObservacoesReserva(reservaId, observacoes.trim());
      }

      await apiClient.createHistoricoKm(veiculoId, {
        kmRegistrado: km,
        observacoes: `Registrado via pendência - Reserva #${reservaId}`,
        fotoOdometro: fotoOdometroUrl
      });

      if (reservaId) {
        await apiClient.updateReservaKmFinal(reservaId, km);
      }

      Alert.alert(
        'Atualizar data/hora de fim?',
        'Deseja atualizar a data e hora de fim da reserva para o momento atual?',
        [
          {
            text: 'Não',
            style: 'cancel',
            onPress: async () => {
              await PendenciasApi.concluirPendencia(pendenciaSelecionada.id, false);
              Toast.show({
                type: 'success',
                text1: 'KM registrado',
                text2: 'O KM foi registrado com sucesso',
              });
              setModalVisible(false);
              setPendenciaSelecionada(null);
              setKmValue('');
              setImageUri(null);
              setFotosCarro([]);
              setObservacoes('');
              loadPendencias();
            },
          },
          {
            text: 'Sim',
            onPress: async () => {
              await PendenciasApi.concluirPendencia(pendenciaSelecionada.id, true);
              Toast.show({
                type: 'success',
                text1: 'KM registrado',
                text2: 'O KM foi registrado e a reserva foi atualizada',
              });
              setModalVisible(false);
              setPendenciaSelecionada(null);
              setKmValue('');
              setImageUri(null);
              setFotosCarro([]);
              setObservacoes('');
              loadPendencias();
            },
          },
        ]
      );

    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível registrar o KM');
    } finally {
      setSalvando(false);
      setUploadingFotos(false);
    }
  };

  const handleCancelar = async (pendencia: Pendencia) => {
    Alert.alert(
      'Cancelar Pendência',
      'Tem certeza que deseja cancelar esta pendência?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            try {
              await PendenciasApi.cancelarPendencia(pendencia.id);
              Toast.show({
                type: 'success',
                text1: 'Pendência cancelada',
                text2: 'A pendência foi cancelada com sucesso'
              });
              loadPendencias();
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível cancelar a pendência');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#254985" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPendencias}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#254985', '#254985']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tarefas</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {pendencias.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Nenhuma pendência</Text>
            <Text style={styles.emptyText}>Você não possui pendências no momento</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {pendencias.length} {pendencias.length === 1 ? 'pendência' : 'pendências'}
            </Text>
            {pendencias.map((pendencia) => (
              <View key={pendencia.id} style={styles.pendenciaCard}>
                <View style={styles.pendenciaHeader}>
                  <View style={styles.pendenciaIconContainer}>
                    <Car size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.pendenciaContent}>
                    <Text style={styles.pendenciaTitle}>{pendencia.titulo}</Text>
                    {pendencia.descricao && (
                      <Text style={styles.pendenciaDescription}>{pendencia.descricao}</Text>
                    )}
                    {pendencia.reservaVeiculo && (
                      <View style={styles.veiculoInfo}>
                        <Text style={styles.veiculoText}>
                          {pendencia.reservaVeiculo.veiculo?.marca} {pendencia.reservaVeiculo.veiculo?.modelo} - {pendencia.reservaVeiculo.veiculo?.placa}
                        </Text>
                        <View style={styles.dateInfo}>
                          <Clock size={14} color="#6B7280" />
                          <Text style={styles.dateText}>
                            {new Date(pendencia.reservaVeiculo.dataFim).toLocaleDateString('pt-BR')} às {pendencia.reservaVeiculo.horarioFim}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.pendenciaActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleCancelar(pendencia)}
                  >
                    <XCircle size={18} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => handleRegistrarKm(pendencia)}
                  >
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Registrar KM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar KM</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setFotosCarro([]);
                setObservacoes('');
              }}>
                <XCircle size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {pendenciaSelecionada && (
                <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Veículo</Text>
                  <Text style={styles.modalInfoValue}>
                    {pendenciaSelecionada.dadosAdicionais?.marca} {pendenciaSelecionada.dadosAdicionais?.modelo} - {pendenciaSelecionada.dadosAdicionais?.placa}
                  </Text>
                </View>

                <View style={styles.modalInputContainer}>
                  <View style={styles.kmHeader}>
                    <Text style={styles.modalInputLabel}>KM Atual</Text>
                    {carregandoUltimoKm ? (
                      <View style={styles.ultimoKmContainer}>
                        <ActivityIndicator size="small" color="#6B7280" />
                        <Text style={styles.ultimoKmText}>Carregando último KM...</Text>
                      </View>
                    ) : ultimoKm !== null ? (
                      <Text style={styles.ultimoKmText}>
                        Último KM: {ultimoKm.toLocaleString('pt-BR')}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handleTirarFoto}
                      disabled={ocrLoading}
                    >
                      {ocrLoading ? (
                        <ActivityIndicator size="small" color="#254985" />
                      ) : (
                        <>
                          <Camera size={18} color="#254985" />
                          <Text style={styles.photoButtonText}>Tirar Foto</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handleSelecionarFoto}
                      disabled={ocrLoading}
                    >
                      {ocrLoading ? (
                        <ActivityIndicator size="small" color="#254985" />
                      ) : (
                        <>
                          <Upload size={18} color="#254985" />
                          <Text style={styles.photoButtonText}>Galeria</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  {imageUri && (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => {
                          setImageUri(null);
                          setKmValue('');
                        }}
                      >
                        <XCircle size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <TextInput
                    style={[
                      styles.modalInput,
                      ultimoKm !== null && kmValue && parseFloat(kmValue.replace(/[^\d,]/g, '').replace(',', '.')) < ultimoKm && styles.modalInputError
                    ]}
                    value={kmValue}
                    onChangeText={setKmValue}
                    placeholder="Ex: 50000"
                    keyboardType="numeric"
                    autoFocus
                    editable={!ocrLoading}
                  />
                  {ultimoKm !== null && kmValue && parseFloat(kmValue.replace(/[^\d,]/g, '').replace(',', '.')) < ultimoKm && (
                    <Text style={styles.errorText}>
                      O KM não pode ser menor que {ultimoKm.toLocaleString('pt-BR')}
                    </Text>
                  )}
                </View>

                <View style={styles.checklistSection}>
                  <Text style={styles.checklistTitle}>Checklist do Veículo</Text>
                  
                  <View style={styles.fotosSection}>
                    <Text style={styles.fotosLabel}>Fotos do Carro</Text>
                    <View style={styles.fotosActions}>
                      <TouchableOpacity
                        style={styles.fotoButton}
                        onPress={handleTirarFotoCarro}
                        disabled={uploadingFotos}
                      >
                        <Camera size={16} color="#254985" />
                        <Text style={styles.fotoButtonText}>Tirar Foto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.fotoButton}
                        onPress={handleAdicionarFotoCarro}
                        disabled={uploadingFotos}
                      >
                        <Upload size={16} color="#254985" />
                        <Text style={styles.fotoButtonText}>Adicionar</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {fotosCarro.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosList}>
                        {fotosCarro.map((foto, index) => (
                          <View key={index} style={styles.fotoItem}>
                            <Image source={{ uri: foto.uri }} style={styles.fotoPreview} />
                            <TouchableOpacity
                              style={styles.removeFotoButton}
                              onPress={() => handleRemoverFotoCarro(index)}
                            >
                              <XCircle size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>

                  <View style={styles.observacoesSection}>
                    <Text style={styles.observacoesLabel}>Observações (opcional)</Text>
                    <TextInput
                      style={styles.observacoesInput}
                      value={observacoes}
                      onChangeText={setObservacoes}
                      placeholder="Adicione observações sobre o estado do veículo..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
                </>
              )}
            </ScrollView>

            {pendenciaSelecionada && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setModalVisible(false);
                    setFotosCarro([]);
                    setObservacoes('');
                  }}
                  disabled={salvando || uploadingFotos}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSalvarKm}
                  disabled={salvando || uploadingFotos || !kmValue}
                >
                  {(salvando || uploadingFotos) ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonSaveText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#254985',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  pendenciaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pendenciaHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pendenciaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pendenciaContent: {
    flex: 1,
  },
  pendenciaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pendenciaDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  veiculoInfo: {
    marginTop: 8,
  },
  veiculoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  pendenciaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#254985',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingBottom: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  kmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ultimoKmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ultimoKmText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  modalInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonSave: {
    backgroundColor: '#254985',
  },
  modalButtonSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  photoButtonText: {
    color: '#254985',
    fontWeight: '600',
    fontSize: 14,
  },
  ocrButton: {
    backgroundColor: '#254985',
    borderColor: '#254985',
  },
  ocrButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 4,
  },
  checklistSection: {
    marginTop: 24,
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  fotosSection: {
    marginBottom: 20,
  },
  fotosLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fotosActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#254985',
    backgroundColor: '#F0F4FF',
    gap: 6,
  },
  fotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#254985',
  },
  fotosList: {
    marginTop: 8,
  },
  fotoItem: {
    position: 'relative',
    marginRight: 12,
  },
  fotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeFotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  observacoesSection: {
    marginTop: 16,
  },
  observacoesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  observacoesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 100,
    textAlignVertical: 'top',
  },
});






