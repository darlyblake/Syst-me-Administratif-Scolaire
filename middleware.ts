import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques
  const publicRoutes = ['/login', '/register', '/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/'

  // "/" laisse passer (la page gère la redirection)
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Routes publiques : laisser passer
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Créer un client Supabase pour le middleware
  let supabase
  try {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getSetCookie()
          },
          setAll(cookiesToSet) {
            // Les cookies ne peuvent pas être définis dans le middleware
            // Cela se fait dans les pages/composants
          },
        },
      }
    )
  } catch (error) {
    console.error('Erreur création client Supabase:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Vérifier la session Supabase
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Pas de session : rediriger vers login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Session présente : laisser passer
  // Les pages vont valider le rôle exact via useAuthentification()
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
