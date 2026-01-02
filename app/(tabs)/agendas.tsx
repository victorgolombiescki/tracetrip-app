import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Clock, MapPin, CheckSquare, X, Lock } from 'lucide-react-native';
import { Card } from '@/src/components/ui/Card';
import { Agenda as AgendaType } from '@/src/types';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import { AgendasApi } from '@/src/services/api/modules/agendas';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { handleError } from '@/src/utils/errorHandler';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { DaySelector } from '@/src/components/DaySelector';
import { useAppStore } from '@/src/store/useAppStore';
import { apiClient } from '@/src/services/api/ApiClient';

LocaleConfig.locales['ptBR'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'ptBR';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = (SCREEN_WIDTH - 40) / 7;

export default function AgendasScreen() {
  const [monthAgendas, setMonthAgendas] = useState<AgendaType[]>([]);
  const [listItems, setListItems] = useState<AgendaType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'calendario' | 'lista'>('lista');
  const [filterDate, setFilterDate] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [calendarDate, setCalendarDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const monthFetchReqIdRef = useRef(0);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const listFetchReqIdRef = useRef(0);
  const navigatingToListRef = useRef(false);
  const [visibleDays, setVisibleDays] = useState<string[]>([]);
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set());
  const [modalTipoAgenda, setModalTipoAgenda] = useState(true);
  const [tipoAgendaSelecionado, setTipoAgendaSelecionado] = useState<'compromissos' | 'frota' | null>(null);
  const { empresaPlano, setEmpresaPlano } = useAppStore();

  useFocusEffect(
    React.useCallback(() => {
      loadEmpresaPlano();
    }, [])
  );

  const loadEmpresaPlano = async () => {
    try {
      const resp = await apiClient.getEmpresa();
      if (resp.success && resp.data) {
        setEmpresaPlano(resp.data.plano || null);
      }
    } catch (error) {
    }
  };

  const moduloDisponivel = (modulo: string): boolean => {
    if (!empresaPlano) return true;
    if (empresaPlano === 'TRACETRIP') return true;
    if (empresaPlano === 'TRACEFROTAS') {
      return modulo === 'Frota';
    }
    return true;
  };
  
  const loadCurrentMonth = () => {
    const today = new Date();
    
    const todayStr = today.toISOString().slice(0, 10);
    setFilterDate(todayStr);
    
    const days = [];
    for (let i = -30; i <= 60; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day.toISOString().slice(0, 10));
    }
    setVisibleDays(days);
    
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    loadMonthData(currentMonth);
    
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    
    if (!loadedMonths.has(prevMonthKey)) {
      setTimeout(() => loadMonthData(prevMonthKey), 200);
    }
    
    if (!loadedMonths.has(nextMonthKey)) {
      setTimeout(() => loadMonthData(nextMonthKey), 400);
    }
  };
  
  useEffect(() => {
    loadCurrentMonth();
  }, []);
  
  useFocusEffect(
    React.useCallback(() => {
      setModalTipoAgenda(true);
    }, [])
  );

  useEffect(() => {
    if (filterDate) {
      const [year, month] = filterDate.split('-');
      const monthKey = `${year}-${month}`;
      if (!loadedMonths.has(monthKey)) {
        loadMonthData(monthKey);
      }
    }
  }, [filterDate, loadedMonths]);

  useEffect(() => {
    if (calendarDate) {
      const [year, month] = calendarDate.split('-');
      const monthKey = `${year}-${month}`;
      if (!loadedMonths.has(monthKey)) {
        loadMonthData(monthKey);
      }
    }
  }, [calendarDate, loadedMonths]);

  const loadMonthData = async (monthKey: string) => {
    try {
      const [year, month] = monthKey.split('-');
      const ano = Number(year);
      const mes = Number(month);
      
      monthFetchReqIdRef.current += 1;
      const currentReqId = monthFetchReqIdRef.current;
      
      const resp = await AgendasApi.listByMonth(ano, mes);
      
      if (!resp || !resp.success) {
        throw new Error(resp?.message || 'Falha ao carregar agendas do mês');
      }
      
      if (monthFetchReqIdRef.current === currentReqId) {
        const items = (resp.data as AgendaType[]) || [];
        
        setMonthAgendas(prev => [...prev.filter(a => {
          const aMonth = (a.inicioAt || '').slice(0, 7);
          return aMonth !== monthKey;
        }), ...items]);
        
        setDayCounts(prev => {
          const nextCounts = {...prev};
          for (const a of items) {
            const key = (a.inicioAt || '').slice(0, 10);
            if (key) nextCounts[key] = (nextCounts[key] || 0) + 1;
          }
          return nextCounts;
        });
        
        setLoadedMonths(prev => new Set([...prev, monthKey]));
      }
    } catch (e) {
      handleError(e, 'Erro ao carregar agendas do mês');
    }
  };

  useEffect(() => {
    if (filterDate) {
      setPage(1);
      setHasMore(false);
      setListItems([]);
      listFetchReqIdRef.current += 1;
      const currentListReqId = listFetchReqIdRef.current;
      loadPage(1, currentListReqId);
    }
  }, [filterDate]);

  const loadPage = async (pageToLoad: number, reqId?: number) => {
    try {
      if (pageToLoad === 1) setLoading(true); else setLoadingMore(true);
      
      if (!filterDate) return;
      
      const [yStr, mStr, dStr] = filterDate.split('-');
      const filtros = { 
        ano: Number(yStr), 
        mes: Number(mStr), 
        dia: dStr 
      };
      
      const resp = await AgendasApi.listPaginated(filtros, pageToLoad, 10);
      
      if (!resp || !resp.success) {
        throw new Error(resp?.message || 'Falha ao carregar lista de agendas');
      }
      
      if (reqId === undefined || listFetchReqIdRef.current === reqId) {
        const { items, meta } = resp.data as any;
        setListItems(prev => pageToLoad === 1 ? items : [...prev, ...items]);
        setHasMore(meta.currentPage < meta.totalPages);
        setPage(meta.currentPage);
      }
    } catch (e) {
      handleError(e, 'Erro ao carregar lista de agendas');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const isoDate = new Date(dateString).toISOString();
      const date = new Date(isoDate);
      date.setHours(date.getHours() - 3);
      
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (e) {
      return { date: '', time: '' };
    }
  };



  const countsByDate = dayCounts;

  const markedDates = useMemo(() => {
    const acc: any = {};
    Object.keys(countsByDate || {}).forEach((key) => {
      if (countsByDate[key] > 0) acc[key] = { marked: true, dotColor: '#254985' };
    });
    
    if (filterDate) {
      acc[filterDate] = { 
        ...acc[filterDate],
        selected: true, 
        selectedColor: '#254985'
      };
    }
    
    return acc;
  }, [countsByDate, filterDate]);

  const getStatusTheme = (status?: string) => {
    if (!status) return { bg: '#EEF2FF', border: '#C7D2FE', text: '#254985' };
    const norm = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    switch (norm) {
      case 'AGUARDANDO':
        return { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' }; 
      case 'PENDENTE':
        return { bg: '#FFE4E6', border: '#FECDD3', text: '#9F1239' }; 
      case 'CONCLUIDO':
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' }; 
      default:
        return { bg: '#EEF2FF', border: '#C7D2FE', text: '#254985' };
    }
  };

  const renderAgenda = ({ item }: { item: AgendaType }) => {
    const inicio = formatDateTime(item.inicioAt);
    const fim = formatDateTime(item.fimAt);
    const theme = getStatusTheme((item as any).status);

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/agendas/${item.id}`)}
        activeOpacity={0.7}
        style={styles.cardContainer}
      >
        <View style={styles.agendaCard}>
          <View style={[styles.statusBar, { backgroundColor: theme.border }]} />
          
          <View style={styles.agendaContent}>
            <View style={styles.agendaHeader}>
              <Text style={styles.agendaTitle} numberOfLines={1}>{item.titulo}</Text>
              <View style={styles.badgesContainer}>
                {(item as any).status ? (
                  <View style={[styles.statusBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.statusBadgeText, { color: theme.text }]}>{(item as any).status}</Text>
                  </View>
                ) : null}
                <View style={styles.checklistBadge}>
                  <CheckSquare size={14} color="#254985" />
                  <Text style={styles.checklistText}>Checklist</Text>
                </View>
              </View>
            </View>

            <View style={styles.agendaDetails}>
              <View style={styles.timeInfo}>
                <View style={styles.iconBackground}>
                  <Clock size={16} color="#254985" />
                </View>
                <Text style={styles.timeText}>
                  {inicio.time} - {fim.time}
                </Text>
                <Text style={styles.dateText}>{inicio.date}</Text>
              </View>

              {item.local && (
                <View style={styles.locationInfo}>
                  <View style={styles.iconBackground}>
                    <MapPin size={16} color="#254985" />
                  </View>
                  <Text style={styles.locationText} numberOfLines={1}>{item.local}</Text>
                </View>
              )}
              
              {item.destinatario && (
                <View style={styles.recipientContainer}>
                  <View style={[styles.iconBackground, {opacity: 0.7}]}>
                    <Text style={styles.iconText}>P</Text>
                  </View>
                  <Text style={styles.recipientText}>Para: {item.destinatario}</Text>
                </View>
              )}

              {item.descricao && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.descricao}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleCalendarDayPress = (day: DateData) => {
    setFilterDate(day.dateString);
    
    const selectedDate = new Date(day.dateString);
    const days = [];
    for (let i = -30; i <= 60; i++) {
      const dayDate = new Date(selectedDate);
      dayDate.setDate(selectedDate.getDate() + i);
      days.push(dayDate.toISOString().slice(0, 10));
    }
    setVisibleDays(days);
    
    const [year, month] = day.dateString.split('-');
    const monthKey = `${year}-${month}`;
    if (!loadedMonths.has(monthKey)) {
      loadMonthData(monthKey);
    }
    
    const prevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    
    const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    
    if (!loadedMonths.has(prevMonthKey)) {
      setTimeout(() => loadMonthData(prevMonthKey), 200);
    }
    
    if (!loadedMonths.has(nextMonthKey)) {
      setTimeout(() => loadMonthData(nextMonthKey), 400);
    }
    
    setViewMode('lista');
  };

  const handleVisibleDaysChange = (firstVisibleIndex: number, lastVisibleIndex: number) => {
    const visibleDaysSubset = visibleDays.slice(
      Math.max(0, firstVisibleIndex - 5), 
      Math.min(visibleDays.length, lastVisibleIndex + 5)
    );
    
    const monthsToCheck = new Set<string>();
    
    visibleDaysSubset.forEach(day => {
      const [year, month] = day.split('-');
      monthsToCheck.add(`${year}-${month}`);
    });
    
    let delay = 0;
    monthsToCheck.forEach(monthKey => {
      if (!loadedMonths.has(monthKey)) {
        setTimeout(() => loadMonthData(monthKey), delay);
        delay += 300; 
      }
    });
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroTitleContainer}>
              <View style={styles.heroIconContainer}>
                <CalendarIcon size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.heroTitle}>Agendas</Text>
                <Text style={styles.heroSubtitle}>Seus compromissos organizados</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.calendarToggle}
              onPress={() => setViewMode(viewMode === 'calendario' ? 'lista' : 'calendario')}
            >
              {viewMode === 'calendario' ? (
                <View style={styles.calendarToggleIcon}>
                  <X size={18} color="#fff" />
                </View>
              ) : (
                <View style={styles.calendarToggleIcon}>
                  <CalendarIcon size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {tipoAgendaSelecionado === 'compromissos' && (viewMode === 'calendario' ? (
          <View style={styles.calendarContainer}>
            <View style={styles.calendarCard}>
              <Calendar
                current={calendarDate}
                onDayPress={handleCalendarDayPress}
                markedDates={markedDates}
                hideExtraDays
                enableSwipeMonths
                firstDay={1}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'white',
                  todayTextColor: '#2563EB',
                  dayTextColor: '#333333',
                  arrowColor: '#2563EB',
                  monthTextColor: '#333333',
                  textMonthFontWeight: '700',
                  textMonthFontFamily: 'System',
                  textDayFontFamily: 'System',
                  textDayHeaderFontFamily: 'System',
                  textDayFontWeight: '600',
                  textDayHeaderFontWeight: '600',
                  textDisabledColor: '#9CA3AF',
                  selectedDayBackgroundColor: '#2563EB',
                  selectedDayTextColor: '#fff',
                  dotColor: '#2563EB',
                  selectedDotColor: '#fff',
                  dotStyle: {
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    marginTop: 1
                  }
                }}
                onVisibleMonthsChange={(months) => {
                  if (months && months[0]) {
                    const m = months[0];
                    setCalendarDate(`${m.year}-${String(m.month).padStart(2,'0')}-01`);
                  }
                }}
              />
            </View>
            
            <View style={styles.monthSummaryContainer}>
              <Text style={styles.monthSummaryTitle}>
                {new Date(calendarDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Text>
              
              <View style={styles.calendarInfoCards}>
                <View style={styles.calendarInfoCard}>
                  <View style={styles.calendarInfoIconContainer}>
                    <CalendarIcon size={20} color="#2563EB" />
                  </View>
                  <View style={styles.calendarInfoContent}>
                    <Text style={styles.calendarInfoLabel}>Semanas</Text>
                    <Text style={styles.calendarInfoValue}>
                      {Math.ceil(new Date(
                        new Date(calendarDate).getFullYear(),
                        new Date(calendarDate).getMonth() + 1,
                        0
                      ).getDate() / 7)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.calendarInfoCard}>
                  <View style={styles.calendarInfoIconContainer}>
                    <Clock size={20} color="#2563EB" />
                  </View>
                  <View style={styles.calendarInfoContent}>
                    <Text style={styles.calendarInfoLabel}>Dias</Text>
                    <Text style={styles.calendarInfoValue}>
                      {new Date(
                        new Date(calendarDate).getFullYear(),
                        new Date(calendarDate).getMonth() + 1,
                        0
                      ).getDate()}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.calendarInfoCards}>
                <View style={styles.calendarInfoCard}>
                  <View style={styles.calendarInfoIconContainer}>
                    <MapPin size={20} color="#2563EB" />
                  </View>
                  <View style={styles.calendarInfoContent}>
                    <Text style={styles.calendarInfoLabel}>Primeiro Dia</Text>
                    <Text style={styles.calendarInfoValue}>
                      {new Date(
                        new Date(calendarDate).getFullYear(),
                        new Date(calendarDate).getMonth(),
                        1
                      ).toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.calendarInfoCard}>
                  <View style={styles.calendarInfoIconContainer}>
                    <CheckSquare size={20} color="#2563EB" />
                  </View>
                  <View style={styles.calendarInfoContent}>
                    <Text style={styles.calendarInfoLabel}>Último Dia</Text>
                    <Text style={styles.calendarInfoValue}>
                      {new Date(
                        new Date(calendarDate).getFullYear(),
                        new Date(calendarDate).getMonth() + 1,
                        0
                      ).toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </Text>
                  </View>
                </View>
              </View>
              

            </View>
          </View>
        ) : (
          <>
            <DaySelector 
              visibleDays={visibleDays}
              filterDate={filterDate}
              setFilterDate={setFilterDate}
              countsByDate={countsByDate}
              onVisibleDaysChange={handleVisibleDaysChange}
            />
            
            <View style={styles.listHeaderContainer}>
              <Text style={styles.currentDateTitle}>
                {filterDate ? new Date(filterDate).toLocaleDateString('pt-BR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric'
                }) : 'Todos os compromissos'}
              </Text>
              
              {countsByDate[filterDate || ''] > 0 && (
                <View style={styles.eventCountBadge}>
                  <Text style={styles.eventCountText}>
                    {countsByDate[filterDate || '']} compromisso{countsByDate[filterDate || ''] !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando agendas...</Text>
              </View>
            ) : (
              <FlatList
                data={listItems}
                renderItem={renderAgenda}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.4}
                onEndReached={() => {
                  if (loading || loadingMore) return;
                  if (hasMore) {
                    const currentListReqId = listFetchReqIdRef.current;
                    loadPage(page + 1, currentListReqId);
                  }
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum compromisso</Text>
                    <Text style={styles.emptySubtext}>
                      Não há compromissos para esta data
                    </Text>
                  </View>
                }
              />
            )}
          </>
        ))}

        <Modal visible={modalTipoAgenda} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecione o tipo de agenda</Text>
              
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  !moduloDisponivel('Viagens') && styles.modalOptionDisabled
                ]}
                onPress={() => {
                  if (!moduloDisponivel('Viagens')) {
                    Alert.alert(
                      'Módulo Indisponível',
                      'Este módulo está disponível apenas para assinantes do plano TraceTrip.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  setTipoAgendaSelecionado('compromissos');
                  setModalTipoAgenda(false);
                  setViewMode('lista');
                  loadCurrentMonth();
                }}
                disabled={!moduloDisponivel('Viagens')}
              >
                <View style={styles.modalOptionIcon}>
                  <CalendarIcon size={24} color={moduloDisponivel('Viagens') ? "#254985" : "#9CA3AF"} />
                </View>
                <View style={styles.modalOptionContent}>
                  <View style={styles.modalOptionTitleRow}>
                    <Text style={[
                      styles.modalOptionTitle,
                      !moduloDisponivel('Viagens') && styles.modalOptionTitleDisabled
                    ]}>Agenda de Compromissos</Text>
                    {!moduloDisponivel('Viagens') && (
                      <Lock size={16} color="#9CA3AF" />
                    )}
                  </View>
                  <Text style={[
                    styles.modalOptionSubtitle,
                    !moduloDisponivel('Viagens') && styles.modalOptionSubtitleDisabled
                  ]}>Visualize e gerencie seus compromissos</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setTipoAgendaSelecionado('frota');
                  setModalTipoAgenda(false);
                  router.push('/(tabs)/agenda-frota');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalOptionIcon}>
                  <MapPin size={24} color="#254985" />
                </View>
                <View style={styles.modalOptionContent}>
                  <Text style={styles.modalOptionTitle}>Agenda de Frota</Text>
                  <Text style={styles.modalOptionSubtitle}>Gerencie reservas de veículos</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  monthSummaryContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    marginHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  monthSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  calendarInfoCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  calendarInfoCard: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarInfoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(37,99,235,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  calendarInfoContent: {
    flex: 1,
  },
  calendarInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  calendarInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  upcomingEventsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  upcomingEventsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
    paddingLeft: 8,
  },
  upcomingEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  upcomingEventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginRight: 10,
  },
  upcomingEventContent: {
    flex: 1,
  },
  upcomingEventTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
  },
  upcomingEventDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  noEventsText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
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
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  heroTitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  heroIconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
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
  calendarToggle: {
    padding: 8,
  },
  calendarToggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  currentDateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  eventCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderRadius: 999,
  },
  eventCountText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  calendarContainer: { 
    paddingTop: 12,
    backgroundColor: 'white',
  },
  calendarCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginHorizontal: 20,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: 14, 
    color: '#6B7280' 
  },
  listContainer: { 
    paddingVertical: 12,
    paddingBottom: 100,
    paddingHorizontal: 0,
  },
  cardContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  agendaCard: { 
    borderRadius: 8,
    backgroundColor: '#F5F9FF',
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 0,
  },
  statusBar: {
    width: 4,
    backgroundColor: '#2563EB',
  },
  agendaContent: {
    flex: 1,
    padding: 12,
  },
  agendaHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 8
  },
  agendaTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333333', 
    flex: 1,
    marginRight: 6
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6
  },
  checklistBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: 'rgba(37,99,235,0.06)', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 8 
  },
  checklistText: { 
    fontSize: 10, 
    color: '#2563EB', 
    fontWeight: '600' 
  },
  statusBadge: { 
    backgroundColor:'rgba(37,99,235,0.06)', 
    borderColor:'transparent', 
    paddingHorizontal:6, 
    paddingVertical:2, 
    borderRadius:999 
  },
  statusBadgeText: { 
    fontSize: 10, 
    color:'#2563EB', 
    fontWeight:'600', 
    textTransform:'capitalize' 
  },
  agendaDetails: { 
    gap: 8
  },
  timeInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8
  },
  timeText: { 
    fontSize: 12, 
    color: '#6B7280',
    fontWeight: '500'
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 'auto'
  },
  locationInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8
  },
  locationText: { 
    fontSize: 12, 
    color: '#6B7280',
    flex: 1
  },
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientText: { 
    fontSize: 12, 
    color: '#6B7280',
  },
  description: { 
    fontSize: 12, 
    color: '#6B7280', 
    lineHeight: 18,
    marginTop: 6,
    paddingLeft: 36
  },
  iconBackground: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(37,99,235,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333333', 
    marginBottom: 6 
  },
  emptySubtext: { 
    fontSize: 13, 
    color: '#6B7280', 
    textAlign: 'center' 
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
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F9FF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 73, 133, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  modalOptionDisabled: {
    opacity: 0.6,
  },
  modalOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalOptionTitleDisabled: {
    color: '#9CA3AF',
  },
  modalOptionSubtitleDisabled: {
    color: '#D1D5DB',
  },
});