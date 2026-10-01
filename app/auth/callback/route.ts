import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") || "/connexion"

  if (!code) return NextResponse.redirect(new URL("/connexion?error=confirmation_invalide", url.origin))

  const response = NextResponse.redirect(new URL(next, url.origin))
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL("/connexion?error=confirmation_invalide", url.origin))

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.account_type === "teacher") {
    const metadata = user.user_metadata
    const { error: profileError } = await supabase.rpc("teacher_create_profile", {
      p_first_name: metadata.first_name || "",
      p_last_name: metadata.last_name || "",
      p_phone: metadata.phone || null,
      p_email: user.email || null,
      p_employee_number: null,
      p_specialty: metadata.specialty || null,
    })
    if (profileError) {
      const errorUrl = new URL("/connexion", url.origin)
      errorUrl.searchParams.set("error", "profil_enseignant")
      return NextResponse.redirect(errorUrl)
    }
    const teacherUrl = new URL("/enseignant/rattachement", url.origin)
    return NextResponse.redirect(teacherUrl)
  }
  return response
}
