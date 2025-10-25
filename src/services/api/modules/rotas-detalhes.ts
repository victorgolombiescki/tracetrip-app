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

export const RotasDetalhesApi = {
    async getDetalhesRota(): Promise<{
        success: boolean;
        data?: DetalhesRotaResponse;
        message?: string;
    }> {
        try {
            const response = await apiClient.get(`/app/rotas-detalhes`);
            return response;
        } catch (error) {
            console.error('Erro ao buscar detalhes da rota:', error);
            return {
                success: false,
                message: 'Erro ao carregar detalhes da rota'
            };
        }
    }
};
