import type { Agenda } from '@/src/types';
import { apiClient } from '@/src/services/api/ApiClient';

export const AgendasApi = {
  list: async () => apiClient.getAgendas(),
  listByMonth: async (ano: number, mes: number) => apiClient.getAgendasByMonth(ano, mes),
  listPaginated: async (
    filtros: { ano: number; mes: number; dia?: string | null },
    page: number = 1,
    limit: number = 10
  ) => apiClient.getAgendasPaginado(filtros, page, limit),
  getById: async (id: string) => apiClient.getAgendaById(id),
}; 