import { apiClient } from '@/src/services/api/ApiClient';

export const RotasApi = {
  getRotas: async () => apiClient.getRotas(),
  getRotasSimples: async () => apiClient.getRotasSimples(),
  list: async (
    filtros?: { status?: 'todas' | 'futuras' | 'em_andamento' | 'passadas'; descricao?: string },
    page: number = 1,
    limit: number = 10
  ) => apiClient.getRotasPaginado(filtros, page, limit),
  getById: async (id: string) => apiClient.getRotaById(id),
  finalizarViagem: async (id: string) => apiClient.finalizarViagem(id),
  setCurrentRoute: async (id: string) => apiClient.setCurrentRoute(id),
  getCurrentRoute: async () => apiClient.getCurrentRoute(),
}; 