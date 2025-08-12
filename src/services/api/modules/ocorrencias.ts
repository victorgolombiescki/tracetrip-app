import { apiClient } from '@/src/services/api/ApiClient';
import type { Ocorrencia } from '@/src/types';

export const OcorrenciasApi = {
  list: async () => apiClient.getOcorrencias(),
  create: async (viagemId: number, descricao: string) => apiClient.createOcorrencia(viagemId, descricao),
  transcribeAudio: (fileUri: string) => apiClient.transcribeAudio(fileUri),
}; 