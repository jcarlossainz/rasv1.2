import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin

  // Simplemente redirigir al dashboard - el cliente manejará la sesión
  return NextResponse.redirect(`${origin}/dashboard`)
}
