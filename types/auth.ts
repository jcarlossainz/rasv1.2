/**
 * Auth Types
 * Tipos de TypeScript para autenticación
 */

export interface User {
  id: string;
  email: string;
  nombre?: string;
  empresa_id?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}
