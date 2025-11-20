import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Alert, Platform } from 'react-native';
import { authService } from './auth/AuthService';
import { localDatabaseService } from './LocalDatabaseService';

const TRACKING_INTERVAL = 30 * 1000;
const BACKGROUND_TASK_NAME = 'background-location-tracking';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📦 [TRACKING] TrackingService.ts CARREGADO');
console.log(`📦 [TRACKING] BACKGROUND_TASK_NAME: ${BACKGROUND_TASK_NAME}`);
console.log(`📦 [TRACKING] TRACKING_INTERVAL: ${TRACKING_INTERVAL / 1000}s`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

export interface LocationData {
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
}

async function sendOrStoreLocation(locationData: LocationData): Promise<void> {
    const timestamp = new Date(locationData.timestamp).toLocaleString('pt-BR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 [TRACKING] ✅ LOCALIZAÇÃO CAPTURADA!`);
    console.log(`   📍 Coordenadas: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`);
    console.log(`   📏 Precisão: ${locationData.accuracy?.toFixed(1) || 'N/A'}m`);
    console.log(`   🕐 Timestamp: ${timestamp}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const sent = await sendLocationToAPI(locationData);
    if (sent) {
        console.log(`✅ [TRACKING] ✅ Localização ENVIADA para API com sucesso!`);
    } else {
        console.log(`💾 [TRACKING] Salvando localização offline (API indisponível ou sem token)`);
        try {
            await localDatabaseService.saveLocation({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                timestamp: locationData.timestamp,
                accuracy: locationData.accuracy,
            });
            console.log(`✅ [TRACKING] ✅ Localização SALVA offline com sucesso!`);
        } catch (error) {
            console.error('❌ [TRACKING] Erro ao salvar localização offline:', error);
        }
    }
}

async function getAuthToken(): Promise<string | null> {
    try {
        const storedAuth = await authService.getStoredAuth();
        return storedAuth?.token || null;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        return null;
    }
}


async function sendLocationToAPI(locationData: LocationData): Promise<boolean> {
    try {
        const apiUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL);
        if (!apiUrl || apiUrl === 'undefined') {
            console.log(`⚠️ [TRACKING] API URL não configurada`);
            return false;
        }

        const token = await getAuthToken();
        if (!token) {
            console.log(`⚠️ [TRACKING] Token de autenticação não encontrado`);
            return false;
        }

        const payload = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp,
            accuracy: locationData.accuracy,
            altitude: locationData.altitude,
            speed: locationData.speed,
            heading: locationData.heading,
        };

        console.log(`📤 [TRACKING] Enviando localização para API: ${apiUrl}/rastreamento/location`);

        const response = await fetch(`${apiUrl}/rastreamento/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`✅ [TRACKING] Resposta da API: ${response.status} ${response.statusText}`);
            return true;
        } else {
            console.log(`❌ [TRACKING] Erro na API: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error('❌ [TRACKING] Erro ao enviar para API:', error);
        return false;
    }
}

console.log(`📋 [TRACKING] Registrando background task: ${BACKGROUND_TASK_NAME}`);

TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
    console.log('🔥🔥🔥 [BACKGROUND] TASK CHAMADA PELO SISTEMA! 🔥🔥🔥');
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🔄 [BACKGROUND] Background task executada - ${timestamp}`);
    console.log(`🔄 [BACKGROUND] Data recebida:`, JSON.stringify(data));
    
    if (error) {
        console.error('❌ [BACKGROUND] Background task error:', error);
        console.error('❌ [BACKGROUND] Error details:', JSON.stringify(error));
        console.log('═══════════════════════════════════════════════════════');
        return;
    }

    try {
        const trackingEnabled = await SecureStore.getItemAsync('tracking_enabled');
        if (trackingEnabled !== 'true') {
            console.log(`⏸️ [BACKGROUND] Tracking desabilitado, ignorando...`);
            return;
        }

        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
            console.log(`⚠️ [BACKGROUND] Serviços de localização desabilitados`);
            return;
        }

        const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            console.log(`⚠️ [BACKGROUND] Permissão de background não concedida: ${backgroundStatus}`);
            return;
        }

        console.log(`🔍 [BACKGROUND] Buscando localização (background task)...`);

        let location;
        let locationSource = '';
        
        try {
            const lastKnownLocation = await Location.getLastKnownPositionAsync({
                maxAge: 300000,
                requiredAccuracy: 500,
            });
            
            if (lastKnownLocation) {
                const age = Date.now() - lastKnownLocation.timestamp;
                const ageMinutes = Math.floor(age / 60000);
                
                if (ageMinutes < 5) {
                    location = lastKnownLocation;
                    locationSource = `Última conhecida (${ageMinutes} min atrás)`;
                    console.log(`✅ [BACKGROUND] Usando última localização conhecida recente (${ageMinutes} min atrás): ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
                } else {
                    console.log(`⚠️ [BACKGROUND] Última localização conhecida muito antiga (${ageMinutes} min), tentando obter nova...`);
                    try {
                        location = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Lowest,
                            mayShowUserSettingsDialog: false,
                        });
                        locationSource = 'Lowest (atual)';
                        console.log(`✅ [BACKGROUND] Localização obtida (Lowest): ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
                    } catch (positionError) {
                        console.log(`⚠️ [BACKGROUND] Erro ao obter localização atual: ${positionError instanceof Error ? positionError.message : String(positionError)}`);
                        location = lastKnownLocation;
                        locationSource = `Última conhecida (${ageMinutes} min atrás)`;
                        console.log(`⚠️ [BACKGROUND] Usando última localização conhecida como fallback: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
                    }
                }
            } else {
                console.log(`⚠️ [BACKGROUND] Nenhuma localização conhecida, tentando obter nova...`);
                try {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Lowest,
                        mayShowUserSettingsDialog: false,
                    });
                    locationSource = 'Lowest (atual)';
                    console.log(`✅ [BACKGROUND] Localização obtida (Lowest): ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
                } catch (positionError) {
                    console.log(`❌ [BACKGROUND] Não foi possível obter localização: ${positionError instanceof Error ? positionError.message : String(positionError)}`);
                    return;
                }
            }
        } catch (error) {
            console.log(`❌ [BACKGROUND] Erro geral ao processar localização: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }

        const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp || Date.now(),
            accuracy: location.coords.accuracy ?? undefined,
            altitude: location.coords.altitude ?? undefined,
            speed: location.coords.speed ?? undefined,
            heading: location.coords.heading ?? undefined,
        };
        console.log(`📊 [BACKGROUND] Fonte: ${locationSource} | Timestamp: ${new Date(locationData.timestamp).toLocaleString('pt-BR')}`);
        await sendOrStoreLocation(locationData);
        console.log(`✅ [BACKGROUND] Background task concluída com sucesso`);
        console.log('═══════════════════════════════════════════════════════');
    } catch (error) {
        console.error('❌ [BACKGROUND] Erro no background task:', error);
        if (error instanceof Error) {
            console.error('❌ [BACKGROUND] Error message:', error.message);
            console.error('❌ [BACKGROUND] Error stack:', error.stack);
        }
        console.log('═══════════════════════════════════════════════════════');
    }
});

class TrackingService {
    private isTracking = false;

    async syncPendingLocations(): Promise<void> {
        await trySyncBatch();
    }

    async initializeTracking(): Promise<boolean> {
        console.log('🔧 [INIT] initializeTracking() CHAMADO');
        try {
            console.log('🔧 [INIT] Inicializando banco de dados local...');
            await localDatabaseService.initialize();
            console.log('🔧 [INIT] Banco de dados inicializado');
            
            console.log('🔧 [INIT] Verificando se localização está habilitada...');
            const isLocationEnabled = await Location.hasServicesEnabledAsync();
            console.log(`🔧 [INIT] Localização habilitada? ${isLocationEnabled ? 'SIM' : 'NÃO'}`);
            if (!isLocationEnabled) {
                console.log(`⚠️ [PERMISSÕES] Serviços de localização desabilitados no dispositivo`);
                return false;
            }

            console.log(`🔐 [PERMISSÕES] Solicitando permissão de foreground...`);
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                console.log(`❌ [PERMISSÕES] Permissão de foreground negada: ${foregroundStatus}`);
                return false;
            }
            console.log(`✅ [PERMISSÕES] Permissão de foreground concedida`);

            console.log(`🔐 [PERMISSÕES] Solicitando permissão de background...`);
            try {
                const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
                if (backgroundStatus !== 'granted') {
                    console.log(`❌ [PERMISSÕES] Permissão de background negada: ${backgroundStatus}`);
                    if (Platform.OS === 'android') {
                        Alert.alert(
                            'Permissão de Localização Necessária',
                            'Para rastrear a rota da viagem, o TraceTrip precisa da sua localização mesmo com o app fechado. Por favor, ative a permissão de localização em segundo plano nas configurações do app.',
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                { 
                                    text: 'Abrir Configurações', 
                                    onPress: () => {
                                        if (Platform.OS === 'android') {
                                            Location.enableNetworkProviderAsync().catch(() => {});
                                        }
                                    }
                                }
                            ]
                        );
                    }
                    return false;
                }
                console.log(`✅ [PERMISSÕES] Permissão de background concedida`);
            } catch (bgError) {
                console.error(`❌ [PERMISSÕES] Erro ao solicitar permissão de background:`, bgError);
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar tracking:', error);
            return false;
        }
    }

    async startTracking(): Promise<void> {
        try {
            console.log('═══════════════════════════════════════════════════════');
            console.log(`🚀 [TRACKING] ===== INICIANDO RASTREAMENTO =====`);
            console.log('═══════════════════════════════════════════════════════');
            
            if (this.isTracking) {
                console.log(`⚠️ [TRACKING] Tracking já está ativo, ignorando...`);
                return;
            }

            console.log(`🚀 [TRACKING] Iniciando rastreamento...`);
            console.log(`🚀 [TRACKING] Chamando initializeTracking()...`);
            const hasPermission = await this.initializeTracking();
            console.log(`🚀 [TRACKING] initializeTracking() retornou: ${hasPermission}`);
            
            if (!hasPermission) {
                console.log(`❌ [TRACKING] Permissões de localização negadas`);
                throw new Error('Permissões de localização necessárias');
            }

            this.isTracking = true;
            await SecureStore.setItemAsync('tracking_enabled', 'true');
            console.log(`✅ [TRACKING] Tracking habilitado e salvo`);

            await this.syncPendingLocations();
            
            console.log(`📱 [TRACKING] Usando APENAS background task (app aberto ou fechado)`);
            const { status: backgroundPermissionStatus } = await Location.getBackgroundPermissionsAsync();
            console.log(`🔐 [TRACKING] Status da permissão de background: ${backgroundPermissionStatus}`);
            
            if (backgroundPermissionStatus !== 'granted') {
                console.error(`❌ [TRACKING] Permissão de background não concedida: ${backgroundPermissionStatus}`);
                throw new Error('Permissão de background necessária para rastreamento em segundo plano');
            }

            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
            console.log(`📋 [TRACKING] Background task já registrada? ${isTaskRegistered}`);
            
            if (!isTaskRegistered) {
                console.log(`🔄 [TRACKING] Registrando background task...`);
                console.log(`⚙️ [TRACKING] Configuração: intervalo=${TRACKING_INTERVAL / 1000}s, accuracy=Balanced`);
                
                await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: TRACKING_INTERVAL,
                    distanceInterval: 0,
                    foregroundService: {
                        notificationTitle: 'TraceTrip Rastreamento',
                        notificationBody: 'Rastreamento ativo em segundo plano',
                        notificationColor: '#1E40AF',
                        killServiceOnDestroy: false,
                    },
                    deferredUpdatesInterval: TRACKING_INTERVAL,
                    deferredUpdatesDistance: 0,
                    showsBackgroundLocationIndicator: true,
                    mayShowUserSettingsDialog: false,
                    pausesUpdatesAutomatically: false,
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const isNowRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
                if (isNowRegistered) {
                    console.log(`✅ [TRACKING] Background task registrada com sucesso!`);
                    console.log(`⏱️ [TRACKING] Intervalo configurado: ${TRACKING_INTERVAL / 1000} segundos`);
                    console.log(`📱 [TRACKING] A task executará automaticamente a cada ${TRACKING_INTERVAL / 1000}s`);
                } else {
                    console.error(`❌ [TRACKING] FALHA: Background task não foi registrada após tentativa`);
                    throw new Error('Falha ao registrar background task');
                }
            } else {
                console.log(`✅ [TRACKING] Background task já estava registrada`);
            }
            
            console.log('═══════════════════════════════════════════════════════');
            console.log(`✅ [TRACKING] ===== RASTREAMENTO INICIADO COM SUCESSO =====`);
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📌 [TRACKING] IMPORTANTE: A background task executará automaticamente`);
            console.log(`📌 [TRACKING] Procure por logs: "🔥🔥🔥 [BACKGROUND] TASK CHAMADA PELO SISTEMA!"`);
            console.log(`📌 [TRACKING] A task pode levar alguns segundos para começar a executar`);
            console.log(`📌 [TRACKING] Se não aparecer logs da task, o app precisa ser rebuild`);
            console.log('═══════════════════════════════════════════════════════');
        } catch (error: unknown) {
            console.error('═══════════════════════════════════════════════════════');
            console.error('❌ [TRACKING] ===== ERRO AO INICIAR RASTREAMENTO =====');
            console.error('═══════════════════════════════════════════════════════');
            console.error('❌ [TRACKING] Erro ao iniciar background tracking:', error);
            if (error instanceof Error) {
                console.error('❌ [TRACKING] Detalhes do erro:', error.message);
                console.error('❌ [TRACKING] Stack:', error.stack);
            } else {
                console.error('❌ [TRACKING] Erro desconhecido:', String(error));
            }
            throw error;
        }
    }

    async stopTracking(): Promise<void> {
        console.log('🛑 [TRACKING] Parando tracking...');
        if (!this.isTracking) {
            console.log('🛑 [TRACKING] Tracking já estava parado');
            return;
        }

        this.isTracking = false;
        await SecureStore.setItemAsync('tracking_enabled', 'false');
        console.log('🛑 [TRACKING] Tracking desabilitado e salvo');

        try {
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
            }
        } catch (error) {}
    }

    async isTrackingEnabled(): Promise<boolean> {
        try {
            const enabled = await SecureStore.getItemAsync('tracking_enabled');
            return enabled === 'true';
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            return false;
        }
    }

    async restoreTrackingIfEnabled(): Promise<void> {
        console.log('🔄 [RESTORE] Verificando se precisa restaurar tracking...');
        try {
            const wasEnabled = await this.isTrackingEnabled();
            console.log(`🔄 [RESTORE] Tracking estava habilitado? ${wasEnabled ? 'SIM' : 'NÃO'}`);
            console.log(`🔄 [RESTORE] Tracking está ativo? ${this.isTracking ? 'SIM' : 'NÃO'}`);
            
            if (wasEnabled && !this.isTracking) {
                console.log('🔄 [RESTORE] Restaurando tracking...');
                const hasPermission = await this.initializeTracking();
                if (hasPermission) {
                    this.isTracking = true;

                    await this.syncPendingLocations();
                    
                    console.log(`📱 [RESTORE] Usando APENAS background task (app aberto ou fechado)`);

                    try {
                        const { status: backgroundPermissionStatus } = await Location.getBackgroundPermissionsAsync();
                        console.log(`🔐 [RESTORE] Status da permissão de background: ${backgroundPermissionStatus}`);
                        
                        if (backgroundPermissionStatus !== 'granted') {
                            console.error(`❌ [RESTORE] Permissão de background não concedida: ${backgroundPermissionStatus}`);
                            return;
                        }

                        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
                        console.log(`📋 [RESTORE] Background task já registrada? ${isTaskRegistered}`);
                        
                        if (!isTaskRegistered) {
                            console.log(`🔄 [RESTORE] Registrando background task...`);
                            await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
                                accuracy: Location.Accuracy.Balanced,
                                timeInterval: TRACKING_INTERVAL,
                                distanceInterval: 0,
                                foregroundService: {
                                    notificationTitle: 'TraceTrip Rastreamento',
                                    notificationBody: 'Rastreamento ativo em segundo plano',
                                    notificationColor: '#1E40AF',
                                    killServiceOnDestroy: false,
                                },
                                deferredUpdatesInterval: TRACKING_INTERVAL,
                                deferredUpdatesDistance: 0,
                                showsBackgroundLocationIndicator: true,
                                mayShowUserSettingsDialog: false,
                                pausesUpdatesAutomatically: false,
                            });
                            
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            const isNowRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
                            if (isNowRegistered) {
                                console.log(`✅ [RESTORE] Background task registrada com sucesso!`);
                            } else {
                                console.error(`❌ [RESTORE] FALHA: Background task não foi registrada`);
                            }
                        } else {
                            console.log(`✅ [RESTORE] Background task já estava registrada`);
                        }
                    } catch (error) {
                        console.error('❌ Erro ao restaurar background tracking:', error);
                        if (error instanceof Error) {
                            console.error('❌ [RESTORE] Detalhes do erro:', error.message);
                        }
                    }
                } else {
                    console.log('🔄 [RESTORE] Sem permissão, desabilitando tracking...');
                    await SecureStore.setItemAsync('tracking_enabled', 'false');
                }
            } else {
                console.log('🔄 [RESTORE] Não precisa restaurar (não estava habilitado ou já está ativo)');
            }
        } catch (error) {
            console.error('❌ [RESTORE] Erro ao restaurar tracking:', error);
        }
    }


    async getOfflineStats(): Promise<{ total: number; unsynced: number }> {
        try {
            return await localDatabaseService.getLocationCount();
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas offline:', error);
            return { total: 0, unsynced: 0 };
        }
    }

    async openLocationSettings(): Promise<void> {
        try {
            await Location.requestForegroundPermissionsAsync();
        } catch (error) {
            console.error('Erro ao abrir configurações:', error);
        }
    }

    async checkBackgroundTaskStatus(): Promise<void> {
        try {
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
            const { status: backgroundPermission } = await Location.getBackgroundPermissionsAsync();
            const trackingEnabled = await this.isTrackingEnabled();
            const isLocationEnabled = await Location.hasServicesEnabledAsync();
            
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📊 [STATUS] ===== DIAGNÓSTICO DO TRACKING =====`);
            console.log('═══════════════════════════════════════════════════════');
            console.log(`   ✅ Task registrada: ${isTaskRegistered ? 'SIM' : '❌ NÃO'}`);
            console.log(`   ✅ Permissão background: ${backgroundPermission === 'granted' ? 'CONCEDIDA' : `❌ ${backgroundPermission}`}`);
            console.log(`   ✅ Tracking habilitado: ${trackingEnabled ? 'SIM' : '❌ NÃO'}`);
            console.log(`   ✅ Tracking ativo: ${this.isTracking ? 'SIM' : '❌ NÃO'}`);
            console.log(`   ✅ Localização habilitada: ${isLocationEnabled ? 'SIM' : '❌ NÃO'}`);
            console.log(`   ✅ Modo: APENAS background task (app aberto ou fechado)`);
            console.log(`   ✅ Intervalo: ${TRACKING_INTERVAL / 1000} segundos`);
            console.log('═══════════════════════════════════════════════════════');
            
            if (!isTaskRegistered && trackingEnabled) {
                console.log(`⚠️ [STATUS] ATENÇÃO: Tracking está habilitado mas a task não está registrada!`);
            }
            
            if (isTaskRegistered && trackingEnabled && backgroundPermission === 'granted') {
                console.log(`✅ [STATUS] Tudo configurado! A task deve executar a cada ${TRACKING_INTERVAL / 1000}s`);
                console.log(`📌 [STATUS] Procure por logs: "🔥🔥🔥 [BACKGROUND] TASK CHAMADA PELO SISTEMA!"`);
                console.log(`📌 [STATUS] Se não aparecer, o app precisa ser rebuild após mudanças no app.json`);
            }
            console.log('═══════════════════════════════════════════════════════');
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
        }
    }

    async testLogs(): Promise<void> {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🧪 [TEST] ===== TESTE DE LOGS =====');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🧪 [TEST] Se você está vendo isso, os logs estão funcionando!');
        console.log('🧪 [TEST] Timestamp:', new Date().toLocaleString('pt-BR'));
        console.log('🧪 [TEST] BACKGROUND_TASK_NAME:', BACKGROUND_TASK_NAME);
        console.log('🧪 [TEST] TRACKING_INTERVAL:', TRACKING_INTERVAL / 1000, 'segundos');
        await this.checkBackgroundTaskStatus();
        console.log('═══════════════════════════════════════════════════════');
        console.log('🧪 [TEST] ===== FIM DO TESTE =====');
        console.log('═══════════════════════════════════════════════════════');
    }
}

export const trackingService = new TrackingService();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ [TRACKING] trackingService INSTANCIADO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function trySyncBatch(): Promise<void> {
    try {
        const online = await localDatabaseService.isOnline();
        if (!online) {
            console.log(`📴 [SYNC] Dispositivo offline, pulando sincronização`);
            return;
        }

        const unsynced = await localDatabaseService.getUnsyncedLocations();
        if (!unsynced || unsynced.length === 0) {
            console.log(`✅ [SYNC] Nenhuma localização pendente para sincronizar`);
            return;
        }

        console.log(`🔄 [SYNC] Sincronizando ${unsynced.length} localização(ões) pendente(s)...`);
        const successIds: number[] = [];
        for (const rec of unsynced) {
            const ok = await sendLocationToAPI({
                latitude: rec.latitude,
                longitude: rec.longitude,
                timestamp: rec.timestamp,
                accuracy: rec.accuracy,
            });
            if (ok && rec.id) successIds.push(rec.id);
        }

        if (successIds.length > 0) {
            await localDatabaseService.markAsSynced(successIds);
            await localDatabaseService.deleteSyncedLocations();
            console.log(`✅ [SYNC] ${successIds.length} localização(ões) sincronizada(s) com sucesso`);
        } else {
            console.log(`⚠️ [SYNC] Nenhuma localização foi sincronizada (erro na API ou sem token)`);
        }
    } catch (error) {
        console.error('❌ [SYNC] Erro ao sincronizar lote:', error);
    }
}
