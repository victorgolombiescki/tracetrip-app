import { apiClient } from '@/src/services/api/ApiClient';

export const AuthApi = {
  login: (email: string, senha: string) => apiClient.authLogin(email, senha),
  validateToken: (token?: string) => apiClient.validateToken(token),
  logout: () => apiClient.logout(),
}; 