import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

// The sign-in pages and the health check are the only routes that do not need a signed-in user.
function isPublic(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  return pathname === '/sign-in' || pathname.startsWith('/sign-in/') || pathname === '/api/health';
}

function isApi(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  return pathname === '/api' || pathname.startsWith('/api/');
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;
  if (isApi(req)) {
    // API routes answer 401 with a JSON body instead of redirecting to the sign-in page.
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
    return;
  }
  // Page requests from a signed-out user are redirected to the sign-in page.
  await auth.protect();
});

export const config = {
  matcher: [
    // Run on every request except Next.js internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run on API routes.
    '/(api|trpc)(.*)',
  ],
};
