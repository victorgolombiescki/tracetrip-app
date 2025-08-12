import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Wallet, ChevronRight, TrendingUp, ArrowDown, CalendarDays, Clock, Receipt, FileBarChart, Home } from 'lucide-react-native';
import { useAppStore } from '@/src/store/useAppStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiClient } from '@/src/services/api/ApiClient';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { tryCatch, handleError } from '@/src/utils/errorHandler';

export default function HomeScreen() {
  const { auth } = useAppStore();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('hoje');
  const [dashboard, setDashboard] = useState<{
    orcamento: { total: number; despesas: number; restante: number; utilizacao: number };
    gastos: Record<string, Array<{ tipo: string; total: number }>>;
    contadores?: {
      despesasHoje: number;
      agendasHoje: number;
      rotasAndamento: number;
    }
  } | null>(null);
  const { width } = useWindowDimensions();

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
      return () => { };
    }, [])
  );

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

  const agendasCount = dashboard?.contadores?.agendasHoje || 0;

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#1E40AF", "#1E40AF"]}
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
              <TouchableOpacity style={styles.notificationButton}>
                <Bell size={20} color="white" />
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

          <View style={styles.budgetContainer}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>Orçamento disponível</Text>
              <View style={[styles.utilizationBadge, { backgroundColor: `${utilizationColor}20` }]}>
                <Text style={[styles.utilizationBadgeText, { color: 'white' }]}>{utilizationPercentage}% utilizado</Text>
              </View>
            </View>

            <Text style={styles.budgetAmount}>{formatCurrency(budgetRemaining)}</Text>

            <View style={styles.budgetProgressContainer}>
              <View style={[styles.budgetProgressBar, { width: `${utilizationPercentage}%`, backgroundColor: utilizationColor }]} />
            </View>

            <View style={styles.budgetDetailsRow}>
              <View style={styles.budgetDetailItem}>
                <View style={styles.budgetDetailIconContainer}>
                  <Wallet size={16} color="#4338CA" />
                </View>
                <View>
                  <Text style={styles.budgetDetailLabel}>Total</Text>
                  <Text style={styles.budgetDetailValue}>{formatCurrency(budgetTotal)}</Text>
                </View>
              </View>

              <View style={styles.budgetDetailDivider} />

              <View style={styles.budgetDetailItem}>
                <View style={[styles.budgetDetailIconContainer]}>
                  <ArrowDown size={16} color="#EF4444" />
                </View>
                <View>
                  <Text style={styles.budgetDetailLabel}>Utilizado</Text>
                  <Text style={styles.budgetDetailValue}>{formatCurrency(budgetUsed)}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.recordsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionTitleIconContainer}>
                  <FileBarChart size={16} color="#1E40AF" />
                </View>
                <Text style={styles.sectionTitle}>Despesas</Text>
              </View>
              <TouchableOpacity style={styles.viewAllButton} onPress={navigateToDespesas}>
                <Text style={styles.viewAllText}>Ver todos</Text>
                <ChevronRight size={16} color="#1E40AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.periodTabsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.periodTabsScroll}
              >
                {periods.map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.periodTab,
                      selectedPeriod === period.key && styles.periodTabActive
                    ]}
                    onPress={() => setSelectedPeriod(period.key)}
                  >
                    <Text style={[
                      styles.periodTabText,
                      selectedPeriod === period.key && styles.periodTabTextActive
                    ]}>
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.transactionsList}>
              {current.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Wallet size={24} color="#1E40AF" />
                  </View>
                  <Text style={styles.emptyStateTitle}>Sem registros</Text>
                  <Text style={styles.emptyStateSubtitle}>Ainda não há gastos neste período</Text>
                </View>
              ) : (
                current.map((g, idx) => (
                  <View key={`${g.tipo}-${idx}`} style={styles.transactionItem}>
                    <View style={[styles.transactionIcon, { backgroundColor: '#EBF5FF' }]}>
                      <TrendingUp size={18} color="#1E40AF" />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{g.tipo}</Text>
                      <Text style={styles.transactionDate}>{selectedPeriod.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.transactionAmount}>
                      {formatCurrency(g.total)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.agendasSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionTitleIconContainer}>
                  <CalendarDays size={16} color="#1E40AF" />
                </View>
                <Text style={styles.sectionTitle}>Compromissos</Text>
              </View>
              <TouchableOpacity style={styles.viewAllButton} onPress={navigateToAgendas}>
                <Text style={styles.viewAllText}>Ver todos</Text>
                <ChevronRight size={16} color="#1E40AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.agendaCard} 
              onPress={navigateToAgendas}
              activeOpacity={0.7}
            >
                <View style={styles.agendaCardContent}>
                  <View style={styles.agendaCardIcon}>
                    <CalendarDays size={24} color="#1E40AF" />
                  </View>
                  <View style={styles.agendaCardInfo}>
                    <Text style={styles.agendaCardTitle}>
                      Hoje você tem {agendasCount} {agendasCount === 1 ? 'compromisso' : 'compromissos'}
                    </Text>
                    <View style={styles.agendaCardTimeRow}>
                      <Clock size={14} color="#4B5563" />
                      <Text style={styles.agendaCardTimeText}>
                        Toque para visualizar sua agenda
                      </Text>
                    </View>
                  </View>
                  <View style={styles.agendaCardArrow}>
                    <ChevronRight size={20} color="#1E40AF" />
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
  container: {
    flex: 1,
    backgroundColor: '#F5F7FF',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
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
  heroTexts: {
    gap: 4,
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginTop: 10,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  budgetProgressContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 20,
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
    marginBottom: 10,
  },
  budgetDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetDetailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  budgetDetailDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -0,
  },
  contentContainer: {
    paddingBottom: 100, // Extra padding to avoid content being hidden by the tab bar
  },
  recordsSection: {
    marginTop: 20,
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
    backgroundColor: '#EBF5FF',
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
    color: '#1E40AF',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  periodTabActive: {
    backgroundColor: '#1E40AF',
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
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(30,64,175,0.08)',
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    backgroundColor: 'white',
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
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(30,64,175,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  agendaCardInfo: {
    flex: 1,
  },

  agendaCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
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
});