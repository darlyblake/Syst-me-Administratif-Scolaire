"use client"

import Link from "next/link"
import { useState } from "react"
import { GraduationCap, Mail, Phone, Plus, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { LinkChildModal } from "@/components/parent/LinkChildModal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentChildren() {
  const { loading, error, refresh, children, claimChild, unclaimChild } = useParentPortal()
  const [open, setOpen] = useState(false)
  const [selectedChild, setSelectedChild] = useState<(typeof children)[number] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Retirer ${name} de votre compte ? Cette action ne supprime pas l'élève de l'établissement.`)) return
    setBusy(id)
    setActionError(null)
    try {
      await unclaimChild(id)
      if (selectedChild?.id === id) setSelectedChild(null)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de retirer l’association.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <ParentPageHeader
        eyebrow="Famille"
        title="Mes enfants"
        description="Consultez rapidement les enfants associés à votre compte."
        onRefresh={() => void refresh()}
        refreshing={loading}
        action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Ajouter un enfant</Button>}
      />

      {(error || actionError) && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError || error}</div>
      )}

      {!loading && children.length === 0 ? (
        <ParentEmptyState
          title="Aucun enfant associé"
          description="Ajoutez un enfant avec son identifiant scolaire et sa date de naissance, ou utilisez le scanner prévu par le portail."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Ajouter mon enfant</Button>}
        />
      ) : (
        <section aria-label="Liste des enfants" className="border-y border-slate-200">
          <div className="hidden border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[minmax(0,1.7fr)_1fr_1fr_auto] sm:items-center sm:gap-4">
            <span>Enfant</span>
            <span>Classe</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </div>

          {children.map((child) => (
            <div
              key={child.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedChild(child)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setSelectedChild(child)
                }
              }}
              className="group cursor-pointer border-b border-slate-100 px-5 py-4 outline-none transition-colors last:border-0 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.7fr)_1fr_1fr_auto] sm:items-center sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terre text-xs font-bold text-white">
                    {child.first_name?.[0] ?? ""}{child.last_name?.[0] ?? ""}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-terre">{child.first_name} {child.last_name}</p>
                    <p className="mt-0.5 text-xs text-pierre">{child.student_number ?? "Matricule non renseigné"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-pierre sm:hidden">Classe</p>
                  <p className="text-sm text-slate-700">{child.class_name ?? "Classe non attribuée"}</p>
                </div>

                <div>
                  <p className="text-xs text-pierre sm:hidden">Statut</p>
                  <Badge variant="outline">{child.active ? "Actif" : "Inactif"}</Badge>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end" onClick={(event) => event.stopPropagation()}>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/parents/notes?eleve=${child.id}`}><GraduationCap className="mr-1.5 h-4 w-4" />Résultats</Link>
                  </Button>
                  {child.can_view_finance && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/parents/paiements?eleve=${child.id}`}>Paiements</Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={busy === child.id}
                    onClick={() => void remove(child.id, child.first_name + " " + child.last_name)}
                  >
                    <UserX className="mr-1.5 h-4 w-4" />{busy === child.id ? "Retrait…" : "Retirer"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <Dialog open={!!selectedChild} onOpenChange={(value) => !value && setSelectedChild(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedChild && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedChild.first_name} {selectedChild.last_name}</DialogTitle>
                <DialogDescription>Informations complémentaires et accès autorisés pour cet enfant.</DialogDescription>
              </DialogHeader>

              <div className="divide-y divide-slate-200 border-y border-slate-200">
                <DetailRow label="Matricule" value={selectedChild.student_number ?? "Non renseigné"} />
                <DetailRow label="Classe" value={selectedChild.class_name ?? "Non attribuée"} />
                <DetailRow label="Statut" value={selectedChild.active ? "Actif" : "Inactif"} />
                {selectedChild.phone && <DetailRow label="Téléphone" value={selectedChild.phone} icon={<Phone className="h-4 w-4" />} />}
                {selectedChild.email && <DetailRow label="E-mail" value={selectedChild.email} icon={<Mail className="h-4 w-4" />} />}
                <DetailRow label="Relation" value={selectedChild.relationship ?? "Non renseignée"} />
                <DetailRow label="Résultats et présences" value={selectedChild.can_view_academic ? "Autorisé" : "Limité"} />
                <DetailRow label="Scolarité et paiements" value={selectedChild.can_view_finance ? "Autorisé" : "Limité"} />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="outline" asChild>
                  <Link href={`/parents/notes?eleve=${selectedChild.id}`}>Voir les résultats</Link>
                </Button>
                {selectedChild.can_view_finance && (
                  <Button asChild>
                    <Link href={`/parents/paiements?eleve=${selectedChild.id}`}>Voir les paiements</Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LinkChildModal open={open} onOpenChange={setOpen} onSubmit={async (input) => { await claimChild(input) }} />
    </div>
  )
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-5 px-1 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="flex items-center gap-2 text-right text-sm font-medium text-slate-900">{icon}{value}</span>
    </div>
  )
}
