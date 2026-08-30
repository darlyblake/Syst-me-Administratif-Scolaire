import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const authorization = req.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentification requise" }, 401)

  const { data: { user }, error: authError } = await admin.auth.getUser(authorization.slice(7))
  if (authError || !user) return json({ error: "Session invalide" }, 401)

  try {
    const body = await req.json()
    const studentId = String(body.student_id ?? "").trim()
    const establishmentId = String(body.establishment_id ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()

    if (!studentId || !establishmentId || !email || !email.includes("@")) {
      return json({ error: "student_id, establishment_id et email sont obligatoires" }, 400)
    }

    const { data: manager } = await admin.from("establishment_members")
      .select("role,active")
      .eq("establishment_id", establishmentId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!manager?.active || !["owner", "admin", "director"].includes(manager.role)) {
      return json({ error: "Permission refusée." }, 403)
    }

    const { data: student } = await admin.from("students")
      .select("id,establishment_id")
      .eq("id", studentId)
      .eq("establishment_id", establishmentId)
      .maybeSingle()

    if (!student) return json({ error: "Élève introuvable dans cet établissement." }, 404)

    let target: any = null
    for (let page = 1; page <= 20 && !target; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      target = data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null
      if (data.users.length < 1000) break
    }

    let status = "linked"
    if (!target) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email)
      if (error) throw error
      target = data.user
      status = "invited"
    }

    if (!target) throw new Error("Impossible de créer le compte parent.")

    const { data: profile } = await admin.from("profiles")
      .select("id,account_type")
      .eq("id", target.id)
      .maybeSingle()

    if (profile && profile.account_type !== "parent") {
      return json({ error: "Cette adresse est déjà utilisée par un autre type de compte." }, 409)
    }

    if (!profile) {
      const { error } = await admin.from("profiles").insert({
        id: target.id,
        account_type: "parent",
        first_name: body.first_name ?? null,
        last_name: body.last_name ?? null,
        phone: body.phone ?? null,
      })
      if (error) throw error
    }

    const values = {
      relationship: String(body.relationship ?? "Parent").trim() || "Parent",
      can_view_academic: body.can_view_academic !== false,
      can_view_finance: body.can_view_finance !== false,
    }

    const { data: existing } = await admin.from("student_guardians")
      .select("id")
      .eq("establishment_id", establishmentId)
      .eq("student_id", studentId)
      .eq("guardian_user_id", target.id)
      .maybeSingle()

    if (existing) {
      const { error } = await admin.from("student_guardians").update(values).eq("id", existing.id)
      if (error) throw error
    } else {
      const { error } = await admin.from("student_guardians").insert({
        establishment_id: establishmentId,
        student_id: studentId,
        guardian_user_id: target.id,
        is_primary: true,
        ...values,
      })
      if (error) throw error
    }

    return json({ status, user_id: target.id, student_id: studentId, email })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : "Erreur serveur" }, 400)
  }
})
