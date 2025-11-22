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
    console.log(`📤 [TRACKING] Tentando enviar localização para API...`);
    const sent = await sendLocationToAPI(locationData);
    if (sent) {
        console.log(`✅ [TRACKING] Localização enviada com SUCESSO para o backend!`);
        console.log(`   📍 Coordenadas: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`);
    } else {
        console.log(`💾 [TRACKING] Falha ao enviar para API, salvando localmente para sincronizar depois...`);
        try {
            await localDatabaseService.saveLocation({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                timestamp: locationData.timestamp,
                accuracy: locationData.accuracy,
            });
            console.log(`✅ [TRACKING] Localização salva localmente com sucesso`);
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
        console.log(`🔍 [TRACKING] Verificando configuração da API...`);
        const apiUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL);
        if (!apiUrl || apiUrl === 'undefined') {
            console.log(`⚠️ [TRACKING] API URL não configurada`);
            return false;
        }
        console.log(`✅ [TRACKING] API URL: ${apiUrl}`);

        console.log(`🔍 [TRACKING] Obtendo token de autenticação...`);
        const token = await getAuthToken();
        if (!token) {
            console.log(`⚠️ [TRACKING] Token de autenticação não encontrado`);
            return false;
        }
        console.log(`✅ [TRACKING] Token obtido (primeiros 20 chars: ${token.substring(0, 20)}...)`);

        const payload = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp,
            accuracy: locationData.accuracy,
            altitude: locationData.altitude,
            speed: locationData.speed,
            heading: locationData.heading,
        };

        console.log(`📤 [TRACKING] Enviando requisição POST para ${apiUrl}/rastreamento/location...`);
        console.log(`   📍 Payload: lat=${payload.latitude.toFixed(6)}, lng=${payload.longitude.toFixed(6)}`);
        
        const response = await fetch(`${apiUrl}/rastreamento/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload)
        });

        console.log(`📥 [TRACKING] Resposta recebida: Status ${response.status} ${response.statusText}`);

        if (response.ok) {
            const responseData = await response.json().catch(() => null);
            console.log(`✅ [TRACKING] API respondeu com sucesso (${response.status})`);
            if (responseData) {
                console.log(`   📊 Resposta: ${JSON.stringify(responseData).substring(0, 100)}...`);
            }
            return true;
        } else {
            const errorText = await response.text().catch(() => 'Erro desconhecido');
            console.log(`❌ [TRACKING] Erro na API: ${response.status} ${response.statusText}`);
            console.log(`   📄 Detalhes: ${errorText.substring(0, 200)}`);
            return false;
        }
    } catch (error) {
        console.error('❌ [TRACKING] Erro ao enviar para API:', error);
        if (error instanceof Error) {
            console.error(`   📄 Mensagem: ${error.message}`);
            console.error(`   📄 Stack: ${error.stack?.substring(0, 200)}`);
        }
        return false;
    }
}

TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
    const timestamp = new Date().toLocaleString('pt-BR');

    if (error) {
        console.error('❌ [BACKGROUND] Background task error:', error);
        console.error('❌ [BACKGROUND] Error details:', JSON.stringify(error));
        console.log('═══════════════════════════════════════════════════════');
        return;
    }

    try {
        console.log(`🔄 [BACKGROUND] Executando background task - ${timestamp}`);
        
        const trackingEnabled = await SecureStore.getItemAsync('tracking_enabled');
        if (trackingEnabled !== 'true') {
            console.log('⚠️ [BACKGROUND] Rastreamento desabilitado, ignorando...');
            return;
        }

        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
            return;
        }

        const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            return;
        }

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
                } else {
                    try {
                        location = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Lowest,
                            mayShowUserSettingsDialog: false,
                        });
                        locationSource = 'Lowest (atual)';
                    } catch (positionError) {
                        console.log(`⚠️ [BACKGROUND] Erro ao obter localização atual: ${positionError instanceof Error ? positionError.message : String(positionError)}`);
                        location = lastKnownLocation;
                        locationSource = `Última conhecida (${ageMinutes} min atrás)`;
                        console.log(`⚠️ [BACKGROUND] Usando última localização conhecida como fallback: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
                    }
                }
            } else {
                try {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Lowest,
                        mayShowUserSettingsDialog: false,
                    });
                    locationSource = 'Lowest (atual)';
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
        
        console.log(`📍 [BACKGROUND] Localização obtida: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`);
        console.log(`📍 [BACKGROUND] Fonte: ${locationSource}`);
        console.log(`📍 [BACKGROUND] Precisão: ${locationData.accuracy ? locationData.accuracy.toFixed(0) + 'm' : 'N/A'}`);
        console.log(`📍 [BACKGROUND] Timestamp: ${new Date(locationData.timestamp).toLocaleString('pt-BR')}`);
        
        await sendOrStoreLocation(locationData);
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
        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 [TRACKING] ===== INICIANDO RASTREAMENTO =====');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🔍 [TRACKING] Estado atual: ${this.isTracking ? 'JÁ ESTÁ ATIVO' : 'INATIVO'}`);
        
        try {
            if (this.isTracking) {
                console.log('⚠️ [TRACKING] Rastreamento já está ativo, ignorando chamada...');
                return;
            }
            
            console.log('🔍 [TRACKING] Verificando permissões e inicializando...');

            const hasPermission = await this.initializeTracking();
            console.log(`🔍 [TRACKING] Permissões obtidas: ${hasPermission ? '✅ SIM' : '❌ NÃO'}`);
            
            if (!hasPermission) {
                console.error('❌ [TRACKING] Permissões de localização necessárias');
                throw new Error('Permissões de localização necessárias');
            }

            console.log('✅ [TRACKING] Permissões OK, ativando rastreamento...');
            this.isTracking = true;
            await SecureStore.setItemAsync('tracking_enabled', 'true');
            console.log('✅ [TRACKING] Flag de rastreamento salva no SecureStore');

            await this.syncPendingLocations();
            
            const { status: backgroundPermissionStatus } = await Location.getBackgroundPermissionsAsync();
            
            if (backgroundPermissionStatus !== 'granted') {
                throw new Error('Permissão de background necessária para rastreamento em segundo plano');
            }

            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
            
            if (!isTaskRegistered) {
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
                if (!isNowRegistered) {
                    throw new Error('Falha ao registrar background task');
                }
                console.log('✅ [TRACKING] Background task registrada com sucesso!');
                console.log(`✅ [TRACKING] Rastreamento iniciado - Intervalo: ${TRACKING_INTERVAL / 1000}s`);
                console.log('✅ [TRACKING] Localizações serão enviadas automaticamente a cada 30 segundos');
            } else {
                console.log('✅ [TRACKING] Background task já estava registrada, continuando...');
            }
            
            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ [TRACKING] ===== RASTREAMENTO ATIVO =====');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📍 [TRACKING] Status: ATIVO`);
            console.log(`⏱️  [TRACKING] Intervalo: ${TRACKING_INTERVAL / 1000} segundos`);
            console.log(`📱 [TRACKING] Modo: Background + Foreground`);
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
        console.log('═══════════════════════════════════════════════════════');
        console.log('🛑 [TRACKING] ===== PARANDO RASTREAMENTO =====');
        console.log('═══════════════════════════════════════════════════════');
        if (!this.isTracking) {
            console.log('⚠️ [TRACKING] Rastreamento já estava parado');
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
                console.log('✅ [TRACKING] Background task parada com sucesso');
            } else {
                console.log('ℹ️  [TRACKING] Background task já estava parada');
            }
            console.log('✅ [TRACKING] Rastreamento desabilitado e salvo');
            console.log('═══════════════════════════════════════════════════════');
        } catch (error) {
            console.error('❌ [TRACKING] Erro ao parar tracking:', error);
        }
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
        try {
            const wasEnabled = await this.isTrackingEnabled();
            
            if (wasEnabled && !this.isTracking) {
                console.log('🔄 [RESTORE] Restaurando tracking...');
                const hasPermission = await this.initializeTracking();
                if (hasPermission) {
                    this.isTracking = true;

                    await this.syncPendingLocations();
                    
                    try {
                        const { status: backgroundPermissionStatus } = await Location.getBackgroundPermissionsAsync();
                        
                        if (backgroundPermissionStatus !== 'granted') {
                            console.error(`❌ [RESTORE] Permissão de background não concedida: ${backgroundPermissionStatus}`);
                            return;
                        }

                        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
                        
                        if (!isTaskRegistered) {
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
                            
                            await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
                        } 
                    } catch (error) {
                        console.error('❌ Erro ao restaurar background tracking:', error);
                        if (error instanceof Error) {
                            console.error('❌ [RESTORE] Detalhes do erro:', error.message);
                        }
                    }
                } else {
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
            console.log('═══════════════════════════════════════════════════════');
            console.log('🔍 [TRACKING] ===== VERIFICANDO STATUS =====');
            console.log('═══════════════════════════════════════════════════════');
            
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
            const { status: backgroundPermission } = await Location.getBackgroundPermissionsAsync();
            const { status: foregroundPermission } = await Location.getForegroundPermissionsAsync();
            const trackingEnabled = await this.isTrackingEnabled();
            const isLocationEnabled = await Location.hasServicesEnabledAsync();
            
            console.log(`📍 [STATUS] Rastreamento habilitado: ${trackingEnabled ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`📍 [STATUS] Background task registrada: ${isTaskRegistered ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`📍 [STATUS] Permissão foreground: ${foregroundPermission === 'granted' ? '✅ CONCEDIDA' : '❌ NEGADA'}`);
            console.log(`📍 [STATUS] Permissão background: ${backgroundPermission === 'granted' ? '✅ CONCEDIDA' : '❌ NEGADA'}`);
            console.log(`📍 [STATUS] GPS habilitado: ${isLocationEnabled ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`📍 [STATUS] Estado interno: ${this.isTracking ? '✅ ATIVO' : '❌ INATIVO'}`);
            console.log(`⏱️  [STATUS] Intervalo: ${TRACKING_INTERVAL / 1000} segundos`);
            
            if (isTaskRegistered && trackingEnabled && backgroundPermission === 'granted' && isLocationEnabled) {
                console.log('✅ [STATUS] Tudo configurado corretamente! Rastreamento deve estar funcionando.');
            } else {
                console.log('⚠️  [STATUS] Alguma configuração está faltando. Verifique os itens acima.');
            }
            
            console.log('═══════════════════════════════════════════════════════');
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
        }
    }

    async testLogs(): Promise<void> {
        await this.checkBackgroundTaskStatus();
    }
}

export const trackingService = new TrackingService();

async function trySyncBatch(): Promise<void> {
    try {
        const online = await localDatabaseService.isOnline();
        if (!online) {
            return;
        }

        const unsynced = await localDatabaseService.getUnsyncedLocations();
        if (!unsynced || unsynced.length === 0) {
            return;
        }

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
        } else {
            console.log(`⚠️ [SYNC] Nenhuma localização foi sincronizada (erro na API ou sem token)`);
        }
    } catch (error) {
        console.error('❌ [SYNC] Erro ao sincronizar lote:', error);
    }
}
