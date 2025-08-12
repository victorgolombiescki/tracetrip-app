import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Clock, MapPin } from 'lucide-react-native';
import { AgendasApi } from '@/src/services/api/modules/agendas';
import { Agenda } from '@/src/types';
import { LinearGradient } from 'expo-linear-gradient';

interface AgendaDetalhe {
  id: string | number;
  titulo: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  descricao?: string;
  status?: string;
  statusConfirmacao?: boolean;
  local?: { nome?: string; endereco?: string; cidade?: string; estado?: string; email?: string; cep?: string } | null;
  viagem?: { nome?: string } | null;
  participantes?: Array<any>;
  template?: { id: number; nome: string; conteudo: string } | null;
  respostasChecklist?: Array<{ pergunta: string; valor: string }>;
}

export default function AgendaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [agenda, setAgenda] = useState<AgendaDetalhe | null>(null);

  useEffect(() => {
    const load = async () => {
      const resp = await AgendasApi.getById(id!);
      if (resp.success) setAgenda(resp.data as unknown as AgendaDetalhe);
    };
    load();
  }, [id]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const safeParseTemplate = (conteudo?: string | null): { texto?: string; checklist?: Array<{ tipo: string; pergunta: string; opcoes?: string[]; obrigatorio?: boolean }> } => {
    if (!conteudo) return {} as any;
    try {
      const parsed = JSON.parse(conteudo);
      return parsed || {};
    } catch {
      return {} as any;
    }
  };

  const formatDateTimeFull = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const buildTemplateVars = (ag: AgendaDetalhe) => {
    const primeiro = Array.isArray(ag.participantes) && ag.participantes.length > 0 ? ag.participantes[0] : undefined;
    const participantesLista = Array.isArray(ag.participantes) ? ag.participantes.map((p: any) => p?.nome || p?.email || '').filter(Boolean).join(', ') : '';
    return {
      nomeViagem: ag.viagem?.nome || '',
      nomeLocal: ag.local?.nome || '',
      enderecoLocal: ag.local?.endereco || '',
      participanteNome: primeiro?.nome || '',
      participanteEmail: primeiro?.email || '',
      participanteTelefone: primeiro?.telefone || primeiro?.phone || '',
      participantes: participantesLista,
      dataHoraInicio: formatDateTimeFull((ag as any).inicioAt || ag.dataHoraInicio),
      dataHoraFim: formatDateTimeFull((ag as any).fimAt || ag.dataHoraFim),
    } as Record<string, string>;
  };

  const interpolateTemplate = (texto?: string, vars?: Record<string, string>) => {
    if (!texto) return '';
    const v = vars || {};
    const normalized = texto.replace(/\n/g, '\n');
    return normalized.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, key) => {
      const k = String(key).trim();
      return (k in v) ? String(v[k]) : '';
    });
  };

  const renderTemplateRichText = (txt?: string) => {
    if (!txt) return null;
    const nodes: React.ReactNode[] = [];
    const parts = txt.split(/(\*\*\*[\s\S]*?\*\*\*)/g);
    parts.forEach((part, idx) => {
      if (!part) return;
      if (part.startsWith('***') && part.endsWith('***')) {
        const content = part.slice(3, -3);
        nodes.push(<Text key={`b-${idx}`} style={styles.templateTextBold}>{content}</Text>);
      } else {
        const lines = part.split('\n');
        lines.forEach((line, j) => {
          nodes.push(<Text key={`t-${idx}-${j}`}>{line}{j < lines.length - 1 ? '\n' : ''}</Text>);
        });
      }
    });
    return nodes;
  };

  if (!agenda) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Agenda</Text>
            <View style={{ width: 22 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingBox}><Text style={styles.loadingText}>Carregando...</Text></View>
      </SafeAreaView>
    );
  }

  const inicio = formatDateTime((agenda as any).inicioAt || agenda.dataHoraInicio);
  const fim = formatDateTime((agenda as any).fimAt || agenda.dataHoraFim);
  const { texto: templateTexto, checklist: templateChecklist } = safeParseTemplate(agenda.template?.conteudo);
  const respostas = agenda.respostasChecklist || [];
  const filledTemplateTexto = interpolateTemplate(templateTexto, buildTemplateVars(agenda));

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#1E40AF", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Agenda</Text>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.agendaTitle}>{agenda.titulo}</Text>
          <View style={styles.row}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.textMuted}>{inicio.date} {inicio.time} - {fim.time}</Text>
          </View>
          <View style={styles.badgesRow}>
            {agenda.status ? (
              <View style={styles.badge}><Text style={styles.badgeText}>{agenda.status}</Text></View>
            ) : null}
            {typeof agenda.statusConfirmacao === 'boolean' ? (
              <View style={[styles.badge, agenda.statusConfirmacao ? styles.badgeOk : styles.badgeWarn]}>
                <Text style={[styles.badgeText, { color: agenda.statusConfirmacao ? '#065F46' : '#92400E' }]}>
                  {agenda.statusConfirmacao ? 'Confirmada' : 'Não confirmada'}
                </Text>
              </View>
            ) : null}
          </View>
          {agenda.local && (
            <View style={styles.row}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.textMuted}>{agenda.local?.nome || agenda.local?.endereco || ''}</Text>
            </View>
          )}
          {agenda.descricao && (
            <Text style={styles.description}>{agenda.descricao}</Text>
          )}
        </View>

        {(agenda.local || agenda.viagem) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Informações</Text>
            {agenda.viagem?.nome ? (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Viagem</Text><Text style={styles.infoValue}>{agenda.viagem.nome}</Text></View>
            ) : null}
            {agenda.local?.endereco ? (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Endereço</Text><Text style={styles.infoValue}>{agenda.local.endereco}</Text></View>
            ) : null}
            {(agenda.local?.cidade || agenda.local?.estado) ? (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Cidade/UF</Text><Text style={styles.infoValue}>{agenda.local?.cidade || ''}{agenda.local?.estado ? ` - ${agenda.local.estado}` : ''}</Text></View>
            ) : null}
            {agenda.local?.email ? (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>E-mail</Text><Text style={styles.infoValue}>{agenda.local.email}</Text></View>
            ) : null}
            {agenda.local?.cep ? (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>CEP</Text><Text style={styles.infoValue}>{agenda.local.cep}</Text></View>
            ) : null}
          </View>
        )}

        {filledTemplateTexto ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Texto do template</Text>
            <Text style={styles.templateText}>{renderTemplateRichText(filledTemplateTexto)}</Text>
          </View>
        ) : null}

        {(templateChecklist && templateChecklist.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Checklist</Text>
            {templateChecklist.map((item, idx) => {
              const resp = respostas.find(r => r.pergunta === item.pergunta);
              return (
                <View key={`${item.pergunta}-${idx}`} style={styles.checkRow}>
                  <Text style={styles.checkQuestion}>{item.pergunta}{item.obrigatorio ? ' *' : ''}</Text>
                  <Text style={styles.checkAnswer}>{resp?.valor || '-'}</Text>
                </View>
              );
            })}
          </View>
        )}

        {(!templateChecklist || templateChecklist.length === 0) && respostas && respostas.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Checklist (respostas)</Text>
            {respostas.map((r, idx) => (
              <View key={idx} style={styles.checkRow}>
                <Text style={styles.checkQuestion}>{r.pergunta}</Text>
                <Text style={styles.checkAnswer}>{r.valor || '-'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomRightRadius: 28 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  backButton: { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6B7280' },
  content: { padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginTop: 10, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  agendaTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textMuted: { color: '#6B7280' },
  description: { marginTop: 8, color: '#4B5563', lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  checkRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  checkQuestion: { color: '#111827', fontWeight: '600', marginBottom: 4 },
  checkAnswer: { color: '#374151' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  infoLabel: { color: '#6B7280', width: 120 },
  infoValue: { color: '#111827', flex: 1 },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeOk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  badgeWarn: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  badgeText: { color: '#1E40AF', fontWeight: '700', fontSize: 12 },
  templateText: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 8 },
  templateTextBold: { fontSize: 14, color: '#111827', fontWeight: '800' },
}); 