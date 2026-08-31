import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const allowedOrigins = new Set(["https://syst-me-administratif-scolaire.vercel.app"]);

const corsHeaders = (origin: string | null): Record<string, string> => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://syst-me-administratif-scolaire.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

const json = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
});

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentification requise" }, 401, origin);

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return json({ error: "Session invalide" }, 401, origin);

  try {
    const { data: platformAdmin } = await admin.from("profiles").select("id,account_type").eq("id", user.id).eq("account_type", "platform_admin").maybeSingle();
    if (!platformAdmin) return json({ error: "Permission refusée" }, 403, origin);

    const body = await req.json();
    const establishmentId = String(body.establishment_id ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.first_name ?? "").trim();
    const lastName = String(body.last_name ?? "").trim();
    const password = String(body.password ?? "").trim() || generatePassword();

    if (!establishmentId || !email || !firstName || !lastName) return json({ error: "Tous les champs obligatoires doivent être renseignés" }, 400, origin);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Adresse e-mail invalide" }, 400, origin);
    if (password.length < 10) return json({ error: "Le mot de passe doit contenir au moins 10 caractères" }, 400, origin);

    const { data: establishment } = await admin.from("establishments").select("id,name").eq("id", establishmentId).maybeSingle();
    if (!establishment) return json({ error: "Établissement introuvable" }, 404, origin);

    const { data: existingAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = existingAuth?.users.find(u => u.email?.toLowerCase() === email);
    if (existing) {
      const { data: existingMember } = await admin.from("establishment_members").select("id,role").eq("establishment_id", establishmentId).eq("user_id", existing.id).maybeSingle();
      if (existingMember) return json({ error: "Cet utilisateur est déjà rattaché à cet établissement" }, 409, origin);
      return json({ error: "Cette adresse e-mail est déjà utilisée. Utilisez une autre adresse ou rattachez cet utilisateur depuis la gestion des membres." }, 409, origin);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName, account_type: "school_member" } });
    if (createError || !created.user) throw createError ?? new Error("Création du compte impossible");

    const { error: profileError } = await admin.from("profiles").update({ first_name: firstName, last_name: lastName, account_type: "school_member" }).eq("id", created.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    const { error: memberError } = await admin.from("establishment_members").insert({ establishment_id: establishmentId, user_id: created.user.id, role: "owner", active: true });
    if (memberError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw memberError;
    }

    return json({ status: "created", user_id: created.user.id, email, temporary_password: password, establishment: establishment.name }, 200, origin);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Erreur serveur" }, 400, origin);
  }
});