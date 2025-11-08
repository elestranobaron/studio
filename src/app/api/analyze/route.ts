import { analyzeWod } from '@/ai/flows/analyze-wod-flow';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoDataUri } = body;

    if (!photoDataUri) {
      return NextResponse.json({ error: 'Missing photoDataUri' }, { status: 400 });
    }

    const result = await analyzeWod({ photoDataUri });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Failed to analyze WOD', details: error.message }, { status: 500 });
  }
}
