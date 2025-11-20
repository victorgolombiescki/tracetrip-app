import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar, Clock, Car, User, X } from 'lucide-react-native';
import { Switch } from 'react-native';
import { Calendar as RNCalendar, LocaleConfig, DateData } from 'react-native-calendars';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { FrotaApi, type Veiculo, type ReservaVeiculo } from '@/src/services/api/modules/frota';
import Toast from 'react-native-toast-message';

LocaleConfig.locales['ptBR'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'ptBR';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TIMELINE_WIDTH = SCREEN_WIDTH - 80;
const MINUTES_PER_DAY = 24 * 60;

const reservaSchema = z.object({
  veiculoId: z.number().min(1, 'Selecione um veículo'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().min(1, 'Data de fim é obrigatória'),
  horarioInicio: z.string().min(1, 'Horário de início é obrigatório'),
  horarioFim: z.string().min(1, 'Horário de fim é obrigatório'),
  motivo: z.string().optional(),
  usuarioId: z.number().min(1, 'Selecione um responsável'),
});

type ReservaForm = z.infer<typeof reservaSchema>;

export default function NovaReservaScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<Array<{ inicio: string; fim: string }>>([]);
  const [horariosOcupados, setHorariosOcupados] = useState<Array<{ inicio: string; fim: string; motivo?: string; usuario?: string; dataInicio?: string; dataFim?: string }>>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [horarioConfigInicio, setHorarioConfigInicio] = useState<string>('08:00');
  const [horarioConfigFim, setHorarioConfigFim] = useState<string>('18:00');
  const [modalVeiculo, setModalVeiculo] = useState(false);
  const [modalDataInicio, setModalDataInicio] = useState(false);
  const [modalDataFim, setModalDataFim] = useState(false);
  const [modalHorario, setModalHorario] = useState(false);
  const [usuarios, setUsuarios] = useState<Array<{ id: number; nome: string; email: string }>>([]);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [selecionandoHorario, setSelecionandoHorario] = useState(false);
  const [selecaoInicio, setSelecaoInicio] = useState<number | null>(null);
  const [selecaoFim, setSelecaoFim] = useState<number | null>(null);
  const [selecoesPorDia, setSelecoesPorDia] = useState<Map<string, { inicio: number; fim: number | null }>>(new Map());
  const [diaAtualSelecionando, setDiaAtualSelecionando] = useState<string | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [aplicarTodosDias, setAplicarTodosDias] = useState(false);
  const timelineRef = useRef<View>(null);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<ReservaForm>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      veiculoId: 0,
      dataInicio: '',
      dataFim: '',
      horarioInicio: '',
      horarioFim: '',
      motivo: '',
      usuarioId: 0,
    }
  });

  const veiculoId = watch('veiculoId');
  const dataInicio = watch('dataInicio');
  const dataFim = watch('dataFim');
  const horarioInicio = watch('horarioInicio');
  const horarioFim = watch('horarioFim');

  useEffect(() => {
    carregarVeiculos();
    carregarUsuarios();
  }, []);

  useEffect(() => {
    if (veiculoId && dataInicio) {
      carregarHorariosDisponiveis();
    }
  }, [veiculoId, dataInicio]);

  useEffect(() => {
    if (dataInicio && !dataFim) {
      setValue('dataFim', dataInicio);
    }
  }, [dataInicio]);

  useEffect(() => {
    if (aplicarTodosDias) {
      setSelecoesPorDia(new Map());
    } else {
      setSelecaoInicio(null);
      setSelecaoFim(null);
    }
  }, [aplicarTodosDias]);

  const carregarVeiculos = async () => {
    try {
      const resp = await FrotaApi.getVeiculos();
      if (resp.success) {
        setVeiculos(resp.data || []);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: error.message || 'Erro ao carregar veículos'
      });
    }
  };

  const carregarUsuarios = async () => {
    try {
      const resp = await FrotaApi.getReservas({});
      if (resp.success && resp.data && resp.data.length > 0) {
        const usuariosUnicos = new Map<number, { id: number; nome: string; email: string }>();
        resp.data.forEach((r: ReservaVeiculo) => {
          if (r.usuario && !usuariosUnicos.has(r.usuario.id)) {
            usuariosUnicos.set(r.usuario.id, r.usuario);
          }
        });
        setUsuarios(Array.from(usuariosUnicos.values()));
      }
    } catch (error) {
    }
  };

  const gerarDiasDoPeriodo = () => {
    if (!dataInicio || !dataFim) return [];
    
    const dias: string[] = [];
    const inicio = new Date(dataInicio + 'T00:00:00');
    const fim = new Date(dataFim + 'T00:00:00');
    const dataAtual = new Date(inicio);
    
    while (dataAtual <= fim) {
      dias.push(dataAtual.toISOString().split('T')[0]);
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    
    return dias;
  };

  const carregarHorariosDisponiveis = async () => {
    if (!veiculoId || !dataInicio || !dataFim) return;
    
    setCarregandoHorarios(true);
    try {
      const dias = gerarDiasDoPeriodo();
      const dataFimBusca = dias.length > 0 ? dias[dias.length - 1] : dataFim;
      
      const [horariosResp, reservasResp, disponibilidadeResp] = await Promise.all([
        FrotaApi.getHorariosDisponiveis(veiculoId, dataInicio),
        FrotaApi.getReservas({
          veiculoId,
          dataInicio,
          dataFim: dataFimBusca
        }),
        FrotaApi.getDisponibilidade({
          dataInicio,
          dataFim: dataFimBusca,
          veiculoId
        })
      ]);

      if (horariosResp.success && horariosResp.data) {
        setHorariosDisponiveis(Array.isArray(horariosResp.data) ? horariosResp.data : []);
      }

      if (reservasResp.success && reservasResp.data) {
        const todasReservas = (reservasResp.data as ReservaVeiculo[]).filter(r => {
          if (r.status === 'CANCELADA') return false;
          return true;
        });

        const ocupados = todasReservas.map(r => ({
          inicio: r.horarioInicio.length === 5 ? r.horarioInicio : r.horarioInicio.substring(0, 5),
          fim: r.horarioFim.length === 5 ? r.horarioFim : r.horarioFim.substring(0, 5),
          motivo: r.motivo,
          usuario: r.usuario?.nome || r.usuario?.email,
          dataInicio: typeof r.dataInicio === 'string' ? r.dataInicio.split('T')[0] : new Date(r.dataInicio).toISOString().split('T')[0],
          dataFim: typeof r.dataFim === 'string' ? r.dataFim.split('T')[0] : new Date(r.dataFim).toISOString().split('T')[0]
        }));

        setHorariosOcupados(ocupados);
      }

      if (disponibilidadeResp.success && disponibilidadeResp.data && disponibilidadeResp.data.length > 0) {
        const disponibilidade = disponibilidadeResp.data[0];
        const dataStr = dataInicio;
        const diaDisponibilidade = disponibilidade.disponibilidade?.[dataStr];
        
        if (diaDisponibilidade && diaDisponibilidade.horariosLivres && diaDisponibilidade.horariosLivres.length > 0) {
          const primeiroHorario = diaDisponibilidade.horariosLivres[0];
          const ultimoHorario = diaDisponibilidade.horariosLivres[diaDisponibilidade.horariosLivres.length - 1];
          
          if (primeiroHorario && ultimoHorario) {
            setHorarioConfigInicio(primeiroHorario.inicio);
            setHorarioConfigFim(ultimoHorario.fim);
          }
        } else if (horariosDisponiveis.length > 0) {
          const primeiroHorario = horariosDisponiveis[0];
          const ultimoHorario = horariosDisponiveis[horariosDisponiveis.length - 1];
          
          if (primeiroHorario && ultimoHorario) {
            setHorarioConfigInicio(primeiroHorario.inicio);
            setHorarioConfigFim(ultimoHorario.fim);
          }
        }
      } else if (horariosDisponiveis.length > 0) {
        const primeiroHorario = horariosDisponiveis[0];
        const ultimoHorario = horariosDisponiveis[horariosDisponiveis.length - 1];
        
        if (primeiroHorario && ultimoHorario) {
          setHorarioConfigInicio(primeiroHorario.inicio);
          setHorarioConfigFim(ultimoHorario.fim);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: error.message || 'Erro ao carregar horários disponíveis'
      });
    } finally {
      setCarregandoHorarios(false);
    }
  };

  const horaParaMinutos = (hora: string): number => {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  };

  const minutosParaHora = (minutos: number): string => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getPosicaoNaTimeline = (hora: string): number => {
    const minutos = horaParaMinutos(hora);
    return (minutos / MINUTES_PER_DAY) * 100;
  };

  const getHoraDaPosicao = (percentual: number): string => {
    const minutos = Math.round((percentual / 100) * MINUTES_PER_DAY);
    const minutosArredondados = Math.round(minutos / 15) * 15;
    return minutosParaHora(Math.max(0, Math.min(MINUTES_PER_DAY - 1, minutosArredondados)));
  };

  const isHorarioOcupado = (hora: string): boolean => {
    return horariosOcupados.some(ocupado => {
      return hora >= ocupado.inicio && hora < ocupado.fim;
    });
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr) return '';
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
  };

  const handleTimelineLayout = (event: any, diaIdx: number) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && (diaIdx === 0 || timelineWidth === 0)) {
      setTimelineWidth(width);
    }
  };

  const calcularHoraDaPosicao = (locationX: number) => {
    if (timelineWidth === 0) return null;
    const percentual = Math.max(0, Math.min(100, (locationX / timelineWidth) * 100));
    const hora = getHoraDaPosicao(percentual);
    return horaParaMinutos(hora);
  };

  const criarPanResponder = (diaStr: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        
        if (timelineWidth === 0) return;
        
        const percentual = Math.max(0, Math.min(100, (locationX / timelineWidth) * 100));
        const hora = getHoraDaPosicao(percentual);
        const minutos = horaParaMinutos(hora);
        
        setArrastando(true);
        setDiaAtualSelecionando(diaStr);
        
        if (aplicarTodosDias) {
          setSelecaoInicio(minutos);
          setSelecaoFim(minutos);
          setValue('horarioInicio', hora);
          setValue('horarioFim', hora);
        } else {
          const novasSelecoes = new Map(selecoesPorDia);
          novasSelecoes.set(diaStr, { inicio: minutos, fim: minutos });
          setSelecoesPorDia(novasSelecoes);
        }
        setSelecionandoHorario(true);
      },
      onPanResponderMove: (evt) => {
        if (!arrastando || timelineWidth === 0) return;
        
        const locationX = evt.nativeEvent.locationX;
        const percentual = Math.max(0, Math.min(100, (locationX / timelineWidth) * 100));
        const hora = getHoraDaPosicao(percentual);
        const minutos = horaParaMinutos(hora);
        
        if (aplicarTodosDias) {
          if (selecaoInicio !== null) {
            if (minutos >= selecaoInicio) {
              setSelecaoFim(minutos);
              setValue('horarioFim', hora);
            } else {
              setSelecaoFim(selecaoInicio);
              setSelecaoInicio(minutos);
              setValue('horarioInicio', hora);
              setValue('horarioFim', minutosParaHora(selecaoInicio));
            }
          }
        } else {
          const selecaoDia = selecoesPorDia.get(diaStr);
          if (selecaoDia) {
            const novasSelecoes = new Map(selecoesPorDia);
            if (minutos >= selecaoDia.inicio) {
              novasSelecoes.set(diaStr, { inicio: selecaoDia.inicio, fim: minutos });
            } else {
              novasSelecoes.set(diaStr, { inicio: minutos, fim: selecaoDia.inicio });
            }
            setSelecoesPorDia(novasSelecoes);
          }
        }
      },
      onPanResponderRelease: () => {
        setArrastando(false);
        setSelecionandoHorario(false);
        
        if (aplicarTodosDias && selecaoInicio !== null && selecaoFim !== null) {
          setValue('horarioInicio', minutosParaHora(selecaoInicio));
          setValue('horarioFim', minutosParaHora(selecaoFim));
        } else if (!aplicarTodosDias && diaAtualSelecionando) {
          const selecaoDia = selecoesPorDia.get(diaAtualSelecionando);
          if (selecaoDia && selecaoDia.fim !== null) {
            setValue('horarioInicio', minutosParaHora(selecaoDia.inicio));
            setValue('horarioFim', minutosParaHora(selecaoDia.fim));
          }
        }
        
        setDiaAtualSelecionando(null);
      },
      onPanResponderTerminate: () => {
        setArrastando(false);
        setSelecionandoHorario(false);
        setDiaAtualSelecionando(null);
      },
    });
  };

  const handleTimelinePress = (event: any) => {
    if (arrastando) return;
    
    const { locationX } = event.nativeEvent;
    const minutos = calcularHoraDaPosicao(locationX);
    
    if (minutos === null) return;
    
    if (selecaoInicio === null) {
      setSelecaoInicio(minutos);
      setSelecaoFim(null);
      setSelecionandoHorario(true);
      setValue('horarioInicio', minutosParaHora(minutos));
      setValue('horarioFim', '');
    } else {
      if (minutos > selecaoInicio) {
        setSelecaoFim(minutos);
        setValue('horarioFim', minutosParaHora(minutos));
        setSelecionandoHorario(false);
      } else {
        setSelecaoInicio(minutos);
        setSelecaoFim(null);
        setValue('horarioInicio', minutosParaHora(minutos));
        setValue('horarioFim', '');
      }
    }
  };

  const getSelectionStyle = (diaStr?: string) => {
    let inicio: number | null = null;
    let fim: number | null = null;
    
    if (aplicarTodosDias) {
      inicio = selecaoInicio;
      fim = selecaoFim;
    } else if (diaStr) {
      const selecaoDia = selecoesPorDia.get(diaStr);
      if (selecaoDia) {
        inicio = selecaoDia.inicio;
        fim = selecaoDia.fim;
      }
    }
    
    if (inicio === null) return { opacity: 0 };
    
    const inicioPercent = getPosicaoNaTimeline(minutosParaHora(inicio));
    const fimPercent = fim !== null ? getPosicaoNaTimeline(minutosParaHora(fim)) : inicioPercent + 1;
    const width = Math.max(1, fimPercent - inicioPercent);
    
    return {
      left: `${Math.max(0, Math.min(100, inicioPercent))}%`,
      width: `${Math.max(1, Math.min(100 - inicioPercent, width))}%`,
      opacity: 1,
    };
  };
  
  const getSelectionText = (diaStr?: string) => {
    let inicio: number | null = null;
    let fim: number | null = null;
    
    if (aplicarTodosDias) {
      inicio = selecaoInicio;
      fim = selecaoFim;
    } else if (diaStr) {
      const selecaoDia = selecoesPorDia.get(diaStr);
      if (selecaoDia) {
        inicio = selecaoDia.inicio;
        fim = selecaoDia.fim;
      }
    }
    
    if (inicio === null) return '';
    
    return minutosParaHora(inicio) + (fim !== null && fim !== inicio ? ` - ${minutosParaHora(fim)}` : '');
  };

  const onSubmit = async (data: ReservaForm) => {
    try {
      setLoading(true);

      if (new Date(data.dataFim) < new Date(data.dataInicio)) {
        Toast.show({
          type: 'error',
          text1: 'Erro',
          text2: 'Data de fim deve ser posterior à data de início'
        });
        return;
      }

      if (data.horarioFim <= data.horarioInicio) {
        Toast.show({
          type: 'error',
          text1: 'Erro',
          text2: 'Horário de fim deve ser posterior ao horário de início'
        });
        return;
      }

      const dias = gerarDiasDoPeriodo();
      
      if (aplicarTodosDias && dias.length > 1) {
        if (!data.horarioInicio || !data.horarioFim) {
          Toast.show({
            type: 'error',
            text1: 'Erro',
            text2: 'Selecione o horário para aplicar a todos os dias'
          });
          setLoading(false);
          return;
        }
        
        const reservas = dias.map(dia => ({
          veiculoId: data.veiculoId,
          dataInicio: dia,
          dataFim: dia,
          horarioInicio: data.horarioInicio,
          horarioFim: data.horarioFim,
          motivo: data.motivo || undefined,
          usuarioId: data.usuarioId,
        }));
        
        const resp = await FrotaApi.createReserva(reservas);
        
        if (resp.success) {
          Toast.show({
            type: 'success',
            text1: 'Reservas criadas',
            text2: `${reservas.length} reservas criadas com sucesso`
          });
          setTimeout(() => router.back(), 500);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Erro',
            text2: resp.message || 'Erro ao criar reservas'
          });
        }
        setLoading(false);
        return;
      }
      
      if (!aplicarTodosDias && selecoesPorDia.size > 0) {
        const reservas: Array<{
          veiculoId: number;
          dataInicio: string;
          dataFim: string;
          horarioInicio: string;
          horarioFim: string;
          motivo?: string;
          usuarioId?: number;
        }> = [];
        
        selecoesPorDia.forEach((selecao, diaStr) => {
          if (selecao.fim !== null && selecao.fim > selecao.inicio) {
            reservas.push({
              veiculoId: data.veiculoId,
              dataInicio: diaStr,
              dataFim: diaStr,
              horarioInicio: minutosParaHora(selecao.inicio),
              horarioFim: minutosParaHora(selecao.fim),
              motivo: data.motivo || undefined,
              usuarioId: data.usuarioId,
            });
          }
        });
        
        if (reservas.length === 0) {
          Toast.show({
            type: 'error',
            text1: 'Erro',
            text2: 'Selecione pelo menos um horário válido'
          });
          setLoading(false);
          return;
        }
        
        const resp = await FrotaApi.createReserva(reservas);
        
        if (resp.success) {
          Toast.show({
            type: 'success',
            text1: 'Reservas criadas',
            text2: `${reservas.length} reserva(s) criada(s) com sucesso`
          });
          setTimeout(() => router.back(), 500);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Erro',
            text2: resp.message || 'Erro ao criar reservas'
          });
        }
        setLoading(false);
        return;
      }

      const reservaData = {
        veiculoId: data.veiculoId,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        horarioInicio: data.horarioInicio,
        horarioFim: data.horarioFim,
        motivo: data.motivo || undefined,
        usuarioId: data.usuarioId || undefined,
      };

      const resp = await FrotaApi.createReserva(reservaData);
      
      if (resp.success) {
        Toast.show({
          type: 'success',
          text1: 'Reserva criada',
          text2: 'Reserva criada com sucesso'
        });
        setTimeout(() => router.back(), 500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Erro',
          text2: resp.message || 'Erro ao criar reserva'
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: error.message || 'Erro ao criar reserva'
      });
    } finally {
      setLoading(false);
    }
  };

  const gerarMarcadoresHoras = () => {
    const marcadores: Array<{ hora: number; label: string }> = [];
    for (let h = 0; h < 24; h += 2) {
      marcadores.push({ hora: h, label: `${String(h).padStart(2, '0')}:00` });
    }
    return marcadores;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.heroTitle}>Nova Reserva</Text>
            <Text style={styles.heroSubtitle}>Reserve um veículo</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Controller
          control={control}
          name="veiculoId"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Veículo *</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setModalVeiculo(true)}>
                <View style={styles.selectContent}>
                  <Car size={18} color="#64748B" />
                  <Text style={value ? styles.selectText : styles.selectPlaceholder}>
                    {value ? veiculos.find(v => v.id === value)?.placa || 'Selecione um veículo' : 'Selecione um veículo'}
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.veiculoId && <Text style={styles.errorText}>{errors.veiculoId.message}</Text>}
            </View>
          )}
        />

        <View style={styles.row}>
          <Controller
            control={control}
            name="dataInicio"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Data Início *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setModalDataInicio(true)}>
                  <View style={styles.selectContent}>
                    <Calendar size={18} color="#64748B" />
                    <Text style={value ? styles.selectText : styles.selectPlaceholder}>
                      {value ? formatarData(value) : 'Selecione'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {errors.dataInicio && <Text style={styles.errorText}>{errors.dataInicio.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="dataFim"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Data Fim *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setModalDataFim(true)}>
                  <View style={styles.selectContent}>
                    <Calendar size={18} color="#64748B" />
                    <Text style={value ? styles.selectText : styles.selectPlaceholder}>
                      {value ? formatarData(value) : 'Selecione'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {errors.dataFim && <Text style={styles.errorText}>{errors.dataFim.message}</Text>}
              </View>
            )}
          />
        </View>

        {veiculoId && dataInicio && dataFim && (
          <View style={styles.timelineContainer}>
            <View style={styles.timelineHeader}>
              <Text style={styles.label}>Selecione o horário *</Text>
              {gerarDiasDoPeriodo().length > 1 && (
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleLabel}>Aplicar a todos os dias</Text>
                  <Switch
                    value={aplicarTodosDias}
                    onValueChange={setAplicarTodosDias}
                    trackColor={{ false: '#E2E8F0', true: '#254985' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}
            </View>
            
            {carregandoHorarios ? (
              <View style={styles.loadingHorarios}>
                <ActivityIndicator size="small" color="#254985" />
                <Text style={styles.loadingText}>Carregando horários...</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.timelinesScroll} 
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {gerarDiasDoPeriodo().map((dia, diaIdx) => {
                  const diaStr = dia;
                  const dataObj = new Date(dia + 'T00:00:00');
                  const diaLabel = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                  const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                  const reservasDoDia = horariosOcupados.filter(ocupado => {
                    if (!ocupado.dataInicio || !ocupado.dataFim) return false;
                    return diaStr >= ocupado.dataInicio && diaStr <= ocupado.dataFim;
                  });
                  
                  return (
                    <View key={diaIdx} style={styles.timelineDayContainer}>
                      <View style={styles.timelineDayHeader}>
                        <Text style={styles.timelineDayLabel}>{diaLabel}</Text>
                        <Text style={styles.timelineDayWeekday}>{diaSemana}</Text>
                      </View>
                      
                      <View style={styles.timelineWrapper}>
                        <View style={styles.timelineMarkers}>
                          {gerarMarcadoresHoras().map((marcador, idx) => (
                            <View key={idx} style={[styles.timelineMarker, { left: `${(marcador.hora / 24) * 100}%` }]}>
                              <Text style={styles.timelineMarkerText}>{marcador.label}</Text>
                            </View>
                          ))}
                        </View>
                        
                        <View 
                          style={styles.timelineBar}
                          onLayout={(event) => handleTimelineLayout(event, diaIdx)}
                          {...criarPanResponder(diaStr).panHandlers}
                        >
                    <View
                      style={[
                        styles.timelineConfigPeriod,
                        {
                          left: `${getPosicaoNaTimeline(horarioConfigInicio)}%`,
                          width: `${getPosicaoNaTimeline(horarioConfigFim) - getPosicaoNaTimeline(horarioConfigInicio)}%`,
                        }
                      ]}
                      pointerEvents="none"
                    >
                      <View style={styles.timelineConfigPeriodBorder} />
                    </View>
                    
                          {reservasDoDia.map((ocupado, idx) => {
                            const inicioPercent = getPosicaoNaTimeline(ocupado.inicio);
                            const fimPercent = getPosicaoNaTimeline(ocupado.fim);
                            const width = fimPercent - inicioPercent;
                            
                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.timelineOccupied,
                                  {
                                    left: `${inicioPercent}%`,
                                    width: `${width}%`,
                                  }
                                ]}
                                pointerEvents="none"
                              >
                                <Text style={styles.timelineOccupiedText}>
                                  {ocupado.inicio} - {ocupado.fim}
                                </Text>
                                {ocupado.motivo && (
                                  <Text style={styles.timelineOccupiedMotivo} numberOfLines={1}>
                                    {ocupado.motivo}
                                  </Text>
                                )}
                                {ocupado.usuario && (
                                  <Text style={styles.timelineOccupiedUsuario} numberOfLines={1}>
                                    {ocupado.usuario}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                          
                          {(() => {
                            const selecaoDia = aplicarTodosDias ? null : selecoesPorDia.get(diaStr);
                            const temSelecao = aplicarTodosDias ? selecaoInicio !== null : selecaoDia !== undefined;
                            
                            if (!temSelecao) return null;
                            
                            const style = getSelectionStyle(diaStr);
                            const text = getSelectionText(diaStr);
                            const inicio = aplicarTodosDias ? selecaoInicio : (selecaoDia?.inicio ?? null);
                            const fim = aplicarTodosDias ? selecaoFim : (selecaoDia?.fim ?? null);
                            
                            return (
                              <View 
                                style={[styles.timelineSelection, style as any]}
                                pointerEvents="none"
                              >
                                <View style={styles.timelineSelectionHandle} />
                                <View style={styles.timelineSelectionContent}>
                                  <Text style={styles.timelineSelectionText}>
                                    {text}
                                  </Text>
                                </View>
                                {fim !== null && inicio !== null && fim !== inicio && <View style={[styles.timelineSelectionHandle, { right: 0, left: 'auto' }]} />}
                              </View>
                            );
                          })()}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.horariosInfoContainer}>
                  <View style={styles.horarioConfigInfo}>
                    <View style={styles.horarioConfigIndicator} />
                    <Text style={styles.horarioConfigText}>
                      Horário de uso configurado: {horarioConfigInicio} - {horarioConfigFim}
                    </Text>
                  </View>
                  
                  {horariosOcupados.length > 0 && (
                    <View style={styles.horariosOcupadosInfo}>
                      <Text style={styles.horariosOcupadosTitle}>Horários já reservados:</Text>
                      {horariosOcupados.map((ocupado, idx) => (
                        <View key={idx} style={styles.horarioOcupadoItem}>
                          <Text style={styles.horarioOcupadoText}>
                            {ocupado.inicio} - {ocupado.fim}
                          </Text>
                          {ocupado.motivo && (
                            <Text style={styles.horarioOcupadoMotivo}>Motivo: {ocupado.motivo}</Text>
                          )}
                          {ocupado.usuario && (
                            <Text style={styles.horarioOcupadoUsuario}>Responsável: {ocupado.usuario}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {(() => {
                  if (aplicarTodosDias && (horarioInicio || horarioFim)) {
                    return (
                      <View style={styles.horarioSelecionado}>
                        <Text style={styles.horarioSelecionadoLabel}>Horário selecionado (aplicado a todos os dias):</Text>
                        <Text style={styles.horarioSelecionadoText}>
                          {horarioInicio || '--:--'} - {horarioFim || '--:--'}
                        </Text>
                      </View>
                    );
                  } else if (!aplicarTodosDias && selecoesPorDia.size > 0) {
                    const selecoesArray = Array.from(selecoesPorDia.entries())
                      .filter(([_, selecao]) => selecao.fim !== null && selecao.fim > selecao.inicio)
                      .map(([dia, selecao]) => {
                        const fim = selecao.fim!;
                        return {
                          dia,
                          texto: `${minutosParaHora(selecao.inicio)} - ${minutosParaHora(fim)}`
                        };
                      });
                    
                    if (selecoesArray.length > 0) {
                      return (
                        <View style={styles.horarioSelecionado}>
                          <Text style={styles.horarioSelecionadoLabel}>Horários selecionados:</Text>
                          {selecoesArray.map(({ dia, texto }, idx) => (
                            <Text key={idx} style={styles.horarioSelecionadoText}>
                              {formatarData(dia)}: {texto}
                            </Text>
                          ))}
                        </View>
                      );
                    }
                  }
                  return null;
                })()}

            {errors.horarioInicio && <Text style={styles.errorText}>{errors.horarioInicio.message}</Text>}
            {errors.horarioFim && <Text style={styles.errorText}>{errors.horarioFim.message}</Text>}
          </View>
        )}

        <Controller
          control={control}
          name="usuarioId"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Responsável *</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setModalUsuario(true)}>
                <View style={styles.selectContent}>
                  <User size={18} color="#64748B" />
                  <Text style={value && value > 0 ? styles.selectText : styles.selectPlaceholder}>
                    {value && value > 0 ? usuarios.find(u => u.id === value)?.nome || usuarios.find(u => u.id === value)?.email : 'Selecione um responsável'}
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.usuarioId && <Text style={styles.errorText}>{errors.usuarioId.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="motivo"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Motivo"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Descreva o motivo da reserva (opcional)"
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />
          )}
        />
      </ScrollView>

      <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title={loading ? 'Criando...' : 'Criar Reserva'}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
        />
      </View>

      <Modal visible={modalVeiculo} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o veículo</Text>
              <TouchableOpacity onPress={() => setModalVeiculo(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {veiculos.map((veiculo) => (
                <TouchableOpacity
                  key={veiculo.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setValue('veiculoId', veiculo.id);
                    setModalVeiculo(false);
                  }}
                >
                  <Car size={20} color="#254985" />
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionTitle}>{veiculo.placa}</Text>
                    <Text style={styles.modalOptionSubtitle}>{veiculo.marca} {veiculo.modelo}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalDataInicio} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a data de início</Text>
              <TouchableOpacity onPress={() => setModalDataInicio(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <RNCalendar
              onDayPress={(day: DateData) => {
                setValue('dataInicio', day.dateString);
                setModalDataInicio(false);
              }}
              minDate={new Date().toISOString().split('T')[0]}
              markedDates={{
                [watch('dataInicio')]: { selected: true, selectedColor: '#254985' }
              }}
              theme={{
                todayTextColor: '#254985',
                arrowColor: '#254985',
                selectedDayBackgroundColor: '#254985',
                selectedDayTextColor: '#ffffff',
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={modalDataFim} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a data de fim</Text>
              <TouchableOpacity onPress={() => setModalDataFim(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <RNCalendar
              onDayPress={(day: DateData) => {
                const dataInicioValue = watch('dataInicio');
                if (!dataInicioValue || day.dateString >= dataInicioValue) {
                  setValue('dataFim', day.dateString);
                  setModalDataFim(false);
                } else {
                  Toast.show({
                    type: 'error',
                    text1: 'Erro',
                    text2: 'Data de fim deve ser posterior à data de início'
                  });
                }
              }}
              minDate={watch('dataInicio') || new Date().toISOString().split('T')[0]}
              markedDates={{
                [watch('dataFim')]: { selected: true, selectedColor: '#254985' }
              }}
              theme={{
                todayTextColor: '#254985',
                arrowColor: '#254985',
                selectedDayBackgroundColor: '#254985',
                selectedDayTextColor: '#ffffff',
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={modalUsuario} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione o responsável</Text>
              <TouchableOpacity onPress={() => setModalUsuario(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {usuarios.map((usuario) => (
                <TouchableOpacity
                  key={usuario.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setValue('usuarioId', usuario.id);
                    setModalUsuario(false);
                  }}
                >
                  <User size={20} color="#254985" />
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionTitle}>{usuario.nome}</Text>
                    <Text style={styles.modalOptionSubtitle}>{usuario.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
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
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)'
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
  content: {
    flex: 1,
    padding: 20
  },
  inputContainer: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  selectText: {
    color: '#333333',
    fontSize: 14
  },
  selectPlaceholder: {
    color: '#94A3B8',
    fontSize: 14
  },
  row: {
    flexDirection: 'row'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4
  },
  loadingHorarios: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    marginTop: 8
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B'
  },
  timelineContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  timelineHeader: {
    marginBottom: 12
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 12
  },
  timelinesScroll: {
    maxHeight: SCREEN_HEIGHT * 0.5,
    minHeight: 200
  },
  timelineDayContainer: {
    marginBottom: 20
  },
  timelineDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  timelineDayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  timelineDayWeekday: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize'
  },
  timelineWrapper: {
    marginTop: 8,
    position: 'relative'
  },
  timelineMarkers: {
    flexDirection: 'row',
    marginBottom: 8,
    height: 20
  },
  timelineMarker: {
    position: 'absolute',
    top: 0
  },
  timelineMarkerText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  timelineBar: {
    height: 60,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden'
  },
  timelineConfigPeriod: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(37, 73, 133, 0.1)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#254985',
    borderStyle: 'dashed'
  },
  timelineConfigPeriodBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#254985',
    borderStyle: 'dashed'
  },
  timelineOccupied: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 2,
    borderLeftColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  timelineOccupiedText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#991B1B'
  },
  timelineOccupiedMotivo: {
    fontSize: 8,
    color: '#991B1B',
    marginTop: 2
  },
  timelineOccupiedUsuario: {
    fontSize: 8,
    color: '#991B1B',
    marginTop: 1
  },
  timelineSelection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(37, 73, 133, 0.3)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#254985',
    justifyContent: 'center',
    alignItems: 'center'
  },
  timelineSelectionHandle: {
    position: 'absolute',
    left: -4,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: '#254985',
    borderRadius: 4
  },
  timelineSelectionContent: {
    backgroundColor: '#254985',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  timelineSelectionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  horariosInfoContainer: {
    marginTop: 16,
    gap: 12
  },
  horarioConfigInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8
  },
  horarioConfigIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#254985',
    borderWidth: 2,
    borderColor: '#254985',
    borderStyle: 'dashed'
  },
  horarioConfigText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    flex: 1
  },
  horariosOcupadosInfo: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  horariosOcupadosTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8
  },
  horarioOcupadoItem: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  horarioOcupadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B'
  },
  horarioOcupadoMotivo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  horarioOcupadoUsuario: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  horarioSelecionado: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  horarioSelecionadoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4
  },
  horarioSelecionadoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46'
  },
  fixedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333'
  },
  modalScroll: {
    maxHeight: 400
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12
  },
  modalOptionContent: {
    flex: 1
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333'
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2
  }
});
