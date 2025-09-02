import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Users, Wallet, Info, ListChecks, AlertTriangle, MapPin, ChevronDown, ChevronUp, Calendar, Clock, Phone } from 'lucide-react-native';
import { RotasApi } from '@/src/services/api/modules/rotas';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

interface RotaDetalhe {
  nomeViagem: string;
  orcamentoTotal: number;
  despesasTotal: number;
  participantes: string[];
  orientacoes: string[];
  breakdown: Array<{ categoria: string; valor: number }>;
  ocorrencias: Array<{ tipo: 'ocorrencia' | 'tarefa'; dataHora: string; participante: string; descricao: string; categoria?: string; usuario?: any } | any>;
  orcamentosTipo?: Array<{ id: number; tipo: string; orcamento: number | string; utilizado: number | string; disponivel: number | string; porParticipante: boolean }>;
  visitas?: Array<{
    id: number;
    titulo: string;
    dataHoraInicio: string;
    dataHoraFim: string;
    local: {
      id: number;
      nome: string;
      endereco: string;
      cidade: string;
      estado: string;
      cep: string;
      telefone: string;
      nomeContato: string;
      statusConfirmacao: string;
    } | null;
    status: string;
    statusConfirmacao: boolean;
  }>;
}

export default function RotaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detalhe, setDetalhe] = useState<RotaDetalhe | null>(null);
  const [expandedVisitas, setExpandedVisitas] = useState<Record<number, boolean>>({});
  const [visitasSectionExpanded, setVisitasSectionExpanded] = useState(false);
  const [ocorrenciasSectionExpanded, setOcorrenciasSectionExpanded] = useState(false);

  const toggleVisita = (visitaId: number) => {
    setExpandedVisitas(prev => ({
      ...prev,
      [visitaId]: !prev[visitaId]
    }));
  };

  const toggleVisitasSection = () => {
    setVisitasSectionExpanded(!visitasSectionExpanded);
  };

  const toggleOcorrenciasSection = () => {
    setOcorrenciasSectionExpanded(!ocorrenciasSectionExpanded);
  };

  useEffect(() => {
    const load = async () => {
      const resp = await RotasApi.getById(id!);
      if (resp.success && resp.data) {
        if (resp.data.visitas && resp.data.visitas.length > 0) {
          resp.data.visitas.sort((a: any, b: any) => {
            return new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime();
          });
        }
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setHours(date.getHours() - 3);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setHours(date.getHours() - 3);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const openMapsApp = (app: 'waze' | 'google', address: string, lat?: number, lng?: number) => {
    let url = '';
    const encodedAddress = encodeURIComponent(address);
    
    if (app === 'waze') {
      url = `waze://?q=${encodedAddress}`;
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://waze.com/ul?q=${encodedAddress}`);
        }
      }).catch(err => {
        Linking.openURL(`https://waze.com/ul?q=${encodedAddress}`);
      });
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
    }
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

        {detalhe.visitas && detalhe.visitas.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={toggleVisitasSection}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Visitas programadas ({detalhe.visitas.length})</Text>
              {visitasSectionExpanded ? (
                <ChevronUp size={20} color="#111827" />
              ) : (
                <ChevronDown size={20} color="#111827" />
              )}
            </TouchableOpacity>
            
            {visitasSectionExpanded && (
              <View style={styles.visitasContainer}>
                {detalhe.visitas.map((visita) => (
                  <View key={visita.id} style={styles.visitaCard}>
                    <TouchableOpacity 
                      style={styles.visitaHeader} 
                      onPress={() => toggleVisita(visita.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.visitaHeaderLeft}>
                        <MapPin size={18} color="#1E40AF" />
                        <View style={styles.visitaHeaderInfo}>
                          <Text style={styles.visitaTitulo}>{visita.titulo}</Text>
                          {visita.local && (
                            <Text style={styles.visitaLocal}>{visita.local.nome}</Text>
                          )}
                        </View>
                      </View>
                      {expandedVisitas[visita.id] ? (
                        <ChevronUp size={20} color="#6B7280" />
                      ) : (
                        <ChevronDown size={20} color="#6B7280" />
                      )}
                    </TouchableOpacity>
                    
                    {expandedVisitas[visita.id] && (
                      <View style={styles.visitaContent}>
                        <View style={styles.visitaInfoRow}>
                          <Calendar size={16} color="#6B7280" />
                          <Text style={styles.visitaInfoText}>
                            {formatDate(visita.dataHoraInicio)}
                          </Text>
                        </View>
                        <View style={styles.visitaInfoRow}>
                          <Clock size={16} color="#6B7280" />
                          <Text style={styles.visitaInfoText}>
                            {formatTime(visita.dataHoraInicio)} - {formatTime(visita.dataHoraFim)}
                          </Text>
                        </View>
                        
                        {visita.local && (
                          <>
                            <View style={styles.visitaDivider} />
                            
                            <View style={styles.visitaInfoRow}>
                              <MapPin size={14} color="#4B5563" />
                              <Text style={styles.visitaInfoText}>
                                {visita.local.endereco}, {visita.local.cidade} - {visita.local.estado}
                              </Text>
                            </View>
                            
                            <View style={styles.navigationButtons}>
                              <TouchableOpacity 
                                style={[styles.navigationButton, styles.googleButton]}
                                onPress={() => openMapsApp('google', `${visita.local?.endereco}, ${visita.local?.cidade} - ${visita.local?.estado}`)}
                              >
                                <View style={styles.navigationButtonIcon}>
                                  <Svg width="22" height="22" viewBox="0 0 256 262">
                                    <Path 
                                      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" 
                                      fill="#4285F4"
                                    />
                                    <Path 
                                      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" 
                                      fill="#34A853"
                                    />
                                    <Path 
                                      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" 
                                      fill="#FBBC05"
                                    />
                                    <Path 
                                      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" 
                                      fill="#EB4335"
                                    />
                                  </Svg>
                                </View>
                                <Text style={styles.googleButtonText}>Google Maps</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity 
                                style={[styles.navigationButton, styles.wazeButton]}
                                onPress={() => openMapsApp('waze', `${visita.local?.endereco}, ${visita.local?.cidade} - ${visita.local?.estado}`)}
                              >
                                <View style={styles.navigationButtonIcon}>
                                  <Svg width="22" height="22" viewBox="0 0 512 512">
                                    <Path
                                      d="M257.56,92.793c-81.171,0-147.275,66.088-147.275,147.275c0,107.708,147.275,179.212,147.275,179.212 s147.275-83.179,147.275-179.212C404.835,158.881,338.731,92.793,257.56,92.793z M257.56,297.994 c-32.138,0-58.283-26.145-58.283-58.283c0-32.138,26.145-58.283,58.283-58.283s58.283,26.145,58.283,58.283 C315.843,271.849,289.698,297.994,257.56,297.994z"
                                      fill="#33CCFF"
                                    />
                                    <Path
                                      d="M450.742,168.242c-15.336-68.657-68.452-121.774-137.11-137.11c-23.342-5.212-47.739-5.212-71.081,0 c-68.657,15.336-121.774,68.452-137.11,137.11c-5.212,23.342-5.212,47.739,0,71.081c3.286,14.713,8.615,28.854,15.801,42.012 c1.519,2.782,4.393,4.355,7.366,4.355c1.259,0,2.534-0.267,3.746-0.83c4.065-1.886,5.827-6.705,3.941-10.77 c-6.471-11.945-11.267-24.766-14.242-38.116c-4.69-20.995-4.69-42.926,0-63.921c13.802-61.77,61.77-109.738,123.54-123.54 c20.995-4.69,42.926-4.69,63.921,0c61.77,13.802,109.738,61.77,123.54,123.54c4.69,20.995,4.69,42.926,0,63.921 c-13.802,61.77-61.77,109.738-123.54,123.54c-20.995,4.69-42.926,4.69-63.921,0c-11.945-2.667-23.374-6.703-34.015-12.003 c-3.921-1.951-8.703-0.353-10.654,3.568c-1.951,3.921-0.353,8.703,3.568,10.654c11.88,5.91,24.613,10.423,37.91,13.384 c23.342,5.212,47.739,5.212,71.081,0c68.657-15.336,121.774-68.452,137.11-137.11 C455.954,215.981,455.954,191.584,450.742,168.242L450.742,168.242z"
                                      fill="#33CCFF"
                                    />
                                    <Path
                                      d="M257.56,198.138c-22.952,0-41.631,18.678-41.631,41.631c0,22.952,18.678,41.631,41.631,41.631 c22.952,0,41.631-18.678,41.631-41.631C299.19,216.817,280.512,198.138,257.56,198.138z M257.56,264.748 c-13.771,0-24.979-11.208-24.979-24.979c0-13.771,11.208-24.979,24.979-24.979c13.771,0,24.979,11.208,24.979,24.979 C282.538,253.541,271.331,264.748,257.56,264.748z"
                                      fill="#33CCFF"
                                    />
                                  </Svg>
                                </View>
                                <Text style={styles.wazeButtonText}>Waze</Text>
                              </TouchableOpacity>
                            </View>
                            
                            {visita.local.telefone && (
                              <View style={styles.visitaInfoRow}>
                                <Phone size={14} color="#4B5563" />
                                <Text style={styles.visitaInfoText}>{visita.local.telefone}</Text>
                              </View>
                            )}
                            
                            {visita.local.nomeContato && (
                              <View style={styles.visitaInfoRow}>
                                <Users size={14} color="#4B5563" />
                                <Text style={styles.visitaInfoText}>{visita.local.nomeContato}</Text>
                              </View>
                            )}
                            
                            <View style={styles.visitaStatusRow}>
                              <View style={[
                                styles.visitaStatusBadge, 
                                {backgroundColor: visita.statusConfirmacao ? '#DCFCE7' : '#FEF2F2'}
                              ]}>
                                <Text style={[
                                  styles.visitaStatusText, 
                                  {color: visita.statusConfirmacao ? '#166534' : '#991B1B'}
                                ]}>
                                  {visita.statusConfirmacao ? 'Confirmado' : 'Não confirmado'}
                                </Text>
                              </View>
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {detalhe.ocorrencias?.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={toggleOcorrenciasSection}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Ocorrências / Tarefas ({detalhe.ocorrencias.length})</Text>
              {ocorrenciasSectionExpanded ? (
                <ChevronUp size={20} color="#111827" />
              ) : (
                <ChevronDown size={20} color="#111827" />
              )}
            </TouchableOpacity>
            
            {ocorrenciasSectionExpanded && (
              <View style={styles.ocorrenciasContainer}>
                {detalhe.ocorrencias.map((oc: any, idx: number) => {
                  const tipo = (oc?.categoria || '').toUpperCase() === 'OCORRENCIA' ? 'ocorrencia' : 'tarefa';
                  const actor = oc?.usuario?.nome || oc?.participante?.nome || '-';
                  
                  const when = oc?.dataHora ? (() => {
                    const data = new Date(oc.dataHora);
                    data.setHours(data.getHours() - 3);
                    return data.toLocaleString('pt-BR');
                  })() : '';
                  
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
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#FFFFFF' },
  hero: { 
    paddingHorizontal:20, 
    paddingTop:8, 
    paddingBottom:16, 
    borderBottomLeftRadius:24,
    borderBottomRightRadius:24
  },
  heroRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  heroTitle: { color:'#fff', fontSize:20, fontWeight:'700' },
  backBtn: { 
    padding:7, 
    borderRadius:10, 
    backgroundColor:'rgba(255,255,255,0.15)' 
  },
  content: { paddingHorizontal:20, paddingTop:20, paddingBottom:100, gap:16 },
  card: { backgroundColor:'#F5F9FF', borderRadius:8, padding:12, gap:10, borderWidth: 0 },
  sectionTitle: { fontSize:14, fontWeight:'600', color:'#333333', letterSpacing: -0.3, textTransform: 'uppercase', marginBottom: 4 },
  statsGrid: { flexDirection:'column', gap:8 },
  statCard: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'white', borderRadius:8, paddingVertical:10, paddingHorizontal:10, width:'100%' },
  statTexts: { flex:1 },
  statLabel: { fontSize:11, color:'#6B7280', marginBottom: 2 },
  statValue: { fontSize:13, fontWeight:'600' },

  progressWrap: { marginTop: 8 },
  progressTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#2563EB' },
  progressText: { marginTop: 4, fontSize: 10, color: '#6B7280' },

  participantsChips: { flexDirection:'row', gap:8, alignItems:'flex-start', flexWrap:'wrap' },
  chipsWrap: { flexDirection:'row', flexWrap:'wrap', gap:8, flex:1, width:'100%' },
  chip: { backgroundColor:'#EEF2FF', borderColor:'#C7D2FE', borderWidth:1, paddingVertical:6, paddingHorizontal:10, borderRadius:999, alignSelf:'flex-start', maxWidth:'100%' },
  chipText: { color:'#1E40AF', fontWeight:'600' },

  breakHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  breakLabel: { color:'#333333', fontSize: 12 },
  breakValue: { fontWeight:'600', fontSize: 12 },
  breakTrack: { height:6, backgroundColor:'#E5E7EB', borderRadius:999, overflow:'hidden' },
  breakFill: { height:6, backgroundColor:'#2563EB' },

  bulletRow: { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:3 },
  bullet: { width:5, height:5, borderRadius:2.5, backgroundColor:'#2563EB' },
  bulletText: { color:'#333333', fontSize: 12 },

  ocCard: { backgroundColor:'white', borderRadius:8, padding:10, gap:4, borderLeftWidth:3, marginBottom: 4 },
  ocBadge: { alignSelf:'flex-start', flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:6, paddingVertical:3, borderRadius:999 },
  ocBadgeText: { textTransform:'capitalize', color:'#374151', fontWeight:'600', fontSize:10 },
  ocMain: { color:'#333333', fontWeight:'600', fontSize: 12 },
  ocDesc: { color:'#6B7280', fontSize: 11 },

  limitHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  limitLabel: { color:'#333333', fontWeight:'600', fontSize: 12 },
  limitBadge: { backgroundColor:'rgba(37,99,235,0.06)', borderRadius:999, paddingHorizontal:6, paddingVertical:2 },
  limitBadgeText: { color:'#2563EB', fontSize:10, fontWeight:'600' },
  limitTrack: { height:6, backgroundColor:'#E5E7EB', borderRadius:999, overflow:'hidden' },
  limitFill: { height:6, backgroundColor:'#2563EB' },
  limitRowNums: { marginTop:4, flexDirection:'row', justifyContent:'space-between' },
  limitNumText: { fontSize:11, color:'#6B7280', fontWeight:'500' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
  },
  visitasContainer: {
    marginTop: 6,
    gap: 8,
  },
  visitaCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  visitaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  visitaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  visitaHeaderInfo: {
    flex: 1,
  },
  visitaTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  visitaLocal: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  visitaContent: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  visitaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitaInfoText: {
    color: '#4B5563',
    fontSize: 14,
    flex: 1,
  },
  visitaDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  visitaStatusRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  visitaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  visitaStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
    gap: 16,
  },
  navigationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  wazeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  navigationButtonIcon: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
  },
  wazeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#33CCFF',
  },
  ocorrenciasContainer: {
    marginTop: 8,
    gap: 12,
  },
}); 