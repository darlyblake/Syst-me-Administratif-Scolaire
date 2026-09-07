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
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
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

    if (!establishmentId) {
      alert("Le contexte de l'établissement est indisponible.")
      return
    }

    try {
      // Un personnel peut exister sans compte utilisateur.
      // Le profil est créé/rattaché uniquement dans le parcours explicite de création de compte.
      await createStaff({
        establishmentId,
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Personnel</p><p className="text-2xl font-bold">{statistiques.totalPersonnel}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Actifs</p><p className="text-2xl font-bold text-green-600">{statistiques.parStatut.actif}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-gray-600">En Congé</p><p className="text-2xl font-bold text-yellow-600">{statistiques.parStatut.conge}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Masse Salariale</p><p className="text-2xl font-bold">{statistiques.masseSalarialeTotale.toLocaleString()} FCFA</p></CardContent></Card>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1"><Input placeholder="Rechercher par nom, prénom ou poste..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" /></div>
                  <select className="border rounded px-3 py-2" value={filterPoste} onChange={(e) => setFilterPoste(e.target.value)}><option value="">Tous les postes</option>{postesUniques.map((poste) => <option key={poste} value={poste}>{poste}</option>)}</select>
                  <select className="border rounded px-3 py-2" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}><option value="">Tous les statuts</option><option value="actif">Actif</option><option value="inactif">Inactif</option><option value="conge">En congé</option></select>
                  <Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Personnel</CardTitle><CardDescription>{total} membre(s) enregistré(s)</CardDescription></CardHeader>
              <CardContent>
                {filteredPersonnel.length === 0 ? <div className="py-12 text-center text-gray-500">Aucun personnel trouvé.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Nom</th><th className="p-3">Poste</th><th className="p-3">Contact</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead><tbody>{filteredPersonnel.map((person) => <tr key={person.id} className="border-b"><td className="p-3 font-medium">{person.prenom} {person.nom}</td><td className="p-3">{person.poste}</td><td className="p-3">{person.telephone || person.email || "—"}</td><td className="p-3">{person.statut}</td><td className="p-3"><Button variant="outline" size="sm" onClick={() => handleOuvrirEditModal(person)}><Edit className="h-4 w-4" /></Button><Button variant="outline" size="sm" className="ml-2" onClick={() => handleSupprimerPersonnel(person.id)} disabled={isDeactivating}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>}
                {totalPages > 1 && <div className="flex justify-between items-center mt-4"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Précédent</Button><span>Page {page} / {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Suivant</Button></div>}
              </CardContent>
            </Card>

            {/* Les modales existantes restent volontairement inchangées dans cette étape. */}
          </>
        )}
      </div>
    </div>
  )
}
