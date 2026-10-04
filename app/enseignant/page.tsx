"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, BookOpen, ClipboardCheck, LifeBuoy, LogOut, School, UserCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"

export default function EspaceEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, etablissementActif, estEnCoursDeChargement, deconnecter, selectionnerEtablissement } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant")) router.replace("/")
  }, [utilisateur, estEnCoursDeChargement, router])

  if (estEnCoursDeChargement || !utilisateur) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><p className="text-sm text-[#6d7280]">Chargement…</p></div>
  }

  const etablissements = contexte?.establishments ?? []

  const ouvrirEtablissement = (id: string, path = "") => {
    if (selectionnerEtablissement(id)) router.push(`/enseignant/etablissement/${id}${path}`)
  }

  const handleChangeEstablishment = (id: string) => {
    if (id) selectionnerEtablissement(id)
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <header className="flex flex-col gap-4 border-b border-[#e4e6ef] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-[#6d7280]">Espace enseignant</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Bonjour{contexte?.first_name ? ` ${contexte.first_name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sélectionnez l'établissement dans lequel vous souhaitez travailler.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {etablissements.length > 0 && (
              <label className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Établissement</span>
                <select
                  value={etablissementActif?.id ?? ""}
                  onChange={(event) => handleChangeEstablishment(event.target.value)}
                  className="h-9 min-w-[230px] rounded-lg border border-[#e1e3eb] bg-white px-3 text-sm outline-none focus:border-[#7890ef]"
                >
                  <option value="" disabled>Choisir...</option>
                  {etablissements.map((school) => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </label>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/enseignant/notifications")}><Bell className="mr-2 h-4 w-4" />Notifications</Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/enseignant/profil")}><UserRound className="mr-2 h-4 w-4" />Mon profil</Button>
            <Button variant="outline" size="sm" onClick={async () => { await deconnecter(); router.replace("/") }}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</Button>
          </div>
        </header>

        <section className="py-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">Mes établissements</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {etablissements.length > 1
                  ? "Votre compte peut être rattaché à plusieurs établissements. Chaque établissement possède ses propres données."
                  : etablissements.length === 1
                    ? "Votre établissement de travail est associé à votre compte."
                    : "Aucun établissement n'est encore associé à votre compte."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/enseignant/service-technique")}><LifeBuoy className="mr-2 h-4 w-4" />Service technique</Button>
          </div>

          {etablissements.length ? (
            <div className="mt-5 overflow-x-auto rounded-md border">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="border-b bg-[#f7f8fa] text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Établissement</th>
                    <th className="px-4 py-3 font-medium">État</th>
                    <th className="px-4 py-3 text-right font-medium">Accès</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {etablissements.map((school) => {
                    const active = etablissementActif?.id === school.id
                    return (
                      <tr key={school.id} className={active ? "bg-slate-50" : "hover:bg-[#fafaff]"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <School className="h-4 w-4 text-[#6d7280]" />
                            <span className="font-medium">{school.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={active ? "text-[#277047]" : "text-slate-500"}>{active ? "Sélectionné" : "Disponible"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <Button size="sm" onClick={() => ouvrirEtablissement(school.id)}>
                              <BookOpen className="mr-2 h-4 w-4" />{active ? "Ouvrir" : "Sélectionner"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => ouvrirEtablissement(school.id, "/notes")}><ClipboardCheck className="mr-2 h-4 w-4" />Notes</Button>
                            <Button variant="outline" size="sm" onClick={() => ouvrirEtablissement(school.id, "/presences")}><UserCheck className="mr-2 h-4 w-4" />Présences</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-md border p-8 text-center">
              <School className="mx-auto h-7 w-7 text-muted-foreground" />
              <h2 className="mt-3 font-medium">Aucun établissement associé</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Demandez votre rattachement à un établissement pour accéder à son espace de travail.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => router.push("/enseignant/rattachement")}>
                Demander un rattachement
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
