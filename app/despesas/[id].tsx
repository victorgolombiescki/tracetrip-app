import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Eye, Utensils, Car, Home, Fuel, Package, Receipt } from 'lucide-react-native';
import { DespesasApi } from '@/src/services/api/modules/despesas';
import { LinearGradient } from 'expo-linear-gradient';

export default function DespesaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const load = async () => {
      const resp = await DespesasApi.getById(id!);
      if (resp.success) setDetalhe(resp.data);
    };
    load();
  }, [id]);

  const formatCurrency = (value: number | string, currency: string = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));

  const getTipoIcon = (tipo?: string) => {
    switch (tipo) {
      case 'ALIMENTACAO': return Utensils;
      case 'TRANSPORTE': return Car;
      case 'HOSPEDAGEM': return Home;
      case 'COMBUSTIVEL': return Fuel;
      case 'OUTROS': return Package;
      default: return Receipt;
    }
  };

  const getTipoColor = (tipo?: string) => {
    switch (tipo) {
      case 'ALIMENTACAO': return '#F59E0B';
      case 'TRANSPORTE': return '#3B82F6';
      case 'HOSPEDAGEM': return '#8B5CF6';
      case 'COMBUSTIVEL': return '#10B981';
      case 'OUTROS': return '#EC4899';
      default: return '#6B7280';
    }
  };

  const getStatusTheme = (status?: string) => {
    switch (status) {
      case 'PENDENTE':
        return { bg: '#FEF3C7', dot: '#F59E0B', text: '#B45309', label: 'Pendente' };
      case 'APROVADO':
        return { bg: '#ECFDF5', dot: '#10B981', text: '#065F46', label: 'Aprovado' };
      case 'REPROVADO':
        return { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B', label: 'Reprovado' };
      default:
        return { bg: '#F3F4F6', dot: '#6B7280', text: '#374151', label: status || '-' };
    }
  };

  if (!detalhe) {
    return (
      <SafeAreaView style={styles.container}> 
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topbarTitle}>Detalhe da despesa</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TipoIcon = getTipoIcon(detalhe.tipo);
  const tipoColor = getTipoColor(detalhe.tipo);
  const statusTheme = getStatusTheme(detalhe.status);

  return (
    <SafeAreaView style={styles.container}> 
      <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Despesa</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <View style={[styles.iconCircle, { backgroundColor: tipoColor }]}>
              <TipoIcon size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{detalhe.nome}</Text>
              <Text style={styles.subInfo} numberOfLines={1} ellipsizeMode="tail">
                {new Date(detalhe.data).toLocaleDateString('pt-BR')} • {detalhe.hora} • {detalhe.tipo}
              </Text>
              {detalhe.rota && (
                <Text style={styles.subInfo} numberOfLines={1} ellipsizeMode="tail">Rota: {detalhe.rota}</Text>
              )}
            </View>
          </View>

          <View style={styles.summaryRight}>
            <Text style={styles.valorGrande}>{formatCurrency(detalhe.valor)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusTheme.dot }]} />
              <Text style={[styles.statusText, { color: statusTheme.text }]}>{statusTheme.label}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <InfoRow label="Data" value={new Date(detalhe.data).toLocaleDateString('pt-BR')} />
          <InfoRow label="Hora" value={detalhe.hora} />
          <InfoRow label="Tipo" value={detalhe.tipo} />
          <InfoRow label="Reembolso" value={detalhe.teveReembolso ? 'Sim' : 'Não'} />
        </View>

        {detalhe.participantes?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Participantes</Text>
            <View style={styles.chipsWrap}>
              {detalhe.participantes.map((p: any) => (
                <View key={p.id} style={styles.chip}>
                  <Text style={styles.chipText}>{p.nome}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {detalhe.rateio?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rateio</Text>
            {detalhe.rateio.map((r: any, idx: number) => (
              <InfoRow key={`${r.participanteId}-${idx}`} label={r.nome} value={formatCurrency(r.valor)} />
            ))}
          </View>
        )}

        {detalhe.comprovanteUrl && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Comprovante</Text>
            <TouchableOpacity
              style={styles.preview}
              onPress={async () => {
                try {
                  setLoadingPreview(true);
                  const resp = await DespesasApi.getAttachment(id!);
                  if (resp.success && resp.data?.url) {
                    const url = resp.data.url;
                    setPreviewUrl(url);
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                      await Linking.openURL(url);
                    } else {
                      setImageOpen(true);
                    }
                  }
                } catch (e) {
                } finally {
                  setLoadingPreview(false);
                }
              }}
            >
              <Image source={{ uri: detalhe.comprovanteUrl }} style={styles.previewImage} />
              <View style={styles.previewOverlay}>
                <Eye size={16} color="#FFFFFF" />
                <Text style={styles.previewText}>Baixar</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={imageOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setImageOpen(false)}>
            {loadingPreview && <ActivityIndicator size="large" color="#FFFFFF" />}
            {previewUrl && (
              <Image
                source={{ uri: previewUrl }}
                style={styles.modalImage}
                resizeMode="contain"
                onError={() => {
                  setImageOpen(false);
                }}
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  topbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topbarTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  backButton: { padding: 6 },
  hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  heroTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 },
  iconCircle: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  nome: { color: 'white', fontSize: 18, fontWeight: '700' },
  subInfo: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  summaryRight: { alignItems: 'flex-end' },
  valorGrande: { color: 'white', fontSize: 22, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginTop: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6B7280' },

  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 16, fontWeight: '600', color: '#111827' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { color: '#1E40AF', fontWeight: '600' },

  preview: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 220 },
  previewOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewText: { color: 'white', fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '90%', height: '80%' },
}); 