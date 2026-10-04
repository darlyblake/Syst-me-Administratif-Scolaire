"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, School, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"

export default function EspaceEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, etablissementActif, estEnCoursDeChargement, deconnecter, selectionnerEtablissement } = useAuthentification()
  const etablissements = contexte?.establishments ?? []

  useEffect(() => {
    if (estEnCoursDeChargement) return
    if (!utilisateur || utilisateur.role !== "enseignant") {
      router.replace("/")
      return
    }

    // Un seul établissement : on entre directement dans la nouvelle interface Stitch.
    if (etablissements.length === 1) {
      const id = etablissements[0].id
      if (etablissementActif?.id !== id) selectionnerEtablissement(id)
      router.replace("/enseignant/etablissement/" + id)
    }
  }, [estEnCoursDeChargement, utilisateur, etablissements.length, etablissements[0]?.id, etablissementActif?.id, router, selectionnerEtablissement])

  if (estEnCoursDeChargement || !utilisateur) {
    return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><p className="text-sm text-[#6d7280]">Chargement de votre espace enseignant…</p></main>
  }

  if (etablissements.length === 1) {
    return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><p className="text-sm text-[#6d7280]">Ouverture de votre espace enseignant…</p></main>
  }

  const ouvrirEtablissement = (id: string) => {
    if (selectionnerEtablissement(id)) router.push("/enseignant/etablissement/" + id)
  }

  return (
    <main className="min-h-screen bg-[#f8f8fc] text-[#172033]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e6ef] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Portail enseignant</p>
            <h1 className="mt-1 text-2xl font-bold">Bonjour{contexte?.first_name ? " " + contexte.first_name : ""}</h1>
            <p className="mt-1 text-sm text-[#6d7280]">Choisissez l’établissement dans lequel vous souhaitez travailler.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/enseignant/notifications")}><Bell className="mr-2 h-4 w-4" />Notifications</Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/enseignant/profil")}><UserRound className="mr-2 h-4 w-4" />Profil</Button>
            <Button variant="outline" size="sm" onClick={async () => { await deconnecter(); router.replace("/") }}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
          </div>
        </header>

        <section className="mt-7">
          {etablissements.length > 1 ? (
            <div className="grid gap-3">
              {etablissements.map((school) => (
                <button key={school.id} type="button" onClick={() => ouvrirEtablissement(school.id)} className="flex items-center gap-4 rounded-xl border border-[#e1e3eb] bg-white p-4 text-left transition hover:border-[#9eaff0] hover:shadow-sm">
                  <span className="rounded-lg bg-[#edf1ff] p-3 text-[#2944a8]"><School className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{school.name}</span><span className="mt-1 block text-xs text-[#6d7280]">Ouvrir mon espace enseignant</span></span>
                  <span className="text-sm font-semibold text-[#2944a8]">Ouvrir →</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#d9dce6] bg-white p-8 text-center">
              <School className="mx-auto h-8 w-8 text-[#7b8190]" />
              <h2 className="mt-3 font-semibold">Aucun établissement associé</h2>
              <p className="mt-1 text-sm text-[#6d7280]">Votre compte enseignant doit être rattaché à un établissement avant l’accès au portail.</p>
              <Button className="mt-4" variant="outline" onClick={() => router.push("/enseignant/rattachement")}>Demander un rattachement</Button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
