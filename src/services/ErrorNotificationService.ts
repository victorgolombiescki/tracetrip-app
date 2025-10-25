import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import * as Network from 'expo-network';

interface ErrorData {
    error: string;
    message: string;
    stack?: string;
    timestamp: number;
    context?: any;
}

class ErrorNotificationService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL);
    }

    private async getAuthToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('tracetrip_auth_token');
        } catch (error) {
            return null;
        }
    }

    private async isOnline(): Promise<boolean> {
        try {
            const networkState = await Network.getNetworkStateAsync();
            return networkState.isConnected && networkState.isInternetReachable;
        } catch (error) {
            return false;
        }
    }

    async sendErrorToAPI(errorData: ErrorData): Promise<boolean> {
        try {
            const online = await this.isOnline();
            if (!online) {
                return false;
            }

            const token = await this.getAuthToken();
            if (!token) {
                return false;
            }

            const response = await fetch(`${this.apiUrl}/rastreamento/error-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(errorData),
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async logError(error: Error, context?: any): Promise<void> {
        const errorData: ErrorData = {
            error: error.name || 'UnknownError',
            message: error.message || 'Erro desconhecido',
            stack: error.stack,
            timestamp: Date.now(),
            context: context || {},
        };

        const sentToAPI = await this.sendErrorToAPI(errorData);

        if (!sentToAPI) {
            this.showErrorNotification(errorData);
        }
    }

    private showErrorNotification(errorData: ErrorData): void {
        Alert.alert(
            'Erro no Rastreamento',
            `Ocorreu um erro: ${errorData.message}\n\nO erro foi registrado localmente e será enviado quando houver conexão.`,
            [
                { text: 'OK', style: 'default' }
            ]
        );
    }

    async logLocationError(error: Error, locationContext?: any): Promise<void> {
        const context = {
            type: 'location_tracking',
            ...locationContext,
        };

        await this.logError(error, context);
    }

    async logAPIError(error: Error, apiContext?: any): Promise<void> {
        const context = {
            type: 'api_request',
            ...apiContext,
        };

        await this.logError(error, context);
    }

    async logDatabaseError(error: Error, dbContext?: any): Promise<void> {
        const context = {
            type: 'database_operation',
            ...dbContext,
        };

        await this.logError(error, context);
    }
}

export const errorNotificationService = new ErrorNotificationService();
