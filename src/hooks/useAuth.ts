import { useEffect } from 'react';
import { authService } from '@/src/services/auth/AuthService';
import { useAppStore } from '@/src/store/useAppStore';
import { apiClient } from '@/src/services/api/ApiClient';

export function useAuth() {
  const { auth, setAuth } = useAppStore();

  useEffect(() => {
    checkStoredAuth();
  }, []);

  useEffect(() => {
    if (auth.token) {
      apiClient.setToken(auth.token);
    } else {
      apiClient.setToken(null);
    }
  }, [auth.token]);

  const checkStoredAuth = async () => {
    try {
      setAuth({ isLoading: true });
      
      const storedAuth = await authService.getStoredAuth();

      if (storedAuth) {
        const isValid = await authService.validateToken(storedAuth.token);
        
        if (isValid) {
          setAuth({
            user: storedAuth.user,
            token: storedAuth.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          await authService.logout();
          setAuth({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        setAuth({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('🔍 useAuth: Auth check failed:', error);
      setAuth({ isAuthenticated: false, isLoading: false });
    }
  };

  return {
    ...auth,
    checkStoredAuth,
  };
}