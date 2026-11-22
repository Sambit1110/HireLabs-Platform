import { updateSession } from '@/lib/supabase/proxy';

/**
 * Next.js 16 proxy (formerly middleware): keeps the Supabase session
 * cookie fresh and redirects signed-out visitors away from protected pages.
 */
export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  // Pages only: skip API routes (they verify bearer tokens themselves),
  // Next.js internals and static files.
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|map)$).*)',
  ],
};
