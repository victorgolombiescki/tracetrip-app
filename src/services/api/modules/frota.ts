import { apiClient } from '@/src/services/api/ApiClient';

export interface Veiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano?: number;
  cor?: string;
}

export interface ReservaVeiculo {
  id: number;
  veiculoId: number;
  veiculo?: Veiculo;
  usuarioId: number;
  criadoPorId?: number;
  usuario?: {
    id: number;
    nome: string;
    email: string;
  };
  criadoPor?: {
    id: number;
    nome: string;
    email: string;
  };
  dataInicio: string;
  dataFim: string;
  horarioInicio: string;
  horarioFim: string;
  motivo?: string;
  observacoes?: string;
  status: 'PENDENTE' | 'CONFIRMADA' | 'EM_USO' | 'CONCLUIDA' | 'CANCELADA';
  grupoId?: string;
}

export interface DisponibilidadeVeiculo {
  veiculoId: number;
  placa: string;
  marca: string;
  modelo: string;
  disponibilidade: Record<string, {
    disponivel: boolean;
    ocupacao: number;
    horariosLivres: Array<{ inicio: string; fim: string }>;
  }>;
}

export const FrotaApi = {
  getVeiculos: async () => apiClient.getVeiculos(),
  getReservas: async (filtros?: {
    veiculoId?: number;
    dataInicio?: string;
    dataFim?: string;
    status?: string;
  }) => apiClient.getReservasVeiculo(filtros),
  createReserva: async (reserva: any | any[]) => apiClient.createReservaVeiculo(reserva),
  updateReserva: async (id: number, reserva: any) => apiClient.updateReservaVeiculo(id, reserva),
  deleteReserva: async (id: number, excluirGrupo?: boolean) => apiClient.deleteReservaVeiculo(id, excluirGrupo),
  getHorariosDisponiveis: async (veiculoId: number, data: string) => apiClient.getHorariosDisponiveisVeiculo(veiculoId, data),
  getDisponibilidade: async (params: {
    dataInicio: string;
    dataFim: string;
    veiculoId?: number;
  }) => apiClient.getDisponibilidadeVeiculos(params),
  getReservasVinculadas: async (id: number) => apiClient.getReservasVinculadas(id),
};

