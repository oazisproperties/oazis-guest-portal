import { NextRequest, NextResponse } from 'next/server';
import { getUpsellsByCategory } from '@/lib/upsells';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') || 'all';

  const upsells = getUpsellsByCategory(category);

  return NextResponse.json({ upsells });
}
