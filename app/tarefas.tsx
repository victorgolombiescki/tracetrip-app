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
} from 'lucide-react-native';
import { PendenciasApi, Pendencia } from '@/src/services/api/modules/pendencias';
import { apiClient } from '@/src/services/api/ApiClient';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function TarefasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<Pendencia | null>(null);
  const [kmValue, setKmValue] = useState('');
  const [salvando, setSalvando] = useState(false);

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

  const handleRegistrarKm = (pendencia: Pendencia) => {
    setPendenciaSelecionada(pendencia);
    setKmValue('');
    setModalVisible(true);
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

      const veiculoId = pendenciaSelecionada.dadosAdicionais?.veiculoId || 
                       pendenciaSelecionada.reservaVeiculo?.veiculoId;

      if (!veiculoId) {
        throw new Error('ID do veículo não encontrado');
      }

      await apiClient.createHistoricoKm(veiculoId, {
        kmRegistrado: km,
        observacoes: `Registrado via pendência - Reserva #${pendenciaSelecionada.reservaVeiculoId}`
      });

      if (pendenciaSelecionada.reservaVeiculoId) {
        await apiClient.updateReservaKmFinal(pendenciaSelecionada.reservaVeiculoId, km);
      }

      await PendenciasApi.concluirPendencia(pendenciaSelecionada.id);

      Toast.show({
        type: 'success',
        text1: 'KM registrado',
        text2: 'O KM foi registrado com sucesso'
      });

      setModalVisible(false);
      setPendenciaSelecionada(null);
      setKmValue('');
      loadPendencias();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível registrar o KM');
    } finally {
      setSalvando(false);
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
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XCircle size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {pendenciaSelecionada && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Veículo</Text>
                  <Text style={styles.modalInfoValue}>
                    {pendenciaSelecionada.dadosAdicionais?.marca} {pendenciaSelecionada.dadosAdicionais?.modelo} - {pendenciaSelecionada.dadosAdicionais?.placa}
                  </Text>
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>KM Atual</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={kmValue}
                    onChangeText={setKmValue}
                    placeholder="Ex: 50000"
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setModalVisible(false)}
                    disabled={salvando}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave]}
                    onPress={handleSalvarKm}
                    disabled={salvando}
                  >
                    {salvando ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonSaveText}>Salvar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
});






