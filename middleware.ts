import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware de compatibilité réseau.
 *
 * L'authentification Supabase est résolue côté application par le provider
 * (qui partage la session navigateur). Ne pas appeler auth.getUser() ici :
 * pendant une connexion client, le cookie SSR peut ne pas encore être propagé
 * au moment de la première navigation et provoquer une boucle
 * /connexion -> /admin -> /connexion.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox[^/]*.js|robots.txt|sitemap.xml|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|json|webmanifest|woff|woff2|ttf|otf)$).*)',
  ],
}
