import { NextResponse } from 'next/server';
import { AppError } from './errors';

/**
 * Runs a route handler body. An AppError becomes a `{ code, message }` JSON response with its
 * status. Any other error is logged and becomes `500 { code: 'INTERNAL' }`.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ code: 'INTERNAL' }, { status: 500 });
  }
}
