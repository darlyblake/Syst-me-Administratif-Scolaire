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
  const { utilisateur, estEnCoursDeChargement } = useAuthentification()
  const permission = permissionForPath(pathname)
  const allowed = !permission || hasEffectiveSchoolPermission(utilisateur, permission)

  useEffect(() => {
    if (!estEnCoursDeChargement && !allowed) router.replace("/ecole/tableau-bord")
  }, [allowed, estEnCoursDeChargement, router])

  if (estEnCoursDeChargement || !allowed) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-pierre">Vérification des autorisations…</div>
  }

  return <>{children}</>
}
