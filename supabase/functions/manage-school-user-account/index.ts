import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("unauthorized");

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: actor }, error: actorError } = await admin.auth.getUser(token);
    if (actorError || !actor) throw new Error("unauthorized");

    const body = await req.json();
    const action = String(body.action || "");
    if (!["create_user", "reset_password", "disable_user", "enable_user"].includes(action)) {
      throw new Error("invalid_action");
    }

    if (action === "create_user") {
      const establishmentId = String(body.establishment_id || "");
      const staffId = String(body.staff_id || "");
      if (!establishmentId || !staffId) throw new Error("staff_and_establishment_required");

      const { data: staff } = await admin.from("staff_members")
        .select("id,establishment_id,profile_id,first_name,last_name,email")
        .eq("id", staffId).eq("establishment_id", establishmentId).maybeSingle();
      if (!staff) throw new Error("staff_not_found");
      if (staff.profile_id) throw new Error("account_already_exists");

      const { data: actorMembership } = await admin.from("establishment_members")
        .select("establishment_id,role,role_id,active")
        .eq("establishment_id", establishmentId).eq("user_id", actor.id).eq("active", true).maybeSingle();
      if (!actorMembership) throw new Error("school_member_required");

      let allowed = ["owner", "admin", "director"].includes(actorMembership.role);
      if (!allowed && actorMembership.role_id) {
        const { data: permission } = await admin.from("establishment_role_permissions")
          .select("id").eq("role_id", actorMembership.role_id).eq("permission", "users.manage").maybeSingle();
        allowed = !!permission;
      }
      if (!allowed) throw new Error("users_manage_required");

      const email = String(body.email || staff.email || "").trim().toLowerCase();
      if (!email) throw new Error("email_required");
      const roleId = String(body.role_id || "");
      if (!roleId) throw new Error("role_required");

      const { data: role } = await admin.from("establishment_roles")
        .select("id,name,active,is_system")
        .eq("id", roleId).eq("establishment_id", establishmentId).eq("active", true).maybeSingle();
      if (!role) throw new Error("role_not_found");

      const password = typeof body.password === "string" && body.password.length >= 8 ? body.password : generatePassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { first_name: staff.first_name, last_name: staff.last_name },
      });
      if (createError || !created.user) throw new Error(createError?.message || "account_creation_failed");

      const userId = created.user.id;
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId, first_name: staff.first_name, last_name: staff.last_name, account_type: "school_member",
      }, { onConflict: "id" });
      if (profileError) {
        await admin.auth.admin.deleteUser(userId);
        throw new Error("profile_creation_failed");
      }

      // establishment_members.role utilise des valeurs techniques fixes.
      // Le nom du rôle affiché peut être en français ou personnalisé : role_id conserve le rôle réel.
      const normalizedRoleName = role.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
      const canonicalRole =
        normalizedRoleName === "administrateur" || normalizedRoleName === "admin"
          ? "admin"
          : normalizedRoleName === "directeur" || normalizedRoleName === "direction"
            ? "director"
            : normalizedRoleName === "comptable"
              ? "accountant"
              : normalizedRoleName === "secretaire"
                ? "secretary"
                : normalizedRoleName === "enseignant" || normalizedRoleName === "professeur"
                  ? "teacher"
                  : normalizedRoleName === "surveillant"
                    ? "supervisor"
                    : normalizedRoleName === "owner"
                      ? "owner"
                      : normalizedRoleName === "staff"
                        ? "staff"
                        : "staff";

      const { data: member, error: memberError } = await admin.from("establishment_members").insert({
        establishment_id: establishmentId, user_id: userId, role: canonicalRole, role_id: role.id, active: true,
      }).select("id,establishment_id,user_id,role,role_id,active").single();

      if (memberError || !member) {
        await admin.auth.admin.deleteUser(userId);
        throw new Error("member_account_link_failed");
      }

      const { error: staffError } = await admin.from("staff_members")
        .update({ profile_id: userId, email, updated_at: new Date().toISOString() })
        .eq("id", staff.id).eq("establishment_id", establishmentId);

      if (staffError) {
        await admin.from("establishment_members").delete().eq("id", member.id);
        await admin.auth.admin.deleteUser(userId);
        throw new Error("staff_account_link_failed");
      }

      await admin.from("audit_logs").insert({
        establishment_id: establishmentId, action: "member.create_user",
        entity_type: "establishment_member", entity_id: member.id,
        metadata: { actor_user_id: actor.id, target_user_id: userId, staff_id: staff.id, role_id: role.id },
      }).then(() => undefined).catch(() => undefined);

      return new Response(JSON.stringify({
        ok: true, action, user_id: userId, member_id: member.id, role_id: role.id, temporary_password: password,
      }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const memberId = String(body.member_id || "");
    if (!memberId) throw new Error("member_id_required");

    const { data: target } = await admin.from("establishment_members")
      .select("id,establishment_id,user_id,role,role_id,active").eq("id", memberId).maybeSingle();
    if (!target) throw new Error("member_not_found");
    const establishmentId = target.establishment_id;

    const { data: actorMembership } = await admin.from("establishment_members")
      .select("establishment_id,role,role_id,active")
      .eq("establishment_id", establishmentId).eq("user_id", actor.id).eq("active", true).maybeSingle();
    if (!actorMembership) throw new Error("school_member_required");

    let allowed = ["owner", "admin", "director"].includes(actorMembership.role);
    if (!allowed && actorMembership.role_id) {
      const { data: permission } = await admin.from("establishment_role_permissions")
        .select("id").eq("role_id", actorMembership.role_id).eq("permission", "users.manage").maybeSingle();
      allowed = !!permission;
    }
    if (!allowed) throw new Error("users_manage_required");
    if (target.user_id === actor.id) throw new Error("cannot_manage_self");
    if (target.role === "owner") throw new Error("owner_protected");
    if (!target.user_id) throw new Error("account_not_found");

    if (action === "reset_password") {
      const password = typeof body.password === "string" && body.password.length >= 8
        ? body.password
        : generatePassword();
      const { error } = await admin.auth.admin.updateUserById(target.user_id, { password });
      if (error) throw new Error("password_reset_failed");

      return new Response(JSON.stringify({
        ok: true,
        action,
        temporary_password: password,
      }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const active = action === "enable_user";
    const { error } = await admin
      .from("establishment_members")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("establishment_id", target.establishment_id);

    if (error) throw new Error("member_status_update_failed");

    await admin.from("audit_logs").insert({
      establishment_id: target.establishment_id,
      action: `member.${action}`,
      entity_type: "establishment_member",
      entity_id: target.id,
      metadata: { actor_user_id: actor.id, target_user_id: target.user_id },
    }).then(() => undefined).catch(() => undefined);

    return new Response(JSON.stringify({ ok: true, action }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "request_failed";
    const status = ["unauthorized", "users_manage_required", "school_member_required"].includes(message) ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});