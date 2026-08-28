"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"

interface CreerEnseignantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const initialForm = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  matieres: "",
  classes: "",
  statut: "actif",
  dateNaissance: "",
  dateEmbauche: "",
}

export function CreerEnseignantModal({ isOpen, onClose, onSuccess }: CreerEnseignantModalProps) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (error) setError(null)
  }

  const reset = () => {
    setForm(initialForm)
    setError(null)
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleSubmit = () => {
    const required = [form.nom, form.prenom, form.email, form.dateNaissance, form.dateEmbauche]
    if (required.some((value) => !value.trim())) {
      setError("Veuillez renseigner tous les champs obligatoires.")
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Veuillez saisir une adresse e-mail valide.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const nouvelEnseignant: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse"> = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        matieres: form.matieres.split(",").map((item) => item.trim()).filter(Boolean),
        classes: form.classes.split(",").map((item) => item.trim()).filter(Boolean),
        statut: form.statut as DonneesEnseignant["statut"],
        dateNaissance: form.dateNaissance,
        dateEmbauche: form.dateEmbauche,
      }

      serviceEnseignants.ajouterEnseignant(nouvelEnseignant)
      onSuccess?.()
      onClose()
      reset()
    } catch {
      setError("Impossible de créer l'enseignant. Vérifiez les informations puis réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un enseignant</DialogTitle>
          <DialogDescription>
            Renseignez les informations professionnelles nécessaires à son dossier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Identité</h3>
              <p className="text-sm text-muted-foreground">Informations personnelles de l'enseignant.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" id="enseignant-nom" required value={form.nom} onChange={(value) => update("nom", value)} />
              <Field label="Prénom" id="enseignant-prenom" required value={form.prenom} onChange={(value) => update("prenom", value)} />
              <Field label="Date de naissance" id="enseignant-date-naissance" required type="date" value={form.dateNaissance} onChange={(value) => update("dateNaissance", value)} />
            </div>
          </section>

          <section className="space-y-4 border-t pt-5">
            <div>
              <h3 className="text-sm font-medium">Coordonnées</h3>
              <p className="text-sm text-muted-foreground">Moyens de contact professionnels.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail" id="enseignant-email" required type="email" value={form.email} onChange={(value) => update("email", value)} />
              <Field label="Téléphone" id="enseignant-telephone" value={form.telephone} onChange={(value) => update("telephone", value)} />
            </div>
          </section>

          <section className="space-y-4 border-t pt-5">
            <div>
              <h3 className="text-sm font-medium">Affectation</h3>
              <p className="text-sm text-muted-foreground">Matières et classes associées, séparées par des virgules.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Matières" id="enseignant-matieres" placeholder="Mathématiques, Physique" value={form.matieres} onChange={(value) => update("matieres", value)} />
              <Field label="Classes" id="enseignant-classes" placeholder="6e A, 5e B" value={form.classes} onChange={(value) => update("classes", value)} />
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(value) => update("statut", value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                    <SelectItem value="conge">En congé</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="Date d'embauche" id="enseignant-date-embauche" required type="date" value={form.dateEmbauche} onChange={(value) => update("dateEmbauche", value)} />
            </div>
          </section>
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Création…" : "Créer l'enseignant"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FieldProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}

function Field({ label, id, value, onChange, required, type = "text", placeholder }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
