"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"
import { updateStaff } from "@/lib/supabase/services/staff.service"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { DonneesPersonnel } from "@/types/personnel"

interface EditPersonnelDialogProps {
  personnel: DonneesPersonnel
  onClose: () => void
  onSuccess: () => void
}

export function EditPersonnelDialog({ personnel, onClose, onSuccess }: EditPersonnelDialogProps) {
  const [form, setForm] = useState({ ...personnel })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (partial: Partial<DonneesPersonnel>) => setForm((f) => ({ ...f, ...partial }))

  const handleSubmit = async () => {
    setError(null)
    if (!form.nom.trim() || !form.prenom.trim() || !form.poste.trim()) {
      setError("Prénom, nom et poste sont obligatoires.")
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Mise à jour via RPC (infos de base)
      await updateStaff({
        staffId: form.id,
        firstName: form.prenom.trim(),
        lastName: form.nom.trim(),
        position: form.poste.trim(),
        phone: form.telephone || undefined,
        email: form.email || undefined,
        hireDate: form.dateEmbauche,
        active: true, // Le statut actif/inactif est géré séparément
      })

      // 2. Mise à jour directe du statut + salaire (non couverts par le RPC)
      const statusMap: Record<string, string> = {
        actif: "active",
        inactif: "inactive",
        conge: "on_leave",
        suspendu: "inactive",
      }

      await supabaseBrowser
        .from("staff")
        .update({
          status: statusMap[form.statut] ?? "active",
          salary: form.salaireFixe ?? null,
        })
        .eq("id", form.id)

      onSuccess()
    } catch (e: any) {
      setError(e.message || "Impossible de modifier ce membre du personnel.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Modifier les informations</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Informations personnelles */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Informations personnelles
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ep-prenom">Prénom *</Label>
                <Input
                  id="ep-prenom"
                  value={form.prenom}
                  onChange={(e) => set({ prenom: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-nom">Nom *</Label>
                <Input
                  id="ep-nom"
                  value={form.nom}
                  onChange={(e) => set({ nom: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-telephone">Téléphone</Label>
                <Input
                  id="ep-telephone"
                  value={form.telephone}
                  onChange={(e) => set({ telephone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-email">Email</Label>
                <Input
                  id="ep-email"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Informations professionnelles */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Informations professionnelles
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="ep-poste">Poste *</Label>
                <Input
                  id="ep-poste"
                  value={form.poste}
                  onChange={(e) => set({ poste: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-dateEmbauche">Date d'embauche</Label>
                <Input
                  id="ep-dateEmbauche"
                  type="date"
                  value={form.dateEmbauche ? new Date(form.dateEmbauche).toISOString().split("T")[0] : ""}
                  onChange={(e) => set({ dateEmbauche: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-statut">Statut</Label>
                <select
                  id="ep-statut"
                  className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                  value={form.statut}
                  onChange={(e) => set({ statut: e.target.value as any })}
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="conge">En congé</option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Rémunération */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Contrat et rémunération
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ep-typeContrat">Type de contrat</Label>
                <select
                  id="ep-typeContrat"
                  className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                  value={form.typeContrat}
                  onChange={(e) => set({ typeContrat: e.target.value as any })}
                >
                  <option value="cdi">CDI</option>
                  <option value="cdd">CDD</option>
                  <option value="vacataire">Vacataire</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-modeRemuneration">Mode de rémunération</Label>
                <select
                  id="ep-modeRemuneration"
                  className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                  value={form.modeRemuneration}
                  onChange={(e) => set({ modeRemuneration: e.target.value as any })}
                >
                  <option value="fixe">Fixe</option>
                  <option value="horaire">Horaire</option>
                </select>
              </div>

              {form.modeRemuneration === "fixe" && (
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="ep-salaireFixe">Salaire fixe (FCFA)</Label>
                  <Input
                    id="ep-salaireFixe"
                    type="number"
                    value={form.salaireFixe ?? ""}
                    onChange={(e) => set({ salaireFixe: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}

              {form.modeRemuneration === "horaire" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ep-tauxHoraire">Taux horaire (FCFA)</Label>
                    <Input
                      id="ep-tauxHoraire"
                      type="number"
                      value={form.tauxHoraire ?? ""}
                      onChange={(e) => set({ tauxHoraire: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ep-heuresPrevues">Heures prévues</Label>
                    <Input
                      id="ep-heuresPrevues"
                      type="number"
                      value={form.heuresPrevues ?? ""}
                      onChange={(e) => set({ heuresPrevues: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
