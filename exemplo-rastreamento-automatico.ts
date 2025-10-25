// Sistema de Rastreamento Automático - Exemplo de Uso
// Agora o sistema obtém automaticamente a rota atual do usuário

import { trackingService } from './src/services/TrackingService';

// Exemplo 1: Uso básico - Sistema automático
export const exemploUsoAutomatico = async () => {
    try {
        console.log('🚀 Iniciando rastreamento automático...');
        
        // 1. Iniciar rastreamento (a rota será obtida automaticamente)
        const success = await trackingService.startTracking();
        
        if (success) {
            console.log('✅ Rastreamento iniciado com sucesso!');
            console.log('📍 Localizações serão enviadas a cada 1 minuto');
            console.log('🔗 Rota atual será associada automaticamente');
            console.log('📱 App pode ser fechado - rastreamento continua em background');
            
            // O sistema automaticamente:
            // - Obtém a rota atual do usuário da tabela usuario_rota_atual
            // - Associa cada localização à rota atual
            // - Salva no banco de dados com todas as informações
            
        } else {
            console.log('❌ Falha ao iniciar rastreamento');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

// Exemplo 2: Verificar status do rastreamento
export const verificarStatus = async () => {
    try {
        const isTracking = await trackingService.isTrackingEnabled();
        console.log(`📍 Rastreamento ${isTracking ? 'ATIVO' : 'INATIVO'}`);
        
        if (isTracking) {
            console.log('✅ Sistema enviando localizações automaticamente');
            console.log('🔗 Rota atual sendo associada automaticamente');
        }
        
        return isTracking;
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        return false;
    }
};

// Exemplo 3: Parar rastreamento
export const pararRastreamento = async () => {
    try {
        await trackingService.stopTracking();
        console.log('🛑 Rastreamento parado');
    } catch (error) {
        console.error('❌ Erro ao parar rastreamento:', error);
    }
};

// Exemplo 4: Fluxo completo de uma viagem
export const fluxoCompletoViagem = async () => {
    try {
        console.log('🚗 Iniciando viagem...');
        
        // 1. Iniciar rastreamento
        const success = await trackingService.startTracking();
        
        if (success) {
            console.log('✅ Rastreamento iniciado');
            console.log('📍 Sistema obtendo rota atual automaticamente');
            console.log('🔄 Enviando localizações a cada 1 minuto');
            
            // 2. Simular viagem (em produção, isso seria automático)
            console.log('🚗 Viagem em andamento...');
            console.log('📱 App pode ser fechado - rastreamento continua');
            
            // 3. Para finalizar a viagem
            // await trackingService.stopTracking();
            // console.log('🏁 Viagem finalizada');
        }
    } catch (error) {
        console.error('❌ Erro no fluxo de viagem:', error);
    }
};

// Exemplo 5: Como funciona internamente
export const explicacaoFuncionamento = () => {
    console.log(`
    🔧 COMO FUNCIONA O SISTEMA AUTOMÁTICO:
    
    1. 📱 Usuário inicia rastreamento
    2. 🔍 Sistema consulta tabela 'usuario_rota_atual' 
    3. 📍 Obtém rota atual do usuário automaticamente
    4. 🗺️ Coleta localização do dispositivo
    5. 📤 Envia dados para API: {
         latitude, longitude, timestamp, accuracy,
         altitude, speed, heading, usuarioId
       }
    6. 🏗️ Backend associa automaticamente à rota atual
    7. 💾 Salva na tabela 'rastreamento' com todas as informações
    
    ✅ VANTAGENS:
    - Não precisa gerenciar rota manualmente
    - Sistema sempre atualizado com rota atual
    - Funciona mesmo com app fechado
    - Dados completos salvos automaticamente
    `);
};

// Exemplo 6: Dados salvos no banco
export const exemploDadosSalvos = () => {
    console.log(`
    📊 DADOS SALVOS NA TABELA 'rastreamento':
    
    {
        id: 1,
        usuarioId: 123,
        rotaId: 456,           // ← Obtido automaticamente
        latitude: -23.5505,
        longitude: -46.6333,
        timestamp: '2025-01-19 17:30:00',
        accuracy: 5.0,
        altitude: 760.0,
        speed: 12.5,
        heading: 45.0,
        createdAt: '2025-01-19 17:30:00'
    }
    
    🔗 RELACIONAMENTOS:
    - usuarioId → usuarios.id
    - rotaId → viagens.id (através de usuario_rota_atual)
    `);
};
