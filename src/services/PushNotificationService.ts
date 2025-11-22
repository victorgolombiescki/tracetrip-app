import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { OneSignal, LogLevel } from 'react-native-onesignal';
import { apiClient } from './api/ApiClient';

const ONESIGNAL_APP_ID =  '13e1b3b0-0f04-4cab-a143-0542306e1b2f';

export class PushNotificationService {
    private static oneSignalUserId: string | null = null;
    private static pushToken: string | null = null;
    private static isInitialized: boolean = false;
    private static registrationAttempts: number = 0;
    private static isSettingExternalUserId: boolean = false;
    private static lastExternalUserId: string | null = null;
    private static isRegistering: boolean = false;
    private static readonly MAX_REGISTRATION_ATTEMPTS = 5;

    static async initialize(): Promise<string | null> {
        try {
            if (this.isInitialized && this.pushToken) {
                return this.pushToken;
            }

            console.log('📱 Inicializando OneSignal...');
            const appId = Constants.expoConfig?.extra?.oneSignalAppId || ONESIGNAL_APP_ID;
            console.log(`📱 OneSignal App ID: ${appId}`);
            
            OneSignal.Debug.setLogLevel(LogLevel.Verbose);
            OneSignal.initialize(appId);

            const permission = await OneSignal.Notifications.requestPermission(true);
            if (permission) {
            const token = await OneSignal.User.pushSubscription.getTokenAsync();
            if (token) {
                this.pushToken = token;
                    console.log(`✅ OneSignal Push Token obtido: ${token.substring(0, 20)}...`);
                }
            }

            OneSignal.User.addEventListener('change', async (event) => {
                try {
                    const onesignalId = await OneSignal.User.getOnesignalId();
                    const externalId = await OneSignal.User.getExternalId();
                    
                    if (onesignalId) {
                        this.oneSignalUserId = onesignalId;
                    }
                    
                    if (externalId && externalId === this.lastExternalUserId) {
                        console.log(`✅ [USER_LISTENER] External User ID confirmado: "${externalId}"`);
                        if (this.pushToken && !this.isRegistering) {
                            setTimeout(() => this.tentarRegistrarTokenComRetry(), 2000);
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Erro no listener de mudanças do usuário:', error);
                }
            });

            OneSignal.Notifications.addEventListener('click', (event) => {
                console.log('📱 Notificação clicada:', event.notification);
            });

            this.isInitialized = true;
            return this.pushToken;
        } catch (error: any) {
            console.error('❌ Erro ao inicializar push notifications:', error?.message);
            return null;
        }
    }

    static async setExternalUserId(userId: string): Promise<void> {
        if (!userId || userId.trim() === '') {
            console.error('❌ External User ID não pode ser vazio');
            return;
        }

        if (this.isSettingExternalUserId) {
            console.log(`⏳ [SET_EXTERNAL_USER_ID] Já está configurando, aguardando...`);
            let tentativas = 0;
            while (this.isSettingExternalUserId && tentativas < 60) {
                await new Promise(resolve => setTimeout(resolve, 500));
                tentativas++;
            }
            if (this.isSettingExternalUserId) {
                this.isSettingExternalUserId = false;
            }
        }

        if (this.lastExternalUserId === userId) {
            try {
                const externalIdAtual = await OneSignal.User.getExternalId();
                if (externalIdAtual === userId) {
                    console.log(`✅ [SET_EXTERNAL_USER_ID] Já está configurado: "${userId}"`);
                    if (this.pushToken) {
                        await this.tentarRegistrarTokenComRetry();
                    }
                    return;
                }
            } catch (error) {
                console.log(`⚠️ Erro ao verificar, continuando...`);
            }
        }

        this.isSettingExternalUserId = true;

        try {
            console.log(`📱 [SET_EXTERNAL_USER_ID] Iniciando para: "${userId}"`);

            if (!this.isInitialized) {
                await this.initialize();
            }

            const isSubscribed = await OneSignal.User.pushSubscription.getOptedInAsync();
            if (!isSubscribed) {
                const permission = await OneSignal.Notifications.requestPermission(true);
                if (!permission) {
                    console.error('❌ Permissão negada');
                    this.isSettingExternalUserId = false;
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const externalIdAntes = await OneSignal.User.getExternalId();
            if (externalIdAntes && externalIdAntes !== userId) {
                console.log(`⚠️ External ID diferente detectado. Fazendo logout...`);
                OneSignal.logout();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            console.log(`📱 [SET_EXTERNAL_USER_ID] Chamando OneSignal.login("${userId}")...`);
            OneSignal.login(userId);
            this.lastExternalUserId = userId;

            console.log(`⏳ [SET_EXTERNAL_USER_ID] Aguardando confirmação (15 segundos)...`);
            await new Promise(resolve => setTimeout(resolve, 15000));

            let externalIdConfirmado = false;
            for (let i = 0; i < 10; i++) {
                try {
                    const externalIdAtual = await OneSignal.User.getExternalId();
                    if (externalIdAtual === userId) {
                        console.log(`✅ [SET_EXTERNAL_USER_ID] CONFIRMADO na tentativa ${i + 1}!`);
                        externalIdConfirmado = true;
                        break;
                    }
                    console.log(`⏳ [SET_EXTERNAL_USER_ID] Tentativa ${i + 1}/10: ainda não confirmado...`);
                    if (i < 9) {
                        OneSignal.login(userId);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                } catch (error) {
                    console.log(`⚠️ Erro na tentativa ${i + 1}: ${error}`);
                }
            }

            if (!externalIdConfirmado) {
                console.warn(`⚠️ External User ID não confirmado após 10 tentativas. Continuando mesmo assim...`);
            }

            const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
            if (!pushToken) {
                console.error('❌ Token não disponível');
                this.isSettingExternalUserId = false;
                return;
            }

            this.pushToken = pushToken;
            let onesignalId = this.oneSignalUserId;
            if (!onesignalId) {
                try {
                    onesignalId = await OneSignal.User.getOnesignalId();
                    if (onesignalId) {
                        this.oneSignalUserId = onesignalId;
                    }
                } catch (error) {
                    console.log('⚠️ Erro ao obter OneSignal User ID');
                }
            }

            console.log(`📊 [SET_EXTERNAL_USER_ID] Estado final:`);
            console.log(`   - External User ID: "${await OneSignal.User.getExternalId() || 'NÃO DEFINIDO'}"`);
            console.log(`   - OneSignal User ID: "${onesignalId || 'não disponível'}"`);
            console.log(`   - Push Token: "${pushToken.substring(0, 30)}..."`);

            console.log(`🔄 [SET_EXTERNAL_USER_ID] Registrando token no backend...`);
            await this.tentarRegistrarTokenComRetry();

            console.log(`✅ [SET_EXTERNAL_USER_ID] Processo concluído!`);
        } catch (error: any) {
            console.error(`❌ [SET_EXTERNAL_USER_ID] Erro: ${error?.message || 'Erro desconhecido'}`);
        } finally {
            this.isSettingExternalUserId = false;
        }
    }

    private static async tentarRegistrarTokenComRetry(): Promise<void> {
        if (this.isRegistering) {
            console.log(`⏳ [TENTAR_REGISTRAR] Já está registrando, aguardando...`);
            let tentativas = 0;
            while (this.isRegistering && tentativas < 30) {
                await new Promise(resolve => setTimeout(resolve, 500));
                tentativas++;
            }
            return;
        }

        this.isRegistering = true;

        try {
            if (!this.pushToken) {
                console.warn(`⚠️ [TENTAR_REGISTRAR] Token não disponível`);
                return;
            }

            if (!this.lastExternalUserId) {
                console.warn(`⚠️ [TENTAR_REGISTRAR] External User ID não definido`);
                return;
            }

            if (this.registrationAttempts >= this.MAX_REGISTRATION_ATTEMPTS) {
                console.warn(`⚠️ [TENTAR_REGISTRAR] Máximo de tentativas atingido`);
                return;
            }

            this.registrationAttempts++;
            console.log(`🔄 [TENTAR_REGISTRAR] Tentativa ${this.registrationAttempts}/${this.MAX_REGISTRATION_ATTEMPTS}`);

            await this.registrarTokenNoBackend(this.pushToken);
            console.log(`✅ [TENTAR_REGISTRAR] Registro concluído com sucesso`);
            this.registrationAttempts = 0;
        } catch (error: any) {
            const errorMessage = error?.message || '';
            console.error(`❌ [TENTAR_REGISTRAR] Erro: ${errorMessage}`);
            
            if (errorMessage === 'UNAUTHORIZED') {
                return;
            }

            const delay = Math.min(1000 * Math.pow(2, this.registrationAttempts - 1), 10000);
            console.log(`🔄 [TENTAR_REGISTRAR] Tentando novamente em ${delay}ms...`);
            
            setTimeout(() => {
                this.tentarRegistrarTokenComRetry();
            }, delay);
        } finally {
            this.isRegistering = false;
        }
    }

    private static async registrarTokenNoBackend(token: string): Promise<void> {
        try {
            const plataforma = Platform.OS === 'ios' ? 'ios' : 'android';
            const playerId = this.oneSignalUserId || null;

            console.log(`📱 [REGISTRAR_TOKEN] Registrando no backend...`);
            console.log(`   - Plataforma: ${plataforma}`);
            console.log(`   - Token: ${token.substring(0, 30)}...`);
            console.log(`   - Player ID: ${playerId || 'não disponível'}`);

            const response = await apiClient.registrarPushToken(token, plataforma, playerId || undefined);

            if (!response.success) {
                throw new Error(response.message || 'Erro desconhecido');
            }

            console.log(`✅ [REGISTRAR_TOKEN] Token registrado com sucesso no backend!`);
        } catch (error: any) {
            console.error(`❌ [REGISTRAR_TOKEN] Erro: ${error?.message || 'Erro desconhecido'}`);
            throw error;
        }
    }

    static async tentarRegistrarTokenNovamente(): Promise<void> {
        this.registrationAttempts = 0;
        if (this.pushToken) {
            await this.tentarRegistrarTokenComRetry();
        } else {
            const token = await OneSignal.User.pushSubscription.getTokenAsync();
            if (token) {
                this.pushToken = token;
                await this.tentarRegistrarTokenComRetry();
            }
        }
    }

    static async desativarToken(): Promise<void> {
        try {
            if (this.pushToken) {
                await apiClient.desativarPushToken(this.pushToken);
            }
            OneSignal.User.pushSubscription.optOut();
            this.pushToken = null;
            this.oneSignalUserId = null;
            this.lastExternalUserId = null;
            this.isInitialized = false;
            this.registrationAttempts = 0;
            this.isRegistering = false;
            this.isSettingExternalUserId = false;
        } catch (error) {
            console.error('Erro ao desativar token:', error);
        }
    }

    static async removeExternalUserId(): Promise<void> {
        try {
            console.log('📱 [REMOVE_EXTERNAL_ID] Removendo External User ID...');
            OneSignal.logout();
            this.lastExternalUserId = null;
            this.isSettingExternalUserId = false;
            this.isRegistering = false;
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ [REMOVE_EXTERNAL_ID] Concluído');
        } catch (error: any) {
            console.error(`❌ [REMOVE_EXTERNAL_ID] Erro: ${error?.message || 'Erro desconhecido'}`);
            this.lastExternalUserId = null;
            this.isSettingExternalUserId = false;
            this.isRegistering = false;
        }
    }

    static async diagnosticarEstado(): Promise<void> {
        try {
            console.log('🔍 === DIAGNÓSTICO DO ONESIGNAL ===');
            const onesignalId = await OneSignal.User.getOnesignalId();
            const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
            const isSubscribed = await OneSignal.User.pushSubscription.getOptedInAsync();
            const externalId = await OneSignal.User.getExternalId();
            
            console.log('📊 Estado atual:');
            console.log(`   - OneSignal User ID: "${onesignalId || 'não disponível'}"`);
            console.log(`   - Push Token: "${pushToken ? pushToken.substring(0, 30) + '...' : 'não disponível'}"`);
            console.log(`   - External User ID: "${externalId || 'não definido'}"`);
            console.log(`   - Inscrito: ${isSubscribed ? 'Sim ✅' : 'Não ❌'}`);
            console.log(`   - Inicializado: ${this.isInitialized ? 'Sim ✅' : 'Não ❌'}`);
            console.log(`   - Token registrado no backend: ${this.pushToken ? 'Sim ✅' : 'Não ❌'}`);
            console.log('🔍 === FIM DO DIAGNÓSTICO ===');
        } catch (error) {
            console.error('❌ Erro ao diagnosticar estado:', error);
        }
    }
}
