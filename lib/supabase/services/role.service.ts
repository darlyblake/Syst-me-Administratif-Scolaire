import { supabaseBrowser } from "@/lib/supabase/client"
import type { EstablishmentRole, EstablishmentRolePermission } from "@/lib/supabase/types"

export async function getRoles(establishmentId: string): Promise<{role: EstablishmentRole, permissions: EstablishmentRolePermission[]}[]> {
  const { data: roles, error: rolesError } = await supabaseBrowser
    .from("establishment_roles")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("name", { ascending: true })

  if (rolesError) throw new Error("Impossible de charger les rôles: " + rolesError.message)

  if (!roles || roles.length === 0) return []

  const roleIds = roles.map(r => r.id)
  
  const { data: permissions, error: permsError } = await supabaseBrowser
    .from("establishment_role_permissions")
    .select("*")
    .in("role_id", roleIds)

  if (permsError) throw new Error("Impossible de charger les permissions: " + permsError.message)

  return roles.map(role => ({
    role: role as EstablishmentRole,
    permissions: (permissions || []).filter(p => p.role_id === role.id) as EstablishmentRolePermission[]
  }))
}

export async function createRole(data: {
  establishmentId: string
  name: string
  description?: string
  permissions: string[]
}): Promise<EstablishmentRole> {
  const { data: role, error: roleError } = await supabaseBrowser
    .from("establishment_roles")
    .insert({
      establishment_id: data.establishmentId,
      name: data.name,
      description: data.description || null,
      active: true
    })
    .select()
    .single()

  if (roleError) throw new Error("Impossible de créer le rôle: " + roleError.message)

  if (data.permissions.length > 0) {
    const permsToInsert = data.permissions.map(p => ({
      role_id: role.id,
      permission: p
    }))
    const { error: permsError } = await supabaseBrowser
      .from("establishment_role_permissions")
      .insert(permsToInsert)

    if (permsError) throw new Error("Rôle créé mais impossible d'ajouter les permissions: " + permsError.message)
  }

  return role as EstablishmentRole
}

export async function updateRole(data: {
  roleId: string
  name: string
  description?: string
  isActive: boolean
  permissions: string[]
}): Promise<EstablishmentRole> {
  const { data: role, error: roleError } = await supabaseBrowser
    .from("establishment_roles")
    .update({
      name: data.name,
      description: data.description || null,
      active: data.isActive
    })
    .eq("id", data.roleId)
    .select()
    .single()

  if (roleError) throw new Error("Impossible de modifier le rôle: " + roleError.message)

  // Remplacer les permissions (supprimer les anciennes puis ajouter les nouvelles)
  const { error: delError } = await supabaseBrowser
    .from("establishment_role_permissions")
    .delete()
    .eq("role_id", data.roleId)

  if (delError) throw new Error("Impossible de réinitialiser les permissions: " + delError.message)

  if (data.permissions.length > 0) {
    const permsToInsert = data.permissions.map(p => ({
      role_id: role.id,
      permission: p
    }))
    const { error: insError } = await supabaseBrowser
      .from("establishment_role_permissions")
      .insert(permsToInsert)

    if (insError) throw new Error("Impossible de sauvegarder les nouvelles permissions: " + insError.message)
  }

  return role as EstablishmentRole
}

export async function deleteRole(roleId: string): Promise<boolean> {
  // Optionnel, on préférera souvent une désactivation.
  const { error } = await supabaseBrowser
    .from("establishment_roles")
    .delete()
    .eq("id", roleId)

  if (error) {
    // Si constraint violation (rôle utilisé)
    if (error.code === '23503') {
      throw new Error("Ce rôle est utilisé par des membres du personnel et ne peut pas être supprimé.")
    }
    throw new Error("Impossible de supprimer le rôle: " + error.message)
  }

  return true
}

export async function getRoleUsageCount(roleId: string): Promise<number> {
  const { count, error } = await supabaseBrowser
    .from("establishment_members")
    .select("*", { count: 'exact', head: true })
    .eq("role_id", roleId)
    
  if (error) throw new Error("Impossible de vérifier l'utilisation du rôle: " + error.message)
  
  return count || 0
}
