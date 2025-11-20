import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { OneSignal, LogLevel } from 'react-native-onesignal';
import { apiClient } from './api/ApiClient';

const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId || '13e1b3b0-0f04-4cab-a143-0542306e1b2f';

export class PushNotificationService {
    private static oneSignalUserId: string | null = null;
    private static pushToken: string | null = null;
    private static isInitialized: boolean = false;
    private static registrationAttempts: number = 0;
    private static readonly MAX_REGISTRATION_ATTEMPTS = 5;

    static async initialize(): Promise<string | null> {
        try {
            if (this.isInitialized && this.pushToken) {
                console.log('📱 Push notifications já inicializado');
                return this.pushToken;
            }

            console.log('📱 Inicializando OneSignal...');
            
            OneSignal.Debug.setLogLevel(LogLevel.Verbose);
            OneSignal.initialize(ONESIGNAL_APP_ID);
            
            OneSignal.Notifications.requestPermission(false).then((permission) => {
                console.log('📱 Resposta de permissão:', permission);
            });

            OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                console.log('📱 Notificação recebida em foreground:', event);
                event.getNotification().display();
            });

            OneSignal.Notifications.addEventListener('click', async (event) => {
                console.log('📱 Notificação aberta:', event);
                const notification = event.notification;
                const data = notification.additionalData as any;
                
                const { Linking } = require('react-native');
                
                if (data?.acao === 'ABRIR_TAREFAS' || 
                    data?.tipo === 'PENDENCIA' ||
                    data?.tipo === 'LEMBRETE_KM_MEIO' ||
                    data?.tipo === 'LEMBRETE_KM_FIM' ||
                    data?.tipo === 'LEMBRETE_KM_APOS_FIM' ||
                    data?.tipo === 'RESERVA_INICIADA') {
                    console.log('📱 Navegando para tarefas devido a notificação:', data.tipo);
                    setTimeout(() => {
                        Linking.openURL('tracetrip://tarefas').catch((err: any) => {
                            console.error('❌ Erro ao abrir deep link:', err);
                        });
                    }, 500);
                }
            });

            const onesignalId = await OneSignal.User.getOnesignalId();
            if (onesignalId) {
                this.oneSignalUserId = onesignalId;
                console.log('✅ OneSignal User ID:', this.oneSignalUserId);
            }

            const token = await OneSignal.User.pushSubscription.getTokenAsync();
            if (token) {
                this.pushToken = token;
                console.log('✅ OneSignal Push Token obtido:', this.pushToken.substring(0, 20) + '...');
                await this.tentarRegistrarTokenComRetry();
            } else {
                console.log('⏳ Token ainda não disponível, aguardando...');
                setTimeout(async () => {
                    const tokenRetry = await OneSignal.User.pushSubscription.getTokenAsync();
                    if (tokenRetry) {
                        this.pushToken = tokenRetry;
                        console.log('✅ OneSignal Push Token obtido (retry):', this.pushToken.substring(0, 20) + '...');
                        await this.tentarRegistrarTokenComRetry();
                    } else {
                        console.log('⚠️ Token ainda não disponível após retry');
                    }
                }, 3000);
            }

            OneSignal.User.pushSubscription.addEventListener('change', async (event) => {
                console.log('🔄 Push subscription mudou:', event);
                if (event.current.id) {
                    this.oneSignalUserId = event.current.id;
                    console.log('🔄 OneSignal User ID atualizado:', this.oneSignalUserId);
                }
                if (event.current.token) {
                    this.pushToken = event.current.token;
                    console.log('🔄 OneSignal Push Token atualizado:', this.pushToken.substring(0, 20) + '...');
                    await this.tentarRegistrarTokenComRetry();
                } else {
                    console.log('⏳ Token ainda não disponível, tentando obter...');
                    setTimeout(async () => {
                        const token = await OneSignal.User.pushSubscription.getTokenAsync();
                        if (token && token !== this.pushToken) {
                            this.pushToken = token;
                            console.log('✅ OneSignal Push Token obtido:', this.pushToken.substring(0, 20) + '...');
                            await this.tentarRegistrarTokenComRetry();
                        }
                    }, 2000);
                }
            });

            this.isInitialized = true;
            this.registrationAttempts = 0;

            if (this.pushToken) {
                await this.tentarRegistrarTokenComRetry();
            }

            return this.pushToken;
        } catch (error: any) {
            const errorMessage = error?.message || 'Erro desconhecido';
                console.error('❌ Erro ao inicializar push notifications (não bloqueante):', errorMessage);
            return null;
        }
    }

    private static async registrarTokenNoBackend(token: string): Promise<void> {
        try {
            const plataforma = Platform.OS === 'ios' ? 'ios' : 'android';
            console.log(`📱 Registrando token OneSignal no backend - Plataforma: ${plataforma}, Token: ${token.substring(0, 20)}...`);
            
            const response = await apiClient.registrarPushToken(token, plataforma);
            
            if (!response.success) {
                const errorMsg = response.message || 'Erro desconhecido';
                console.warn('⚠️ Falha ao registrar token no backend:', errorMsg);
                
                if (errorMsg.includes('não autorizado') || 
                    errorMsg.includes('Unauthorized') ||
                    errorMsg.includes('401')) {
                    console.warn('⚠️ Usuário não autenticado. Token será registrado após login.');
                    throw new Error('UNAUTHORIZED');
                }
                throw new Error(errorMsg);
            } else {
                console.log('✅ Token OneSignal registrado com sucesso no backend');
                this.registrationAttempts = 0;
            }
        } catch (error: any) {
            const errorMessage = error?.message || 'Erro desconhecido';
            if (errorMessage === 'UNAUTHORIZED') {
                throw error;
            }
            if (errorMessage.includes('não autorizado') || 
                errorMessage.includes('Unauthorized') ||
                errorMessage.includes('401')) {
                throw new Error('UNAUTHORIZED');
            }
            throw error;
        }
    }

    private static async tentarRegistrarTokenComRetry(): Promise<void> {
        if (!this.pushToken) {
            return;
        }

        if (this.registrationAttempts >= this.MAX_REGISTRATION_ATTEMPTS) {
            console.warn(`⚠️ Máximo de tentativas de registro atingido (${this.MAX_REGISTRATION_ATTEMPTS})`);
            return;
        }

        this.registrationAttempts++;

        try {
            await this.registrarTokenNoBackend(this.pushToken);
        } catch (error: any) {
            const errorMessage = error?.message || '';
            
            if (errorMessage === 'UNAUTHORIZED') {
                console.log('⏳ Aguardando autenticação para registrar token...');
                return;
            }

            const delay = Math.min(1000 * Math.pow(2, this.registrationAttempts - 1), 10000);
            console.log(`🔄 Tentativa ${this.registrationAttempts}/${this.MAX_REGISTRATION_ATTEMPTS} falhou. Tentando novamente em ${delay}ms...`);
            
            setTimeout(() => {
                this.tentarRegistrarTokenComRetry();
            }, delay);
        }
    }

    static async tentarRegistrarTokenNovamente(): Promise<void> {
        this.registrationAttempts = 0;
        if (this.pushToken) {
            await this.tentarRegistrarTokenComRetry();
        } else {
            console.log('⏳ Aguardando token OneSignal...');
            const token = await OneSignal.User.pushSubscription.getTokenAsync();
            if (token) {
                this.pushToken = token;
                await this.tentarRegistrarTokenComRetry();
            }
        }
    }

    static async desativarToken(): Promise<void> {
        if (!this.pushToken) {
            return;
        }

        try {
            await apiClient.desativarPushToken(this.pushToken);
            OneSignal.User.pushSubscription.optOut();
            this.pushToken = null;
            this.oneSignalUserId = null;
            this.isInitialized = false;
            this.registrationAttempts = 0;
        } catch (error) {
            console.error('Erro ao desativar token:', error);
        }
    }

    static async setExternalUserId(userId: string): Promise<void> {
        try {
            if (!userId || userId.trim() === '') {
                console.error('❌ External User ID não pode ser vazio');
                return;
            }

            console.log(`📱 Definindo External User ID no OneSignal: "${userId}"`);
            
            if (!this.isInitialized) {
                console.warn('⚠️ OneSignal não inicializado ainda. Aguardando...');
                await this.initialize();
            }
            
            const isSubscribed = await OneSignal.User.pushSubscription.getOptedInAsync();
            
            if (!isSubscribed) {
                console.warn('⚠️ Usuário não está inscrito para receber notificações push');
                console.warn('⚠️ Tentando solicitar permissão novamente...');
                
                const permission = await OneSignal.Notifications.requestPermission(true);
                console.log(`📱 Resposta de permissão: ${permission}`);
                
                if (permission === false) {
                    console.error('❌ Usuário negou permissão para notificações push. Não será possível enviar notificações.');
                    return;
                }
            }
            
            OneSignal.login(userId.toString());
            console.log(`✅ OneSignal.login("${userId}") chamado com sucesso`);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const onesignalId = await OneSignal.User.getOnesignalId();
            const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
            const isSubscribedAfter = await OneSignal.User.pushSubscription.getOptedInAsync();
            
            console.log(`📊 Estado do OneSignal após definir External User ID:`);
            console.log(`   - External User ID definido: "${userId}"`);
            console.log(`   - OneSignal User ID: "${onesignalId || 'não disponível'}"`);
            console.log(`   - Push Token: "${pushToken ? pushToken.substring(0, 30) + '...' : 'não disponível'}"`);
            console.log(`   - Inscrito: ${isSubscribedAfter ? 'Sim ✅' : 'Não ❌'}`);
            
            if (!isSubscribedAfter) {
                console.error('❌ Usuário ainda não está inscrito após definir External User ID');
                console.error('❌ Notificações push não funcionarão até que o usuário permita notificações');
            }
            
            if (pushToken && pushToken !== this.pushToken) {
                this.pushToken = pushToken;
                await this.tentarRegistrarTokenComRetry();
            }
        } catch (error: any) {
            console.error(`❌ Erro ao definir External User ID: ${error?.message || 'Erro desconhecido'}`);
            console.error(`❌ Stack: ${error?.stack || 'N/A'}`);
        }
    }

    static async removeExternalUserId(): Promise<void> {
        try {
            console.log('📱 Removendo External User ID do OneSignal...');
            OneSignal.logout();
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('✅ OneSignal.logout() chamado com sucesso');
        } catch (error: any) {
            console.error(`❌ Erro ao remover External User ID: ${error?.message || 'Erro desconhecido'}`);
        }
    }

    static async diagnosticarEstado(): Promise<void> {
        try {
            console.log('🔍 === DIAGNÓSTICO DO ONESIGNAL ===');
            const onesignalId = await OneSignal.User.getOnesignalId();
            const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
            const isSubscribed = await OneSignal.User.pushSubscription.getOptedInAsync();
            
            console.log(`📊 Estado atual:`);
            console.log(`   - OneSignal User ID: "${onesignalId || 'não disponível'}"`);
            console.log(`   - Push Token: "${pushToken ? pushToken.substring(0, 30) + '...' : 'não disponível'}"`);
            console.log(`   - Inscrito: ${isSubscribed ? 'Sim' : 'Não'}`);
            console.log(`   - Inicializado: ${this.isInitialized ? 'Sim' : 'Não'}`);
            console.log(`   - Token registrado no backend: ${this.pushToken ? 'Sim' : 'Não'}`);
            console.log('🔍 === FIM DO DIAGNÓSTICO ===');
        } catch (error: any) {
            console.error(`❌ Erro no diagnóstico: ${error?.message || 'Erro desconhecido'}`);
            console.error(`❌ Stack: ${error?.stack || 'N/A'}`);
        }
    }
}
