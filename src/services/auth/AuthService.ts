import { secureStorage } from './SecureStorage';
import { apiClient } from '@/src/services/api/ApiClient';
import { Usuario } from '@/src/types';

const TOKEN_KEY = 'tracetrip_auth_token';
const USER_KEY = 'tracetrip_user_data';

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, senha: string, options?: { remember?: boolean }): Promise<{ user: Usuario; token: string }> {
    try {
      const response = await apiClient.authLogin(email, senha);
      if (!response.success) {
        throw new Error(response.message || 'Falha na autenticação');
      }

      const token = (response.data as any)?.access_token as string;
      const user = ((response.data as any)?.usuario || {}) as Usuario;

      if (!token) throw new Error('Token inválido');

      apiClient.setToken(token);

      await secureStorage.setItemAsync(TOKEN_KEY, token);
      await secureStorage.setItemAsync(USER_KEY, JSON.stringify(user));

      return { user, token };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async validateToken(token?: string): Promise<boolean> {
    try {
      const res = await apiClient.validateToken(token);
      if (!res.success) {
        const msg = (res.message || '').toLowerCase();
        if (token && (msg.includes('sem conexão') || msg.includes('conectar') || msg.includes('network'))) {
          apiClient.setToken(token);
          return true;
        }
        return false;
      }
      const ok = (res.data as any)?.autorized ?? (res.data as any)?.authorized;
      
      if (ok && token) {
        apiClient.setToken(token);
      }
      
      return Boolean(ok);
    } catch (e) {
      if (token) {
        apiClient.setToken(token);
        return true;
      }
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await secureStorage.deleteItemAsync(TOKEN_KEY);
      await secureStorage.deleteItemAsync(USER_KEY);
      apiClient.setToken(null);
    }
  }

  async getStoredAuth(): Promise<{ user: Usuario; token: string } | null> {
    try {
      const token = await secureStorage.getItemAsync(TOKEN_KEY);
      const userData = await secureStorage.getItemAsync(USER_KEY);


      if (!token || !userData) {
        return null;
      }

      const user = JSON.parse(userData);
      apiClient.setToken(token);

      return { user, token };
    } catch (error) {
      console.error('Failed to get stored auth:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const auth = await this.getStoredAuth();
    return auth !== null;
  }
}

export const authService = AuthService.getInstance();