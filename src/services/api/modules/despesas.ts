import type { Despesa } from '@/src/types';
import { apiClient } from '@/src/services/api/ApiClient';

interface DespesaResponse {
  items: Despesa[];
  meta: {
    totalItems: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export const DespesasApi = {
  list: async (filtros?: {
    status?: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
    tipo?: 'ALIMENTACAO' | 'TRANSPORTE' | 'HOSPEDAGEM' | 'COMBUSTIVEL' | 'OUTROS';
    descricao?: string;
    apenasRotaAtual?: boolean;
  }) => apiClient.getDespesas(filtros),
  create: async (payload: Omit<Despesa, 'id' | 'updatedAt'>) => apiClient.createDespesa(payload),
  createWithViagem: async (viagemId: number, despesa: any) => apiClient.createDespesaComViagem(viagemId, despesa),
  processImage: async (formData: FormData) => apiClient.processDespesaImagem(formData),
  getAttachment: async (despesaId: string) => apiClient.getDespesaAttachment(despesaId),
  getById: async (id: string) => apiClient.getDespesaDetalhe(id),
}; 