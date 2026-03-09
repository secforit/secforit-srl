import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // Protect /portal routes — redirect unauthenticated users to login
    if (pathname.startsWith('/portal') && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect authenticated users away from login/register
    if ((pathname === '/login' || pathname === '/register') && user) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  } catch {
    // If token refresh fails, continue — protected pages will individually
    // check auth and redirect to login if needed.
  }

  return supabaseResponse
}
