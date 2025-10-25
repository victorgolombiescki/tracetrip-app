import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Users, Wallet, Map, Check, X, AlertCircle } from 'lucide-react-native';
import { Card } from '@/src/components/ui/Card';
import { RotasApi } from '@/src/services/api/modules/rotas';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { handleError } from '@/src/utils/errorHandler';
import ErrorBoundary from '@/src/components/ErrorBoundary';

interface RotaItem {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  orcamento: number;
  totalDespesas: number;
  restante: number;
  quantidadeUsuarios: number;
  quantidadeDias: number;
  status: 'futuras' | 'em_andamento' | 'passadas';
  finalizarViagem: boolean | null;
  finalizarViagemData?: string | null;
  isCurrent?: boolean;
}

export default function RotasScreen() {
  const [rotas, setRotas] = useState<RotaItem[]>([]);
  const [filter, setFilter] = useState<'futuras' | 'em_andamento' | 'passadas'>('futuras');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<RotaItem | null>(null);
  const [finalizingTrip, setFinalizingTrip] = useState(false);
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  const [settingCurrentRoute, setSettingCurrentRoute] = useState(false);
  const fetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastFocusTimeRef = useRef(0);
  
  useEffect(() => {
    retryCountRef.current = 0;
    loadRotas(true);
  }, [filter]);
  
  useEffect(() => {
    if (rotas.length > 0) {
      const currentRoute = rotas.find(route => route.isCurrent === true);
      if (currentRoute) {
        setCurrentRouteId(currentRoute.id);
      } else if (filter === 'em_andamento' && rotas.length > 0) {
        setCurrentRouteId(rotas[0].id);
      }
    }
  }, [rotas, filter]);
  
  const fetchCurrentRoute = async () => {
    try {
      const response = await RotasApi.getCurrentRoute();
      
      if (response.success && response.data) {
        setCurrentRouteId(response.data.id);
      }
    } catch (error) {}
  };

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      if (now - lastFocusTimeRef.current < 1000) {
        return;
      }
      
      lastFocusTimeRef.current = now;
      retryCountRef.current = 0;
      
      setLoading(true);
      setPage(1);
      setRotas([]);
      
      loadRotas(true);
      
      return () => {
        retryCountRef.current = 0;
      };
    }, [filter]) 
  );

  const loadRotas = async (reset: boolean = false) => {
    if (fetchingRef.current) return;
    
    if (retryCountRef.current > 2) {
      setNetworkError(true);
      return;
    }
    
    fetchingRef.current = true;
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
        setNetworkError(false);
        
        if (rotas.length > 0) {
          setRotas([]);
        }
      } else {
        setLoadingMore(true);
      }

      let apiFilters: { status?: 'todas' | 'futuras' | 'em_andamento' | 'passadas' };
      
      if (filter === 'em_andamento') {
        apiFilters = { status: 'todas' };
      } else {
        apiFilters = { status: filter };
      }
      
      const resp = await RotasApi.list(apiFilters, reset ? 1 : page, 10);
      
      if (!resp || !resp.success) {
        throw new Error(resp?.message || 'Falha ao carregar rotas');
      }
      
      const data = resp.data;

      let items: RotaItem[] = data.items || [];
      
      if (filter === 'em_andamento') {
        items = items.filter(item => {
          if (item.status === 'em_andamento') {
            return true;
          }
          
          if (item.status === 'passadas' && (item.finalizarViagem === false || item.finalizarViagem === null)) {
            return true;
          }
          
          return false;
        });
      } else if (filter === 'passadas') {
        items = items.filter(item => 
          item.status === 'passadas' && item.finalizarViagem === true
        );
      } else if (filter === 'futuras') {
        items = items.filter(item => item.status === 'futuras');
      }

      if (reset) {
        setRotas(items);
      } else {
        setRotas(prev => [...prev, ...items]);
      }

      setHasMore(data.meta?.currentPage < data.meta?.totalPages);
      setPage(data.meta?.currentPage + 1);
      
      retryCountRef.current = 0;
      
    } catch (error) {
      retryCountRef.current += 1;
      handleError(error, 'Não foi possível carregar as rotas');
      setNetworkError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  };

  const onEndReached = () => {
    if (!loading && !loadingMore && hasMore && !networkError) {
      loadRotas(false);
    }
  };

  const handleRetry = () => {
    retryCountRef.current = 0;
    setNetworkError(false);
    loadRotas(true);
  };
  
  const handleFinalizarPressed = (trip: RotaItem) => {
    setSelectedTrip(trip);
    setShowFinalizarModal(true);
  };
  
  const handleConfirmFinalizarTrip = async () => {
    if (!selectedTrip) return;
    
    setFinalizingTrip(true);
    try {
      await RotasApi.finalizarViagem(selectedTrip.id);
      
      const updatedRotas = rotas.map(rota => 
        rota.id === selectedTrip.id 
          ? { ...rota, finalizarViagem: true, finalizarViagemData: new Date().toISOString() } 
          : rota
      );
      
      setRotas(updatedRotas);
      setShowFinalizarModal(false);
      setSelectedTrip(null);
      
      loadRotas(true);
    } catch (error) {
      handleError(error, 'Erro ao finalizar a viagem');
    } finally {
      setFinalizingTrip(false);
    }
  };
  
  const handleSetCurrentRoute = async (routeId: string) => {
    if (routeId === currentRouteId || settingCurrentRoute) return;
    
    setSettingCurrentRoute(true);
    try {
      await RotasApi.setCurrentRoute(routeId);
      
      setCurrentRouteId(routeId);
      
      setRotas(prev => prev.map(rota => ({
        ...rota,
        isCurrent: rota.id === routeId
      })));
      
    } catch (error) {
      handleError(error, 'Erro ao definir rota atual');
    } finally {
      setSettingCurrentRoute(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      date.setHours(date.getHours() - 3);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };
  
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    } catch (e) {
      return `R$ ${value}`;
    }
  };

  const getStatusTheme = (item: RotaItem) => {
    if (item.status === 'futuras') {
      return { bg: '#DBEAFE', fg: '#1D4ED8' };
    }
    
    if (item.status === 'em_andamento' || (item.status === 'passadas' && item.finalizarViagem === null)) {
      return { bg: '#D1FAE5', fg: '#047857' }; 
    }
    
    return { bg: '#E5E7EB', fg: '#374151' };
  };

  const renderRota = ({ item }: { item: RotaItem }) => {
    const theme = getStatusTheme(item);
    const usadoPct = item.orcamento > 0 ? Math.min(100, Math.round((item.totalDespesas / item.orcamento) * 100)) : 0;

    return (
      <TouchableOpacity 
        onPress={() => router.push({ pathname: '/rotas/[id]', params: { id: item.id } })}
        activeOpacity={0.9}
      >
        <Card style={styles.rotaCard}>
          <View style={styles.cardContent}>
            <View style={styles.rotaHeader}>
              <Text style={styles.routeTitle}>{item.nome}</Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}> 
                <Text style={[styles.statusText, { color: theme.fg }]}>
                  {item.status === 'futuras' ? 'Futura' : 
                    (item.status === 'em_andamento' || (item.status === 'passadas' && item.finalizarViagem === null)) ? 'Em Andamento' : 'Passada'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.metaText}>{formatDate(item.dataInicio)} - {formatDate(item.dataFim)} ({item.quantidadeDias} dias)</Text>
              </View>
              <View style={styles.metaItem}>
                <Users size={16} color="#6B7280" />
                <Text style={styles.metaText}>{item.quantidadeUsuarios} participantes</Text>
              </View>
              
              {item.status === 'passadas' && item.finalizarViagem === true && item.finalizarViagemData && (
                <View style={styles.metaItem}>
                  <Check size={16} color="#059669" />
                  <Text style={[styles.metaText, styles.finalizadaText]}>
                    Finalizada em {formatDate(item.finalizarViagemData)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.budgetRow}>
              <View style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>Orçamento</Text>
                <Text style={styles.budgetValue}>{formatCurrency(item.orcamento)}</Text>
              </View>
              <View style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>Despesas</Text>
                <Text style={[styles.budgetValue, { color: '#DC2626' }]}>{formatCurrency(item.totalDespesas)}</Text>
              </View>
              <View style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>Restante</Text>
                <Text style={[styles.budgetValue, { color: '#059669' }]}>{formatCurrency(item.restante)}</Text>
              </View>
            </View>

            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${usadoPct}%` }]} />
              </View>
              <Text style={styles.progressText}>{usadoPct}% do orçamento utilizado</Text>
            </View>
          </View>
          
          {(item.status === 'em_andamento' || (item.status === 'passadas' && (item.finalizarViagem === null || item.finalizarViagem === false))) && (
            <View style={styles.finalizeTripBtnContainer}>
              <View style={[styles.tripActionsRow, { alignItems: 'center', justifyContent: 'center' }]}>
                {filter === 'em_andamento' && (
                  <TouchableOpacity
                    style={[
                      styles.currentRouteBadge, 
                      item.isCurrent && styles.currentRouteBadgeActive,
                      { width: '80%' }
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleSetCurrentRoute(item.id);
                    }}
                    activeOpacity={0.1}
                    disabled={settingCurrentRoute}
                  >
                    <View style={styles.currentRouteIcon}>
                      <Map size={12} color={item.isCurrent ? "#FFFFFF" : "#254985"} />
                    </View>
                    <Text style={[
                      styles.currentRouteBadgeText,
                      item.isCurrent && styles.currentRouteBadgeActiveText
                    ]}>
                      {item.isCurrent ? "Rota Atual" : "Definir como Atual"}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.finalizeTripBtn, 
                    filter === 'em_andamento' && styles.finalizeTripBtnWithMargin,
                    filter !== 'em_andamento' && { width: '80%' }
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleFinalizarPressed(item);
                  }}
                  activeOpacity={0.8}
                >
                  <Check size={14} color="#047857" />
                  <Text style={styles.finalizeTripBtnText}>Finalizar Viagem</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroTitleContainer}>
              <View style={styles.heroIconContainer}>
                <Map size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.heroTitle}>Minhas Rotas</Text>
                <Text style={styles.heroSubtitle}>Gerencie suas viagens corporativas</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity 
                style={styles.heroActionButton}
                activeOpacity={0.7}
              >
                <Wallet size={18} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.heroActionButton}
                activeOpacity={0.7}
              >
                <Calendar size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.filters}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'futuras' && styles.filterButtonActive]}
            onPress={() => {
              setFilter('futuras');
              setLoading(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'futuras' && styles.filterTextActive]}>Futuras</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'em_andamento' && styles.filterButtonActive]}
            onPress={() => {
              setFilter('em_andamento');
              setLoading(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'em_andamento' && styles.filterTextActive]}>Em Andamento</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'passadas' && styles.filterButtonActive]}
            onPress={() => {
              setFilter('passadas');
              setLoading(true);
            }}
          >
            <Text style={[styles.filterText, filter === 'passadas' && styles.filterTextActive]}>Passadas</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando rotas...</Text>
          </View>
        ) : networkError ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Falha na conexão</Text>
            <Text style={styles.emptySubtext}>
              Não foi possível carregar as rotas. Verifique sua conexão com a internet.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : rotas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma rota encontrada</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'futuras' ? 'Você não tem viagens futuras agendadas' :
               filter === 'em_andamento' ? 'Você não tem viagens em andamento' :
               'Você não tem viagens passadas'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={rotas}
            renderItem={renderRota}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.15}
            ListFooterComponent={loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>Carregando mais...</Text>
              </View>
            ) : null}
          />
        )}
      </SafeAreaView>
      
      <Modal
        visible={showFinalizarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinalizarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Finalizar Viagem</Text>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setShowFinalizarModal(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <AlertCircle size={32} color="#F59E0B" style={styles.modalIcon} />
              <Text style={styles.modalMessage}>
                Deseja realmente finalizar esta viagem?
              </Text>
              {selectedTrip && (
                <Text style={styles.modalTripName}>
                  {selectedTrip.nome}
                </Text>
              )}
              <Text style={styles.modalWarning}>
                Esta ação não pode ser desfeita e a viagem será movida para "Passadas".
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowFinalizarModal(false)}
                disabled={finalizingTrip}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={handleConfirmFinalizarTrip}
                disabled={finalizingTrip}
              >
                {finalizingTrip ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Finalizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { 
    paddingHorizontal: 20, 
    paddingTop: 8, 
    paddingBottom: 16, 
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  heroTitle: { color: 'white', fontSize: 22, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroActionButton: {
    padding: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
  },
  filters: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    backgroundColor: 'white',
    marginBottom: 4,
  },
  filterButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderRadius: 20, 
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  filterButtonActive: { 
    backgroundColor: 'white',
    borderColor: '#2563EB'
  },
  filterText: { 
    textAlign: 'center', 
    fontSize: 12, 
    fontWeight: '500', 
    color: '#64748B' 
  },
  filterTextActive: { 
    color: '#2563EB', 
    fontWeight: '600' 
  },
  listContainer: { 
    padding: 20,
    paddingBottom: 100,
  },
  rotaCard: { 
    marginBottom: 4, 
    borderRadius: 8, 
    padding: 10, 
    backgroundColor: '#F5F9FF', 
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 0,
  },
  cardContent: {
    flex: 1,
    paddingBottom: 6,
  },
  rotaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  routeTitle: { fontSize: 14, fontWeight: '600', color: '#333333', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600' },
  metaRow: { 
    gap: 6, 
    marginBottom: 8, 
    flexDirection: 'column',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#6B7280' },
  finalizadaText: { color: '#059669', fontWeight: '500' },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  budgetItem: { flex: 1 },
  budgetLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  budgetValue: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  progressWrap: { marginTop: 8 },
  progressTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#2563EB' },
  progressText: { marginTop: 4, fontSize: 11, color: '#6B7280' },
  
  finalizeTripBtnContainer: { 
    marginTop: 10, 
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tripActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  finalizeTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    minHeight: 36,
    flex: 1,
  },
  finalizeTripBtnWithMargin: {
    marginLeft: 8,
  },
  finalizeTripBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  currentRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,99,235,0.06)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 36,
    flex: 1,
    gap: 6,
  },
  currentRouteBadgeActive: {
    backgroundColor: '#2563EB',
    borderColor: '#254985',
  },
  currentRouteIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  currentRouteBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  currentRouteBadgeActiveText: {
    color: '#FFFFFF',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalTripName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalWarning: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  retryButton: { marginTop: 12, backgroundColor: '#254985', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '600', fontSize: 14 },
});