import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api/ApiClient';
import * as Linking from 'expo-linking';

export interface VersaoInfo {
    precisaAtualizar: boolean;
    atualizacaoObrigatoria: boolean;
    versaoAtual: string;
    versaoMinima: string;
    urlAtualizacao?: string;
    mensagem?: string;
}

class VersionCheckService {
    getCurrentVersion(): string {
        let version: string;
        let source: string;
        
        if (Constants.manifest && 'version' in Constants.manifest && Constants.manifest.version) {
            version = Constants.manifest.version as string;
            source = 'Constants.manifest.version';
        } 
        else if (Constants.manifest2?.extra?.expo?.version) {
            version = Constants.manifest2.extra.expo.version as string;
            source = 'Constants.manifest2.extra.expo.version';
        }
        else if ((Constants as any).expoConfig?.version) {
            version = (Constants as any).expoConfig.version as string;
            source = 'Constants.expoConfig.version';
        }
        else {
            version = '1.0.0';
            source = 'PADRÃO (fallback)';
        }
        
        return version;
    }

    getPlatform(): 'ios' | 'android' {
        return Platform.OS === 'ios' ? 'ios' : 'android';
    }

    async verificarAtualizacao(): Promise<VersaoInfo | null> {
        try {
            const appVersion = this.getCurrentVersion();
            const platform = this.getPlatform();

            console.log('[VersionCheck] 🔄 Verificando atualização...');
            console.log('[VersionCheck] 📱 Versão do app:', appVersion);
            console.log('[VersionCheck] 📱 Plataforma:', platform);
            console.log('[VersionCheck] 📤 Enviando para backend...');

            const response = await apiClient.verificarVersao(appVersion, platform);
            
            console.log('[VersionCheck] 📥 Resposta do backend:', JSON.stringify(response, null, 2));

            if (response.success && response.data) {
                console.log('[VersionCheck] Resposta da verificação:', response.data);
                return response.data;
            }

            return null;
        } catch (error) {
            console.error('[VersionCheck] Erro ao verificar atualização:', error);
            return null;
        }
    }

    /**
     * Abre a loja de aplicativos (App Store ou Play Store)
     */
    async abrirLoja(url?: string): Promise<void> {
        try {
            if (!url) {
                // URLs padrão caso não seja fornecida
                const platform = this.getPlatform();
                if (platform === 'ios') {
                    url = 'https://apps.apple.com/app/tracetrip/id123456789'; // Substitua pelo ID real
                } else {
                    url = 'https://play.google.com/store/apps/details?id=com.tracetrip.app';
                }
            }

            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                console.error('[VersionCheck] Não foi possível abrir a URL:', url);
            }
        } catch (error) {
            console.error('[VersionCheck] Erro ao abrir loja:', error);
        }
    }
}

export const versionCheckService = new VersionCheckService();

