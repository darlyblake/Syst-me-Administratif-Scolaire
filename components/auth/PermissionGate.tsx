"use client"

import type { ReactNode } from "react"
import { useAuthentification } from "@/providers/authentification.provider"
import { hasEffectiveSchoolPermission } from "@/lib/organization/runtime-permissions"

export function PermissionGate({ permission, children, fallback = null }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const { utilisateur } = useAuthentification()
  return hasEffectiveSchoolPermission(utilisateur, permission) ? <>{children}</> : <>{fallback}</>
}
