
import { NextResponse } from 'next/server';
import { salvarEstagio } from '@/lib/funis-service';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const estagio = await salvarEstagio(data);
    return NextResponse.json(estagio);
  } catch (error: any) {
    console.error('❌ API - Erro ao salvar estágio:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar estágio' },
      { status: 500 }
    );
  }
}
