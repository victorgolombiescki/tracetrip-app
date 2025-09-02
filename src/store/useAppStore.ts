import { create } from 'zustand';
import { AuthState } from '@/src/types';

interface CurrentRoute {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  status: string;
}

interface AppState {
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;

  currentRoute: CurrentRoute | null;
  setCurrentRoute: (route: CurrentRoute | null) => void;

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

  currentRoute: null,
  setCurrentRoute: (route) => set({ currentRoute: route }),

  isDarkMode: false,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));