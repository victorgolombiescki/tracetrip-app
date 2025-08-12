export interface Usuario {
    id: string;
    nome: string;
    email: string;
    avatarUrl?: string;
    updatedAt: string;
  }
  
  export interface Rota {
    id: string;
    origem: string;
    destino: string;
    partidaAt: string;
    chegadaAt: string;
    status: 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';
    detalhes?: string;
    updatedAt: string;
  }
  
  export interface Agenda {
    id: string;
    rotaId: string;
    titulo: string;
    inicioAt: string;
    fimAt: string;
    local?: string;
    descricao?: string;
    lembreteMin?: number;
    destinatario?: string;
    status?: string;
    statusConfirmacao?: boolean;
    updatedAt: string;
  }
  
  export interface Despesa {
    id: string;
    rotaId?: string;
    nome: string;
    titulo?: string;
    categoria?: 'alimentacao' | 'transporte' | 'hospedagem' | 'combustivel' | 'outros';
    tipo: 'ALIMENTACAO' | 'TRANSPORTE' | 'HOSPEDAGEM' | 'COMBUSTIVEL' | 'OUTROS';
    valor: string;
    moeda?: string;
    data: string;
    hora: string;
    status?: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
    temAnexo: boolean;
    rota?: string;
    imageUri?: string;
    ocrJson?: any;
    updatedAt?: string;
  }
  
  export interface Ocorrencia {
    id: string;
    rotaId: string;
    titulo: string;
    descricao: string;
    dataHora: string;
    latitude?: number;
    longitude?: number;
    imageUri?: string;
    updatedAt: string;
  }