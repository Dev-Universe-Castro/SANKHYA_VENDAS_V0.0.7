import { NextResponse } from 'next/server';
import { salvarLead } from '@/lib/leads-service';

export async function POST(request: Request) {
  try {
    const leadData = await request.json();
    const leadSalvo = await salvarLead(leadData);
    return NextResponse.json(leadSalvo);
  } catch (error: any) {
    console.error('❌ API Route - Erro ao salvar lead:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar lead' },
      { status: 500 }
    );
  }
}