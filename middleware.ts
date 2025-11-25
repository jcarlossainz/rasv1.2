import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Solo refrescar la sesión, sin redirecciones
  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|anuncio/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}