import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { now } from '@/lib/clock';
import { requireUserId } from '@/server/auth';
import { AppError } from '@/server/errors';
import { handle } from '@/server/http';
import { getDays } from '@/server/properties';

// `from` must be a real calendar date, and `days` a whole number from 1 to 31.
const slotsQuery = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(31).default(14),
});

export function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUserId();
    const { id } = await params;
    const search = req.nextUrl.searchParams;
    const query = slotsQuery.safeParse({
      from: search.get('from') ?? undefined,
      days: search.get('days') ?? undefined,
    });
    if (!query.success) {
      throw new AppError('VALIDATION', 400, query.error.issues.map((i) => i.path.join('.')).join(', '));
    }
    return NextResponse.json(await getDays(id, now(req.headers), query.data.from, query.data.days));
  });
}
