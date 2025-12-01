'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

/**
 * Hook que convierte invitaciones pendientes (email_invitado) a user_id
 * cuando el usuario inicia sesión.
 *
 * Esto resuelve el caso donde un usuario fue invitado a una propiedad
 * ANTES de registrarse en el sistema.
 */
export function useConvertirInvitaciones(userId: string | undefined) {
  const hasConverted = useRef(false)

  useEffect(() => {
    // Solo ejecutar una vez por sesión
    if (!userId || hasConverted.current) return

    const convertirInvitaciones = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser?.email) return

        const userEmail = authUser.email.toLowerCase()

        // Buscar invitaciones pendientes con el email del usuario (case-insensitive)
        const { data: invitacionesPendientes, error: searchError } = await supabase
          .from('propiedades_colaboradores')
          .select('id')
          .ilike('email_invitado', userEmail)
          .is('user_id', null)

        if (searchError) {
          logger.error('Error buscando invitaciones pendientes:', searchError)
          return
        }

        // Convertir cada invitación pendiente a user_id
        if (invitacionesPendientes && invitacionesPendientes.length > 0) {
          const ids = invitacionesPendientes.map(inv => inv.id)

          const { error: updateError } = await supabase
            .from('propiedades_colaboradores')
            .update({ user_id: userId, email_invitado: null })
            .in('id', ids)

          if (updateError) {
            logger.error('Error convirtiendo invitaciones:', updateError)
            return
          }

          logger.log(`✅ Convertidas ${invitacionesPendientes.length} invitaciones pendientes a user_id`)
        }

        hasConverted.current = true
      } catch (error) {
        logger.error('Error en useConvertirInvitaciones:', error)
      }
    }

    convertirInvitaciones()
  }, [userId])
}
