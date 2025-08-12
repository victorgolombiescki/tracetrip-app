import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Eye, Utensils, Car, Home, Fuel, Package, Receipt, CreditCard } from 'lucide-react-native';
import { Card } from '@/src/components/ui/Card';
import { DespesasApi } from '@/src/services/api/modules/despesas';
import { Despesa } from '@/src/types';
import { LinearGradient } from 'expo-linear-gradient';
import { tryCatch, handleError } from '@/src/utils/errorHandler';
import ErrorBoundary from '@/src/components/ErrorBoundary';

export default function DespesasScreen() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'PENDENTE' | 'APROVADO' | 'REPROVADO'>('PENDENTE');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingImage, setLoadingImage] = useState<string | null>(null);
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      loadDespesas(true);
    }, [])
  );

  const loadDespesas = async (reset: boolean = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        setHasMorePages(true);
      } else {
        setLoadingMore(true);
      }

      const filtros = { status: filter as 'PENDENTE' | 'APROVADO' | 'REPROVADO' };

      const response = await DespesasApi.list(filtros);
      
      if (!response || !response.success) {
        throw new Error(response?.message || 'Falha ao carregar despesas');
      }
      
      const data = response.data;
      
      const despesasData = data.items || [];
      
      despesasData.sort((a: Despesa, b: Despesa) => new Date(b.data).getTime() - new Date(a.data).getTime());
      
      if (reset) {
        setDespesas(despesasData);
      } else {
        setDespesas(prev => [...prev, ...despesasData]);
      }
      
      setHasMorePages(data.meta.currentPage < data.meta.totalPages);
      setCurrentPage(data.meta.currentPage);
      
    } catch (error) {
      handleError(error, 'Não foi possível carregar as despesas');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!loading) {
      loadDespesas(true);
    }
  }, [filter]);

  const loadMoreDespesas = () => {
    if (hasMorePages && !loadingMore && !loading) {
      loadDespesas(false);
    }
  };

  const handleViewAttachment = async (despesa: Despesa) => {
    if (!despesa.temAnexo) return;
    
    setLoadingImage(despesa.id);
    
    await tryCatch(async () => {
      const response = await DespesasApi.getAttachment(despesa.id);
      if (response?.success && response.data) {
        setPreviewUri(response.data.url);
      } else {
        throw new Error(response?.message || 'Erro ao carregar anexo');
      }
    }, 'Não foi possível carregar o anexo');
    
    setLoadingImage(null);
  };

  const getStatusTheme = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return { bg: '#FEF3C7', dot: '#F59E0B', text: '#B45309' };
      case 'APROVADO':
        return { bg: '#ECFDF5', dot: '#10B981', text: '#065F46' };
      case 'REPROVADO':
        return { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B' };
      default:
        return { bg: '#F3F4F6', dot: '#6B7280', text: '#374151' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'Pendente';
      case 'APROVADO': return 'Aprovado';
      case 'REPROVADO': return 'Reprovado';
      default: return status;
    }
  };

  const renderStatusBadge = (status: string) => {
    const theme = getStatusTheme(status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: theme.bg }] }>
        <View style={[styles.statusDot, { backgroundColor: theme.dot }]} />
        <Text style={[styles.statusText, { color: theme.text }]}>{getStatusLabel(status)}</Text>
      </View>
    );
  };

  const getCategoryLabel = (categoria: string) => {
    switch (categoria) {
      case 'ALIMENTACAO': return 'Alimentação';
      case 'TRANSPORTE': return 'Transporte';
      case 'HOSPEDAGEM': return 'Hospedagem';
      case 'COMBUSTIVEL': return 'Combustível';
      case 'OUTROS': return 'Outros';
      default: return categoria;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ALIMENTACAO': return Utensils;
      case 'TRANSPORTE': return Car;
      case 'HOSPEDAGEM': return Home;
      case 'COMBUSTIVEL': return Fuel;
      case 'OUTROS': return Package;
      default: return Receipt;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ALIMENTACAO': return '#F59E0B';
      case 'TRANSPORTE': return '#3B82F6';
      case 'HOSPEDAGEM': return '#8B5CF6';
      case 'COMBUSTIVEL': return '#10B981';
      case 'OUTROS': return '#EC4899';
      default: return '#6B7280';
    }
  };

  const formatDateLine = (isoDate: string, hora?: string) => {
    try {
      const d = new Date(isoDate);
      const dataFormatada = d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      return hora ? `${d.getDate()} ${dataFormatada.split(' ').slice(1).join(' ')}, ${hora}` : dataFormatada;
    } catch (e) {
      return isoDate;
    }
  };

  const formatCurrency = (value: string, currency: string = 'BRL') => {
    try {
      const numericValue = parseFloat(value);
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
      }).format(numericValue);
    } catch (e) {
      return value;
    }
  };

  const renderDespesa = ({ item }: { item: Despesa }) => {
    const TipoIcon = getTipoIcon(item.tipo);
    const tipoColor = getTipoColor(item.tipo);

    return (
      <Pressable onPress={() => router.push({ pathname: '/despesas/[id]', params: { id: item.id } })}>
        <Card style={styles.despesaCard}>
          <View style={styles.despesaHeader}>
            <View style={styles.despesaInfo}>
              <View style={styles.despesaInfoRow}>
                <View style={[styles.iconBox, { backgroundColor: tipoColor }]}>
                  <TipoIcon size={20} color="#FFFFFF" />
                </View>
                <View style={styles.despesaInfoText}>
                  <Text style={styles.despesaTitle}>{item.nome}</Text>
                  <Text style={styles.categoria}>{getCategoryLabel(item.tipo)}</Text>
                  {item.data && (
                    <Text style={styles.dataLine} numberOfLines={1} ellipsizeMode="tail">
                      {formatDateLine(item.data, item.hora)}
                    </Text>
                  )}
                  {item.rota && (
                    <Pressable
                      hitSlop={4}
                      onPress={(e) => {
                        e.stopPropagation();
                        setTooltipText(`Rota: ${item.rota}`);
                      }}
                      onLongPress={(e) => {
                        e.stopPropagation();
                        setTooltipText(`Rota: ${item.rota}`);
                      }}
                    >
                      <Text style={styles.rotaLine} numberOfLines={1} ellipsizeMode="tail">
                        Rota: {item.rota}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.despesaStatus}>
              <Text style={styles.valor}>{formatCurrency(item.valor, 'BRL')}</Text>
              <View style={styles.statusContainer}>
                {renderStatusBadge(item.status || 'PENDENTE')}
                {item.temAnexo && (
                  <TouchableOpacity 
                    onPress={() => handleViewAttachment(item)}
                    style={styles.attachmentButton}
                    disabled={loadingImage === item.id}
                  >
                    {loadingImage === item.id ? (
                      <ActivityIndicator size={16} color="#1E40AF" />
                    ) : (
                      <Eye size={18} color="#1E40AF" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.despesaDetails}>
            <Text style={styles.data}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.hora}>{item.hora}</Text>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#1E40AF" />
        <Text style={styles.loadingMoreText}>Carregando mais despesas...</Text>
      </View>
    );
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroTitleContainer}>
              <View style={styles.heroIconContainer}>
                <CreditCard size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.heroTitle}>Despesas</Text>
                <Text style={styles.heroSubtitle}>Gerencie suas despesas corporativas</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando despesas...</Text>
          </View>
        ) : (
          <>
            <View style={styles.filters}>
              <TouchableOpacity 
                style={[styles.filterButton, filter === 'PENDENTE' && styles.filterButtonActive]}
                onPress={() => setFilter('PENDENTE')}
              >
                <Text style={[styles.filterText, filter === 'PENDENTE' && styles.filterTextActive]}>Pendentes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterButton, filter === 'APROVADO' && styles.filterButtonActive]}
                onPress={() => setFilter('APROVADO')}
              >
                <Text style={[styles.filterText, filter === 'APROVADO' && styles.filterTextActive]}>Aprovadas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterButton, filter === 'REPROVADO' && styles.filterButtonActive]}
                onPress={() => setFilter('REPROVADO')}
              >
                <Text style={[styles.filterText, filter === 'REPROVADO' && styles.filterTextActive]}>Reprovadas</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={despesas}
              renderItem={renderDespesa}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMoreDespesas}
              onEndReachedThreshold={0.1}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhuma despesa encontrada</Text>
                  <Text style={styles.emptySubtext}>
                    {`Nenhuma despesa ${getStatusLabel(filter)} encontrada`}
                  </Text>
                </View>
              }
            />
          </>
        )}

        <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPreviewUri(null)}>
            {previewUri && (
              <Image 
                source={{ uri: previewUri }} 
                style={styles.modalImage} 
                resizeMode="contain"
                onError={() => {
                  handleError(new Error('Falha ao carregar imagem'), 'Não foi possível exibir a imagem');
                  setPreviewUri(null);
                }}
              />
            )}
          </TouchableOpacity>
        </Modal>

        <Modal visible={!!tooltipText} transparent animationType="fade" onRequestClose={() => setTooltipText(null)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTooltipText(null)}>
            {tooltipText && (
              <View style={styles.tooltipBox}>
                <Text style={styles.tooltipText}>{tooltipText}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
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
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1E40AF',
    backgroundColor: 'transparent',
  },
  filterButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1E40AF',
  },
  filterText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  filterTextActive: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  despesaCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  despesaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  despesaInfo: {
    flex: 1,
  },
  despesaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  despesaInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  despesaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  categoria: {
    fontSize: 13,
    color: '#6B7280',
  },
  despesaStatus: {
    alignItems: 'flex-end',
  },
  valor: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  despesaDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  data: {
    fontSize: 12,
    color: '#6B7280',
  },
  hora: {
    fontSize: 12,
    color: '#6B7280',
  },
  rotaText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  dataLine: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rotaLine: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  attachmentButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '90%', height: '80%' },
  statusCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tooltipBox: {
    maxWidth: '85%',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipText: {
    fontSize: 14,
    color: '#111827',
  },
}); 