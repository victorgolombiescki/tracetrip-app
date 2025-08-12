import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Users, Wallet, Info, ListChecks, AlertTriangle } from 'lucide-react-native';
import { RotasApi } from '@/src/services/api/modules/rotas';
import { LinearGradient } from 'expo-linear-gradient';

interface RotaDetalhe {
  nomeViagem: string;
  orcamentoTotal: number;
  despesasTotal: number;
  participantes: string[];
  orientacoes: string[];
  breakdown: Array<{ categoria: string; valor: number }>;
  ocorrencias: Array<{ tipo: 'ocorrencia' | 'tarefa'; dataHora: string; participante: string; descricao: string; categoria?: string; usuario?: any } | any>;
  orcamentosTipo?: Array<{ id: number; tipo: string; orcamento: number | string; utilizado: number | string; disponivel: number | string; porParticipante: boolean }>; 
}

export default function RotaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detalhe, setDetalhe] = useState<RotaDetalhe | null>(null);

  useEffect(() => {
    const load = async () => {
      const resp = await RotasApi.getById(id!);
      if (resp.success && resp.data) {
        setDetalhe(resp.data as RotaDetalhe);
      }
    };
    load();
  }, [id]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const toNumber = (val: any): number => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };



  if (!detalhe) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Rota</Text>
            <View style={{ width:22 }} />
          </View>
        </LinearGradient>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color:'#6B7280' }}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const restante = (detalhe.orcamentoTotal || 0) - (detalhe.despesasTotal || 0);
  const usoPct = detalhe.orcamentoTotal > 0 ? Math.round((detalhe.despesasTotal / detalhe.orcamentoTotal) * 100) : 0;
  const totalBreakdown = (detalhe.breakdown || []).reduce((acc, b) => acc + (b.valor || 0), 0);

  const humanTipo = (t: string) => {
    const s = (t || '').toString().toLowerCase();
    if (s.includes('hosp')) return 'Hospedagem';
    if (s.includes('transp')) return 'Transporte';
    if (s.includes('comb')) return 'Combustível';
    if (s.includes('aliment')) return 'Alimentação';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Detalhes da viagem</Text>
          <View style={{ width:22 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{detalhe.nomeViagem}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Wallet size={18} color="#1E40AF" />
              <View style={styles.statTexts}>
                <Text style={styles.statLabel}>Orçamento</Text>
                <Text style={styles.statValue}>{fmt(detalhe.orcamentoTotal)}</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Info size={18} color="#1E40AF" />
              <View style={styles.statTexts}>
                <Text style={styles.statLabel}>Usado</Text>
                <Text style={styles.statValue}>{fmt(detalhe.despesasTotal)} ({usoPct}%)</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Info size={18} color="#1E40AF" />
              <View style={styles.statTexts}>
                <Text style={styles.statLabel}>Restante</Text>
                <Text style={styles.statValue}>{fmt(restante)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, usoPct))}%` }]} />
            </View>
            <Text style={styles.progressText}>{usoPct}% do orçamento utilizado</Text>
          </View>
        </View>

        {detalhe.breakdown?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Gastos por tipo</Text>
            {(detalhe.breakdown).map((b, idx) => {
              const pct = totalBreakdown > 0 ? Math.round((b.valor / totalBreakdown) * 100) : 0;
              return (
                <View key={idx} style={{ marginBottom: 10 }}>
                  <View style={styles.breakHeader}>
                    <Text style={styles.breakLabel}>{b.categoria}</Text>
                    <Text style={styles.breakValue}>{fmt(b.valor)} ({pct}%)</Text>
                  </View>
                  <View style={styles.breakTrack}>
                    <View style={[styles.breakFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {detalhe.orcamentosTipo && detalhe.orcamentosTipo.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Limites por tipo</Text>
            {detalhe.orcamentosTipo.map((o, idx) => {
              const limite = toNumber(o.orcamento);
              return (
                <View key={o.id ?? idx} style={{ marginBottom: 12 }}>
                  <View style={styles.limitHeader}>
                    <Text style={styles.limitLabel}>{humanTipo(o.tipo)}</Text>
                    {o.porParticipante && (
                      <View style={styles.limitBadge}><Text style={styles.limitBadgeText}>por participante</Text></View>
                    )}
                  </View>
                  <View style={styles.limitRowNums}>
                    <Text style={styles.limitNumText}>Limite: {fmt(limite)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {detalhe.orientacoes?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Orientações gerais</Text>
            {detalhe.orientacoes.map((o, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{o}</Text>
              </View>
            ))}
          </View>
        )}

        {detalhe.ocorrencias?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ocorrências / Tarefas</Text>
            {detalhe.ocorrencias.map((oc: any, idx: number) => {
              const tipo = (oc?.categoria || '').toUpperCase() === 'OCORRENCIA' ? 'ocorrencia' : 'tarefa';
              const actor = oc?.usuario?.nome || oc?.participante?.nome || '-';
              const when = oc?.dataHora ? new Date(oc.dataHora).toLocaleString('pt-BR') : '';
              const badgeBg = tipo === 'ocorrencia' ? '#FDE68A' : '#DBEAFE';
              const lineColor = tipo === 'ocorrencia' ? '#F59E0B' : '#3B82F6';
              return (
                <View key={idx} style={[styles.ocCard, { borderLeftColor: lineColor }]}> 
                  <View style={[styles.ocBadge, { backgroundColor: badgeBg }] }>
                    {tipo === 'ocorrencia' ? <AlertTriangle size={14} color="#92400E" /> : <ListChecks size={14} color="#1E40AF" />}
                    <Text style={styles.ocBadgeText}>{tipo}</Text>
                  </View>
                  <Text style={styles.ocMain}>{when}{when ? ' • ' : ''}{actor}</Text>
                  <Text style={styles.ocDesc}>{oc?.descricao || ''}</Text>
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
  container: { flex:1, backgroundColor:'#F6F7FB' },
  hero: { paddingHorizontal:16, paddingTop:16, paddingBottom:16, borderBottomRightRadius:28 },
  heroRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  heroTitle: { color:'#fff', fontSize:20, fontWeight:'700' },
  backBtn: { padding:6, borderRadius:999, backgroundColor:'rgba(255,255,255,0.15)' },
  content: { paddingHorizontal:16, paddingTop:16, paddingBottom:28, gap:16 },
  card: { backgroundColor:'white', borderRadius:14, padding:16, shadowColor:'#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.06, shadowRadius:6, elevation:2, gap:12 },
  sectionTitle: { fontSize:16, fontWeight:'700', color:'#111827' },
  statsGrid: { flexDirection:'column', gap:10 },
  statCard: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#F9FAFB', borderRadius:12, paddingVertical:12, paddingHorizontal:12, width:'100%' },
  statTexts: { flex:1 },
  statLabel: { fontSize:12, color:'#6B7280' },
  statValue: { fontSize:15, fontWeight:'700', color:'#111827' },

  progressWrap: { marginTop: 4 },
  progressTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#1E40AF' },
  progressText: { marginTop: 6, fontSize: 12, color: '#6B7280' },

  participantsChips: { flexDirection:'row', gap:8, alignItems:'flex-start', flexWrap:'wrap' },
  chipsWrap: { flexDirection:'row', flexWrap:'wrap', gap:8, flex:1, width:'100%' },
  chip: { backgroundColor:'#EEF2FF', borderColor:'#C7D2FE', borderWidth:1, paddingVertical:6, paddingHorizontal:10, borderRadius:999, alignSelf:'flex-start', maxWidth:'100%' },
  chipText: { color:'#1E40AF', fontWeight:'600' },

  breakHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  breakLabel: { color:'#111827' },
  breakValue: { fontWeight:'700', color:'#111827' },
  breakTrack: { height:8, backgroundColor:'#E5E7EB', borderRadius:999, overflow:'hidden' },
  breakFill: { height:8, backgroundColor:'#1E40AF' },

  bulletRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:4 },
  bullet: { width:6, height:6, borderRadius:3, backgroundColor:'#1E40AF' },
  bulletText: { color:'#111827' },

  ocCard: { backgroundColor:'#F9FAFB', borderRadius:12, padding:12, gap:4, borderLeftWidth:4 },
  ocBadge: { alignSelf:'flex-start', flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:8, paddingVertical:4, borderRadius:999 },
  ocBadgeText: { textTransform:'capitalize', color:'#374151', fontWeight:'700', fontSize:12 },
  ocMain: { color:'#111827', fontWeight:'600' },
  ocDesc: { color:'#6B7280' },

  limitHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  limitLabel: { color:'#111827', fontWeight:'700' },
  limitBadge: { backgroundColor:'#EEF2FF', borderRadius:999, paddingHorizontal:8, paddingVertical:4 },
  limitBadgeText: { color:'#1E40AF', fontSize:12, fontWeight:'700' },
  limitTrack: { height:8, backgroundColor:'#E5E7EB', borderRadius:999, overflow:'hidden' },
  limitFill: { height:8, backgroundColor:'#1E40AF' },
  limitRowNums: { marginTop:6, flexDirection:'row', justifyContent:'space-between' },
  limitNumText: { fontSize:12, color:'#6B7280', fontWeight:'600' },
}); 