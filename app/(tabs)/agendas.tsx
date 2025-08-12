import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Clock, MapPin, CheckSquare, X } from 'lucide-react-native';
import { Card } from '@/src/components/ui/Card';
import { Agenda as AgendaType } from '@/src/types';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import { AgendasApi } from '@/src/services/api/modules/agendas';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { handleError } from '@/src/utils/errorHandler';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { DaySelector } from '@/src/components/DaySelector';

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
      setViewMode('lista');
      
      loadCurrentMonth();
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
      // Garantir que a data seja tratada como UTC para evitar problemas de timezone
      const isoDate = new Date(dateString).toISOString();
      const date = new Date(isoDate);
      
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      };
    } catch (e) {
      return { date: '', time: '' };
    }
  };



  const countsByDate = dayCounts;

  const markedDates = useMemo(() => {
    const acc: any = {};
    Object.keys(countsByDate || {}).forEach((key) => {
      if (countsByDate[key] > 0) acc[key] = { marked: true, dotColor: '#1E40AF' };
    });
    
    if (filterDate) {
      acc[filterDate] = { 
        ...acc[filterDate],
        selected: true, 
        selectedColor: '#1E40AF'
      };
    }
    
    return acc;
  }, [countsByDate, filterDate]);

  const getStatusTheme = (status?: string) => {
    if (!status) return { bg: '#EEF2FF', border: '#C7D2FE', text: '#1E40AF' };
    const norm = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    switch (norm) {
      case 'AGUARDANDO':
        return { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' }; 
      case 'PENDENTE':
        return { bg: '#FFE4E6', border: '#FECDD3', text: '#9F1239' }; 
      case 'CONCLUIDO':
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' }; 
      default:
        return { bg: '#EEF2FF', border: '#C7D2FE', text: '#1E40AF' };
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
          {/* Barra lateral colorida indicando o status */}
          <View style={[styles.statusBar, { backgroundColor: theme.border }]} />
          
          <View style={styles.agendaContent}>
            {/* Cabeçalho com título e badges */}
            <View style={styles.agendaHeader}>
              <Text style={styles.agendaTitle} numberOfLines={1}>{item.titulo}</Text>
              <View style={styles.badgesContainer}>
                {(item as any).status ? (
                  <View style={[styles.statusBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.statusBadgeText, { color: theme.text }]}>{(item as any).status}</Text>
                  </View>
                ) : null}
                <View style={styles.checklistBadge}>
                  <CheckSquare size={14} color="#1E40AF" />
                  <Text style={styles.checklistText}>Checklist</Text>
                </View>
              </View>
            </View>

            {/* Detalhes do compromisso */}
            <View style={styles.agendaDetails}>
              <View style={styles.timeInfo}>
                <View style={styles.iconBackground}>
                  <Clock size={16} color="#1E40AF" />
                </View>
                <Text style={styles.timeText}>
                  {inicio.time} - {fim.time}
                </Text>
                <Text style={styles.dateText}>{inicio.date}</Text>
              </View>

              {item.local && (
                <View style={styles.locationInfo}>
                  <View style={styles.iconBackground}>
                    <MapPin size={16} color="#1E40AF" />
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
        <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
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

        {viewMode === 'calendario' ? (
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
                  todayTextColor: '#1E40AF',
                  dayTextColor: '#111827',
                  arrowColor: '#1E40AF',
                  monthTextColor: '#111827',
                  textMonthFontWeight: '800',
                  textMonthFontFamily: 'System',
                  textDayFontFamily: 'System',
                  textDayHeaderFontFamily: 'System',
                  textDayFontWeight: '700',
                  textDayHeaderFontWeight: '700',
                  textDisabledColor: '#9CA3AF',
                  selectedDayBackgroundColor: '#1E40AF',
                  selectedDayTextColor: '#fff',
                  dotColor: '#1E40AF',
                  selectedDotColor: '#fff',
                  dotStyle: {
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    marginTop: 2
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
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F6F7FB' 
  },
  hero: { 
    paddingHorizontal: 16, 
    paddingTop: 16, 
    paddingBottom: 12, 
    borderBottomRightRadius: 28 
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
  heroTitle: { 
    color: 'white', 
    fontSize: 22, 
    fontWeight: '700' 
  },
  heroSubtitle: { 
    color: 'rgba(255,255,255,0.9)' 
  },
  calendarToggle: {
    padding: 8,
  },
  calendarToggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  currentDateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  eventCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
  },
  eventCountText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  calendarContainer: { 
    paddingHorizontal: 12, 
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  calendarCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: 16, 
    color: '#6B7280' 
  },
  listContainer: { 
    paddingVertical: 16,
    paddingBottom: 100,
    paddingHorizontal: 0,
  },
  // Estilos atualizados para os cards de agenda
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  agendaCard: { 
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  statusBar: {
    width: 6,
    backgroundColor: '#1E40AF',
  },
  agendaContent: {
    flex: 1,
    padding: 16,
  },
  agendaHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12
  },
  agendaTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827', 
    flex: 1,
    marginRight: 8
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8
  },
  checklistBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#EEF2FF', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  checklistText: { 
    fontSize: 11, 
    color: '#1E40AF', 
    fontWeight: '600' 
  },
  statusBadge: { 
    backgroundColor:'#EEF2FF', 
    borderColor:'#C7D2FE', 
    borderWidth:1, 
    paddingHorizontal:8, 
    paddingVertical:3, 
    borderRadius:999 
  },
  statusBadgeText: { 
    fontSize: 11, 
    color:'#1E40AF', 
    fontWeight:'700', 
    textTransform:'capitalize' 
  },
  agendaDetails: { 
    gap: 12
  },
  timeInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12
  },
  timeText: { 
    fontSize: 14, 
    color: '#6B7280',
    fontWeight: '500'
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto'
  },
  locationInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12
  },
  locationText: { 
    fontSize: 14, 
    color: '#6B7280',
    flex: 1
  },
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recipientText: { 
    fontSize: 14, 
    color: '#6B7280',
  },
  description: { 
    fontSize: 14, 
    color: '#6B7280', 
    lineHeight: 20,
    marginTop: 8,
    paddingLeft: 40
  },
  iconBackground: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#111827', 
    marginBottom: 8 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center' 
  },
});