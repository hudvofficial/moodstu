import { NextResponse } from 'next/server';
import { getContractDrawerExtra } from '@/app/actions/contract-queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const c = await getContractDrawerExtra('bd8008c8-ce62-4ab2-a384-07f5ffbe908d');
    return NextResponse.json(c);
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
