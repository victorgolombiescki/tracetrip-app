import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CheckCircle, Circle } from 'lucide-react-native';
import { apiClient } from '@/src/services/api/ApiClient';
import Toast from 'react-native-toast-message';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  status: string;
  createdAt: string;
  viagemId?: number;
  dadosAdicionais?: any;
}

export default function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    carregarNotificacoes();
    carregarContadorNaoLidas();
  }, []);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getNotificacoes(undefined, 50, 0);
      if (response.success && response.data) {
        setNotificacoes(response.data.notificacoes || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar as notificações',
        position: 'top',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const carregarContadorNaoLidas = async () => {
    try {
      const response = await apiClient.contarNotificacoesNaoLidas();
      if (response.success && response.data) {
        setTotalNaoLidas(response.data.count || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar contador:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarNotificacoes();
    carregarContadorNaoLidas();
  };

  const marcarComoLida = async (notificacao: Notificacao) => {
    if (notificacao.status === 'LIDA') return;

    try {
      const response = await apiClient.marcarNotificacaoComoLida(notificacao.id);
      if (response.success) {
        setNotificacoes(prev =>
          prev.map(n =>
            n.id === notificacao.id ? { ...n, status: 'LIDA' } : n
          )
        );
        setTotalNaoLidas(prev => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      console.error('Erro ao marcar como lida:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível marcar a notificação como lida',
        position: 'top',
      });
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const response = await apiClient.marcarTodasNotificacoesComoLidas();
      if (response.success) {
        setNotificacoes(prev =>
          prev.map(n => ({ ...n, status: 'LIDA' }))
        );
        setTotalNaoLidas(0);
        Toast.show({
          type: 'success',
          text1: 'Sucesso',
          text2: 'Todas as notificações foram marcadas como lidas',
          position: 'top',
        });
      }
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível marcar todas como lidas',
        position: 'top',
      });
    }
  };

  const formatarData = (data: string) => {
    try {
      return formatDistanceToNow(new Date(data), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return '';
    }
  };

  const getIconForTipo = (tipo: string) => {
    if (tipo.includes('RESERVA') || tipo.includes('KM')) return '🚗';
    if (tipo.includes('VIAGEM')) return '✈️';
    if (tipo.includes('CLIENTE')) return '👥';
    if (tipo.includes('RESUMO')) return '📊';
    return '🔔';
  };

  if (loading && notificacoes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificações</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#254985" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={[styles.statusBarBackground, { height: insets.top }]} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {totalNaoLidas > 0 && (
          <TouchableOpacity onPress={marcarTodasComoLidas} style={styles.marcarTodasButton}>
            <Text style={styles.marcarTodasText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
        {totalNaoLidas === 0 && <View style={styles.backButton} />}
      </View>

      {totalNaoLidas > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {totalNaoLidas} {totalNaoLidas === 1 ? 'não lida' : 'não lidas'}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#254985" />
        }
      >
        {notificacoes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
            <Text style={styles.emptyDescription}>
              Você não possui notificações no momento
            </Text>
          </View>
        ) : (
          <View style={styles.notificacoesList}>
            {notificacoes.map((notificacao) => (
              <TouchableOpacity
                key={notificacao.id}
                style={[
                  styles.notificacaoItem,
                  notificacao.status === 'NAO_LIDA' && styles.notificacaoNaoLida
                ]}
                onPress={() => marcarComoLida(notificacao)}
                activeOpacity={0.7}
              >
                <View style={styles.notificacaoContent}>
                  <View style={styles.notificacaoIcon}>
                    <Text style={styles.iconEmoji}>{getIconForTipo(notificacao.tipo)}</Text>
                  </View>
                  <View style={styles.notificacaoInfo}>
                    <View style={styles.notificacaoHeader}>
                      <Text style={styles.notificacaoTitulo} numberOfLines={1}>
                        {notificacao.titulo}
                      </Text>
                      {notificacao.status === 'NAO_LIDA' ? (
                        <Circle size={12} color="#254985" fill="#254985" />
                      ) : (
                        <CheckCircle size={12} color="#9CA3AF" fill="#9CA3AF" />
                      )}
                    </View>
                    <Text style={styles.notificacaoMensagem} numberOfLines={2}>
                      {notificacao.mensagem}
                    </Text>
                    <Text style={styles.notificacaoData}>
                      {formatarData(notificacao.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  marcarTodasButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  marcarTodasText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#254985',
  },
  badgeContainer: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#254985',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  notificacoesList: {
    padding: 16,
  },
  notificacaoItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificacaoNaoLida: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BFDBFE',
  },
  notificacaoContent: {
    flexDirection: 'row',
    gap: 12,
  },
  notificacaoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  notificacaoInfo: {
    flex: 1,
    gap: 4,
  },
  notificacaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notificacaoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  notificacaoMensagem: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  notificacaoData: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

