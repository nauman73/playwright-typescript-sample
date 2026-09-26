import { NextResponse, type NextRequest } from 'next/server';
import { now } from '@/lib/clock';
import { requireUserId } from '@/server/auth';
import { AppError } from '@/server/errors';
import { handle } from '@/server/http';
import { bookShowing, toDto } from '@/server/showings';

export function POST(req: NextRequest) {
  return handle(async () => {
    const userId = await requireUserId();
    const body = await req.json().catch(() => {
      throw new AppError('VALIDATION', 400, 'Body must be JSON');
    });
    const showing = await bookShowing(body, userId, now(req.headers));
    return NextResponse.json(toDto(showing), { status: 201 });
  });
}
