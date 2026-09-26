import { NextResponse, type NextRequest } from 'next/server';
import { now } from '@/lib/clock';
import { requireUserId } from '@/server/auth';
import { handle } from '@/server/http';
import { listProperties } from '@/server/properties';

export function GET(req: NextRequest) {
  return handle(async () => {
    await requireUserId();
    // The list does not depend on the time, but a malformed test clock header still returns 400.
    now(req.headers);
    return NextResponse.json(await listProperties());
  });
}
