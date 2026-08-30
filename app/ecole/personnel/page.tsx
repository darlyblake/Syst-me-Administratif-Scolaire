"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Users, Plus, Edit, Trash2, Search, Clock, Calendar, FileText } from "lucide-react"
import Link from "next/link"
import { servicePointage } from "@/services/pointage.service"
import { serviceConges } from "@/services/conges.service"
import type { DonneesPersonnel } from "@/types/personnel"
import type { Pointage } from "@/services/pointage.service"
import type { DemandeConge } from "@/services/conges.service"
import { useUserContext } from "@/hooks/useUserContext"
import { useStaff } from "@/hooks/useStaff"
import { createStaff, updateStaff } from "@/lib/supabase/services/staff.service"

export default function PersonnelPage() {
  const { primaryEstablishment, estEnCoursDeChargement, utilisateur } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const { staff, total, totalPages, isLoading: isLoadingStaff, error: staffError, refresh, deactivate, isDeactivating } = useStaff(establishmentId, {
    page,
    pageSize: 25,
    search: searchTerm,
  })
  const [personnel, setPersonnel] = useState<DonneesPersonnel[]>([])
  const [pointages, setPointages] = useState<Pointage[]>([])
  const [conges, setConges] = useState<DemandeConge[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCongeModal, setShowCongeModal] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<DonneesPersonnel | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterPoste, setFilterPoste] = useState("")
  const [filterStatut, setFilterStatut] = useState("")
  const [nouveauPersonnel, setNouveauPersonnel] = useState({
    nom: "",
    prenom: "",
    poste: "",
    email: "",
    telephone: "",
    typeContrat: "cdi" as any,
    modeRemuneration: "fixe" as any,
    salaireFixe: 0,
    tauxHoraire: 0,
    heuresPrevues: 0,
    statut: "actif" as any,
    dateEmbauche: new Date().toISOString().split('T')[0]
  })
  const [nouvelleDemandeConge, setNouvelleDemandeConge] = useState({
    personnelId: "",
    type: "paye" as "paye" | "sans_solde" | "maladie" | "exceptionnel",
    dateDebut: "",
    dateFin: "",
    motif: ""
  })

  const supabasePersonnel = useMemo<DonneesPersonnel[]>(() => staff.map((member) => ({
    id: member.id,
    nom: member.last_name,
    prenom: member.first_name,
    poste: member.position || member.department || member.role,
    email: member.email || undefined,
    typeContrat: "cdi",
    modeRemuneration: "fixe",
    salaireFixe: member.salary ?? 0,
    telephone: member.phone || "",
    statut: member.status === "active"
      ? "actif"
      : member.status === "on_leave"
        ? "conge"
        : member.status === "inactive"
          ? "inactif"
          : "suspendu",
    dateEmbauche: member.hire_date || member.created_at || new Date().toISOString(),
    dateCreation: member.created_at || new Date().toISOString(),
    dateModification: member.updated_at || member.created_at || new Date().toISOString(),
  })), [staff])

  const personnelSource = supabasePersonnel

  useEffect(() => {
    setPersonnel(personnelSource)
    setPointages(servicePointage.obtenirTousLesPointages())
    setConges(serviceConges.obtenirToutesLesDemandes())
    setIsLoaded(!estEnCoursDeChargement && !isLoadingStaff)
  }, [estEnCoursDeChargement, isLoadingStaff, personnelSource])

  const handleAjouterPersonnel = async () => {
    if (!nouveauPersonnel.nom || !nouveauPersonnel.prenom || !nouveauPersonnel.poste) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    if (!establishmentId || !utilisateur?.id) {
      alert("Le contexte de l'établissement est indisponible.")
      return
    }

    try {
      await createStaff({
        establishmentId,
        profileId: utilisateur.id,
        firstName: nouveauPersonnel.prenom,
        lastName: nouveauPersonnel.nom,
        position: nouveauPersonnel.poste,
        phone: nouveauPersonnel.telephone,
        email: nouveauPersonnel.email,
        hireDate: nouveauPersonnel.dateEmbauche,
        active: nouveauPersonnel.statut === "actif",
      })
      refresh()
      setShowAddModal(false)
    } catch {
      alert("Impossible de créer le membre du personnel.")
      return
    }
    setNouveauPersonnel({
      nom: "",
      prenom: "",
      poste: "",
      email: "",
      telephone: "",
      typeContrat: "cdi",
      modeRemuneration: "fixe",
      salaireFixe: 0,
      tauxHoraire: 0,
      heuresPrevues: 0,
      statut: "actif",
      dateEmbauche: new Date().toISOString().split('T')[0]
    })
  }

  const handleModifierPersonnel = async () => {
    if (!editingPersonnel || !editingPersonnel.nom || !editingPersonnel.prenom || !editingPersonnel.poste) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      await updateStaff({
        staffId: editingPersonnel.id,
        firstName: editingPersonnel.prenom,
        lastName: editingPersonnel.nom,
        position: editingPersonnel.poste,
        phone: editingPersonnel.telephone,
        email: editingPersonnel.email,
        hireDate: editingPersonnel.dateEmbauche,
        active: editingPersonnel.statut === "actif",
      })
      refresh()
      setShowEditModal(false)
      setEditingPersonnel(null)
    } catch {
      alert("Impossible de modifier le membre du personnel.")
    }
  }

  const handleOuvrirEditModal = (person: DonneesPersonnel) => {
    setEditingPersonnel({ ...person })
    setShowEditModal(true)
  }

  const handleSupprimerPersonnel = async (id: string) => {
    if (!confirm("Désactiver ce membre du personnel ?\n\nIl ne sera plus considéré comme actif, mais son historique sera conservé.")) return

    const deactivated = await deactivate(id)
    if (deactivated) alert("Membre désactivé avec succès.")
  }

  const handlePointageArrivee = (personnelId: string) => {
    servicePointage.enregistrerArrivee(personnelId, selectedDate)
    setPointages(servicePointage.obtenirTousLesPointages())
  }

  const handlePointageDepart = (personnelId: string) => {
    servicePointage.enregistrerDepart(personnelId, selectedDate)
    setPointages(servicePointage.obtenirTousLesPointages())
  }

  const handlePointageAbsence = (personnelId: string) => {
    const motif = prompt("Motif de l'absence :")
    if (motif) {
      servicePointage.enregistrerAbsence(personnelId, selectedDate, motif)
      setPointages(servicePointage.obtenirTousLesPointages())
    }
  }

  const getPointageForPersonnel = (personnelId: string): Pointage | null => {
    return pointages.find(p => p.personnelId === personnelId && p.date === selectedDate) || null
  }

  const handleCreerDemandeConge = () => {
    if (!nouvelleDemandeConge.personnelId || !nouvelleDemandeConge.dateDebut || !nouvelleDemandeConge.dateFin || !nouvelleDemandeConge.motif) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    const jours = serviceConges.calculerJours(nouvelleDemandeConge.dateDebut, nouvelleDemandeConge.dateFin)
    
    if (serviceConges.verifierChevauchement(nouvelleDemandeConge.personnelId, nouvelleDemandeConge.dateDebut, nouvelleDemandeConge.dateFin)) {
      alert("Cette période chevauche avec un congé déjà validé")
      return
    }

    serviceConges.creerDemande({
      ...nouvelleDemandeConge,
      jours
    })

    setConges(serviceConges.obtenirToutesLesDemandes())
    setShowCongeModal(false)
    setNouvelleDemandeConge({
      personnelId: "",
      type: "paye",
      dateDebut: "",
      dateFin: "",
      motif: ""
    })
  }

  const handleValiderConge = (id: string) => {
    if (serviceConges.validerDemande(id, "Administration")) {
      setConges(serviceConges.obtenirToutesLesDemandes())
      alert("Demande de congé validée")
    }
  }

  const handleRefuserConge = (id: string) => {
    const commentaires = prompt("Motif du refus :")
    if (commentaires) {
      if (serviceConges.refuserDemande(id, "Administration", commentaires)) {
        setConges(serviceConges.obtenirToutesLesDemandes())
        alert("Demande de congé refusée")
      }
    }
  }

  const getCongesForPersonnel = (personnelId: string): DemandeConge[] => {
    return conges.filter(c => c.personnelId === personnelId)
  }

  const filteredPersonnel = personnel.filter(p => {
    const matchSearch = !searchTerm || 
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.poste.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchPoste = !filterPoste || filterPoste === "tous" || p.poste.toLowerCase().includes(filterPoste.toLowerCase())
    const matchStatut = !filterStatut || filterStatut === "tous" || p.statut === filterStatut
    
    return matchSearch && matchPoste && matchStatut
  })

  const postesUniques = useMemo(
    () => Array.from(new Set(personnel.map((person) => person.poste))),
    [personnel]
  )
  const statistiques = useMemo(() => ({
    totalPersonnel: personnel.length,
    parStatut: {
      actif: personnel.filter((person) => person.statut === "actif").length,
      inactif: personnel.filter((person) => person.statut === "inactif").length,
      suspendu: personnel.filter((person) => person.statut === "suspendu").length,
      conge: personnel.filter((person) => person.statut === "conge").length,
    },
    masseSalarialeTotale: personnel.reduce((total, person) => total + (person.salaireFixe || 0), 0),
  }), [personnel])

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-64">
            <p className={staffError ? "text-red-600" : "text-gray-600"}>
              {staffError || "Chargement..."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" size="sm" asChild>
                <Link href="/ecole/tableau-bord">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Gestion du Personnel
                </h1>
                <p className="text-gray-600">Administration et personnel technique</p>
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Total Personnel</p>
                  <p className="text-2xl font-bold">{statistiques.totalPersonnel}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Actifs</p>
                  <p className="text-2xl font-bold text-green-600">{statistiques.parStatut.actif}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">En Congé</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistiques.parStatut.conge}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Masse Salariale</p>
                  <p className="text-2xl font-bold">{statistiques.masseSalarialeTotale.toLocaleString()} FCFA</p>
                </CardContent>
              </Card>
            </div>

            {/* Filtres et recherche */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Rechercher par nom, prénom ou poste..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <select
                    className="border rounded px-3 py-2"
                    value={filterPoste}
                    onChange={(e) => setFilterPoste(e.target.value)}
                  >
                    <option value="">Tous les postes</option>
                    {postesUniques.map((poste) => (
                      <option key={poste} value={poste}>{poste}</option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                  >
                    <option value="">Tous les statuts</option>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="conge">En congé</option>
                  </select>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Liste du personnel */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Liste du Personnel</CardTitle>
                <CardDescription>{total} membre(s) trouvé(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredPersonnel.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucun membre du personnel trouvé</p>
                  ) : (
                    filteredPersonnel.map((person) => {
                      const pointage = getPointageForPersonnel(person.id)
                      const congesPersonnel = getCongesForPersonnel(person.id)
                      const soldeConge = serviceConges.calculerSoldeConge(person.id, new Date().getFullYear())
                      return (
                        <div key={person.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Users className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold">{person.prenom} {person.nom}</p>
                                  <p className="text-sm text-gray-600">{person.poste}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  person.statut === 'actif' ? 'bg-green-100 text-green-800' :
                                  person.statut === 'inactif' ? 'bg-gray-100 text-gray-800' :
                                  person.statut === 'conge' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {person.statut}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                  {person.typeContrat}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                                  Solde congé: {soldeConge} jours
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {person.modeRemuneration === "fixe" 
                                  ? `${person.salaireFixe?.toLocaleString()} FCFA/mois`
                                  : `${person.tauxHoraire?.toLocaleString()} FCFA/h`
                                }
                              </p>
                              <p className="text-xs text-gray-500">
                                Depuis {new Date(person.dateEmbauche).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {/* Pointage section */}
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <div className="flex gap-4">
                                <div className="text-sm">
                                  <span className="text-gray-600">Arrivée:</span>
                                  <span className="ml-2 font-medium">{pointage?.heureArrivee || '--:--'}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-600">Départ:</span>
                                  <span className="ml-2 font-medium">{pointage?.heureDepart || '--:--'}</span>
                                </div>
                                {pointage?.statut && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    pointage.statut === 'present' ? 'bg-green-100 text-green-800' :
                                    pointage.statut === 'absent' ? 'bg-red-100 text-red-800' :
                                    pointage.statut === 'retard' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {pointage.statut}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => { setNouvelleDemandeConge({ ...nouvelleDemandeConge, personnelId: person.id }); setShowCongeModal(true) }}>
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Congé
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleOuvrirEditModal(person)}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Modifier
                                </Button>
                                <Button variant="ghost" size="sm" disabled={isDeactivating} onClick={() => handleSupprimerPersonnel(person.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Congés section */}
                          {congesPersonnel.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium mb-2">Congés demandés:</p>
                              <div className="space-y-2">
                                {congesPersonnel.slice(-3).map((conge) => (
                                  <div key={conge.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                    <div>
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        conge.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                        conge.statut === 'valide' ? 'bg-green-100 text-green-800' :
                                        conge.statut === 'refuse' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                    {conge.statut}
                                  </span>
                                  <span className="ml-2">{conge.type} - {conge.jours} jours</span>
                                  <span className="text-gray-500 ml-2">
                                    {new Date(conge.dateDebut).toLocaleDateString()} - {new Date(conge.dateFin).toLocaleDateString()}
                                  </span>
                                </div>
                                {conge.statut === 'en_attente' && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleValiderConge(conge.id)}>
                                      ✓
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleRefuserConge(conge.id)}>
                                      ✗
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

            {/* Demandes de congé en attente */}
            <Card>
              <CardHeader>
                <CardTitle>Demandes de Congé en Attente</CardTitle>
                <CardDescription>{conges.filter(c => c.statut === 'en_attente').length} demande(s) en attente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conges.filter(c => c.statut === 'en_attente').length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucune demande en attente</p>
                  ) : (
                    conges.filter(c => c.statut === 'en_attente').map((conge) => {
                      const person = personnel.find(p => p.id === conge.personnelId)
                      return (
                        <div key={conge.id} className="border rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{person ? `${person.prenom} ${person.nom}` : 'Personnel inconnu'}</p>
                            <p className="text-sm text-gray-600">{conge.type} - {conge.jours} jours</p>
                            <p className="text-xs text-gray-500">
                              {new Date(conge.dateDebut).toLocaleDateString()} - {new Date(conge.dateFin).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Motif: {conge.motif}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleValiderConge(conge.id)}>
                              Valider
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleRefuserConge(conge.id)}>
                              Refuser
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Modal d'ajout de congé */}
            {showCongeModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-bold mb-4">Nouvelle Demande de Congé</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="personnel">Personnel *</Label>
                      <select
                        id="personnel"
                        className="w-full border rounded px-3 py-2"
                        value={nouvelleDemandeConge.personnelId}
                        onChange={(e) => setNouvelleDemandeConge({ ...nouvelleDemandeConge, personnelId: e.target.value })}
                      >
                        <option value="">Sélectionner</option>
                        {personnel.filter(p => p.statut === 'actif').map((person) => (
                          <option key={person.id} value={person.id}>{person.prenom} {person.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type de congé *</Label>
                      <select
                        id="type"
                        className="w-full border rounded px-3 py-2"
                        value={nouvelleDemandeConge.type}
                        onChange={(e) => setNouvelleDemandeConge({ ...nouvelleDemandeConge, type: e.target.value as any })}
                      >
                        <option value="paye">Payé</option>
                        <option value="sans_solde">Sans solde</option>
                        <option value="maladie">Maladie</option>
                        <option value="exceptionnel">Exceptionnel</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateDebut">Date de début *</Label>
                      <Input
                        id="dateDebut"
                        type="date"
                        value={nouvelleDemandeConge.dateDebut}
                        onChange={(e) => setNouvelleDemandeConge({ ...nouvelleDemandeConge, dateDebut: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateFin">Date de fin *</Label>
                      <Input
                        id="dateFin"
                        type="date"
                        value={nouvelleDemandeConge.dateFin}
                        onChange={(e) => setNouvelleDemandeConge({ ...nouvelleDemandeConge, dateFin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motif">Motif</Label>
                      <Input
                        id="motif"
                        value={nouvelleDemandeConge.motif}
                        onChange={(e) => setNouvelleDemandeConge({ ...nouvelleDemandeConge, motif: e.target.value })}
                        placeholder="Motif du congé"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleCreerDemandeConge} className="flex-1">
                      Créer
                    </Button>
                    <Button variant="outline" onClick={() => setShowCongeModal(false)} className="flex-1">
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal d'ajout */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold mb-4">Nouveau Membre du Personnel</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={nouveauPersonnel.nom}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, nom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom *</Label>
                      <Input
                        id="prenom"
                        value={nouveauPersonnel.prenom}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, prenom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poste">Poste *</Label>
                      <Input
                        id="poste"
                        value={nouveauPersonnel.poste}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, poste: e.target.value })}
                        placeholder="Ex: Secrétaire"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={nouveauPersonnel.email}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Téléphone</Label>
                      <Input
                        id="telephone"
                        value={nouveauPersonnel.telephone}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, telephone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="typeContrat">Type de contrat *</Label>
                      <select
                        id="typeContrat"
                        className="w-full border rounded px-3 py-2"
                        value={nouveauPersonnel.typeContrat}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, typeContrat: e.target.value as any })}
                      >
                        <option value="cdi">CDI</option>
                        <option value="cdd">CDD</option>
                        <option value="vacataire">Vacataire</option>
                        <option value="consultant">Consultant</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modeRemuneration">Mode de rémunération *</Label>
                      <select
                        id="modeRemuneration"
                        className="w-full border rounded px-3 py-2"
                        value={nouveauPersonnel.modeRemuneration}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, modeRemuneration: e.target.value as any })}
                      >
                        <option value="fixe">Fixe</option>
                        <option value="horaire">Horaire</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateEmbauche">Date d'embauche *</Label>
                      <Input
                        id="dateEmbauche"
                        type="date"
                        value={nouveauPersonnel.dateEmbauche}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, dateEmbauche: e.target.value })}
                      />
                    </div>
                    {nouveauPersonnel.modeRemuneration === "fixe" && (
                      <div className="space-y-2">
                        <Label htmlFor="salaireFixe">Salaire fixe (FCFA)</Label>
                        <Input
                          id="salaireFixe"
                          type="number"
                          value={nouveauPersonnel.salaireFixe}
                          onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, salaireFixe: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                    {nouveauPersonnel.modeRemuneration === "horaire" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="tauxHoraire">Taux horaire (FCFA)</Label>
                          <Input
                            id="tauxHoraire"
                            type="number"
                            value={nouveauPersonnel.tauxHoraire}
                            onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, tauxHoraire: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="heuresPrevues">Heures prévues</Label>
                          <Input
                            id="heuresPrevues"
                            type="number"
                            value={nouveauPersonnel.heuresPrevues}
                            onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, heuresPrevues: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="statut">Statut *</Label>
                      <select
                        id="statut"
                        className="w-full border rounded px-3 py-2"
                        value={nouveauPersonnel.statut}
                        onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, statut: e.target.value as any })}
                      >
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="conge">En congé</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleAjouterPersonnel} className="flex-1">
                      Ajouter
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de modification */}
            {showEditModal && editingPersonnel && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold mb-4">Modifier le Personnel</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-nom">Nom *</Label>
                      <Input
                        id="edit-nom"
                        value={editingPersonnel.nom}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, nom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-prenom">Prénom *</Label>
                      <Input
                        id="edit-prenom"
                        value={editingPersonnel.prenom}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, prenom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-poste">Poste *</Label>
                      <Input
                        id="edit-poste"
                        value={editingPersonnel.poste}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, poste: e.target.value })}
                        placeholder="Ex: Secrétaire"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingPersonnel.email}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-telephone">Téléphone</Label>
                      <Input
                        id="edit-telephone"
                        value={editingPersonnel.telephone}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, telephone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-typeContrat">Type de contrat *</Label>
                      <select
                        id="edit-typeContrat"
                        className="w-full border rounded px-3 py-2"
                        value={editingPersonnel.typeContrat}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, typeContrat: e.target.value as any })}
                      >
                        <option value="cdi">CDI</option>
                        <option value="cdd">CDD</option>
                        <option value="vacataire">Vacataire</option>
                        <option value="consultant">Consultant</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-modeRemuneration">Mode de rémunération *</Label>
                      <select
                        id="edit-modeRemuneration"
                        className="w-full border rounded px-3 py-2"
                        value={editingPersonnel.modeRemuneration}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, modeRemuneration: e.target.value as any })}
                      >
                        <option value="fixe">Fixe</option>
                        <option value="horaire">Horaire</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-dateEmbauche">Date d'embauche *</Label>
                      <Input
                        id="edit-dateEmbauche"
                        type="date"
                        value={editingPersonnel.dateEmbauche}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, dateEmbauche: e.target.value })}
                      />
                    </div>
                    {editingPersonnel.modeRemuneration === "fixe" && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-salaireFixe">Salaire fixe (FCFA)</Label>
                        <Input
                          id="edit-salaireFixe"
                          type="number"
                          value={editingPersonnel.salaireFixe}
                          onChange={(e) => setEditingPersonnel({ ...editingPersonnel, salaireFixe: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                    {editingPersonnel.modeRemuneration === "horaire" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="edit-tauxHoraire">Taux horaire (FCFA)</Label>
                          <Input
                            id="edit-tauxHoraire"
                            type="number"
                            value={editingPersonnel.tauxHoraire}
                            onChange={(e) => setEditingPersonnel({ ...editingPersonnel, tauxHoraire: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-heuresPrevues">Heures prévues</Label>
                          <Input
                            id="edit-heuresPrevues"
                            type="number"
                            value={editingPersonnel.heuresPrevues}
                            onChange={(e) => setEditingPersonnel({ ...editingPersonnel, heuresPrevues: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="edit-statut">Statut *</Label>
                      <select
                        id="edit-statut"
                        className="w-full border rounded px-3 py-2"
                        value={editingPersonnel.statut}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, statut: e.target.value as any })}
                      >
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="conge">En congé</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleModifierPersonnel} className="flex-1">
                      Modifier
                    </Button>
                    <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingPersonnel(null) }} className="flex-1">
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
