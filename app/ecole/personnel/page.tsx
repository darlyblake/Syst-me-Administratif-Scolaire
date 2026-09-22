"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Users, Plus, Edit, Trash2, Search, Clock, Calendar, FileText, Shield, UserCheck, UserX, UserPlus, User, Key, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { servicePointage } from "@/services/pointage.service"
import { serviceConges } from "@/services/conges.service"
import type { DonneesPersonnel } from "@/types/personnel"
import type { Pointage } from "@/services/pointage.service"
import type { DemandeConge } from "@/services/conges.service"
import { useUserContext } from "@/hooks/useUserContext"
import { useStaff } from "@/hooks/useStaff"
import { createStaff, updateStaff, manageStaffAccount, getEstablishmentMemberId } from "@/lib/supabase/services/staff.service"
import { useRoles } from "@/hooks/useRoles"
import { supabaseBrowser } from "@/lib/supabase/client"

export default function PersonnelPage() {
  const { primaryEstablishment, estEnCoursDeChargement, utilisateur } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])
  const [page, setPage] = useState(1)
  const { staff, total, totalPages, isLoading: isLoadingStaff, error: staffError, refresh, deactivate, isDeactivating } = useStaff(establishmentId, {
    page,
    pageSize: 25,
    search: searchTerm,
  })
  const { roles } = useRoles(establishmentId)
  const [personnel, setPersonnel] = useState<DonneesPersonnel[]>([])
  const [pointages, setPointages] = useState<Pointage[]>([])
  const [conges, setConges] = useState<DemandeConge[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCompteModal, setShowCompteModal] = useState(false)
  const [showCongeModal, setShowCongeModal] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<DonneesPersonnel | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterPoste, setFilterPoste] = useState("")
  const [filterStatut, setFilterStatut] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nouveauPersonnel, setNouveauPersonnel] = useState({
    nom: "",
    prenom: "",
    poste: "",
    email: "",
    telephone: "",
    roleId: "",
    typeContrat: "cdi" as any,
    modeRemuneration: "fixe" as any,
    salaireFixe: 0,
    tauxHoraire: 0,
    heuresPrevues: 0,
    statut: "actif" as any,
    dateEmbauche: new Date().toISOString().split('T')[0],
    creerCompte: false
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
    roleId: member.role_id || undefined,
    accountId: member.account_id || undefined,
    accountStatus: member.account_status || undefined,
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!nouveauPersonnel.nom || !nouveauPersonnel.prenom || !nouveauPersonnel.poste) {
      alert("Veuillez remplir tous les champs obligatoires")
      setIsSubmitting(false)
      return
    }

    if (!establishmentId || !utilisateur?.id) {
      alert("Le contexte de l'établissement est indisponible.")
      setIsSubmitting(false)
      return
    }

    try {
      const newStaffId = await createStaff({
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

      if (nouveauPersonnel.creerCompte && nouveauPersonnel.roleId && nouveauPersonnel.email) {
        await supabaseBrowser.functions.invoke('manage-school-user-account', {
          body: {
            action: 'create_user',
            staff_id: newStaffId,
            email: nouveauPersonnel.email,
            first_name: nouveauPersonnel.prenom,
            last_name: nouveauPersonnel.nom,
            role_id: nouveauPersonnel.roleId,
            establishment_id: establishmentId,
          }
        }).then(({ error }) => { 
          if (error) {
            console.error("Erreur création compte:", error);
            alert("Le personnel a été créé mais la création du compte a échoué. Vous pourrez réessayer depuis sa fiche.");
          }
        })
      }

      refresh()
      setShowAddModal(false)
    } catch {
      alert("Impossible de créer le membre du personnel.")
      setIsSubmitting(false)
      return
    }
    setNouveauPersonnel({
      nom: "",
      prenom: "",
      poste: "",
      email: "",
      telephone: "",
      roleId: "",
      typeContrat: "cdi",
      modeRemuneration: "fixe",
      salaireFixe: 0,
      tauxHoraire: 0,
      heuresPrevues: 0,
      statut: "actif",
      dateEmbauche: new Date().toISOString().split('T')[0],
      creerCompte: false
    })
    setIsSubmitting(false)
  }

  const handleModifierPersonnel = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!editingPersonnel || !editingPersonnel.nom || !editingPersonnel.prenom || !editingPersonnel.poste) {
      alert("Veuillez remplir tous les champs obligatoires")
      setIsSubmitting(false)
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
    } finally {
      setIsSubmitting(false)
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

  const handleGererCompte = async (action: 'create_user' | 'reset_password' | 'disable_user' | 'enable_user') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!editingPersonnel || !establishmentId) { setIsSubmitting(false); return; }

    let email: string | undefined = editingPersonnel.email
    if (action === 'create_user' && !email) {
      const prompted = prompt("Veuillez saisir l'adresse email pour créer le compte :")
      if (!prompted) { setIsSubmitting(false); return; }
      email = prompted
    }
    if (action === 'disable_user') {
      if (!confirm(`Désactiver le compte de ${editingPersonnel.prenom} ${editingPersonnel.nom} ?\n\nIl ne pourra plus accéder à l'établissement jusqu'à sa réactivation.`)) {
        setIsSubmitting(false);
        return;
      }
    }

    try {
      let memberId: string | null = null

      if (action !== 'create_user') {
        if (!editingPersonnel.accountId) {
          alert("Ce membre n'a pas encore de compte utilisateur associé.")
          setIsSubmitting(false); return;
        }
        memberId = await getEstablishmentMemberId(editingPersonnel.accountId, establishmentId)
        if (!memberId) {
          alert("Impossible de trouver le lien membre dans la base de données.")
          setIsSubmitting(false); return;
        }
      }

      if (action === 'create_user') {
        const { data, error } = await supabaseBrowser.functions.invoke('manage-school-user-account', {
          body: {
            action: 'create_user',
            staff_id: editingPersonnel.id,
            email,
            first_name: editingPersonnel.prenom,
            last_name: editingPersonnel.nom,
            role_id: editingPersonnel.roleId,
            establishment_id: establishmentId,
          }
        })
        if (error) throw error
        if (data?.temporary_password) {
          setTemporaryPassword(data.temporary_password)
        } else {
          alert("Compte créé avec succès.")
        }
      } else {
        const responseData = await manageStaffAccount(
          memberId!,
          action,
          {
            email,
            firstName: editingPersonnel.prenom,
            lastName: editingPersonnel.nom,
            roleId: editingPersonnel.roleId,
            establishmentId
          }
        )
        if (action === 'reset_password' && responseData?.temporary_password) {
          setTemporaryPassword(responseData.temporary_password)
        } else {
          alert("Action effectuée avec succès.")
        }
      }
      refresh()
    } catch (e: any) {
      console.error(e)
      let msg = e.message || "Erreur inconnue"
      if (msg.includes('member_not_found')) msg = "Ce membre est introuvable."
      else if (msg.includes('user_not_found')) msg = "L'utilisateur associé à ce compte est introuvable."
      else if (msg.includes('email_exists')) msg = "Cette adresse email est déjà utilisée par un autre compte."
      alert("Erreur : " + msg)
    } finally {
      setIsSubmitting(false);
    }
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
    const searchLower = debouncedSearch.toLowerCase()
    const fullSearch = `${p.prenom} ${p.nom} ${p.poste} ${p.telephone || ''} ${p.email || ''}`.toLowerCase()
    const matchSearch = !debouncedSearch || fullSearch.includes(searchLower)
    
    let matchFiltre = true
    if (filterStatut === "actifs") matchFiltre = p.statut === "actif"
    else if (filterStatut === "inactifs") matchFiltre = p.statut === "inactif"
    else if (filterStatut === "avec_compte") matchFiltre = !!p.accountStatus
    else if (filterStatut === "sans_compte") matchFiltre = !p.accountStatus

    return matchSearch && matchFiltre
  })

  const postesUniques = useMemo(
    () => Array.from(new Set(personnel.map((person) => person.poste))),
    [personnel]
  )
  const statistiques = useMemo(() => ({
    totalPersonnel: personnel.length,
    actifs: personnel.filter((person) => person.statut === "actif").length,
    comptesActifs: personnel.filter((person) => person.accountStatus === "active").length,
    sansCompte: personnel.filter((person) => !person.accountStatus).length,
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Personnel</h1>
                <p className="text-gray-500 text-sm">Gérez les membres du personnel de votre établissement et leurs accès à l'application.</p>
              </div>
              <Button onClick={() => setShowAddModal(true)} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un personnel
              </Button>
            </div>

            {/* Statistiques simples */}
            <div className="flex flex-wrap gap-6 mb-6 px-4 py-3 bg-white border border-gray-200 rounded-md shadow-sm text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500 font-medium">Total du personnel</span>
                <span className="text-xl font-bold text-gray-900">{statistiques.totalPersonnel}</span>
              </div>
              <div className="w-px bg-gray-200 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 font-medium">Personnel actif</span>
                <span className="text-xl font-bold text-gray-900">{statistiques.actifs}</span>
              </div>
              <div className="w-px bg-gray-200 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 font-medium">Comptes actifs</span>
                <span className="text-xl font-bold text-green-600">{statistiques.comptesActifs}</span>
              </div>
              <div className="w-px bg-gray-200 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 font-medium">Sans compte</span>
                <span className="text-xl font-bold text-amber-600">{statistiques.sansCompte}</span>
              </div>
            </div>

            {/* Filtres et recherche */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un nom, un poste ou un numéro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white w-full"
                />
              </div>
              <div className="flex bg-gray-100 p-1 rounded-md overflow-x-auto hide-scrollbar">
                {[
                  { id: 'tous', label: 'Tous' },
                  { id: 'actifs', label: 'Actifs' },
                  { id: 'inactifs', label: 'Inactifs' },
                  { id: 'avec_compte', label: 'Avec compte' },
                  { id: 'sans_compte', label: 'Sans compte' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatut(tab.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                      filterStatut === tab.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste du personnel */}
            
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-6">
              {filteredPersonnel.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users className="h-8 w-8 mx-auto text-gray-300 mb-3" />
                  <p>Aucun membre du personnel trouvé</p>
                </div>
              ) : (
                <>
                  {/* Table Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-medium text-gray-700">Nom</th>
                          <th className="px-4 py-3 font-medium text-gray-700">Poste</th>
                          <th className="px-4 py-3 font-medium text-gray-700">Téléphone</th>
                          <th className="px-4 py-3 font-medium text-gray-700">Statut</th>
                          <th className="px-4 py-3 font-medium text-gray-700">Compte</th>
                          <th className="px-4 py-3 font-medium text-gray-700">Rôle</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredPersonnel.map((person) => (
                          <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{person.prenom} {person.nom}</div>
                              {person.email && <div className="text-xs text-gray-500">{person.email}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{person.poste}</td>
                            <td className="px-4 py-3 text-gray-600">{person.telephone || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                person.statut === 'actif' ? 'bg-green-100 text-green-800' :
                                person.statut === 'inactif' ? 'bg-gray-100 text-gray-600' :
                                person.statut === 'conge' ? 'bg-amber-100 text-amber-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {person.statut === 'actif' ? 'Actif' :
                                 person.statut === 'inactif' ? 'Inactif' :
                                 person.statut === 'conge' ? 'En congé' : person.statut}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                person.accountStatus === 'active' ? 'text-green-700' :
                                person.accountStatus === 'inactive' ? 'text-red-600' :
                                person.accountStatus === 'invited' ? 'text-amber-600' :
                                'text-gray-500'
                              }`}>
                                {person.accountStatus === 'active' && <UserCheck className="h-3.5 w-3.5" />}
                                {person.accountStatus === 'inactive' && <UserX className="h-3.5 w-3.5" />}
                                {person.accountStatus === 'active' ? 'Compte actif' :
                                 person.accountStatus === 'inactive' ? 'Désactivé' :
                                 person.accountStatus === 'invited' ? 'Invité' :
                                 'Aucun compte'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {(() => {
                                if (!person.roleId) return '—'
                                const foundRole = roles.find(r => r.role.id === person.roleId)
                                return foundRole ? foundRole.role.name : '—'
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Ouvrir le menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleOuvrirEditModal(person)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier les infos
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {person.accountStatus === 'active' || person.accountStatus === 'invited' ? (
                                    <DropdownMenuItem onClick={() => { setEditingPersonnel(person); setShowCompteModal(true) }}>
                                      <Shield className="mr-2 h-4 w-4" />
                                      Gérer le compte
                                    </DropdownMenuItem>
                                  ) : person.accountStatus === 'inactive' ? (
                                    <DropdownMenuItem onClick={() => { setEditingPersonnel(person); setShowCompteModal(true) }} className="text-green-600">
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Réactiver le compte
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => { setEditingPersonnel(person); setShowCompteModal(true) }}>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Créer un compte
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Liste Mobile */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {filteredPersonnel.map((person) => (
                      <div key={person.id} className="p-4 space-y-3">
                        <div>
                          <div className="font-semibold text-gray-900">{person.prenom} {person.nom}</div>
                          <div className="text-sm text-gray-600">{person.poste}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Personnel : </span>
                            <span className={`font-medium ${
                              person.statut === 'actif' ? 'text-green-700' :
                              person.statut === 'inactif' ? 'text-gray-600' :
                              'text-amber-600'
                            }`}>
                              {person.statut === 'actif' ? 'Actif' :
                               person.statut === 'inactif' ? 'Inactif' : person.statut}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Compte : </span>
                            <span className={`font-medium ${
                              person.accountStatus === 'active' ? 'text-green-700' :
                              person.accountStatus === 'inactive' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {person.accountStatus === 'active' ? 'Actif' :
                               person.accountStatus === 'inactive' ? 'Désactivé' :
                               'Aucun compte'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Rôle : </span>
                            <span className="font-medium text-gray-700">
                              {(() => {
                                if (!person.roleId) return '—'
                                const foundRole = roles.find(r => r.role.id === person.roleId)
                                return foundRole ? foundRole.role.name : '—'
                              })()}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          {person.accountStatus === 'active' || person.accountStatus === 'invited' ? (
                            <Button variant="outline" size="sm" className="flex-1 text-blue-600 border-blue-200" onClick={() => { setEditingPersonnel(person); setShowCompteModal(true) }}>
                              Gérer le compte
                            </Button>
                          ) : person.accountStatus === 'inactive' ? (
                            <Button variant="outline" size="sm" className="flex-1 text-green-700 border-green-200" onClick={() => { setEditingPersonnel(person); setShowCompteModal(true) }}>
                              Réactiver
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingPersonnel(person); setShowCompteModal(true) }}>
                              Créer un compte
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="px-3" onClick={() => handleOuvrirEditModal(person)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

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
                    <div className="space-y-4 col-span-2 mt-4 p-4 border rounded bg-gray-50">
                      <h4 className="font-medium text-sm text-gray-800">Compte utilisateur</h4>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="creerCompte"
                          checked={nouveauPersonnel.creerCompte}
                          onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, creerCompte: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Label htmlFor="creerCompte" className="cursor-pointer">Créer un compte maintenant</Label>
                      </div>
                      
                      {nouveauPersonnel.creerCompte ? (
                        <div className="space-y-2 pl-6 mt-2">
                          <Label htmlFor="roleId">Rôle d'accès *</Label>
                          <select
                            id="roleId"
                            className="w-full border rounded px-3 py-2"
                            value={nouveauPersonnel.roleId}
                            onChange={(e) => setNouveauPersonnel({ ...nouveauPersonnel, roleId: e.target.value })}
                          >
                            <option value="">Sélectionnez un rôle</option>
                            {roles.filter(r => r.role.active).map(r => (
                              <option key={r.role.id} value={r.role.id}>{r.role.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-2 pl-6">Vous pourrez créer un compte de connexion plus tard depuis sa fiche.</p>
                      )}
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

            {showEditModal && editingPersonnel && (
              <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Modifier les informations</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-prenom">Prénom *</Label>
                      <Input
                        id="edit-prenom"
                        value={editingPersonnel.prenom}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, prenom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-nom">Nom *</Label>
                      <Input
                        id="edit-nom"
                        value={editingPersonnel.nom}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, nom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-poste">Poste *</Label>
                      <Input
                        id="edit-poste"
                        value={editingPersonnel.poste}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, poste: e.target.value })}
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
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingPersonnel.email || ''}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-dateEmbauche">Date d'embauche</Label>
                      <Input
                        id="edit-dateEmbauche"
                        type="date"
                        value={editingPersonnel.dateEmbauche ? new Date(editingPersonnel.dateEmbauche).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, dateEmbauche: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="edit-statut">Statut professionnel *</Label>
                      <select
                        id="edit-statut"
                        className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                        value={editingPersonnel.statut}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, statut: e.target.value as any })}
                      >
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="conge">En congé</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingPersonnel(null) }}>
                      Annuler
                    </Button>
                    <Button onClick={handleModifierPersonnel} disabled={isSubmitting}>
                      {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

                </>
        )}
      </div>
      {showCompteModal && editingPersonnel && (
        <Dialog open={showCompteModal} onOpenChange={setShowCompteModal}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>
                {(!editingPersonnel.accountStatus) ? 'Créer un compte utilisateur' : 'Gestion du compte'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {(!editingPersonnel.accountStatus) ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm items-center">
                    <span className="text-gray-500 font-medium">Nom</span>
                    <span className="col-span-2">{editingPersonnel.prenom} {editingPersonnel.nom}</span>
                    
                    <span className="text-gray-500 font-medium">Poste</span>
                    <span className="col-span-2">{editingPersonnel.poste}</span>
                    
                    <span className="text-gray-500 font-medium self-center mt-2">Email</span>
                    <div className="col-span-2 mt-2">
                      <Input
                        value={editingPersonnel.email}
                        onChange={(e) => setEditingPersonnel({...editingPersonnel, email: e.target.value})}
                        placeholder="jean@example.com"
                        className="h-8"
                      />
                    </div>
                    
                    <span className="text-gray-500 font-medium self-center mt-2">Rôle d'accès</span>
                    <div className="col-span-2 mt-2">
                      <select
                        className="w-full border rounded px-3 py-1.5 bg-white text-sm"
                        value={editingPersonnel.roleId || ""}
                        onChange={(e) => setEditingPersonnel({ ...editingPersonnel, roleId: e.target.value })}
                      >
                        <option value="">Sélectionner un rôle</option>
                        {roles.filter(r => r.role.active).map(r => (
                          <option key={r.role.id} value={r.role.id}>{r.role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setShowCompteModal(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => { handleGererCompte('create_user'); setShowCompteModal(false); }} 
                      disabled={!editingPersonnel.roleId || !editingPersonnel.email || isSubmitting}
                    >
                      Créer le compte
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{editingPersonnel.prenom} {editingPersonnel.nom}</p>
                      <p className="text-xs text-gray-500">{editingPersonnel.email || 'Aucun email'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {editingPersonnel.accountStatus === 'active' || editingPersonnel.accountStatus === 'invited' ? (
                      <>
                        <Button 
                          variant="outline" 
                          disabled={isSubmitting}
                          className="w-full justify-start text-left font-normal" 
                          onClick={() => {
                            if(confirm("Réinitialiser le mot de passe ? Un nouveau mot de passe temporaire sera généré.")) {
                              handleGererCompte('reset_password'); setShowCompteModal(false);
                            }
                          }}
                        >
                          <Key className="mr-2 h-4 w-4 text-blue-500" />
                          Réinitialiser le mot de passe
                        </Button>
                        <Button 
                          variant="outline" 
                          disabled={isSubmitting}
                          className="w-full justify-start text-left font-normal text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                          onClick={() => { handleGererCompte('disable_user'); setShowCompteModal(false); }}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Désactiver le compte
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        disabled={isSubmitting}
                        className="w-full justify-start text-left font-normal text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" 
                        onClick={() => { handleGererCompte('enable_user'); setShowCompteModal(false); }}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Réactiver le compte
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {temporaryPassword && (
        <Dialog open={!!temporaryPassword} onOpenChange={(open) => !open && setTemporaryPassword(null)}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Mot de passe temporaire</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-gray-600">
                L'action a été effectuée avec succès. Veuillez communiquer ce mot de passe temporaire à l'utilisateur :
              </p>
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                <code className="font-mono text-lg font-bold text-gray-800">{temporaryPassword}</code>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(temporaryPassword)
                  alert('Copié dans le presse-papiers !')
                }}>
                  Copier
                </Button>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                ⚠️ Ce mot de passe ne sera affiché qu'une seule fois.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setTemporaryPassword(null)}>
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
