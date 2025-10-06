
import { NextResponse } from 'next/server';
import { consultarFunis } from '@/lib/funis-service';

export async function GET() {
  try {
    const funis = await consultarFunis();
    return NextResponse.json(funis);
  } catch (error: any) {
    console.error('❌ API - Erro ao consultar funis:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar funis' },
      { status: 500 }
    );
  }
}
