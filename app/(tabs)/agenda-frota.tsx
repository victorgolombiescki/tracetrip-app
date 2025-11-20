import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar, Car, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { FrotaApi, type ReservaVeiculo, type Veiculo, type DisponibilidadeVeiculo } from '@/src/services/api/modules/frota';
import Toast from 'react-native-toast-message';

export default function AgendaFrotaScreen() {
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState<ReservaVeiculo[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [disponibilidadeVeiculos, setDisponibilidadeVeiculos] = useState<DisponibilidadeVeiculo[]>([]);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<'calendario' | 'veiculo'>('calendario');
  const [veiculoFiltro, setVeiculoFiltro] = useState<number | null>(null);
  const [modalReservasDia, setModalReservasDia] = useState(false);
  const [reservasDoDiaSelecionado, setReservasDoDiaSelecionado] = useState<ReservaVeiculo[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);

  useEffect(() => {
    carregarDados();
  }, [dataAtual, veiculoFiltro, visualizacaoAtiva]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const inicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
      const fim = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
      
      const inicioStr = inicio.toISOString().slice(0, 10);
      const fimStr = fim.toISOString().slice(0, 10);

      const [veiculosResp, reservasResp, disponibilidadeResp] = await Promise.all([
        FrotaApi.getVeiculos(),
        FrotaApi.getReservas({
          dataInicio: inicioStr,
          dataFim: fimStr,
          veiculoId: veiculoFiltro || undefined
        }),
        visualizacaoAtiva === 'veiculo' ? FrotaApi.getDisponibilidade({
          dataInicio: inicioStr,
          dataFim: fimStr,
          veiculoId: veiculoFiltro || undefined
        }) : Promise.resolve({ success: true, data: [] })
      ]);

      if (veiculosResp.success) {
        setVeiculos(veiculosResp.data || []);
      }

      if (reservasResp.success) {
        setReservas(reservasResp.data || []);
      }

      if (disponibilidadeResp.success && visualizacaoAtiva === 'veiculo') {
        setDisponibilidadeVeiculos(disponibilidadeResp.data || []);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: error.message || 'Erro ao carregar dados'
      });
    } finally {
      setLoading(false);
    }
  };

  const mudarMes = (direcao: number) => {
    const novaData = new Date(dataAtual);
    novaData.setMonth(novaData.getMonth() + direcao);
    setDataAtual(novaData);
  };

  const formatarMesAno = (data: Date) => {
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getDiasDoMes = () => {
    const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
    const dias: Date[] = [];
    
    const primeiroDiaSemana = primeiroDia.getDay();
    for (let i = 0; i < primeiroDiaSemana; i++) {
      dias.push(new Date(primeiroDia.getFullYear(), primeiroDia.getMonth(), -i));
    }
    
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), i));
    }
    
    return dias;
  };

  const getReservasNoDia = (data: Date): ReservaVeiculo[] => {
    const dataStr = data.toISOString().slice(0, 10);
    return reservas.filter(r => {
      const inicioStr = typeof r.dataInicio === 'string' ? r.dataInicio.split('T')[0] : new Date(r.dataInicio).toISOString().slice(0, 10);
      const fimStr = typeof r.dataFim === 'string' ? r.dataFim.split('T')[0] : new Date(r.dataFim).toISOString().slice(0, 10);
      return dataStr >= inicioStr && dataStr <= fimStr;
    });
  };

  const isToday = (data: Date): boolean => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataComparar = new Date(data);
    dataComparar.setHours(0, 0, 0, 0);
    return dataComparar.getTime() === hoje.getTime();
  };

  const formatarData = (data: Date): string => {
    return data.toISOString().slice(0, 10);
  };

  const abrirReservasDoDia = (data: Date) => {
    const reservas = getReservasNoDia(data);
    setReservasDoDiaSelecionado(reservas);
    setDataSelecionada(data);
    setModalReservasDia(true);
  };

  const formatarHorario = (horario: string) => {
    if (!horario) return '';
    return horario.length === 5 ? horario : horario.substring(0, 5);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.heroTitle}>Agenda de Frota</Text>
            <Text style={styles.heroSubtitle}>Gerencie reservas de veículos</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <View style={styles.header}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, visualizacaoAtiva === 'calendario' && styles.viewToggleBtnActive]}
            onPress={() => setVisualizacaoAtiva('calendario')}
          >
            <Calendar size={18} color={visualizacaoAtiva === 'calendario' ? '#fff' : '#254985'} />
            <Text style={[styles.viewToggleText, visualizacaoAtiva === 'calendario' && styles.viewToggleTextActive]}>
              Calendário
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, visualizacaoAtiva === 'veiculo' && styles.viewToggleBtnActive]}
            onPress={() => setVisualizacaoAtiva('veiculo')}
          >
            <Car size={18} color={visualizacaoAtiva === 'veiculo' ? '#fff' : '#254985'} />
            <Text style={[styles.viewToggleText, visualizacaoAtiva === 'veiculo' && styles.viewToggleTextActive]}>
              Por Veículo
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={() => mudarMes(-1)} style={styles.monthNavBtn}>
            <ChevronLeft size={20} color="#254985" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatarMesAno(dataAtual)}</Text>
          <TouchableOpacity onPress={() => mudarMes(1)} style={styles.monthNavBtn}>
            <ChevronRight size={20} color="#254985" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#254985" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : visualizacaoAtiva === 'calendario' ? (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.calendarGrid}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, idx) => (
              <View key={idx} style={styles.calendarDayName}>
                <Text style={styles.calendarDayNameText}>{dia}</Text>
              </View>
            ))}
            {getDiasDoMes().map((dia, idx) => {
              const reservasDoDia = getReservasNoDia(dia);
              const hoje = isToday(dia);
              const doMesAtual = dia.getMonth() === dataAtual.getMonth();
              
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calendarCell,
                    !doMesAtual && styles.calendarCellOutside,
                    hoje && styles.calendarCellToday
                  ]}
                  onPress={() => doMesAtual && abrirReservasDoDia(dia)}
                  disabled={!doMesAtual}
                >
                  <Text style={[
                    styles.calendarCellDate,
                    !doMesAtual && styles.calendarCellDateOutside,
                    hoje && styles.calendarCellDateToday
                  ]}>
                    {dia.getDate()}
                  </Text>
                  {reservasDoDia.length > 0 && (
                    <View style={styles.reservasContainer}>
                      {reservasDoDia.slice(0, 2).map((reserva) => (
                        <View key={reserva.id} style={styles.reservaPill}>
                          <Text style={styles.reservaHorario}>
                            {reserva.horarioInicio}-{reserva.horarioFim}
                          </Text>
                          <Text style={styles.reservaPlaca} numberOfLines={1}>
                            {reserva.veiculo?.placa || 'N/A'}
                          </Text>
                        </View>
                      ))}
                      {reservasDoDia.length > 2 && (
                        <Text style={styles.reservaMore}>+{reservasDoDia.length - 2}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
          {disponibilidadeVeiculos.map((veiculo) => (
            <View key={veiculo.veiculoId} style={styles.veiculoCard}>
              <View style={styles.veiculoHeader}>
                <Text style={styles.veiculoPlaca}>{veiculo.placa}</Text>
                <Text style={styles.veiculoModelo}>{veiculo.marca} {veiculo.modelo}</Text>
              </View>
              <View style={styles.disponibilidadeGrid}>
                {Object.entries(veiculo.disponibilidade).map(([dataStr, info]) => {
                  const data = new Date(dataStr);
                  const hoje = isToday(data);
                  
                  return (
                    <TouchableOpacity
                      key={dataStr}
                      style={[
                        styles.disponibilidadeDia,
                        info.disponivel && styles.disponibilidadeDiaDisponivel,
                        !info.disponivel && styles.disponibilidadeDiaOcupado,
                        hoje && styles.disponibilidadeDiaHoje
                      ]}
                    >
                      <Text style={styles.disponibilidadeDiaNumero}>{data.getDate()}</Text>
                      {info.ocupacao > 0 && (
                        <View style={styles.ocupacaoBar}>
                          <View style={[styles.ocupacaoFill, { width: `${info.ocupacao}%` }]} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalReservasDia} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {dataSelecionada ? dataSelecionada.toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }) : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalReservasDia(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {reservasDoDiaSelecionado.length === 0 ? (
                <View style={styles.emptyReservas}>
                  <Text style={styles.emptyReservasText}>Nenhuma reserva neste dia</Text>
                </View>
              ) : (
                reservasDoDiaSelecionado.map((reserva) => (
                  <View key={reserva.id} style={styles.reservaCard}>
                    <View style={styles.reservaCardHeader}>
                      <Text style={styles.reservaCardHorario}>
                        {formatarHorario(reserva.horarioInicio)} - {formatarHorario(reserva.horarioFim)}
                      </Text>
                      <View style={[styles.reservaStatusBadge, { 
                        backgroundColor: reserva.status === 'CONFIRMADA' ? '#D1FAE5' : 
                                         reserva.status === 'PENDENTE' ? '#FEF3C7' : 
                                         reserva.status === 'CANCELADA' ? '#FEE2E2' : '#EEF2FF'
                      }]}>
                        <Text style={[styles.reservaStatusText, {
                          color: reserva.status === 'CONFIRMADA' ? '#065F46' : 
                                 reserva.status === 'PENDENTE' ? '#92400E' : 
                                 reserva.status === 'CANCELADA' ? '#991B1B' : '#254985'
                        }]}>
                          {reserva.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reservaCardInfo}>
                      <View style={styles.reservaCardRow}>
                        <Car size={16} color="#64748B" />
                        <Text style={styles.reservaCardLabel}>Veículo:</Text>
                        <Text style={styles.reservaCardValue}>
                          {reserva.veiculo?.placa || 'N/A'} - {reserva.veiculo?.marca} {reserva.veiculo?.modelo}
                        </Text>
                      </View>
                      {reserva.usuario && (
                        <View style={styles.reservaCardRow}>
                          <Text style={styles.reservaCardLabel}>Responsável:</Text>
                          <Text style={styles.reservaCardValue}>{reserva.usuario.nome || reserva.usuario.email}</Text>
                        </View>
                      )}
                      {reserva.motivo && (
                        <View style={styles.reservaCardRow}>
                          <Text style={styles.reservaCardLabel}>Motivo:</Text>
                          <Text style={styles.reservaCardValue}>{reserva.motivo}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)'
  },
  heroTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700'
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#254985',
    backgroundColor: 'white'
  },
  viewToggleBtnActive: {
    backgroundColor: '#254985'
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#254985'
  },
  viewToggleTextActive: {
    color: '#fff'
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  monthNavBtn: {
    padding: 8
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textTransform: 'capitalize'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B'
  },
  content: {
    flex: 1,
    padding: 16
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  calendarDayName: {
    width: '14.28%',
    paddingVertical: 8,
    alignItems: 'center'
  },
  calendarDayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  calendarCell: {
    width: '14.28%',
    minHeight: 80,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: 'white'
  },
  calendarCellOutside: {
    backgroundColor: '#F9FAFB',
    opacity: 0.5
  },
  calendarCellToday: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2
  },
  calendarCellDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4
  },
  calendarCellDateOutside: {
    color: '#9CA3AF'
  },
  calendarCellDateToday: {
    color: '#92400E',
    fontWeight: '700'
  },
  reservasContainer: {
    gap: 2
  },
  reservaPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#254985'
  },
  reservaHorario: {
    fontSize: 9,
    fontWeight: '600',
    color: '#254985'
  },
  reservaPlaca: {
    fontSize: 8,
    color: '#64748B'
  },
  reservaMore: {
    fontSize: 9,
    color: '#254985',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2
  },
  veiculoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  veiculoHeader: {
    marginBottom: 12
  },
  veiculoPlaca: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4
  },
  veiculoModelo: {
    fontSize: 13,
    color: '#64748B'
  },
  disponibilidadeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  disponibilidadeDia: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  disponibilidadeDiaDisponivel: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981'
  },
  disponibilidadeDiaOcupado: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444'
  },
  disponibilidadeDiaHoje: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2
  },
  disponibilidadeDiaNumero: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333'
  },
  ocupacaoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8
  },
  ocupacaoFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
    textTransform: 'capitalize',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748B',
    fontWeight: '300',
  },
  modalScroll: {
    maxHeight: 400,
  },
  emptyReservas: {
    padding: 40,
    alignItems: 'center',
  },
  emptyReservasText: {
    fontSize: 14,
    color: '#64748B',
  },
  reservaCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reservaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reservaCardHorario: {
    fontSize: 16,
    fontWeight: '700',
    color: '#254985',
  },
  reservaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reservaStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reservaCardInfo: {
    gap: 8,
  },
  reservaCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  reservaCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  reservaCardValue: {
    fontSize: 13,
    color: '#333333',
    flex: 1,
  },
});

