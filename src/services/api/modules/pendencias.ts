import { apiClient } from '@/src/services/api/ApiClient';

export interface Pendencia {
  id: number;
  tipo: 'REGISTRAR_KM_RESERVA';
  titulo: string;
  descricao?: string;
  status: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA';
  usuarioId: number;
  reservaVeiculoId?: number;
  reservaVeiculo?: {
    id: number;
    veiculoId: number;
    veiculo?: {
      id: number;
      placa: string;
      marca: string;
      modelo: string;
    };
    dataFim: string;
    horarioFim: string;
  };
  dadosAdicionais?: {
    veiculoId?: number;
    placa?: string;
    marca?: string;
    modelo?: string;
  };
  dataConclusao?: string;
  createdAt: string;
  updatedAt: string;
}

export const PendenciasApi = {
  getPendencias: async (status?: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA') => 
    apiClient.getPendencias(status),
  getPendenciasCount: async () => apiClient.getPendenciasCount(),
  getPendenciaById: async (id: number) => apiClient.getPendenciaById(id),
  concluirPendencia: async (id: number, atualizarDataHoraFim?: boolean) => 
    apiClient.concluirPendencia(id, atualizarDataHoraFim),
  cancelarPendencia: async (id: number) => apiClient.cancelarPendencia(id),
};






