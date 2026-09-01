"use client"

import type { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuthentification } from "@/providers/authentification.provider"
import { hasEffectiveSchoolPermission } from "@/lib/organization/runtime-permissions"

const ROUTE_PERMISSIONS: Array<[string, string]> = [
  ["/ecole/tableau-bord", "dashboard.view"],
  ["/ecole/inscriptions", "enrollments.view"],
  ["/ecole/students", "students.view"],
  ["/ecole/dossiers-papier", "documents.view"],
  ["/ecole/classes", "classes.view"],
  ["/ecole/notes", "grades.view"],
  ["/ecole/emploi-du-temps", "timetable.view"],
  ["/ecole/registre-appel", "attendance.view"],
  ["/ecole/absences", "attendance.view"],
  ["/ecole/matieres", "subjects.view"],
  ["/ecole/evaluation", "grades.view"],
  ["/ecole/options", "settings.view"],
  ["/ecole/enseignants", "staff.view"],
  ["/ecole/personnel", "staff.view"],
  ["/ecole/etat-salaire", "staff.view"],
  ["/ecole/heures-vacataires", "staff.view"],
  ["/ecole/payments", "payments.view"],
  ["/ecole/comptabilite", "finance.view"],
  ["/ecole/archivage", "documents.view"],
  ["/ecole/documents", "documents.view"],
  ["/ecole/communication", "communication.view"],
  ["/ecole/evenements", "events.view"],
  ["/ecole/service-technique", "support.view"],
  ["/ecole/settings", "settings.view"],
]

function permissionForPath(pathname: string): string | null {
  const match = ROUTE_PERMISSIONS.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))
  return match?.[1] ?? null
}

export function PermissionRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { utilisateur, contexte, etablissementActif, estEnCoursDeChargement } = useAuthentification()
  const permission = permissionForPath(pathname)

  // Les comptes école utilisent les rôles applicatifs historiques ("ecole"),
  // tandis que l'autorisation est déterminée par le rôle de l'utilisateur
  // dans l'établissement retourné par Supabase. On respecte donc strictement
  // ce rôle établissement et ses permissions effectives.
  const organizationRole =
    etablissementActif?.role ??
    contexte?.establishments?.find((establishment) => establishment.id === utilisateur?.etablissementId)?.role

  const runtimeUser = utilisateur
    ? {
        role: utilisateur.role === "ecole" ? organizationRole : utilisateur.role,
        permissions: [],
        revoked_permissions: [],
        status: "active",
      }
    : null

  const allowed = !permission || hasEffectiveSchoolPermission(runtimeUser, permission)

  useEffect(() => {
    if (!estEnCoursDeChargement && utilisateur && !allowed) {
      router.replace("/ecole/tableau-bord")
    }
  }, [allowed, estEnCoursDeChargement, router, utilisateur])

  if (estEnCoursDeChargement || !utilisateur) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-pierre">Vérification de la session…</div>
  }

  if (!allowed) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-pierre">Accès non autorisé.</div>
  }

  return <>{children}</>
}
