import { create } from 'zustand';
import { AuthState } from '@/src/types';

interface AppState {
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;

  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  auth: {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  },
  setAuth: (auth) => set((state) => ({ 
    auth: { ...state.auth, ...auth } 
  })),

  isDarkMode: false,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));