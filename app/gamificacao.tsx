import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Trophy,
  Award,
  ArrowLeft,
  CheckCircle,
  TrendingUp,
  Medal,
  MapPin,
  Receipt,
  AlertCircle,
} from 'lucide-react-native';
import { GamificacaoApi } from '@/src/services/api/modules/gamificacao';
import { useRouter } from 'expo-router';

export default function GamificacaoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gamificacao, setGamificacao] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGamificacao();
  }, []);

  const loadGamificacao = async () => {
    try {
      setLoading(true);
      const response = await GamificacaoApi.getGamificacao();

      if (response.success && response.data) {
        setGamificacao(response.data);
      } else {
        setError(response.message || 'Erro ao carregar dados de gamificação');
      }
    } catch (err) {
      console.error('Erro ao carregar gamificação:', err);
      setError('Erro ao carregar dados de gamificação');
    } finally {
      setLoading(false);
    }
  };

  const toNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !gamificacao) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Erro ao carregar dados'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadGamificacao}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pontosRaw = gamificacao.pontos || {};
  const pontos = {
    usuarioId: pontosRaw.usuarioId || 0,
    totalPontos: toNumber(pontosRaw.totalPontos),
    nivel: toNumber(pontosRaw.nivel) || 1,
    pontosDespesas: toNumber(pontosRaw.pontosDespesas),
    pontosRastreamento: toNumber(pontosRaw.pontosRastreamento),
    pontosCheckin: toNumber(pontosRaw.pontosCheckin),
    pontosOcorrencias: toNumber(pontosRaw.pontosOcorrencias),
  };

  const badges = gamificacao.badges || [];
  const posicaoRanking = gamificacao.posicaoRanking || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Principal Stats - 4 cards em linha */}
        <View style={styles.mainStatsRow}>
          <View style={styles.mainStatCard}>
            <Trophy size={20} color="#FFD700" />
            <Text style={styles.mainStatValue}>{pontos.totalPontos.toFixed(0)}</Text>
            <Text style={styles.mainStatLabel}>Pontos</Text>
          </View>

          <View style={styles.mainStatCard}>
            <Medal size={20} color="#10B981" />
            <Text style={styles.mainStatValue}>{pontos.nivel}</Text>
            <Text style={styles.mainStatLabel}>Nível</Text>
          </View>

          <View style={styles.mainStatCard}>
            <TrendingUp size={20} color="#2563EB" />
            <Text style={styles.mainStatValue}>{posicaoRanking || 0}</Text>
            <Text style={styles.mainStatLabel}>Ranking</Text>
          </View>

          <View style={styles.mainStatCard}>
            <CheckCircle size={20} color="#EC4899" />
            <Text style={styles.mainStatValue}>{badges.length}</Text>
            <Text style={styles.mainStatLabel}>Badges</Text>
          </View>
        </View>

        {/* Estatísticas Detalhadas */}
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <View style={styles.detailStatsGrid}>
          <View style={styles.detailStatCard}>
            <Receipt size={18} color="#2563EB" />
            <Text style={styles.detailStatValue}>{pontos.pontosDespesas.toFixed(0)}</Text>
            <Text style={styles.detailStatLabel}>Despesas</Text>
          </View>

          <View style={styles.detailStatCard}>
            <CheckCircle size={18} color="#EC4899" />
            <Text style={styles.detailStatValue}>{pontos.pontosCheckin.toFixed(0)}</Text>
            <Text style={styles.detailStatLabel}>Check-ins</Text>
          </View>

          <View style={styles.detailStatCard}>
            <MapPin size={18} color="#10B981" />
            <Text style={styles.detailStatValue}>{pontos.pontosRastreamento.toFixed(0)}</Text>
            <Text style={styles.detailStatLabel}>Rastreamento</Text>
          </View>

          <View style={styles.detailStatCard}>
            <AlertCircle size={18} color="#F59E0B" />
            <Text style={styles.detailStatValue}>{pontos.pontosOcorrencias.toFixed(0)}</Text>
            <Text style={styles.detailStatLabel}>Ocorrências</Text>
          </View>
        </View>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Badges Conquistadas</Text>
        {badges.length === 0 ? (
          <View style={styles.emptyState}>
            <Award size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhum badge conquistado ainda</Text>
          </View>
        ) : (
          <View style={styles.badgesList}>
            {badges.map((badge: any, index: number) => {
              const shapeStyle = index % 4 === 0 ? styles.badgeShapeRound : 
                               index % 4 === 1 ? styles.badgeShapeHexagon :
                               index % 4 === 2 ? styles.badgeShapeDiamond : styles.badgeShapeStar;
              return (
                <View key={badge.id} style={styles.badgeItem}>
                  <View style={[styles.badgeContainer, { backgroundColor: badge.badgeCor }]}>
                    <View style={shapeStyle}>
                      <Award size={24} color="white" style={styles.badgeInnerIcon} />
                    </View>
                  </View>
                  <View style={styles.badgeContent}>
                    <Text style={styles.badgeName}>{badge.badgeNome}</Text>
                    <Text style={styles.badgeDescription}>{badge.badgeDescricao}</Text>
                    {badge.createdAt && (
                      <Text style={styles.badgeDate}>
                        {new Date(badge.createdAt).toLocaleDateString('pt-BR')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
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
  mainStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  mainStatCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 6,
  },
  mainStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  detailStatCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 8,
  },
  detailStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '500',
  },
  badgesList: {
    gap: 12,
  },
  badgeItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  badgeContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeShapeRound: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeShapeHexagon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeShapeDiamond: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInnerIcon: {
    transform: [{ rotate: '0deg' }],
  },
  badgeShapeStar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  badgeContent: {
    flex: 1,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  badgeDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
