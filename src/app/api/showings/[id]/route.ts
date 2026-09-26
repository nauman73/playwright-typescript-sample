import { NextResponse, type NextRequest } from 'next/server';
import { now } from '@/lib/clock';
import { requireUserId } from '@/server/auth';
import { AppError } from '@/server/errors';
import { handle } from '@/server/http';
import { cancelShowing, rescheduleShowing, toDto } from '@/server/showings';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await requireUserId();
    const { id } = await params;
    const body = await req.json().catch(() => {
      throw new AppError('VALIDATION', 400, 'Body must be JSON');
    });
    return NextResponse.json(toDto(await rescheduleShowing(id, body, now(req.headers))));
  });
}

export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await requireUserId();
    const { id } = await params;
    return NextResponse.json(toDto(await cancelShowing(id, now(req.headers))));
  });
}
