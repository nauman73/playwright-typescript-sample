import { NextResponse } from 'next/server';

// This temporary route lets the authentication tests run. Task C3 replaces it with the real list.
export function GET() {
  return NextResponse.json([]);
}
