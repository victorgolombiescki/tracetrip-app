
import { trackingService } from './src/services/TrackingService';


export const verificarStatus = async () => {
    try {
        return await trackingService.isTrackingEnabled();
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        return false;
    }
};

export const pararRastreamento = async () => {
    try {
        await trackingService.stopTracking();
    } catch (error) {
        console.error('❌ Erro ao parar rastreamento:', error);
    }
};

export const fluxoCompletoViagem = async () => {
    try {
        await trackingService.startTracking();
    } catch (error) {
        console.error('❌ Erro no fluxo de viagem:', error);
    }
};
