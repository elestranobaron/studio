import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage') || 'open';
  const year = searchParams.get('year') || '2026';
  const division = searchParams.get('division') || '1';
  const region = searchParams.get('region') || '0';
  const scaled = searchParams.get('scaled') || '0';
  const page = searchParams.get('page') || '1';
  const sort = searchParams.get('sort') || '0';

  // Construction de l'URL CrossFit v2 dynamique selon le stage
  const targetUrl = `https://c3po.crossfit.com/api/competitions/v2/competitions/${stage}/${year}/leaderboards?division=${division}&region=${region}&scaled=${scaled}&page=${page}&sort=${sort}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from CrossFit API' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
