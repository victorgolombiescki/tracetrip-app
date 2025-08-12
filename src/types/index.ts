import { Usuario } from '../../types/models';

export * from '../../types/models';

export interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface OCRResult {
  amount?: number;
  date?: string;
  merchant?: string;
  category?: string;
  confidence: number;
  rawText: string;
}