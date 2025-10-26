import { apiClient } from '../ApiClient';

interface Pontos {
  usuarioId: number;
  totalPontos: number;
  nivel: number;
  pontosDespesas: number;
  pontosRastreamento: number;
  pontosCheckin: number;
  pontosOcorrencias: number;
  pontosFinalizacoes: number;
  pontosAvaliacoes: number;
}

interface Badge {
  id: number;
  badgeId: string;
  badgeNome: string;
  badgeDescricao: string;
  badgeCor: string;
  conquistado: boolean;
  dataConquista?: string;
}

interface HistoricoPontos {
  id: number;
  tipoAcao: string;
  pontosAdicionados: number;
  descricao: string;
  createdAt: string;
}

export interface GamificacaoData {
  pontos: Pontos;
  badges: Badge[];
  historico: HistoricoPontos[];
  posicaoRanking?: number;
  totalJogadores?: number;
}

export class GamificacaoApi {
  static async getGamificacao(): Promise<{ success: boolean; data?: GamificacaoData; message?: string }> {
    return await apiClient.get('/gamificacao/minha-gamificacao');
  }

  static async getRanking(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    return await apiClient.get('/gamificacao/ranking');
  }
}

