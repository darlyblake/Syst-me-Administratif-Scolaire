"use client"

import { LogOut, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"

export default function ParentProfile() {
  const { utilisateur, deconnecter } = useAuthentification()

  return (
    <div className="space-y-7">
      <ParentPageHeader
        eyebrow="Compte"
        title="Profil & sécurité"
        description="Consultez les informations de votre compte parent et gérez votre session."
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Informations du compte</h2>
          <p className="mt-1 text-sm text-slate-500">Ces informations sont celles utilisées par votre espace parent.</p>
        </div>
        <div className="divide-y divide-slate-200">
          <Row label="Nom affiché" value={utilisateur?.nomUtilisateur ?? "—"} />
          <Row label="Rôle" value="Parent" />
          <Row label="Identifiant" value={utilisateur?.id ?? "—"} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <ShieldCheck className="h-4 w-4 text-slate-900" />
          <h2 className="font-semibold text-slate-900">Sécurité de la session</h2>
        </div>
        <div className="divide-y divide-slate-200">
          <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Session actuelle</p>
              <p className="mt-1 text-sm text-slate-500">Votre compte est authentifié en tant que parent.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-vert">Session active</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-slate-500">Pour protéger votre compte, déconnectez-vous après utilisation sur un appareil partagé.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserRound className="h-4 w-4 text-slate-500" />
          <p className="text-sm text-slate-500">Vous êtes connecté en tant que parent.</p>
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
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-all text-sm font-medium text-slate-900">{value}</span>
    </div>
  )
}
