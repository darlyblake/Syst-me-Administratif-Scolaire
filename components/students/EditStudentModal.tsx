"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Save } from "lucide-react"
import type { DonneesEleve } from "@/types/models"
import { toast } from "sonner"

interface EditStudentModalProps {
  student: DonneesEleve
  onClose: () => void
  onSave: (data: any) => Promise<boolean>
}

export default function EditStudentModal({
  student,
  onClose,
  onSave,
}: EditStudentModalProps) {
  const [formData, setFormData] = useState({
    nom: student.nom || "",
    prenom: student.prenom || "",
    identifiant: student.identifiant || "",
    dateNaissance: student.dateNaissance || "",
    sexe: student.sexe || "",
    telephone: student.informationsContact?.telephone || student.contactParent || "",
    email: student.informationsContact?.email || "",
  })
  
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    const success = await onSave({
      studentId: student.id,
      firstName: formData.prenom,
      lastName: formData.nom,
      studentNumber: formData.identifiant,
      birthDate: formData.dateNaissance,
      sex: formData.sexe,
      phone: formData.telephone,
      email: formData.email,
      active: student.statut === "actif",
    })
    
    setIsSaving(false)
    if (success) {
      toast.success("Élève modifié avec succès")
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-[60] w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Modifier l'élève
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Nom</label>
              <Input
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Prénom</label>
              <Input
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                required
                className="h-9 text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Matricule</label>
              <Input
                name="identifiant"
                value={formData.identifiant}
                onChange={handleChange}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Sexe</label>
              <select
                name="sexe"
                value={formData.sexe}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Non spécifié</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Date de naissance</label>
              <Input
                type="date"
                name="dateNaissance"
                value={formData.dateNaissance}
                onChange={handleChange}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Téléphone (Parent)</label>
              <Input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="h-9"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 bg-[#1e3a8a] text-white hover:bg-[#00236f]"
            >
              {isSaving ? (
                "Enregistrement..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
