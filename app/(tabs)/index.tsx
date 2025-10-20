import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Wallet, ChevronRight, TrendingUp, ArrowDown, CalendarDays, Clock, Receipt, FileBarChart, Home, Map, LogOut } from 'lucide-react-native';
import { useAppStore } from '@/src/store/useAppStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { authService } from '@/src/services/auth/AuthService';
import { apiClient } from '@/src/services/api/ApiClient';
import { RotasApi } from '@/src/services/api/modules/rotas';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { tryCatch } from '@/src/utils/errorHandler';
import { TrackingButton } from '@/src/components/TrackingButton';
import { trackingService } from '@/src/services/TrackingService';
import NetInfo from '@react-native-community/netinfo';

export default function HomeScreen() {
  const { auth, setCurrentRoute, currentRoute, setAuth } = useAppStore();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('hoje');
  const [dashboard, setDashboard] = useState<{
    orcamento: { total: number; despesas: number; restante: number; utilizacao: number };
    gastos: Record<string, Array<{ tipo: string; total: number }>>;
    contadores?: {
      despesasHoje: number;
      agendasHoje: number;
      rotasAndamento: number;
    };
    viagem?: string;
  } | null>(null);
  const [loadingCurrentRoute, setLoadingCurrentRoute] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineStats, setOfflineStats] = useState<{ total: number; unsynced: number }>({ total: 0, unsynced: 0 });
  const { width } = useWindowDimensions();

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
      loadCurrentRoute();
      
      trackingService.restoreTrackingIfEnabled();
      
      const unsubscribe = NetInfo.addEventListener(state => {
        const online = (state.isConnected === true) && (state.isInternetReachable !== false);
        setIsOnline(online);
      });

      let intervalId: any;
      const loadStats = async () => {
        try {
          const stats = await trackingService.getOfflineStats();
          setOfflineStats(stats);
        } catch {}
      };
      loadStats();
      intervalId = setInterval(loadStats, 15000);
      
      return () => { 
        try { unsubscribe(); } catch {}
        try { if (intervalId) clearInterval(intervalId); } catch {}
      };
    }, [])
  );

  const loadCurrentRoute = async () => {
    setLoadingCurrentRoute(true);
    try {
      const response = await RotasApi.getCurrentRoute();

      if (response.success && response.data) {
        setCurrentRoute(response.data);
        loadDashboardData();
      } else {
        setCurrentRoute(null);
      }
    } catch (error) {
      setCurrentRoute(null);
    } finally {
      setLoadingCurrentRoute(false);
    }
  };

  const loadDashboardData = async () => {
    await tryCatch(async () => {
      const resp = await apiClient.getHomeDashboard();
      if (resp.success) {
        setDashboard(resp.data as any);
      } else {
        throw new Error(resp.message || 'Falha ao carregar dados do dashboard');
      }
    }, 'Não foi possível carregar os dados do dashboard');
  };

  const periods = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mês' },
    { key: 'ano', label: 'Ano' },
  ];

  const periodMap: Record<string, keyof NonNullable<typeof dashboard>['gastos']> = {
    hoje: 'hoje',
    semana: 'semana',
    mes: 'mes',
    ano: 'ano',
  };
  const current = dashboard?.gastos?.[periodMap[selectedPeriod] || 'hoje'] || [];

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Math.abs(value));
    } catch (e) {
      return `R$ ${value}`;
    }
  };

  const budgetTotal = dashboard?.orcamento?.total || 0;
  const budgetUsed = dashboard?.orcamento?.despesas || 0;
  const budgetRemaining = dashboard?.orcamento?.restante || 0;
  const utilization = dashboard?.orcamento?.utilizacao ?? (budgetTotal > 0 ? budgetUsed / budgetTotal : 0);
  const utilizationPercentage = Math.round(utilization * 100);

  const utilizationColor =
    utilizationPercentage >= 95 ? '#EF4444' :
      utilizationPercentage >= 80 ? '#F59E0B' :
        '#10B981';

  const firstName = auth.user?.nome ? auth.user.nome.split(' ')[0] : 'Motorista';
  const firstInitial = auth.user?.nome ? auth.user.nome.charAt(0).toUpperCase() : 'M';
  const hours = new Date().getHours();
  const greetingTime = hours < 12 ? 'Bom dia' : hours < 18 ? 'Boa tarde' : 'Boa noite';

  const navigateToDespesas = () => {
    router.push('/despesas');
  };

  const navigateToAgendas = () => {
    router.push('/agendas');
  };
  
  const handleLogout = () => {
    Alert.alert(
      "Sair",
      "Tem certeza que deseja sair do aplicativo?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim", onPress: async () => {
          try {
            await authService.logout();
            setAuth({ user: null, token: null, isAuthenticated: false, isLoading: false });
            router.replace('/login');
          } catch (error) {
            setAuth({ user: null, token: null, isAuthenticated: false, isLoading: false });
            router.replace('/login');
          }
        }}
      ]
    );
  };

  const agendasCount = dashboard?.contadores?.agendasHoje || 0;

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#254985", "#254985"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleContainer}>
              <View style={styles.heroIconContainer}>
                <Home size={24} color="#fff" />
              </View>
              <View style={styles.heroTexts}>
                <Text style={styles.greeting}>{greetingTime}</Text>
                <Text style={styles.userName}>Olá, {firstName}</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TrackingButton />

              <TouchableOpacity style={styles.notificationButton}>
                <Bell size={20} color="white" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.notificationButton} onPress={handleLogout}>
                <LogOut size={18} color="white" />
              </TouchableOpacity>

              {auth.user?.avatarUrl ? (
                <Image source={{ uri: auth.user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{firstInitial}</Text>
                </View>
              )}
            </View>
            
          </View>
          {!isOnline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                Sem conexão. Coleta de localização continua offline ({offlineStats.unsynced} pendente{offlineStats.unsynced === 1 ? '' : 's'}).
              </Text>
            </View>
          )}

          {(currentRoute || dashboard?.viagem) && (
            <TouchableOpacity
              style={styles.currentRouteBanner}
              onPress={() => currentRoute?.id && router.push({ pathname: '/rotas/[id]', params: { id: currentRoute.id } })}
              activeOpacity={0.8}
            >
              <Map size={14} color="#fff" />
              <Text style={styles.currentRouteBannerText}>
                {currentRoute?.nome || dashboard?.viagem}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.budgetContainer}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>Orçamento disponível</Text>
              <View style={[styles.utilizationBadge, { backgroundColor: `${utilizationColor}20` }]}>
                <Text style={[styles.utilizationBadgeText, { color: 'white' }]}>
  {utilizationPercentage > 100 ? 'Mais de 100% utilizado' : `${utilizationPercentage}% utilizado`}
</Text>
              </View>
            </View>

            <Text style={styles.budgetAmount}>{formatCurrency(budgetRemaining)}</Text>

            <View style={styles.budgetProgressContainer}>
              <View style={[styles.budgetProgressBar, { width: `${utilizationPercentage}%`, backgroundColor: utilizationColor }]} />
            </View>

            <View style={styles.budgetDetailsRow}>
              <View style={styles.budgetDetailItem}>
                <View style={styles.budgetDetailIconContainer}>
                  <Wallet size={14} color="#4338CA" />
                </View>
                <View>
                  <Text style={styles.budgetDetailLabel}>Total</Text>
                  <Text style={styles.budgetDetailValue}>{formatCurrency(budgetTotal)}</Text>
                </View>
              </View>

              <View style={styles.budgetDetailDivider} />

              <View style={styles.budgetDetailItem}>
                <View style={[styles.budgetDetailIconContainer]}>
                  <ArrowDown size={14} color="#EF4444" />
                </View>
                <View>
                  <Text style={styles.budgetDetailLabel}>Utilizado</Text>
                  <Text style={styles.budgetDetailValue}>{formatCurrency(budgetUsed)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.countersContainer}>
              <View style={styles.counterCard}>
                <Text style={styles.counterValue}>{offlineStats.unsynced}</Text>
                <Text style={styles.counterLabel}>Pendentes</Text>
              </View>
              {!isOnline && (
                <View style={styles.counterCard}>
                  <Text style={styles.counterValue}>OFF</Text>
                  <Text style={styles.counterLabel}>Sem conexão</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.recordsSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Despesas</Text>
              <TouchableOpacity style={styles.modernViewAllButton} onPress={navigateToDespesas}>
                <Text style={styles.modernViewAllText}>Ver histórico</Text>
                <ChevronRight size={14} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <View style={styles.modernPeriodTabsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modernPeriodTabsScroll}
              >
                {periods.map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.modernPeriodTab,
                      selectedPeriod === period.key && styles.modernPeriodTabActive
                    ]}
                    onPress={() => setSelectedPeriod(period.key)}
                  >
                    <Text style={[
                      styles.modernPeriodTabText,
                      selectedPeriod === period.key && styles.modernPeriodTabTextActive
                    ]}>
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modernTransactionsList}>
              {current.length === 0 ? (
                <View style={styles.modernEmptyState}>
                  <View style={styles.modernEmptyStateIcon}>
                    <Wallet size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.modernEmptyStateTitle}>Sem despesas</Text>
                  <Text style={styles.modernEmptyStateSubtitle}>Nenhum gasto registrado neste período</Text>
                  <TouchableOpacity
                    style={styles.modernEmptyStateButton}
                    onPress={navigateToDespesas}
                  >
                    <Text style={styles.modernEmptyStateButtonText}>Ver histórico</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                current.map((g, idx) => (
                  <TouchableOpacity
                    key={`${g.tipo}-${idx}`}
                    style={styles.modernTransactionItem}
                    activeOpacity={0.7}
                    onPress={navigateToDespesas}
                  >
                    <View style={styles.modernTransactionLeftContent}>
                      <View style={styles.modernTransactionIcon}>
                        <TrendingUp size={16} color="#2563EB" strokeWidth={1.5} />
                      </View>
                      <View style={styles.modernTransactionInfo}>
                        <Text style={styles.modernTransactionTitle}>{g.tipo}</Text>
                        <Text style={styles.modernTransactionDate}>{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.modernTransactionRightContent}>
                      <Text style={styles.modernTransactionAmount}>
                        {formatCurrency(g.total)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>



          <View style={styles.agendasSection}>
            <View style={styles.modernSectionHeader}>
              <Text style={styles.modernSectionTitle}>Compromissos</Text>
              <TouchableOpacity style={styles.modernViewAllButton} onPress={navigateToAgendas}>
                <Text style={styles.modernViewAllText}>Ver agenda</Text>
                <ChevronRight size={14} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modernAgendaCard}
              onPress={navigateToAgendas}
              activeOpacity={0.7}
            >
              <View style={styles.modernAgendaCardHeader}>
                <Text style={styles.modernAgendaCardHeaderText}>AGENDA DE HOJE</Text>
              </View>

              <View style={styles.modernAgendaCardBody}>
                <View style={styles.modernAgendaCardIcon}>
                  <CalendarDays size={18} color="#2563EB" />
                </View>
                <View style={styles.modernAgendaCardInfo}>
                  <Text style={styles.modernAgendaCardTitle}>
                    {agendasCount} {agendasCount === 1 ? 'compromisso' : 'compromissos'} agendados
                  </Text>
                  <View style={styles.modernAgendaCardTimeRow}>
                    <Clock size={14} color="#64748B" />
                    <Text style={styles.modernAgendaCardTimeText}>
                      {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }).replace(/^\d+ de (\w)(\w+)$/, function (match, first, rest) {
                        return `${match.split(' ')[0]} de ${first.toUpperCase()}${rest.toLowerCase()}`;
                      })}
                    </Text>
                  </View>
                </View>
              </View>

            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  offlineBannerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modernSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 2,
  },
  modernSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  modernViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  modernViewAllText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginRight: 4,
  },
  modernPeriodTabsContainer: {
    marginBottom: 10,
  },
  modernPeriodTabsScroll: {
    paddingRight: 8,
  },
  modernPeriodTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modernPeriodTabActive: {
    backgroundColor: 'white',
    borderColor: '#2563EB',
  },
  modernPeriodTabText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  modernPeriodTabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  modernTransactionsList: {
    gap: 4,
  },
  modernTransactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  modernTransactionLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernTransactionRightContent: {
    alignItems: 'flex-end',
    maxWidth: '40%',
  },
  modernTransactionIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  modernTransactionInfo: {
    flex: 1,
  },
  modernTransactionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  modernTransactionDate: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '400',
  },
  modernTransactionAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  modernEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 6,
  },
  modernEmptyStateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(37,99,235,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  modernEmptyStateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  modernEmptyStateSubtitle: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  modernEmptyStateButton: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 6,
  },
  modernEmptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  modernAgendaCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modernAgendaCardContent: {
    padding: 0,
  },
  modernAgendaCardHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modernAgendaCardHeaderText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  modernAgendaCardBody: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernAgendaCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(37,99,235,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernAgendaCardInfo: {
    flex: 1,
  },
  modernAgendaCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  modernAgendaCardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modernAgendaCardTimeText: {
    fontSize: 12,
    color: '#64748B',
  },
  modernAgendaCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    alignItems: 'center',
  },
  modernAgendaCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modernAgendaCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
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
  heroTexts: {
    gap: 4,
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  userName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  currentRouteBannerText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarInitial: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  budgetContainer: {
    marginTop: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  utilizationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  utilizationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetAmount: {
    color: 'white',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  budgetProgressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  budgetProgressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#4338CA',
  },
  budgetDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  budgetDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetDetailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  budgetDetailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  budgetDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  budgetDetailDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -0,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  recordsSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  currentRouteSection: {
    marginBottom: 24,
  },
  agendasSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    marginRight: 4,
  },
  periodTabsContainer: {
    marginBottom: 16,
  },
  periodTabsScroll: {
    paddingRight: 16,
  },
  periodTab: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  periodTabActive: {
    backgroundColor: '#2563EB',
  },
  periodTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodTabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyStateIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(37,99,235,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  countersContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginBottom: 4,
    gap: 8,
  },

  counterCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 1,
    elevation: 1,
    gap: 2,
  },

  counterValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  counterLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },

  agendaCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  agendaCardGradient: {
    borderRadius: 16,
  },

  agendaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },

  agendaCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  agendaCardInfo: {
    flex: 1,
  },

  agendaCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 6,
  },

  agendaCardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  agendaCardTimeText: {
    fontSize: 13,
    color: '#4B5563',
  },

  agendaCardArrow: {
    marginLeft: 8,
  },

  currentRouteCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    backgroundColor: 'white',
  },
  currentRouteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  currentRouteIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(30,64,175,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currentRouteInfo: {
    flex: 1,
  },
  currentRouteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#254985',
    marginBottom: 6,
  },
  currentRouteDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  currentRouteDetailsText: {
    fontSize: 13,
    color: '#4B5563',
  },
  currentRouteStatusBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  currentRouteStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#254985',
  },
  currentRouteArrow: {
    marginLeft: 8,
  },
  noCurrentRouteCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 16,
  },
  noCurrentRouteText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
  },
  setCurrentRouteButton: {
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  setCurrentRouteButtonText: {
    color: '#254985',
    fontSize: 14,
    fontWeight: '600',
  },
});
