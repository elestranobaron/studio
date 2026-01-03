// This file is now obsolete as the Genkit flow will be called directly 
// from a Cloud Function instead of a Next.js API route.
// Keeping it empty to avoid build errors from missing dependencies.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // This endpoint is intentionally deprecated. The client should call the 'analyzeWod' Firebase Function.
    // Returning a 410 Gone status code informs the client that this resource is no longer available.
    return NextResponse.json({ error: 'This endpoint is deprecated. Please use the `analyzeWod` cloud function.' }, { status: 410 });
}
