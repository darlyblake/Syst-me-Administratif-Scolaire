"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Plus, Edit, Trash2, Clock, MapPin, Users } from "lucide-react"
import Link from "next/link"
import { serviceEvenements } from "@/services/evenements.service"
import { serviceClasses } from "@/services/classes.service"
import type { Evenement } from "@/services/evenements.service"
import type { Classe } from "@/types/models"

const TYPES_EVENEMENT = [
  { value: "reunion", label: "Réunion" },
  { value: "examen", label: "Examen" },
  { value: "fete", label: "Fête" },
  { value: "conference", label: "Conférence" },
  { value: "sport", label: "Sport" },
  { value: "autre", label: "Autre" }
] as const

const STATUT_EVENEMENT = [
  { value: "planifie", label: "Planifié" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" }
] as const

export default function EvenementsPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState("tous")
  const [filterStatut, setFilterStatut] = useState("tous")
  const [nouvelEvenement, setNouvelEvenement] = useState({
    titre: "",
    description: "",
    type: "reunion" as Evenement["type"],
    date: "",
    heureDebut: "",
    heureFin: "",
    lieu: "",
    classeId: "all",
    statut: "planifie" as Evenement["statut"]
  })

  useEffect(() => {
    setEvenements(serviceEvenements.obtenirTousLesEvenements())
    setClasses(serviceClasses.obtenirToutesLesClasses())
  }, [])

  const handleAjouterEvenement = () => {
    if (!nouvelEvenement.titre || !nouvelEvenement.date) {
      alert("Veuillez remplir le titre et la date")
      return
    }

    serviceEvenements.creerEvenement(nouvelEvenement)
    setEvenements(serviceEvenements.obtenirTousLesEvenements())
    setShowAddModal(false)
    setNouvelEvenement({
      titre: "",
      description: "",
      type: "reunion",
      date: "",
      heureDebut: "",
      heureFin: "",
      lieu: "",
      classeId: "all",
      statut: "planifie"
    })
  }

  const handleSupprimerEvenement = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
      serviceEvenements.supprimerEvenement(id)
      setEvenements(serviceEvenements.obtenirTousLesEvenements())
    }
  }

  const handleMettreAJourStatut = (id: string, statut: Evenement["statut"]) => {
    serviceEvenements.mettreAJourStatut(id, statut)
    setEvenements(serviceEvenements.obtenirTousLesEvenements())
  }

  const filteredEvenements = evenements.filter(e => {
    const matchType = filterType === "tous" || e.type === filterType
    const matchStatut = filterStatut === "tous" || e.statut === filterStatut
    return matchType && matchStatut
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const statistiques = serviceEvenements.obtenirStatistiques()
  const evenementsAVenir = serviceEvenements.obtenirEvenementsAVenir()

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#d9dce5] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748b]">Vie scolaire</p>
            <h1 className="text-2xl font-semibold text-[#131b2e]">Événements scolaires</h1>
            <p className="mt-1 text-sm text-[#64748b]">Planification et suivi des événements et activités de l'établissement.</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-[#1e3a8a] text-white hover:bg-[#172f70]">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel événement
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-2 border-y border-[#d9dce5] bg-white md:grid-cols-4">
          {[
            ["Total", statistiques.total],
            ["À venir", statistiques.aVenir],
            ["En cours", statistiques.enCours],
            ["Terminés", statistiques.termines],
          ].map(([label, value], index) => (
            <div key={String(label)} className={`px-4 py-4 ${index > 0 ? "border-l border-[#d9dce5]" : ""}`}>
              <p className="text-xs font-medium text-[#64748b]">{label}</p>
              <p className="mt-1 text-xl font-semibold text-[#131b2e]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-col gap-3 border-y border-[#d9dce5] bg-white p-3 md:flex-row md:items-center">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full border-[#c5c5d3] bg-white md:w-56">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              {TYPES_EVENEMENT.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-full border-[#c5c5d3] bg-white md:w-56">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {STATUT_EVENEMENT.map((statut) => <SelectItem key={statut.value} value={statut.value}>{statut.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-[#64748b]">{filteredEvenements.length} événement(s)</div>
        </div>

        {evenementsAVenir.length > 0 && (
          <section className="mb-6 border border-[#d9dce5] bg-white">
            <div className="border-b border-[#d9dce5] px-5 py-4">
              <h2 className="text-base font-semibold text-[#131b2e]">Prochains événements</h2>
              <p className="mt-1 text-sm text-[#64748b]">Les {Math.min(5, evenementsAVenir.length)} prochains événements.</p>
            </div>
            <div className="divide-y divide-[#e5e7eb]">
              {evenementsAVenir.slice(0, 5).map((evenement) => (
                <div key={evenement.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="min-w-14 border-r border-[#d9dce5] pr-4 text-center">
                      <p className="text-xs font-semibold uppercase text-[#64748b]">{new Date(evenement.date).toLocaleDateString("fr-FR", { month: "short" })}</p>
                      <p className="text-xl font-semibold text-[#131b2e]">{new Date(evenement.date).getDate()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-[#131b2e]">{evenement.titre}</p>
                      <p className="mt-1 text-sm text-[#64748b]">{TYPES_EVENEMENT.find(t => t.value === evenement.type)?.label}</p>
                    </div>
                  </div>
                  <div className="text-sm text-[#64748b] md:text-right">
                    {evenement.heureDebut && <p><Clock className="mr-1 inline h-4 w-4" />{evenement.heureDebut}{evenement.heureFin && ` - ${evenement.heureFin}`}</p>}
                    {evenement.lieu && <p className="mt-1"><MapPin className="mr-1 inline h-4 w-4" />{evenement.lieu}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="border border-[#d9dce5] bg-white">
          <div className="border-b border-[#d9dce5] px-5 py-4">
            <h2 className="text-base font-semibold text-[#131b2e]">Tous les événements</h2>
            <p className="mt-1 text-sm text-[#64748b]">Liste des événements enregistrés.</p>
          </div>
          {filteredEvenements.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#64748b]">Aucun événement trouvé.</div>
          ) : (
            <div className="divide-y divide-[#e5e7eb]">
              {filteredEvenements.map((evenement) => (
                <div key={evenement.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="min-w-14 border-r border-[#d9dce5] pr-4 text-center">
                      <p className="text-xs font-semibold uppercase text-[#64748b]">{new Date(evenement.date).toLocaleDateString("fr-FR", { month: "short" })}</p>
                      <p className="text-xl font-semibold text-[#131b2e]">{new Date(evenement.date).getDate()}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#131b2e]">{evenement.titre}</p>
                      {evenement.description && <p className="mt-1 text-sm text-[#64748b]">{evenement.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="border border-[#c5c5d3] px-2 py-1 text-[#515f74]">{STATUT_EVENEMENT.find(s => s.value === evenement.statut)?.label}</span>
                        <span className="border border-[#c5c5d3] bg-[#f2f3ff] px-2 py-1 text-[#515f74]">{TYPES_EVENEMENT.find(t => t.value === evenement.type)?.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-[#64748b] lg:min-w-64 lg:items-end">
                    {evenement.heureDebut && <span><Clock className="mr-1 inline h-4 w-4" />{evenement.heureDebut}{evenement.heureFin && ` - ${evenement.heureFin}`}</span>}
                    {evenement.lieu && <span><MapPin className="mr-1 inline h-4 w-4" />{evenement.lieu}</span>}
                    {evenement.classeId && <span><Users className="mr-1 inline h-4 w-4" />{classes.find(c => c.id === evenement.classeId)?.nom || "Classe inconnue"}</span>}
                    <div className="mt-1 flex gap-2">
                      <Button variant="outline" size="sm" className="border-[#c5c5d3]" onClick={() => handleMettreAJourStatut(evenement.id, evenement.statut === "planifie" ? "en_cours" : evenement.statut === "en_cours" ? "termine" : evenement.statut)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Statut
                      </Button>
                      <Button variant="outline" size="sm" className="border-[#c5c5d3] text-red-700 hover:bg-red-50" onClick={() => handleSupprimerEvenement(evenement.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#c5c5d3] bg-white shadow-xl">
              <div className="border-b border-[#d9dce5] px-5 py-4">
                <h3 className="text-lg font-semibold text-[#131b2e]">Nouvel événement</h3>
                <p className="mt-1 text-sm text-[#64748b]">Renseignez les informations de l'activité scolaire.</p>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label htmlFor="titre">Titre *</Label><Input id="titre" value={nouvelEvenement.titre} onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, titre: e.target.value })} placeholder="Ex. Réunion parents-professeurs" className="border-[#c5c5d3] bg-white" /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="description">Description</Label><Input id="description" value={nouvelEvenement.description} onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, description: e.target.value })} className="border-[#c5c5d3] bg-white" /></div>
                <div className="space-y-2"><Label htmlFor="type">Type *</Label><Select value={nouvelEvenement.type} onValueChange={(value) => setNouvelEvenement({ ...nouvelEvenement, type: value as any })}><SelectTrigger className="border-[#c5c5d3] bg-white"><SelectValue /></SelectTrigger><SelectContent>{TYPES_EVENEMENT.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="date">Date *</Label><Input id="date" type="date" value={nouvelEvenement.date} onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, date: e.target.value })} className="border-[#c5c5d3] bg-white" /></div>
                <div className="space-y-2"><Label htmlFor="heureDebut">Heure début</Label><Input id="heureDebut" type="time" value={nouvelEvenement.heureDebut} onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, heureDebut: e.target.value })} className="border-[#c5c5d3] bg-white" /></div>
                <div className="space-y-2"><Label htmlFor="heureFin">Heure fin</Label><Input id="heureFin" type="time" value={nouvelEvenement.heureFin} onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, heureFin: e.target.value })} className="border-[#c5c5d3] bg-white" /></div>
                <div className="space-y-2"><Label htmlFor="lieu">Lieu</Label><Input id="lieu" value={nouvelEvenement.lieu} onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, lieu: e.target.value })} placeholder="Ex. Salle de réunion" className="border-[#c5c5d3] bg-white" /></div>
                <div className="space-y-2"><Label htmlFor="classe">Classe</Label><Select value={nouvelEvenement.classeId} onValueChange={(value) => setNouvelEvenement({ ...nouvelEvenement, classeId: value === "all" ? "" : value })}><SelectTrigger className="border-[#c5c5d3] bg-white"><SelectValue placeholder="Toutes les classes" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les classes</SelectItem>{classes.map((classe) => <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#d9dce5] px-5 py-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-[#c5c5d3]">Annuler</Button>
                <Button onClick={handleAjouterEvenement} className="bg-[#1e3a8a] text-white hover:bg-[#172f70]">Ajouter l'événement</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

}
