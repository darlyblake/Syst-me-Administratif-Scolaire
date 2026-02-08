"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DonneesEleve, DonneesEnseignant, Classe } from "@/types/models"

interface NotificationSearchFiltersProps {
  eleves: DonneesEleve[]
  enseignants: DonneesEnseignant[]
  classes: Classe[]
  onEleveSearchChange: (value: string) => void
  onEnseignantSearchChange: (value: string) => void
  onMatiereFilterChange: (value: string) => void
  onClasseFilterChange: (value: string) => void
  filtreClasseEleve: string
  filtreMatiere: string
  rechercheEleve: string
  rechercheEnseignant: string
}

export function NotificationSearchFilters({
  eleves,
  enseignants,
  classes,
  onEleveSearchChange,
  onEnseignantSearchChange,
  onMatiereFilterChange,
  onClasseFilterChange,
  filtreClasseEleve,
  filtreMatiere,
  rechercheEleve,
  rechercheEnseignant,
}: NotificationSearchFiltersProps) {
  // Extract unique matieres from enseignants
  const matieres = Array.from(
    new Set(
      enseignants.flatMap((enseignant) => enseignant.matieres)
    )
  )

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      {/* Recherche élève */}
      <div>
        <Label htmlFor="recherche-eleve">Rechercher un élève</Label>
        <Input
          id="recherche-eleve"
          type="search"
          placeholder="Nom ou prénom"
          value={rechercheEleve}
          onChange={(e) => onEleveSearchChange(e.target.value)}
        />
      </div>

      {/* Filtre classe élève */}
      <div>
        <Label htmlFor="filtre-classe-eleve">Filtrer par classe</Label>
        <Select
          value={filtreClasseEleve}
          onValueChange={onClasseFilterChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {classes.map((classe) => (
              <SelectItem key={classe.id} value={classe.id}>
                {classe.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recherche enseignant */}
      <div>
        <Label htmlFor="recherche-enseignant">Rechercher un enseignant</Label>
        <Input
          id="recherche-enseignant"
          type="search"
          placeholder="Nom ou prénom"
          value={rechercheEnseignant}
          onChange={(e) => onEnseignantSearchChange(e.target.value)}
        />
      </div>

      {/* Filtre matière enseignant */}
      <div>
        <Label htmlFor="filtre-matiere">Filtrer par matière</Label>
        <Select
          value={filtreMatiere}
          onValueChange={onMatiereFilterChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les matières" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les matières</SelectItem>
            {matieres.map((matiere) => (
              <SelectItem key={matiere} value={matiere}>
                {matiere}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
