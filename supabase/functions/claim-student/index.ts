import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const allowedOrigins = new Set([
  "https://syst-me-administratif-scolaire.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
])

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : "https://syst-me-administratif-scolaire.vercel.app"
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

function json(body: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin")
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origine non autorisée." }, req, 403)
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) })
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, req, 405)

  const authorization = req.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, req, 401)

  const { data: { user }, error: authError } = await admin.auth.getUser(authorization.slice(7))
  if (authError || !user) return json({ error: "Session invalide." }, req, 401)

  try {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (profile?.account_type !== "parent") {
      return json({ error: "Cette opération est réservée aux comptes parents." }, req, 403)
    }

    const body = await req.json().catch(() => ({}))
    const studentId = typeof body.student_id === "string" ? body.student_id.trim() : ""
    const studentNumber = typeof body.student_number === "string" ? body.student_number.trim() : ""
    const birthDate = typeof body.birth_date === "string" ? body.birth_date.trim() : ""

    if ((!studentId && !studentNumber) || !birthDate) {
      return json({ error: "L'identifiant de l'élève et la date de naissance sont obligatoires." }, req, 400)
    }

    // The identifier + birth date pair is the ownership proof for the claim flow.
    // The resulting relationship is still protected by RLS everywhere else.
    let query = admin
      .from("students")
      .select("id,establishment_id,student_number,first_name,last_name,birth_date,sex,active")
      .eq("birth_date", birthDate)
      .eq("active", true)
      .limit(1)

    query = studentId ? query.eq("id", studentId) : query.eq("student_number", studentNumber)
    const { data: student, error: studentError } = await query.maybeSingle()
    if (studentError) throw studentError

    if (!student) {
      return json({ error: "Aucun élève actif ne correspond à ces informations." }, req, 404)
    }

    const { data: existing, error: existingError } = await admin
      .from("student_guardians")
      .select("id,relationship,can_view_academic,can_view_finance")
      .eq("student_id", student.id)
      .eq("guardian_user_id", user.id)
      .maybeSingle()

    if (existingError) throw existingError

    if (!existing) {
      const { error: linkError } = await admin.from("student_guardians").insert({
        establishment_id: student.establishment_id,
        student_id: student.id,
        guardian_user_id: user.id,
        relationship: "Parent",
        is_primary: true,
        can_view_academic: true,
        can_view_finance: true,
      })
      if (linkError) throw linkError
    }

    return json({
      linked: true,
      already_linked: Boolean(existing),
      student: {
        id: student.id,
        establishment_id: student.establishment_id,
        student_number: student.student_number,
        first_name: student.first_name,
        last_name: student.last_name,
      },
    }, req)
  } catch (error) {
    console.error("claim-student error", error)
    // Never expose database/service internals to the client.
    return json({ error: "Impossible de rattacher l'élève pour le moment." }, req, 500)
  }
})
