import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Forward cookies onto the request so later middleware/handlers see them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          // Rebuild the response with updated cookies and enforce 24h maxAge
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: SESSION_MAX_AGE,
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
            })
          )
        },
      },
    }
  )

  // Refresh the access token when it has expired using the refresh token.
  // Without this call, users are silently logged out after the JWT expiry.
  try {
    await supabase.auth.getUser()
  } catch {
    // If token refresh fails, continue with the request — protected pages
    // will individually check auth and redirect to login if needed.
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * Session refresh must run on page navigations and API routes.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
