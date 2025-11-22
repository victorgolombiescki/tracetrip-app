import { Rota, Agenda, Despesa, Ocorrencia } from '@/src/types';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private lastDetectedIP: string | null = null;

  constructor(baseURL: string = (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_BASE_URL) || 'https://tripapi.traceai.com.br') {
    this.baseURL = this.detectAndUpdateBaseURL(baseURL);
    this.logBaseURL();
  }

  private detectAndUpdateBaseURL(envBaseURL: string): string {
    const isDevelopment = __DEV__ || Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!isDevelopment || envBaseURL.includes('https://')) {
      return envBaseURL;
    }

    try {
      const expoIP = this.getExpoServerIP();
      if (expoIP) {
        const detectedURL = `http://${expoIP}:3002`;
        
        if (this.lastDetectedIP && this.lastDetectedIP !== expoIP) {
        } else if (!this.lastDetectedIP) {
          const currentIP = this.extractIPFromURL(envBaseURL);
        }
        
        this.lastDetectedIP = expoIP;
        return detectedURL;
      } else {
        const currentIP = this.extractIPFromURL(envBaseURL);
        if (currentIP) {
          this.lastDetectedIP = currentIP;
        }
      }
    } catch (error) {
    }

    return envBaseURL;
  }

  private extractIPFromURL(url: string): string | null {
    try {
      const match = url.match(/http:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (match && match[1] && this.isValidIP(match[1])) {
        return match[1];
      }
    } catch (error) {
      // Ignora erros
    }
    return null;
  }

  private getExpoServerIP(): string | null {
    try {
      if (Constants.expoConfig?.hostUri) {
        const ip = Constants.expoConfig.hostUri.split(':')[0];
        if (ip && this.isValidIP(ip)) {
          return ip;
        }
      }

      if (Constants.manifest2?.extra?.expoGo?.debuggerHost) {
        const ip = Constants.manifest2.extra.expoGo.debuggerHost.split(':')[0];
        if (ip && this.isValidIP(ip)) {
          return ip;
        }
      }

      if ((Constants.manifest as any)?.hostUri) {
        const ip = (Constants.manifest as any).hostUri.split(':')[0];
        if (ip && this.isValidIP(ip)) {
          return ip;
        }
      }
    } catch (error) {
    }

    return null;
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }

  private logBaseURL(): void {
  }

  getBaseURL(): string {
    const updatedURL = this.detectAndUpdateBaseURL(this.baseURL);
    if (updatedURL !== this.baseURL) {
      this.baseURL = updatedURL;
      this.logBaseURL();
    }
    return this.baseURL;
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

  private async http<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, body?: any, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined as any;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : undefined;

    const currentBaseURL = this.getBaseURL();
    const url = `${currentBaseURL}${path}`;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller?.signal,
      } as any);

      const text = await res.text();
      
      let json: any = undefined;
      try {
        json = text ? JSON.parse(text) : undefined;
      } catch (parseError) {
      }

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
    const response = await this.http<Array<{
      id: string;
      nome: string;
      dataInicio: string;
      dataFim: string;
      status: string;
    }>>('GET', '/app/rotas/simples/lista');
    return response;
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
    apenasRotaAtual?: boolean;
  }): Promise<ApiResponse<{
    items: Despesa[];
    meta: {
      totalItems: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
  }>> {
    // Sempre usar POST com filtros para garantir que apenasRotaAtual seja enviado
    const body = {
      filtros: {
        status: filtros?.status || 'todos',
        tipo: filtros?.tipo || 'todas',
        descricao: filtros?.descricao || '',
        apenasRotaAtual: filtros?.apenasRotaAtual !== undefined ? filtros.apenasRotaAtual : true
      }
    };
    return this.http('POST', '/app/despesas/filtros', body);
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

      const res = await fetch(`${this.getBaseURL()}/app/despesas/create-inteligente`, {
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

      const res = await fetch(`${this.getBaseURL()}/app/despesas/create-inteligente`, {
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

      const res = await fetch(`${this.getBaseURL()}/app/ocorrencias/transcrever-audio`, {
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

  async getVeiculos(): Promise<ApiResponse<any[]>> {
    return this.http('GET', '/app/frota/veiculos');
  }

  async getReservasVeiculo(filtros?: {
    veiculoId?: number;
    dataInicio?: string;
    dataFim?: string;
    status?: string;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filtros?.veiculoId) params.append('veiculoId', String(filtros.veiculoId));
    if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros?.dataFim) params.append('dataFim', filtros.dataFim);
    if (filtros?.status) params.append('status', filtros.status);
    const query = params.toString();
    return this.http('GET', `/app/frota/reservas${query ? `?${query}` : ''}`);
  }

  async createReservaVeiculo(reserva: any | any[]): Promise<ApiResponse<any>> {
    return this.http('POST', '/app/frota/reservas', reserva);
  }

  async updateReservaVeiculo(id: number, reserva: any): Promise<ApiResponse<any>> {
    return this.http('PATCH', `/app/frota/reservas/${id}`, reserva);
  }

  async deleteReservaVeiculo(id: number, excluirGrupo?: boolean): Promise<ApiResponse<void>> {
    const query = excluirGrupo ? '?excluirGrupo=true' : '';
    return this.http('DELETE', `/app/frota/reservas/${id}${query}`);
  }

  async getHorariosDisponiveisVeiculo(veiculoId: number, data: string): Promise<ApiResponse<any>> {
    return this.http('GET', `/app/frota/reservas/horarios-disponiveis?veiculoId=${veiculoId}&data=${data}`);
  }

  async getDisponibilidadeVeiculos(params: {
    dataInicio: string;
    dataFim: string;
    veiculoId?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append('dataInicio', params.dataInicio);
    queryParams.append('dataFim', params.dataFim);
    if (params.veiculoId) queryParams.append('veiculoId', String(params.veiculoId));
    return this.http('GET', `/app/frota/reservas/disponibilidade?${queryParams.toString()}`);
  }

  async getReservasVinculadas(id: number): Promise<ApiResponse<any[]>> {
    return this.http('GET', `/app/frota/reservas/${id}/vinculadas`);
  }

  async getPendencias(status?: string): Promise<ApiResponse<any[]>> {
    const query = status ? `?status=${status}` : '';
    return this.http('GET', `/pendencias${query}`);
  }

  async getPendenciasCount(): Promise<ApiResponse<{ count: number }>> {
    return this.http('GET', `/pendencias/contar`);
  }

  async getPendenciaById(id: number): Promise<ApiResponse<any>> {
    return this.http('GET', `/pendencias/${id}`);
  }

  async concluirPendencia(id: number, atualizarDataHoraFim?: boolean): Promise<ApiResponse<any>> {
    return this.http('POST', `/pendencias/${id}/concluir`, { atualizarDataHoraFim });
  }

  async cancelarPendencia(id: number): Promise<ApiResponse<any>> {
    return this.http('POST', `/pendencias/${id}/cancelar`);
  }

  async getHistoricosKm(veiculoId: number): Promise<ApiResponse<any>> {
    return this.http('GET', `/frota/veiculos/${veiculoId}/kms`);
  }

  async createHistoricoKm(veiculoId: number, data: { kmRegistrado: number; observacoes?: string; fotoOdometro?: string }): Promise<ApiResponse<any>> {
    return this.http('POST', `/frota/veiculos/${veiculoId}/kms`, data);
  }

  async updateReservaKmFinal(reservaId: number, kmFinal: number): Promise<ApiResponse<any>> {
    return this.http('PATCH', `/app/frota/reservas/${reservaId}`, { kmFinal });
  }

  async processarOcrKm(formData: FormData): Promise<ApiResponse<any>> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch(`${this.getBaseURL()}/app/frota/ocr-km`, {
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

  async uploadFotoReserva(reservaId: number, formData: FormData): Promise<ApiResponse<any>> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch(`${this.getBaseURL()}/app/frota/reservas/${reservaId}/fotos`, {
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

  async atualizarObservacoesReserva(reservaId: number, observacoes: string): Promise<ApiResponse<any>> {
    return this.http('PATCH', `/app/frota/reservas/${reservaId}/observacoes`, { observacoes });
  }

  async uploadFotoOdometro(veiculoId: number, formData: FormData): Promise<ApiResponse<any>> {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch(`${this.getBaseURL()}/app/frota/veiculos/${veiculoId}/foto-odometro`, {
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

  async registrarPushToken(token: string, plataforma: 'ios' | 'android', playerId?: string): Promise<ApiResponse<any>> {
    return this.http('POST', '/push-notifications/registrar-token', { token, plataforma, playerId });
  }

  async desativarPushToken(token: string): Promise<ApiResponse<any>> {
    return this.http('POST', '/push-notifications/desativar-token', { token });
  }

  async limparTodosTokensPush(): Promise<ApiResponse<any>> {
    return this.http('POST', '/push-notifications/limpar-tokens', {});
  }

  async associarExternalUserId(playerId: string): Promise<ApiResponse<any>> {
    return this.http('POST', '/push-notifications/associar-external-user-id', { playerId });
  }

  async verificarVersao(appVersion: string, platform: string): Promise<ApiResponse<{
    precisaAtualizar: boolean;
    atualizacaoObrigatoria: boolean;
    versaoAtual: string;
    versaoMinima: string;
    urlAtualizacao?: string;
    mensagem?: string;
  }>> {
    return this.http('GET', `/app/versao/verificar`, undefined, {
      'x-app-version': appVersion,
      'x-platform': platform,
    });
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.http<T>('GET', path);
  }

  async getConfiguracoesNotificacoes(): Promise<ApiResponse<Array<{
    tipoNotificacao: string;
    label: string;
    descricao: string;
    habilitado: boolean;
    id: number | null;
  }>>> {
    return this.http('GET', '/configuracoes-notificacoes');
  }

  async criarConfiguracaoNotificacao(tipoNotificacao: string, habilitado: boolean): Promise<ApiResponse<any>> {
    return this.http('POST', '/configuracoes-notificacoes', {
      tipoNotificacao,
      habilitado
    });
  }

  async atualizarConfiguracaoNotificacao(tipoNotificacao: string, habilitado: boolean): Promise<ApiResponse<any>> {
    return this.http('PUT', `/configuracoes-notificacoes/${tipoNotificacao}`, {
      habilitado
    });
  }

  async getNotificacoes(status?: string, limite?: number, offset?: number): Promise<ApiResponse<{
    notificacoes: Array<{
      id: number;
      tipo: string;
      titulo: string;
      mensagem: string;
      status: string;
      createdAt: string;
      viagemId?: number;
      dadosAdicionais?: any;
    }>;
    total: number;
  }>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limite) params.append('limite', limite.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return this.http('GET', `/app/notificacoes${query ? `?${query}` : ''}`);
  }

  async contarNotificacoesNaoLidas(): Promise<ApiResponse<{ count: number }>> {
    return this.http('GET', '/app/notificacoes/nao-lidas/count');
  }

  async marcarNotificacaoComoLida(id: number): Promise<ApiResponse<{ sucesso: boolean }>> {
    return this.http('PUT', `/app/notificacoes/${id}/marcar-lida`);
  }

  async marcarTodasNotificacoesComoLidas(): Promise<ApiResponse<{ quantidade: number }>> {
    return this.http('PUT', '/app/notificacoes/marcar-todas-lidas');
  }
}

export const apiClient = new ApiClient();