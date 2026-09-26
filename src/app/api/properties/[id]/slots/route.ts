import { NextResponse, type NextRequest } from 'next/server';
import { now } from '@/lib/clock';
import { requireUserId } from '@/server/auth';
import { handle } from '@/server/http';
import { getDays } from '@/server/properties';

export function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUserId();
    const { id } = await params;
    const search = req.nextUrl.searchParams;
    const days = await getDays(id, now(req.headers), search.get('from') ?? undefined, search.get('days') ?? undefined);
    return NextResponse.json(days);
  });
}
