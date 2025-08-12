import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Users, Wallet, Map } from 'lucide-react-native';
import { Card } from '@/src/components/ui/Card';
import { RotasApi } from '@/src/services/api/modules/rotas';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { tryCatch, handleError } from '@/src/utils/errorHandler';
import ErrorBoundary from '@/src/components/ErrorBoundary';

interface RotaItem {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  orcamento: number;
  totalDespesas: number;
  restante: number;
  quantidadeParticipantes: number;
  quantidadeDias: number;
  status: 'futuras' | 'em_andamento' | 'passadas';
}

export default function RotasScreen() {
  const [rotas, setRotas] = useState<RotaItem[]>([]);
  const [filter, setFilter] = useState<'futuras' | 'em_andamento' | 'passadas'>('futuras');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const fetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastFocusTimeRef = useRef(0);
  
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      // Evita múltiplas chamadas em um curto período de tempo (debounce)
      if (now - lastFocusTimeRef.current < 1000) {
        return;
      }
      
      lastFocusTimeRef.current = now;
      retryCountRef.current = 0;
      loadRotas(true);
      
      return () => {
        // Cleanup ao sair da tela
        retryCountRef.current = 0;
      };
    }, [filter])
  );

  const loadRotas = async (reset: boolean = false) => {
    // Evita requisições simultâneas ou em loop
    if (fetchingRef.current) return;
    
    // Limita o número de tentativas em caso de falha
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
      } else {
        setLoadingMore(true);
      }

      const filtros = { status: (filter as 'futuras' | 'em_andamento' | 'passadas') } as any;
      const resp = await RotasApi.list({ status: filtros.status }, reset ? 1 : page, 10);
      
      if (!resp || !resp.success) {
        throw new Error(resp?.message || 'Falha ao carregar rotas');
      }
      
      const data = resp.data;

      const items: RotaItem[] = data.items || [];

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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  const getStatusTheme = (status: RotaItem['status']) => {
    switch (status) {
      case 'futuras': return { bg: '#DBEAFE', fg: '#1D4ED8' };
      case 'em_andamento': return { bg: '#D1FAE5', fg: '#047857' }; 
      case 'passadas': return { bg: '#E5E7EB', fg: '#374151' }; 
      default: return { bg: '#E5E7EB', fg: '#374151' };
    }
  };

  const renderRota = ({ item }: { item: RotaItem }) => {
    const theme = getStatusTheme(item.status);
    const usadoPct = item.orcamento > 0 ? Math.min(100, Math.round((item.totalDespesas / item.orcamento) * 100)) : 0;

    return (
      <TouchableOpacity onPress={() => router.push({ pathname: '/rotas/[id]', params: { id: item.id } })}>
        <Card style={styles.rotaCard}>
          <View style={styles.rotaHeader}>
            <Text style={styles.routeTitle}>{item.nome}</Text>
            <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}> 
              <Text style={[styles.statusText, { color: theme.fg }]}>
                {item.status === 'futuras' ? 'Futura' : item.status === 'em_andamento' ? 'Em Andamento' : 'Passada'}
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
              <Text style={styles.metaText}>{item.quantidadeParticipantes} participantes</Text>
            </View>
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
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
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
          </View>
        </LinearGradient>

        <View style={styles.filters}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'futuras' && styles.filterButtonActive]}
            onPress={() => setFilter('futuras')}
          >
            <Text style={[styles.filterText, filter === 'futuras' && styles.filterTextActive]}>Futuras</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'em_andamento' && styles.filterButtonActive]}
            onPress={() => setFilter('em_andamento')}
          >
            <Text style={[styles.filterText, filter === 'em_andamento' && styles.filterTextActive]}>Em Andamento</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'passadas' && styles.filterButtonActive]}
            onPress={() => setFilter('passadas')}
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomRightRadius: 28 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroTitle: { color: 'white', fontSize: 22, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)' },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#1E40AF', backgroundColor: 'transparent' },
  filterButtonActive: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  filterText: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  filterTextActive: { color: 'white', fontWeight: '700' },
  listContainer: { padding: 16 },
  rotaCard: { marginBottom: 14, borderRadius: 16, padding: 14, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  rotaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  routeTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },
  metaRow: { gap: 8, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, color: '#6B7280' },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  budgetItem: { flex: 1 },
  budgetLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  budgetValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  progressWrap: { marginTop: 10 },
  progressTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#1E40AF' },
  progressText: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  retryButton: { marginTop: 12, backgroundColor: '#1E40AF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '600', fontSize: 14 },
});