import { Rota, Agenda, Despesa, Ocorrencia } from '@/src/types';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_BASE_URL) || 'https://tripapi.traceai.com.br') {
    this.baseURL = baseURL;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  private showErrorToast(title: string, description?: string) {
    try {
      Toast.show({
        type: 'error',
        text1: title,
        text2: description,
      });
    } catch { }
  }

  private mapFriendlyError(status?: number, rawMessage?: string): { title: string; description: string } {
    if (typeof status === 'number') {
      if (status === 0) {
        return { title: 'Sem conexão', description: 'Não foi possível conectar. Verifique sua internet.' };
      }
      if ([502, 503, 504].includes(status)) {
        return { title: 'Serviço indisponível', description: 'Nosso servidor está temporariamente indisponível. Tente novamente em instantes.' };
      }
      if (status >= 500) {
        return { title: 'Erro no servidor', description: 'Ocorreu um erro ao processar sua solicitação.' };
      }
    }
    if (rawMessage && /network request failed|Failed to fetch/i.test(rawMessage)) {
      return { title: 'Sem conexão', description: 'Não foi possível conectar. Verifique sua internet.' };
    }
    return { title: 'Erro', description: rawMessage || 'Ocorreu um erro inesperado.' };
  }

  private async http<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: any, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined as any;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : undefined;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch(`${this.baseURL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller?.signal,
      } as any);

      const text = await res.text();
      let json: any = undefined;
      try {
        json = text ? JSON.parse(text) : undefined;
      } catch {}

      if (!res.ok) {
        const friendly = this.mapFriendlyError(res.status, json?.message || res.statusText);
        if (res.status >= 500 || [502, 503, 504].includes(res.status)) {
          this.showErrorToast(friendly.title, friendly.description);
        }
        return { success: false, data: json as T, message: json?.message || friendly.description };
      }
      return { success: true, data: json as T };
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError';
      const friendly = isAbort
        ? { title: 'Tempo esgotado', description: 'A conexão demorou demais. Tente novamente.' }
        : this.mapFriendlyError(undefined, e?.message);
      this.showErrorToast(friendly.title, friendly.description);
      return { success: false, data: undefined as T, message: friendly.description };
    } finally {
      if (timeoutId) clearTimeout(timeoutId as any);
    }
  }

  async authLogin(email: string, senha: string): Promise<ApiResponse<{ access_token: string; usuario: any }>> {
    return this.http('POST', '/auth/login', { email, senha });
  }

  async validateToken(token?: string): Promise<ApiResponse<{ autorized: boolean }>> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.http('GET', '/auth/validar-token', undefined, headers);
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.http('POST', '/auth/logout');
  }

  async solicitarTrocaSenhaLogin(email: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.http('POST', '/usuarios/solicitar-troca-senha-login', { email });
  }

  async getRotas(): Promise<ApiResponse<{
    items: any[];
    meta: {
      totalItems: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
  }>> {
    const body = {
      filtros: {
        status: 'todas',
        descricao: ''
      },
      page: 1,
      limit: 10
    };
    return this.http('POST', '/app/rotas/paginado', body);
  }

  async getRotasSimples(): Promise<ApiResponse<Array<{
    id: string;
    nome: string;
    dataInicio: string;
    dataFim: string;
    status: string;
  }>>> {
    return this.http('GET', '/app/rotas/simples/lista');
  }

  async getRotaById(id: string): Promise<ApiResponse<any>> {
    return this.http('GET', `/app/rotas/${id}`);
  }

  async getRotasPaginado(
    filtros?: { status?: 'todas' | 'futuras' | 'em_andamento' | 'passadas'; descricao?: string },
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<{
    items: any[];
    meta: { totalItems: number; itemsPerPage: number; totalPages: number; currentPage: number };
  }>> {
    const body = {
      filtros: {
        status: filtros?.status || 'todas',
        descricao: filtros?.descricao || ''
      },
      page,
      limit
    };
    return this.http('POST', '/app/rotas/paginado', body);
  }

  async getAgendas(): Promise<ApiResponse<Agenda[]>> {
    return this.http('GET', '/app/agendas');
  }

  async getAgendasByMonth(ano: number, mes: number): Promise<ApiResponse<Agenda[]>> {
    return this.http('POST', '/app/agendas/mes', { ano, mes });
  }

  async getAgendasPaginado(
    filtros: { ano: number; mes: number; dia?: string | null },
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<{ items: Agenda[]; meta: { totalItems: number; itemsPerPage: number; totalPages: number; currentPage: number } }>> {
    return this.http('POST', '/app/agendas/paginado', { filtros, page, limit });
  }

  async getHomeDashboard(): Promise<ApiResponse<{
    orcamento: { total: number; despesas: number; restante: number; utilizacao: number };
    gastos: {
      hoje: Array<{ tipo: string; total: number }>;
      semana: Array<{ tipo: string; total: number }>;
      mes: Array<{ tipo: string; total: number }>;
      ano: Array<{ tipo: string; total: number }>;
    };
    contadores?: {
      despesasHoje: number;
      agendasHoje: number;
      rotasAndamento: number;
    }
  }>> {
    return this.http('GET', '/app/home/dashboard');
  }

  async getAgendaById(id: string): Promise<ApiResponse<Agenda>> {
    return this.http('GET', `/app/agendas/${id}`);
  }

  async getDespesas(filtros?: {
    status?: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
    tipo?: 'ALIMENTACAO' | 'TRANSPORTE' | 'HOSPEDAGEM' | 'COMBUSTIVEL' | 'OUTROS';
    descricao?: string;
  }): Promise<ApiResponse<{
    items: Despesa[];
    meta: {
      totalItems: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
  }>> {
    if (filtros && filtros.status) {
      const body = {
        filtros: {
          status: filtros.status,
          tipo: filtros.tipo,
          descricao: filtros.descricao || ''
        }
      };
      return this.http('POST', '/app/despesas/filtros', body);
    } else {
      return this.http('GET', '/app/despesas');
    }
  }

  async getDespesaDetalhe(id: string): Promise<ApiResponse<any>> {
    return this.http('GET', `/app/despesas/${id}`);
  }

  async getDespesaAttachment(despesaId: string): Promise<ApiResponse<{ url: string }>> {
    return this.http('GET', `/app/despesas/${despesaId}/comprovante-temporario`);
  }

  async getOcorrencias(): Promise<ApiResponse<Ocorrencia[]>> {
    return this.http('GET', '/app/ocorrencias');
  }

  async createDespesa(despesa: Omit<Despesa, 'id' | 'updatedAt'>): Promise<ApiResponse<Despesa>> {
    return this.http('POST', '/app/despesas', despesa);
  }

  async createDespesaInteligente(formData: FormData): Promise<ApiResponse<any>> {
    try {

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data'
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const res = await fetch(`${this.baseURL}/app/despesas/create-inteligente`, {
        method: 'POST',
        headers,
        body: formData as any,
      });


      const text = await res.text();
      const json = text ? JSON.parse(text) : undefined;

      if (!res.ok) {
        const friendly = this.mapFriendlyError(res.status, json?.message || res.statusText);
        this.showErrorToast(friendly.title, friendly.description);
        return { success: false, data: json as any, message: json?.message || res.statusText };
      }
      return { success: true, data: json as any };
    } catch (e: any) {
      const friendly = this.mapFriendlyError(undefined, e?.message);
      this.showErrorToast(friendly.title, friendly.description);
      return { success: false, data: undefined as any, message: e?.message || 'Network error' };
    }
  }

  async processDespesaImagem(formData: FormData): Promise<ApiResponse<any>> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data'
      };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch(`${this.baseURL}/app/despesas/create-inteligente`, {
        method: 'POST',
        headers,
        body: formData as any,
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : undefined;

      if (!res.ok) {
        const friendly = this.mapFriendlyError(res.status, json?.message || res.statusText);
        this.showErrorToast(friendly.title, friendly.description);
        return { success: false, data: json as any, message: json?.message || res.statusText };
      }
      return { success: true, data: json as any };
    } catch (e: any) {
      const friendly = this.mapFriendlyError(undefined, e?.message);
      this.showErrorToast(friendly.title, friendly.description);
      return { success: false, data: undefined as any, message: e?.message || 'Network error' };
    }
  }

  async createOcorrencia(viagemId: number, descricao: string): Promise<ApiResponse<any>> {
    return this.http('POST', '/app/ocorrencias', { viagemId, descricao });
  }

  async transcribeAudio(fileUri: string): Promise<ApiResponse<{ text: string }>> {
    try {

      const form = new FormData();

      if (Platform.OS === 'web') {
        const resp = await fetch(fileUri);
        const blob = await resp.blob();
        const filename = (fileUri.split('/').pop() || 'audio.m4a').replace(/\?.*$/, '') || 'audio.m4a';
        form.append('file', blob as any, filename);
      } else {
        const filename = fileUri.split('/').pop() || 'audio.m4a';
        const fileInfo = {
          uri: fileUri,
          type: 'audio/m4a',
          name: filename,
        };
        form.append('file', fileInfo as any);
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data'
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const res = await fetch(`${this.baseURL}/app/ocorrencias/transcrever-audio`, {
        method: 'POST',
        headers,
        body: form as any,
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : undefined;

      if (!res.ok) {
        const friendly = this.mapFriendlyError(res.status, json?.message || res.statusText);
        this.showErrorToast(friendly.title, friendly.description);
        return { success: false, data: json as any, message: json?.message || res.statusText };
      }
      return { success: true, data: json as any };
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError';
      const friendly = isAbort
        ? { title: 'Tempo esgotado', description: 'A conexão demorou demais. Tente novamente.' }
        : this.mapFriendlyError(undefined, e?.message);
      this.showErrorToast(friendly.title, friendly.description);
      return { success: false, data: undefined as any, message: e?.message || 'Network error' };
    }
  }

  async createDespesaComViagem(viagemId: number, despesa: any): Promise<ApiResponse<any>> {
    return this.http('POST', '/app/despesas', { viagemId, despesa });
  }

  async finalizarViagem(id: string): Promise<ApiResponse<any>> {
    return this.http('POST', `/app/rotas/${id}/finalizar`, {});
  }
  
  async setCurrentRoute(id: string): Promise<ApiResponse<any>> {
    return this.http('POST', `/app/rotas/${id}/set-current`, {});
  }
  
  async getCurrentRoute(): Promise<ApiResponse<any>> {
    return this.http('GET', `/app/rotas/current`);
  }
}

export const apiClient = new ApiClient();