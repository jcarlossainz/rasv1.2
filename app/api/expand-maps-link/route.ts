// app/api/expand-maps-link/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { link } = await request.json();

    if (!link) {
      return NextResponse.json(
        { error: 'Link es requerido' },
        { status: 400 }
      );
    }

    // Expandir link acortado
    const response = await fetch(link, {
      method: 'HEAD',
      redirect: 'follow'
    });

    return NextResponse.json({
      expandedUrl: response.url
    });
  } catch (error) {
    console.error('Error expandiendo link:', error);
    return NextResponse.json(
      { error: 'Error al expandir el link' },
      { status: 500 }
    );
  }
}
