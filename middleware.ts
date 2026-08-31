import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Toutes les pages d'authentification doivent rester accessibles sans session.
  // /auth/login redirige vers /connexion, donc /connexion doit également être public
  // pour éviter une boucle /auth/login -> /connexion -> /auth/login.
  const publicRoutes = ['/login', '/register', '/auth', '/connexion', '/offline']
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (isPublicRoute) return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase middleware configuration is missing')
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  } catch (error) {
    console.error('Supabase middleware error:', error)
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|workbox[^/]*\\.js|robots\\.txt|sitemap\\.xml|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|json|webmanifest|woff|woff2|ttf|otf)$).*)',
  ],
}
