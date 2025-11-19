/**
 * useLogout Hook
 * Maneja el logout de usuario
 * Reemplaza handleLogout() duplicado en múltiples páginas
 */

'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function useLogout() {
  const router = useRouter();

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  return logout;
}
