import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError || !session) {
        console.error('Error exchanging code for session:', sessionError)
        return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
      }

      // Verificar si el usuario tiene perfil en la tabla profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      // Si no tiene perfil, es usuario nuevo -> redirigir a registro
      if (!profile) {
        return NextResponse.redirect(new URL('/register?new_user=true', request.url))
      }

      // Usuario existente -> redirigir al dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
    }
  }

  // Sin código, redirigir a login
  return NextResponse.redirect(new URL('/login', request.url))
}
