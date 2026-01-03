// This file is now obsolete as the Genkit flow will be called directly 
// from a Cloud Function instead of a Next.js API route.
// Keeping it empty to avoid build errors from missing dependencies.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json({ error: 'This endpoint is deprecated.' }, { status: 410 });
}
