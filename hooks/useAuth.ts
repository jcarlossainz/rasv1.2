/**
 * useAuth Hook
 * Maneja autenticación de usuario y redirección
 * Reemplaza checkUser() duplicado en múltiples páginas
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  nombre?: string;
  empresa_id?: string;
  [key: string]: any;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      // Cargar perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser({ ...profile, id: authUser.id });
      } else {
        setUser({ id: authUser.id, email: authUser.email || '' });
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar datos del usuario (útil después de actualizaciones)
  const refreshUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser({ ...profile, id: authUser.id });
      }
    } catch (error) {
      console.error('Error refrescando usuario:', error);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return { user, loading, refreshUser };
}
