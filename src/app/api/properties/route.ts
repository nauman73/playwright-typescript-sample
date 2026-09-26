import { NextResponse, type NextRequest } from 'next/server';
import { now } from '@/lib/clock';
import { requireUserId } from '@/server/auth';
import { handle } from '@/server/http';

// This temporary route lets the authentication and clock tests run. Task C3 replaces it with the real list.
export function GET(req: NextRequest) {
  return handle(async () => {
    await requireUserId();
    now(req.headers);
    return NextResponse.json([]);
  });
}
