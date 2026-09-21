import { useState, useEffect, useCallback } from "react"
import { getRoles, createRole, updateRole, deleteRole, getRoleUsageCount } from "@/lib/supabase/services/role.service"
import type { EstablishmentRole, EstablishmentRolePermission } from "@/lib/supabase/types"

export type RoleWithPermissions = {
  role: EstablishmentRole
  permissions: EstablishmentRolePermission[]
}

export function useRoles(establishmentId: string | null) {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async () => {
    if (!establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await getRoles(establishmentId)
      setRoles(data)
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des rôles")
    } finally {
      setIsLoading(false)
    }
  }, [establishmentId])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const addRole = async (name: string, description: string, permissions: string[]) => {
    if (!establishmentId) throw new Error("Établissement non défini")
    
    const newRole = await createRole({
      establishmentId,
      name,
      description,
      permissions
    })
    
    await fetchRoles()
    return newRole
  }

  const editRole = async (roleId: string, name: string, description: string, isActive: boolean, permissions: string[]) => {
    const updatedRole = await updateRole({
      roleId,
      name,
      description,
      isActive,
      permissions
    })
    
    await fetchRoles()
    return updatedRole
  }

  const removeRole = async (roleId: string) => {
    // Vérifier l'utilisation avant
    const usageCount = await getRoleUsageCount(roleId)
    if (usageCount > 0) {
      throw new Error(`Ce rôle est utilisé par ${usageCount} utilisateur(s). Vous devez d'abord réattribuer ces utilisateurs.`)
    }
    
    await deleteRole(roleId)
    await fetchRoles()
  }

  return {
    roles,
    isLoading,
    error,
    refresh: fetchRoles,
    addRole,
    editRole,
    removeRole,
    getRoleUsageCount
  }
}
