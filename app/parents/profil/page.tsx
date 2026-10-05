"use client"

import { LogOut, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"

export default function ParentProfile() {
  const { utilisateur, deconnecter } = useAuthentification()

  return (
    <div className="space-y-6">
      <ParentPageHeader
        eyebrow="Compte"
        title="Profil & sécurité"
        description="Consultez les informations de votre compte parent et gérez votre session."
      />

      <section className="border border-terre/10 bg-papier">
        <div className="border-b border-terre/10 px-5 py-4">
          <h2 className="font-semibold text-terre">Informations du compte</h2>
          <p className="mt-1 text-sm text-pierre">Ces informations sont celles utilisées par votre espace parent.</p>
        </div>
        <div className="divide-y divide-terre/10">
          <Row label="Nom affiché" value={utilisateur?.nomUtilisateur ?? "—"} />
          <Row label="Rôle" value="Parent" />
          <Row label="Identifiant" value={utilisateur?.id ?? "—"} />
        </div>
      </section>

      <section className="border border-terre/10 bg-papier">
        <div className="flex items-center gap-2 border-b border-terre/10 px-5 py-4">
          <ShieldCheck className="h-4 w-4 text-terre" />
          <h2 className="font-semibold text-terre">Sécurité de la session</h2>
        </div>
        <div className="divide-y divide-terre/10">
          <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-terre">Session actuelle</p>
              <p className="mt-1 text-sm text-pierre">Votre compte est authentifié en tant que parent.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-vert">Session active</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-pierre">Pour protéger votre compte, déconnectez-vous après utilisation sur un appareil partagé.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-terre/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserRound className="h-4 w-4 text-pierre" />
          <p className="text-sm text-pierre">Vous êtes connecté en tant que parent.</p>
        </div>
        <Button variant="outline" onClick={() => void deconnecter()}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr]">
      <span className="text-sm text-pierre">{label}</span>
      <span className="break-all text-sm font-medium text-terre">{value}</span>
    </div>
  )
}
