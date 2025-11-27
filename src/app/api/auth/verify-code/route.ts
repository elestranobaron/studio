import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;
const codes = new Map<string, { code: string; expires: number }>();

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const key = email.toLowerCase();
    const stored = codes.get(key);

    if (!stored || Date.now() > stored.expires || stored.code !== code) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    codes.delete(key);

    // CORRECTION ICI : await cookies()
    const cookieStore = await cookies();
    const token = sign({ email: key }, JWT_SECRET, { expiresIn: '30d' });
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}