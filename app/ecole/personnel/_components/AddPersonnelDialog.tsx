"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"
import { createStaff } from "@/lib/supabase/services/staff.service"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { RoleWithPermissions } from "@/hooks/useRoles"

interface AddPersonnelDialogProps {
  establishmentId: string
  roles: RoleWithPermissions[]
  onClose: () => void
  onSuccess: (temporaryPassword?: string) => void
}

const defaultForm = {
  prenom: "",
  nom: "",
  telephone: "",
  email: "",
  poste: "",
  dateEmbauche: new Date().toISOString().split("T")[0],
  statut: "actif" as "actif" | "inactif" | "conge",
  creerCompte: false,
  roleId: "",
}

export function AddPersonnelDialog({ establishmentId, roles, onClose, onSuccess }: AddPersonnelDialogProps) {
  const [form, setForm] = useState(defaultForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (partial: Partial<typeof form>) => setForm((f) => ({ ...f, ...partial }))

  const handleSubmit = async () => {
    setError(null)
    if (!form.prenom.trim() || !form.nom.trim() || !form.poste.trim()) {
      setError("Prénom, nom et poste sont obligatoires.")
      return
    }
    if (form.creerCompte && !form.email) {
      setError("L'email est obligatoire pour créer un compte.")
      return
    }
    if (form.creerCompte && !form.roleId) {
      setError("Sélectionnez un rôle d'accès pour créer le compte.")
      return
    }

    setIsSubmitting(true)
    try {
      const statusMap: Record<string, boolean> = { actif: true, inactif: false, conge: true }

      const newStaffId = await createStaff({
        establishmentId,
        firstName: form.prenom.trim(),
        lastName: form.nom.trim(),
        position: form.poste.trim(),
        phone: form.telephone || undefined,
        email: form.email || undefined,
        hireDate: form.dateEmbauche,
        active: statusMap[form.statut] ?? true,
      })

      let temporaryPassword: string | undefined

      if (form.creerCompte && form.email && form.roleId) {
        const { data, error: fnError } = await supabaseBrowser.functions.invoke("manage-school-user-account", {
          body: {
            action: "create_user",
            staff_id: newStaffId,
            email: form.email,
            first_name: form.prenom.trim(),
            last_name: form.nom.trim(),
            role_id: form.roleId,
            establishment_id: establishmentId,
          },
        })

        if (fnError) {
          // Le personnel est créé mais le compte a échoué
          onClose()
          onSuccess()
          // On laisse l'utilisateur gérer le compte depuis la fiche
          return
        }

        temporaryPassword = data?.temporary_password
      }

      onClose()
      onSuccess(temporaryPassword)
    } catch (e: any) {
      setError(e.message || "Impossible de créer le membre du personnel.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Ajouter un membre du personnel</DialogTitle>
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
                <Label htmlFor="add-prenom">Prénom *</Label>
                <Input
                  id="add-prenom"
                  value={form.prenom}
                  onChange={(e) => set({ prenom: e.target.value })}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-nom">Nom *</Label>
                <Input
                  id="add-nom"
                  value={form.nom}
                  onChange={(e) => set({ nom: e.target.value })}
                  placeholder="Dupont"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-telephone">Téléphone</Label>
                <Input
                  id="add-telephone"
                  value={form.telephone}
                  onChange={(e) => set({ telephone: e.target.value })}
                  placeholder="07 xx xx xx xx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="jean.dupont@ecole.cd"
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
                <Label htmlFor="add-poste">Poste *</Label>
                <Input
                  id="add-poste"
                  value={form.poste}
                  onChange={(e) => set({ poste: e.target.value })}
                  placeholder="Ex : Enseignant de mathématiques, Secrétaire…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-dateEmbauche">Date d'embauche</Label>
                <Input
                  id="add-dateEmbauche"
                  type="date"
                  value={form.dateEmbauche}
                  onChange={(e) => set({ dateEmbauche: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-statut">Statut</Label>
                <select
                  id="add-statut"
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

          {/* Accès à l'application */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Accès à l'application
            </h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.creerCompte}
                onChange={(e) => set({ creerCompte: e.target.checked })}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Créer un compte de connexion maintenant</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Un mot de passe temporaire sera généré. Vous pourrez aussi créer le compte plus tard depuis sa fiche.
                </p>
              </div>
            </label>

            {form.creerCompte && (
              <div className="space-y-1.5 ml-6">
                <Label htmlFor="add-roleId">Rôle d'accès *</Label>
                <select
                  id="add-roleId"
                  className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                  value={form.roleId}
                  onChange={(e) => set({ roleId: e.target.value })}
                >
                  <option value="">Sélectionner un rôle</option>
                  {roles.filter((r) => r.role.active).map((r) => (
                    <option key={r.role.id} value={r.role.id}>{r.role.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  Définit ce que l'utilisateur peut faire dans l'application (différent du poste).
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
