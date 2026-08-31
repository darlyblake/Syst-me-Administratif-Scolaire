import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405)

  const authorization = req.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401)

  const { data: { user }, error: authError } = await admin.auth.getUser(authorization.slice(7))
  if (authError || !user) return json({ error: "Session invalide." }, 401)

  try {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (profile?.account_type !== "parent") {
      return json({ error: "Cette opération est réservée aux comptes parents." }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const studentId = typeof body.student_id === "string" ? body.student_id.trim() : ""
    const studentNumber = typeof body.student_number === "string" ? body.student_number.trim() : ""
    const birthDate = typeof body.birth_date === "string" ? body.birth_date.trim() : ""

    if ((!studentId && !studentNumber) || !birthDate) {
      return json({ error: "L'identifiant de l'élève et la date de naissance sont obligatoires." }, 400)
    }

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
      return json({ error: "Aucun élève actif ne correspond à ces informations." }, 404)
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
    })
  } catch (error) {
    console.error("claim-student error", error)
    return json({ error: error instanceof Error ? error.message : "Impossible de rattacher l'élève." }, 400)
  }
})
