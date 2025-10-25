import { authService } from './auth/AuthService';

class AppLogger {
    async error(message: string, context?: any): Promise<void> {
        await this.sendToAPI('ERROR', message, context);
    }

    async warn(message: string, context?: any): Promise<void> {
        await this.sendToAPI('WARN', message, context);
    }

    async info(message: string, context?: any): Promise<void> {
        await this.sendToAPI('INFO', message, context);
    }

    async debug(message: string, context?: any): Promise<void> {
        await this.sendToAPI('DEBUG', message, context);
    }

    async syncLogs(): Promise<void> {
    }

    private async sendToAPI(level: string, message: string, context?: any): Promise<void> {
        try {
            const apiUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL);
            if (!apiUrl || apiUrl === 'undefined') return;

            const storedAuth = await authService.getStoredAuth();
            if (!storedAuth?.token) {
                return;
            }

            const payload = {
                error: level,
                message: message,
                context: context || {},
                timestamp: Date.now(),
                stack: ''
            };

            const response = await fetch(`${apiUrl}/rastreamento/error-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${storedAuth.token}`,
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Erro ao enviar log para API:', error);
        }
    }
}

export const appLogger = new AppLogger();