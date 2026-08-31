import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentification requise" }, 401);

  const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.slice(7));
  if (authError || !user) return json({ error: "Session invalide" }, 401);

  try {
    const { data: platformAdmin } = await admin.from("profiles").select("id").eq("id", user.id).eq("account_type", "platform_admin").maybeSingle();
    if (!platformAdmin) return json({ error: "Permission refusée" }, 403);

    const body = await req.json();
    const establishmentId = String(body.establishment_id ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.first_name ?? "").trim();
    const lastName = String(body.last_name ?? "").trim();
    const password = String(body.password ?? "").trim() || generatePassword();

    if (!establishmentId || !email || !firstName || !lastName) return json({ error: "Tous les champs obligatoires doivent être renseignés" }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Adresse e-mail invalide" }, 400);
    if (password.length < 10) return json({ error: "Le mot de passe doit contenir au moins 10 caractères" }, 400);

    const { data: establishment } = await admin.from("establishments").select("id,name").eq("id", establishmentId).maybeSingle();
    if (!establishment) return json({ error: "Établissement introuvable" }, 404);

    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    const existing = usersData.users.find(u => u.email?.toLowerCase() === email);
    if (existing) return json({ error: "Cette adresse e-mail est déjà utilisée." }, 409);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, account_type: "school_member" },
    });
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

    return json({ status: "created", user_id: created.user.id, email, temporary_password: password, establishment: establishment.name });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Erreur serveur" }, 400);
  }
});
