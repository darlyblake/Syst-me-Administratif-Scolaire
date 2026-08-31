import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const allowedOrigins = new Set(["https://syst-me-administratif-scolaire.vercel.app"]);
const headers = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://syst-me-administratif-scolaire.vercel.app", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" });
const json = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: { ...headers(origin), "Content-Type": "application/json" } });
const ALL_PERMISSIONS = ["dashboard.view","establishments.view","establishments.manage","subscriptions.manage","users.view","admins.manage","support.manage","settings.manage"];
const generatePassword = () => { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"; const bytes = crypto.getRandomValues(new Uint8Array(16)); return Array.from(bytes, b => chars[b % chars.length]).join(""); };

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentification requise" }, 401, origin);
  try {
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !user) return json({ error: "Session invalide" }, 401, origin);
    const { data: caller } = await admin.from("platform_admins").select("user_id,active,is_root,permissions").eq("user_id", user.id).maybeSingle();
    if (!caller?.active) return json({ error: "Permission refusée" }, 403, origin);

    const body = await req.json();
    const action = String(body.action ?? "create");
    const targetId = String(body.user_id ?? "").trim();

    if (action === "delete") {
      if (!targetId) return json({ error: "Administrateur introuvable" }, 400, origin);
      const { data: target } = await admin.from("platform_admins").select("user_id,is_root").eq("user_id", targetId).maybeSingle();
      if (!target) return json({ error: "Administrateur introuvable" }, 404, origin);
      if (target.is_root) return json({ error: "L'administrateur général ne peut pas être supprimé" }, 403, origin);
      const { data: canManage } = await admin.rpc("platform_admin_can_manage", { p_target: targetId });
      if (!canManage) return json({ error: "Vous ne pouvez gérer que vos administrateurs descendants" }, 403, origin);
      const { data: children } = await admin.from("platform_admins").select("user_id").eq("created_by", targetId).limit(1);
      if (children?.length) return json({ error: "Supprimez d'abord les administrateurs créés par ce compte" }, 409, origin);
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) throw error;
      return json({ status: "deleted", user_id: targetId }, 200, origin);
    }

    if (!caller.is_root && !(caller.permissions ?? []).includes("admins.manage")) return json({ error: "Vous n'avez pas le droit de créer des administrateurs" }, 403, origin);
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.first_name ?? "").trim();
    const lastName = String(body.last_name ?? "").trim();
    const password = String(body.password ?? "").trim() || generatePassword();
    const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions.map((p: unknown) => String(p)))] : [];
    if (!email || !firstName || !lastName) return json({ error: "Le prénom, le nom et l'e-mail sont obligatoires" }, 400, origin);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Adresse e-mail invalide" }, 400, origin);
    if (password.length < 10) return json({ error: "Le mot de passe doit contenir au moins 10 caractères" }, 400, origin);
    if (permissions.some((p: string) => !ALL_PERMISSIONS.includes(p))) return json({ error: "Permission inconnue" }, 400, origin);
    if (!caller.is_root && !permissions.every((p: string) => (caller.permissions ?? []).includes(p))) return json({ error: "Vous ne pouvez pas attribuer un droit que vous ne possédez pas" }, 403, origin);

    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existing?.users.some(u => u.email?.toLowerCase() === email)) return json({ error: "Cette adresse e-mail est déjà utilisée" }, 409, origin);
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName, account_type: "platform_admin" } });
    if (createError || !created.user) throw createError ?? new Error("Création du compte impossible");
    try {
      const { error: profileError } = await admin.from("profiles").update({ first_name: firstName, last_name: lastName, account_type: "platform_admin" }).eq("id", created.user.id);
      if (profileError) throw profileError;
      const { error: insertError } = await admin.from("platform_admins").insert({ user_id: created.user.id, created_by: caller.user_id, permissions, active: true, is_root: false });
      if (insertError) throw insertError;
    } catch (error) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw error;
    }
    return json({ status: "created", user_id: created.user.id, email, temporary_password: password, permissions }, 200, origin);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Erreur serveur" }, 400, origin);
  }
});
