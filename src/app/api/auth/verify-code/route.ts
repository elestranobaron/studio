// This API route is no longer needed as the logic has been moved to a callable Cloud Function 
// in src/functions/src/index.ts to resolve production authentication issues.
// The client will now call the 'verifyDigicode' function directly.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json({ error: 'This endpoint is deprecated. Please use the callable Cloud Function.' }, { status: 410 });
}
