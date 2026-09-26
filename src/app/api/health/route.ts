import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok', appEnv: config.appEnv, testClock: config.allowTestClock });
}
