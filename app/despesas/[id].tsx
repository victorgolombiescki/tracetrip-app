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
        return { bg: 'rgba(245,158,11,0.1)', dot: '#F59E0B', text: '#B45309', label: 'Pendente' };
      case 'APROVADO':
        return { bg: 'rgba(16,185,129,0.1)', dot: '#10B981', text: '#065F46', label: 'Aprovado' };
      case 'REPROVADO':
        return { bg: 'rgba(239,68,68,0.1)', dot: '#EF4444', text: '#991B1B', label: 'Reprovado' };
      default:
        return { bg: 'rgba(107,114,128,0.1)', dot: '#6B7280', text: '#374151', label: status || '-' };
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
  const tipoColor = '#2563EB'; 
  const statusTheme = getStatusTheme(detalhe.status);

  return (
    <SafeAreaView style={styles.container}> 
      <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
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
                {(() => {
                  const date = new Date(detalhe.data);
                  date.setTime(date.getTime() - (3 * 60 * 60 * 1000));
                  return date.toLocaleDateString('pt-BR');
                })()} • {(() => {
                  if (!detalhe.hora) return '-';
                  const [h, m] = detalhe.hora.split(':').map(Number);
                  if (isNaN(h) || isNaN(m)) return detalhe.hora;
                  
                  const horaObj = new Date();
                  horaObj.setHours(h, m);
                  horaObj.setHours(horaObj.getHours() - 3);
                  return `${String(horaObj.getHours()).padStart(2, '0')}:${String(horaObj.getMinutes()).padStart(2, '0')}`;
                })()} • {detalhe.tipo}
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
          <InfoRow label="Data" value={(() => {
            const date = new Date(detalhe.data);
            date.setTime(date.getTime() - (3 * 60 * 60 * 1000));
            return date.toLocaleDateString('pt-BR');
          })()} />
          <InfoRow label="Hora" value={(() => {
            if (!detalhe.hora) return '-';
            const [h, m] = detalhe.hora.split(':').map(Number);
            if (isNaN(h) || isNaN(m)) return detalhe.hora;
            
            const horaObj = new Date();
            horaObj.setHours(h, m);
            horaObj.setHours(horaObj.getHours() - 3);
            return `${String(horaObj.getHours()).padStart(2, '0')}:${String(horaObj.getMinutes()).padStart(2, '0')}`;
          })()} />
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topbar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarTitle: { fontSize: 16, fontWeight: '600', color: '#333333' },
  backButton: { padding: 6 },
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 10 },
  heroTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10 },
  iconCircle: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  nome: { color: 'white', fontSize: 16, fontWeight: '600' },
  subInfo: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  summaryRight: { alignItems: 'flex-end' },
  valorGrande: { color: 'white', fontSize: 18, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '600' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6B7280' },

  content: { padding: 20, gap: 12 },
  card: {
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    padding: 12,
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333333', 
    marginBottom: 4,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  label: { fontSize: 12, color: '#666666' },
  value: { fontSize: 12, fontWeight: '600', },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { 
    backgroundColor: 'rgba(37,99,235,0.06)', 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    borderRadius: 20,
    borderWidth: 0,
  },
  chipText: { color: '#2563EB', fontSize: 11, fontWeight: '500' },

  preview: { borderRadius: 8, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 160 },
  previewOverlay: { 
    position: 'absolute', 
    bottom: 8, 
    right: 8, 
    backgroundColor: 'rgba(37,99,235,0.8)', 
    borderRadius: 20, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  previewText: { color: 'white', fontWeight: '600', fontSize: 11 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '90%', height: '80%' },
}); 