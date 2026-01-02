import { apiClient } from '../ApiClient';

export interface EnderecoRotaDetalhes {
    id: number;
    endereco: string;
    latitude: number;
    longitude: number;
    ordem: number;
    tipo: string;
    isAeroporto: boolean;
    dataVisita?: string;
    horarioChegada?: string;
    horarioSaida?: string;
    diaVisita?: number;
    distanciaProximo?: number;
    alertaEnderecoDiferente: boolean;
    novoEndereco?: string;
    obrigatorioDataVisita: boolean;
    checkinRealizado: boolean;
    dataCheckin?: string;
    distanciaCheckin?: number;
    latitudeCheckin?: number;
    longitudeCheckin?: number;
    local?: {
        id: number;
        nome: string;
        endereco: string;
        latitude: number;
        longitude: number;
        cidade: string;
        estado: string;
        telefone?: string;
        email?: string;
    };
    usuarioCheckin?: {
        id: number;
        nome: string;
        email: string;
    };
}

export interface RotaDetalhes {
    id: number;
    nome: string;
    pontoPartida: string;
    pontoFinal: string;
    dataInicio: string;
    dataFim?: string;
    status: string;
    dataCriacao: string;
    dataAtualizacao: string;
}

export interface EstatisticasRota {
    totalEnderecos: number;
    checkinsRealizados: number;
    enderecosComDataVisita: number;
    enderecosObrigatorios: number;
    distanciaTotal: number;
    progressoCheckin: number;
}

export interface DetalhesRotaResponse {
    rota: RotaDetalhes;
    enderecos: EnderecoRotaDetalhes[];
    estatisticas: EstatisticasRota;
}

// Cache de requisições em andamento para evitar chamadas duplicadas
let pendingRequest: Promise<{ success: boolean; data?: DetalhesRotaResponse; message?: string }> | null = null;
let lastRequestId: number | undefined = undefined;

export const RotasDetalhesApi = {
    async getDetalhesRota(id?: number): Promise<{
        success: boolean;
        data?: DetalhesRotaResponse;
        message?: string;
    }> {
        // Se já existe uma requisição em andamento para o mesmo ID, retorna a mesma Promise
        if (pendingRequest && lastRequestId === id) {
            console.log('🔄 [ROTAS-DETALHES] Requisição duplicada detectada, retornando requisição em andamento');
            return pendingRequest;
        }

        // Cria nova requisição
        pendingRequest = (async () => {
            try {
                console.log('🔵 [ROTAS-DETALHES] Iniciando busca de detalhes da rota');
                console.log('📋 [ROTAS-DETALHES] ID recebido:', id);
                
                lastRequestId = id;
                
                if (id) {
                    console.log('🔧 [ROTAS-DETALHES] Definindo rota atual:', id);
                    const setCurrentResponse = await apiClient.setCurrentRoute(String(id));
                    console.log('✅ [ROTAS-DETALHES] Resposta setCurrentRoute:', JSON.stringify(setCurrentResponse, null, 2));
                    
                    if (!setCurrentResponse.success) {
                        console.error('❌ [ROTAS-DETALHES] Falha ao definir rota atual:', setCurrentResponse.message);
                        return {
                            success: false,
                            message: setCurrentResponse.message || 'Erro ao definir rota atual'
                        };
                    }
                }
                
                // Busca os detalhes da rota atual
                console.log('🔍 [ROTAS-DETALHES] Buscando detalhes em /app/rotas-detalhes');
                const response = await apiClient.get(`/app/rotas-detalhes`);
                
                console.log('📦 [ROTAS-DETALHES] Resposta completa:', JSON.stringify(response, null, 2));
                
                // A resposta vem com estrutura aninhada: response.data.data
                // Precisamos extrair os dados corretos
                if (response.success && response.data) {
                    // Verifica se há data.data (estrutura aninhada)
                    const detalhesData = (response.data as any).data || response.data;
                    
                    console.log('✅ [ROTAS-DETALHES] Dados extraídos:', {
                        hasRota: !!detalhesData.rota,
                        hasEnderecos: !!detalhesData.enderecos,
                        totalEnderecos: detalhesData.enderecos?.length || 0,
                        hasEstatisticas: !!detalhesData.estatisticas
                    });
                    
                    return {
                        success: true,
                        data: detalhesData as DetalhesRotaResponse
                    };
                }
                
                console.warn('⚠️ [ROTAS-DETALHES] Resposta sem dados ou sem sucesso');
                return {
                    success: false,
                    message: response.message || 'Não foi possível carregar os detalhes da rota'
                };
            } catch (error) {
                console.error('❌ [ROTAS-DETALHES] Erro ao buscar detalhes da rota:', error);
                if (error instanceof Error) {
                    console.error('❌ [ROTAS-DETALHES] Mensagem de erro:', error.message);
                }
                return {
                    success: false,
                    message: 'Erro ao carregar detalhes da rota'
                };
            } finally {
                // Limpa a requisição pendente após completar
                pendingRequest = null;
                lastRequestId = undefined;
            }
        })();

        return pendingRequest;
    }
};
