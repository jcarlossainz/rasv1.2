import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore - called from Server Component
            }
          },
        },
      }
    )

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError || !session) {
        console.error('Error exchanging code for session:', sessionError)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }

      // Verificar si el usuario tiene perfil en la tabla profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      // Si no tiene perfil, es usuario nuevo -> redirigir a registro
      if (!profile) {
        return NextResponse.redirect(`${origin}/register?new_user=true`)
      }

      // Usuario existente -> redirigir al dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
  }

  // Sin código, redirigir a login
  return NextResponse.redirect(`${origin}/login`)
}
