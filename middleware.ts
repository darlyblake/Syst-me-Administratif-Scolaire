import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Role } from '@/types/models'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log("Middleware - Pathname:", pathname)

  // Routes publiques qui ne nécessitent pas d'authentification
  const publicRoutes = ['/login', '/register']
  
  // Vérifier si c'est une route publique
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Route racine - rediriger vers login
  if (pathname === '/') {
    console.log("Middleware - Redirection vers /login")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si route publique, laisser passer
  if (isPublicRoute) {
    console.log("Middleware - Route publique, laisser passer")
    return NextResponse.next()
  }

  // Récupérer la session depuis le cookie
  const sessionCookie = request.cookies.get('utilisateur_connecte')
  
  console.log("Middleware - Cookie session:", sessionCookie ? "présent" : "absent")
  
  if (!sessionCookie) {
    // Pas de session, rediriger vers login
    console.log("Middleware - Pas de session, redirection vers /login")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Parser la session pour obtenir le rôle
  let session
  try {
    session = JSON.parse(sessionCookie.value)
    console.log("Middleware - Session parsée:", session)
  } catch (error) {
    // Session invalide, rediriger vers login
    console.log("Middleware - Session invalide, redirection vers /login")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const userRole = session.utilisateur?.role as Role
  console.log("Middleware - User role:", userRole)

  // Vérifier les permissions selon la route
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      console.log("Middleware - Accès admin refusé pour rôle:", userRole)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname.startsWith('/ecole')) {
    if (userRole !== 'ecole' && userRole !== 'admin') {
      console.log("Middleware - Accès école refusé pour rôle:", userRole)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname.startsWith('/parents')) {
    if (userRole !== 'parent') {
      console.log("Middleware - Accès parents refusé pour rôle:", userRole)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  console.log("Middleware - Accès autorisé")
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
