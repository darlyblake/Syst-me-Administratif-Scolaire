"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"

interface CreerEnseignantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreerEnseignantModal({ isOpen, onClose, onSuccess }: CreerEnseignantModalProps) {
  const [nom, setNom] = useState("")
  const [prenom, setPrenom] = useState("")
  const [email, setEmail] = useState("")
  const [telephone, setTelephone] = useState("")
  const [matieres, setMatieres] = useState("")
  const [classes, setClasses] = useState("")
  const [statut, setStatut] = useState("actif")
  const [dateNaissance, setDateNaissance] = useState("")
  const [dateEmbauche, setDateEmbauche] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    if (!nom || !prenom || !email || !dateNaissance || !dateEmbauche) {
      alert("Veuillez remplir tous les champs obligatoires.")
      return
    }

    setLoading(true)
    try {
      const nouvelEnseignant: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse"> = {
        nom,
        prenom,
        email,
        telephone,
        matieres: matieres.split(",").map(m => m.trim()).filter(m => m.length > 0),
        classes: classes.split(",").map(c => c.trim()).filter(c => c.length > 0),
        statut: statut as DonneesEnseignant["statut"],
        dateNaissance,
        dateEmbauche,
      }
      serviceEnseignants.ajouterEnseignant(nouvelEnseignant)
      onSuccess?.()
      onClose()
      // Reset form
      setNom("")
      setPrenom("")
      setEmail("")
      setTelephone("")
      setMatieres("")
      setClasses("")
      setStatut("actif")
      setDateNaissance("")
      setDateEmbauche("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel enseignant</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="prenom">Prénom *</Label>
            <Input id="prenom" value={prenom} onChange={e => setPrenom(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" value={telephone} onChange={e => setTelephone(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="matieres">Matières (séparées par des virgules)</Label>
            <Input id="matieres" value={matieres} onChange={e => setMatieres(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="classes">Classes (séparées par des virgules)</Label>
            <Input id="classes" value={classes} onChange={e => setClasses(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="statut">Statut</Label>
            <select
              id="statut"
              value={statut}
              onChange={e => setStatut(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="conge">En congé</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="dateNaissance">Date de naissance *</Label>
            <Input id="dateNaissance" type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="dateEmbauche">Date d'embauche *</Label>
            <Input id="dateEmbauche" type="date" value={dateEmbauche} onChange={e => setDateEmbauche(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
