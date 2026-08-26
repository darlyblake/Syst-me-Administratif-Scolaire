"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Wallet, Users, Receipt, FileText, TrendingUp, DollarSign, Plus, Edit, Trash2, ArrowDown, ArrowUp, Calendar, Filter, Download } from "lucide-react"
import Link from "next/link"
import { serviceComptabilite } from "@/services/comptabilite.service"
import { servicePaie } from "@/services/paie.service"
import { serviceDepenses } from "@/services/depenses.service"
import { serviceMouvements } from "@/services/mouvements.service"
import { serviceComptabiliteFacade } from "@/services/comptabilite-facade.service"
import { downloadCsv } from "@/lib/download"
import type { CompteComptable } from "@/services/comptabilite.service"
import type { Employe, FichePaie } from "@/services/paie.service"
import type { CategorieDepense, Depense } from "@/services/depenses.service"
import type { MouvementFinancier } from "@/services/mouvements.service"

export default function ComptabilitePage() {
  const [activeSection, setActiveSection] = useState<string>("dashboard")
  const [comptes, setComptes] = useState<CompteComptable[]>([])
  const [employes, setEmployes] = useState<Employe[]>([])
  const [fichesPaie, setFichesPaie] = useState<FichePaie[]>([])
  const [categoriesDepenses, setCategoriesDepenses] = useState<CategorieDepense[]>([])
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [mouvements, setMouvements] = useState<MouvementFinancier[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false)
  const [showAddDepenseModal, setShowAddDepenseModal] = useState(false)
  const [showAddMouvementModal, setShowAddMouvementModal] = useState(false)
  const [filterDateDebut, setFilterDateDebut] = useState("")
  const [filterDateFin, setFilterDateFin] = useState("")
  const [filterType, setFilterType] = useState<"entree" | "sortie" | "all">("all")
  const [nouveauCompte, setNouveauCompte] = useState({
    numero: "",
    nom: "",
    type: "actif" as "actif" | "passif" | "charge" | "produit",
    categorie: "",
    parentId: ""
  })
  const [nouvelEmploye, setNouvelEmploye] = useState({
    nom: "",
    prenom: "",
    poste: "",
    typeContrat: "permanent" as "permanent" | "horaire" | "journalier",
    typeRemuneration: "mensuel" as "mensuel" | "horaire" | "journalier",
    tauxHoraire: 0,
    tauxJournalier: 0,
    salaireMensuel: 0,
    statut: "actif" as "actif" | "inactif" | "conge" | "suspendu"
  })
  const [nouvelleDepense, setNouvelleDepense] = useState({
    categorieId: "",
    nom: "",
    description: "",
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    fournisseur: "",
    reference: ""
  })
  const [nouveauMouvement, setNouveauMouvement] = useState({
    type: "entree" as "entree" | "sortie",
    categorie: "",
    description: "",
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    reference: "",
    compteId: ""
  })

  const sections = [
    { id: "dashboard", title: "Tableau de Bord", icon: TrendingUp, description: "Vue d'ensemble financière" },
    { id: "mouvements", title: "Mouvements", icon: ArrowUp, description: "Entrées et sorties d'argent" },
    { id: "comptes", title: "Comptes Généraux", icon: Wallet, description: "Plan comptable et comptes" },
    { id: "paie", title: "Gestion de la Paie", icon: Users, description: "Salaires du personnel" },
    { id: "depenses", title: "Autres Dépenses", icon: Receipt, description: "Dépenses opérationnelles" },
    { id: "rapports", title: "Rapports Financiers", icon: FileText, description: "Bilan et comptes de résultat" },
  ]

  useEffect(() => {
    setComptes(serviceComptabilite.obtenirTousLesComptes())
    setEmployes(servicePaie.obtenirTousLesEmployes())
    setFichesPaie(servicePaie.obtenirToutesLesFiches())
    setCategoriesDepenses(serviceDepenses.obtenirToutesLesCategories())
    setDepenses(serviceDepenses.obtenirToutesLesDepenses())
    setMouvements(serviceMouvements.obtenirTousLesMouvements())
  }, [])

  const handleAjouterCompte = () => {
    if (!nouveauCompte.numero || !nouveauCompte.nom || !nouveauCompte.type || !nouveauCompte.categorie) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    serviceComptabilite.ajouterCompte({
      ...nouveauCompte,
      solde: 0,
      parentId: nouveauCompte.parentId || undefined
    })

    setComptes(serviceComptabilite.obtenirTousLesComptes())
    setShowAddModal(false)
    setNouveauCompte({
      numero: "",
      nom: "",
      type: "actif",
      categorie: "",
      parentId: ""
    })
  }

  const handleSupprimerCompte = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
      const success = serviceComptabilite.supprimerCompte(id)
      if (success) {
        setComptes(serviceComptabilite.obtenirTousLesComptes())
      } else {
        alert("Impossible de supprimer ce compte (il a des sous-comptes ou des mouvements)")
      }
    }
  }

  const handleAjouterEmploye = () => {
    if (!nouvelEmploye.nom || !nouvelEmploye.prenom || !nouvelEmploye.poste) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    servicePaie.ajouterEmploye({
      ...nouvelEmploye,
      dateEmbauche: new Date().toISOString()
    })

    setEmployes(servicePaie.obtenirTousLesEmployes())
    setShowAddEmployeeModal(false)
    setNouvelEmploye({
      nom: "",
      prenom: "",
      poste: "",
      typeContrat: "permanent",
      typeRemuneration: "mensuel",
      tauxHoraire: 0,
      tauxJournalier: 0,
      salaireMensuel: 0,
      statut: "actif"
    })
  }

  const handleGenererFichePaie = (employeId: string) => {
    const periodeDebut = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const periodeFin = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    
    try {
      servicePaie.genererFichePaie(employeId, periodeDebut, periodeFin)
      setFichesPaie(servicePaie.obtenirToutesLesFiches())
      alert("Fiche de paie générée avec succès")
    } catch (error) {
      alert("Erreur lors de la génération de la fiche de paie")
    }
  }

  const handleAjouterDepense = () => {
    if (!nouvelleDepense.categorieId || !nouvelleDepense.nom || !nouvelleDepense.montant) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    serviceDepenses.ajouterDepense({
      ...nouvelleDepense,
      statut: "en_attente"
    })

    setDepenses(serviceDepenses.obtenirToutesLesDepenses())
    setShowAddDepenseModal(false)
    setNouvelleDepense({
      categorieId: "",
      nom: "",
      description: "",
      montant: 0,
      date: new Date().toISOString().split('T')[0],
      fournisseur: "",
      reference: ""
    })
  }

  const handleValiderDepense = (id: string) => {
    serviceDepenses.validerDepense(id)
    setDepenses(serviceDepenses.obtenirToutesLesDepenses())
  }

  const handleMarquerPayee = (id: string) => {
    serviceDepenses.marquerCommePayee(id)
    setDepenses(serviceDepenses.obtenirToutesLesDepenses())
  }

  const handleAjouterMouvement = () => {
    if (!nouveauMouvement.type || !nouveauMouvement.categorie || !nouveauMouvement.description || !nouveauMouvement.montant) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    const mouvementAjoute = serviceMouvements.ajouterMouvement(nouveauMouvement)

    serviceComptabiliteFacade.enregistrerTransaction({
      type: mouvementAjoute.type,
      categorie: mouvementAjoute.categorie,
      description: mouvementAjoute.description,
      montant: mouvementAjoute.montant,
      date: mouvementAjoute.date,
      reference: mouvementAjoute.reference || mouvementAjoute.id,
      statut: mouvementAjoute.statut,
      source: "mouvement",
      contexte: {
        compteId: mouvementAjoute.compteId,
      },
    })

    setMouvements(serviceMouvements.obtenirTousLesMouvements())
    setShowAddMouvementModal(false)
    setNouveauMouvement({
      type: "entree",
      categorie: "",
      description: "",
      montant: 0,
      date: new Date().toISOString().split('T')[0],
      reference: "",
      compteId: ""
    })
  }

  const handleSupprimerMouvement = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce mouvement ?")) {
      const mouvement = serviceMouvements.obtenirTousLesMouvements().find(item => item.id === id)
      if (mouvement) {
        serviceComptabiliteFacade.supprimerTransaction(mouvement.reference || mouvement.id)
      }

      serviceMouvements.supprimerMouvement(id)
      setMouvements(serviceMouvements.obtenirTousLesMouvements())
    }
  }

  const journalComptable = serviceComptabiliteFacade.obtenirJournal()
  const journalRecents = journalComptable.slice(0, 5)
  const mouvementsFiltres = journalComptable.filter((mouvement) => {
    const correspondType = filterType === "all" || mouvement.type === filterType
    const correspondDebut = !filterDateDebut || new Date(mouvement.date) >= new Date(filterDateDebut)
    const correspondFin = !filterDateFin || new Date(mouvement.date) <= new Date(filterDateFin)

    return correspondType && correspondDebut && correspondFin
  })

  const totalEntrees = serviceComptabiliteFacade.obtenirTotalEntrees(filterDateDebut || undefined, filterDateFin || undefined)
  const totalSorties = serviceComptabiliteFacade.obtenirTotalSorties(filterDateDebut || undefined, filterDateFin || undefined)
  const solde = totalEntrees - totalSorties

  const comptesRacines = comptes.filter(c => !c.parentId)
  const soldeActif = serviceComptabilite.calculerSoldeParType("actif")
  const soldePassif = serviceComptabilite.calculerSoldeParType("passif")
  const soldeCharges = serviceComptabilite.calculerSoldeParType("charge")
  const soldeProduits = serviceComptabilite.calculerSoldeParType("produit")
  const resultatNet = serviceComptabilite.calculerResultatNet()
  const statistiquesMensuelles = serviceComptabiliteFacade.obtenirStatistiquesMensuelles(new Date().getFullYear())
  const statistiquesParCategorie = serviceComptabiliteFacade.obtenirStatistiquesParCategorie(filterDateDebut || undefined, filterDateFin || undefined)

  const handleExporterJournalCSV = () => {
    const fichier = `journal_comptable_${new Date().toISOString().split('T')[0]}.csv`
    const contenu = serviceComptabiliteFacade.exporterJournalCSV(filterDateDebut || undefined, filterDateFin || undefined)
    downloadCsv(contenu, fichier)
  }

  return (
    <div className="min-h-screen p-4 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/ecole/tableau-bord">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-300">
                  <DollarSign className="h-4 w-4" />
                  Finance scolaire
                </div>
                <h1 className="text-2xl font-bold mt-1">Comptabilité</h1>
                <p className="text-sm text-slate-300">Suivi des recettes, dépenses, salaires et trésorerie.</p>
              </div>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 border border-white/10">
              Journal local • {journalComptable.length} écritures
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Navigation */}
          <div className="md:col-span-1">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                <CardTitle>Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <Button
                      key={section.id}
                      className={`w-full justify-start rounded-xl border px-3 text-sm font-medium shadow-sm transition-all ${
                        activeSection === section.id
                          ? "border-slate-900 bg-slate-900 text-white hover:border-slate-800 hover:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {section.title}
                    </Button>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="md:col-span-2">
            {activeSection === "dashboard" && (
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                  <CardTitle>Tableau de Bord Financier</CardTitle>
                  <CardDescription>Vue d'ensemble des finances et de la trésorerie</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
                      <p className="text-sm text-slate-600">Total Entrées</p>
                      <p className="text-2xl font-bold text-emerald-700 mt-2">{totalEntrees.toLocaleString()} FCFA</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4">
                      <p className="text-sm text-slate-600">Total Sorties</p>
                      <p className="text-2xl font-bold text-rose-700 mt-2">{totalSorties.toLocaleString()} FCFA</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                      <p className="text-sm text-slate-600">Total Actif</p>
                      <p className="text-2xl font-bold text-amber-700 mt-2">{soldeActif.toLocaleString()} FCFA</p>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4">
                      <p className="text-sm text-slate-600">Solde Net</p>
                      <p className={`text-2xl font-bold mt-2 ${solde >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {solde.toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm text-slate-600">Résultat Net</p>
                        <p className={`text-2xl font-bold ${resultatNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {resultatNet.toLocaleString()} FCFA
                        </p>
                      </div>
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Suivi mensuel</span>
                    </div>
                  </div>

                  <div className="mt-6 border rounded-2xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Historique du journal local</h3>
                      <span className="text-xs text-gray-500">{journalComptable.length} écritures</span>
                    </div>
                    <div className="space-y-2">
                      {journalRecents.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune écriture enregistrée pour le moment.</p>
                      ) : (
                        journalRecents.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{entry.description}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(entry.date).toLocaleDateString("fr-FR")} • {entry.categorie} • {entry.source}
                              </p>
                            </div>
                            <p className={`text-sm font-semibold ${entry.type === "entree" ? "text-green-600" : "text-red-600"}`}>
                              {entry.type === "entree" ? "+" : "-"}{entry.montant.toLocaleString()} FCFA
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "mouvements" && (
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div>
                      <CardTitle>Mouvements Financiers</CardTitle>
                      <CardDescription>Gestion des entrées et sorties d'argent</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddMouvementModal(true)} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau Mouvement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {/* Filtres */}
                  <div className="flex gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm font-medium">Filtres:</span>
                    </div>
                    <select
                      aria-label="Type de mouvement"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as "entree" | "sortie" | "all")}
                      className="border rounded px-3 py-2"
                    >
                      <option value="all">Tous les types</option>
                      <option value="entree">Entrées</option>
                      <option value="sortie">Sorties</option>
                    </select>
                    <Input
                      type="date"
                      value={filterDateDebut}
                      onChange={(e) => setFilterDateDebut(e.target.value)}
                      className="w-40"
                    />
                    <Input
                      type="date"
                      value={filterDateFin}
                      onChange={(e) => setFilterDateFin(e.target.value)}
                      className="w-40"
                    />
                    <Button variant="outline" onClick={() => {
                      setFilterDateDebut("")
                      setFilterDateFin("")
                      setFilterType("all")
                    }}>
                      Réinitialiser
                    </Button>
                  </div>

                  {/* Statistiques */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm text-slate-600">Total Entrées</p>
                      <p className="text-xl font-bold text-emerald-700 mt-2">{totalEntrees.toLocaleString()} FCFA</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-sm text-slate-600">Total Sorties</p>
                      <p className="text-xl font-bold text-rose-700 mt-2">{totalSorties.toLocaleString()} FCFA</p>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                      <p className="text-sm text-slate-600">Solde</p>
                      <p className={`text-xl font-bold mt-2 ${solde >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {solde.toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>

                  {/* Liste des mouvements */}
                  <div className="space-y-2">
                    {mouvementsFiltres.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Aucun mouvement trouvé</p>
                    ) : (
                      mouvementsFiltres.map((mouvement) => (
                        <div key={mouvement.id} className="border border-slate-200 rounded-2xl p-4 bg-white hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${
                                mouvement.type === 'entree' ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                {mouvement.type === 'entree' ? (
                                  <ArrowUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold">{mouvement.description}</p>
                                <p className="text-sm text-gray-600">{mouvement.categorie}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                                  {mouvement.reference && ` • Réf: ${mouvement.reference}`}
                                  {mouvement.source && ` • Source: ${mouvement.source}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className={`font-bold ${
                                mouvement.type === 'entree' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {mouvement.type === 'entree' ? '+' : '-'}{mouvement.montant.toLocaleString()} FCFA
                              </p>
                              <Button variant="ghost" size="sm" onClick={() => handleSupprimerMouvement(mouvement.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "comptes" && (
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div>
                      <CardTitle>Comptes Généraux</CardTitle>
                      <CardDescription>Plan comptable et gestion des comptes</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddModal(true)} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau Compte
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {comptesRacines.map((compte) => (
                      <div key={compte.id} className="border border-slate-200 rounded-2xl p-4 bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{compte.numero}</span>
                            <span className="font-semibold">{compte.nom}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              compte.type === 'actif' ? 'bg-green-100 text-green-800' :
                              compte.type === 'passif' ? 'bg-red-100 text-red-800' :
                              compte.type === 'charge' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {compte.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{compte.solde.toLocaleString()} FCFA</span>
                            <Button variant="ghost" size="sm" onClick={() => handleSupprimerCompte(compte.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {comptes.filter(c => c.parentId === compte.id).map((sousCompte) => (
                          <div key={sousCompte.id} className="ml-6 mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">{sousCompte.numero}</span>
                                <span className="text-sm">{sousCompte.nom}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{sousCompte.solde.toLocaleString()} FCFA</span>
                                <Button variant="ghost" size="sm" onClick={() => handleSupprimerCompte(sousCompte.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "paie" && (
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div>
                      <CardTitle>Gestion de la Paie</CardTitle>
                      <CardDescription>Salaires et fiches de paie</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddEmployeeModal(true)} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvel Employé
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-6">
                    {/* Liste des employés */}
                    <div>
                      <h3 className="font-semibold mb-3">Employés</h3>
                      <div className="space-y-2">
                        {employes.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Aucun employé enregistré</p>
                        ) : (
                          employes.map((employe) => (
                            <div key={employe.id} className="border border-slate-200 rounded-2xl p-4 flex justify-between items-center bg-white">
                              <div>
                                <p className="font-semibold">{employe.prenom} {employe.nom}</p>
                                <p className="text-sm text-gray-600">{employe.poste}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    employe.typeContrat === 'permanent' ? 'bg-blue-100 text-blue-800' :
                                    employe.typeContrat === 'horaire' ? 'bg-green-100 text-green-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {employe.typeContrat}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    employe.statut === 'actif' ? 'bg-green-100 text-green-800' :
                                    employe.statut === 'inactif' ? 'bg-gray-100 text-gray-800' :
                                    employe.statut === 'conge' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {employe.statut}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleGenererFichePaie(employe.id)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Générer Fiche
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Fiches de paie récentes */}
                    <div>
                      <h3 className="font-semibold mb-3">Fiches de Paie Récentes</h3>
                      <div className="space-y-2">
                        {fichesPaie.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Aucune fiche de paie générée</p>
                        ) : (
                          fichesPaie.slice(-5).reverse().map((fiche) => {
                            const employe = employes.find(e => e.id === fiche.employeId)
                            return (
                              <div key={fiche.id} className="border border-slate-200 rounded-2xl p-4 flex justify-between items-center bg-white">
                                <div>
                                  <p className="font-semibold">{employe ? `${employe.prenom} ${employe.nom}` : 'Employé inconnu'}</p>
                                  <p className="text-sm text-gray-600">
                                    {new Date(fiche.periodeDebut).toLocaleDateString()} - {new Date(fiche.periodeFin).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{fiche.netAPayer.toLocaleString()} FCFA</p>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    fiche.statut === 'brouillon' ? 'bg-gray-100 text-gray-800' :
                                    fiche.statut === 'valide' ? 'bg-blue-100 text-blue-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {fiche.statut}
                                  </span>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "depenses" && (
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div>
                      <CardTitle>Autres Dépenses</CardTitle>
                      <CardDescription>Dépenses opérationnelles</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddDepenseModal(true)} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle Dépense
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-6">
                    {/* Résumé par catégorie */}
                    <div>
                      <h3 className="font-semibold mb-3">Résumé par Catégorie (Ce mois)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoriesDepenses.slice(0, 6).map((categorie) => {
                          const total = serviceDepenses.calculerBudgetUtilise(categorie.id, new Date().getFullYear(), new Date().getMonth() + 1)
                          return (
                            <div key={categorie.id} className="border border-slate-200 rounded-2xl p-3 bg-white">
                              <p className="text-sm font-medium">{categorie.nom}</p>
                              <p className="text-lg font-bold">{total.toLocaleString()} FCFA</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Liste des dépenses récentes */}
                    <div>
                      <h3 className="font-semibold mb-3">Dépenses Récentes</h3>
                      <div className="space-y-2">
                        {depenses.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Aucune dépense enregistrée</p>
                        ) : (
                          depenses.slice(-10).reverse().map((depense) => {
                            const categorie = categoriesDepenses.find(c => c.id === depense.categorieId)
                            return (
                              <div key={depense.id} className="border border-slate-200 rounded-2xl p-4 flex justify-between items-center bg-white">
                                <div>
                                  <p className="font-semibold">{depense.nom}</p>
                                  <p className="text-sm text-gray-600">{categorie?.nom || 'Catégorie inconnue'}</p>
                                  <p className="text-xs text-gray-500">{new Date(depense.date).toLocaleDateString()}</p>
                                  {depense.fournisseur && <p className="text-xs text-gray-500">Fournisseur: {depense.fournisseur}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{depense.montant.toLocaleString()} FCFA</p>
                                  <div className="flex gap-1 mt-1">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      depense.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                      depense.statut === 'validee' ? 'bg-blue-100 text-blue-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {depense.statut}
                                    </span>
                                    {depense.statut === 'en_attente' && (
                                      <Button variant="ghost" size="sm" onClick={() => handleValiderDepense(depense.id)}>
                                        Valider
                                      </Button>
                                    )}
                                    {depense.statut === 'validee' && (
                                      <Button variant="ghost" size="sm" onClick={() => handleMarquerPayee(depense.id)}>
                                        Payer
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "rapports" && (
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                  <CardTitle>Rapports Financiers</CardTitle>
                  <CardDescription>Bilan et comptes de résultat</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-6">
                    {/* Bilan */}
                    <div>
                      <h3 className="font-semibold mb-3">Bilan</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2 text-green-700">Actif</h4>
                          <div className="space-y-2">
                            {comptes.filter(c => c.type === 'actif').map((compte) => (
                              <div key={compte.id} className="flex justify-between text-sm">
                                <span>{compte.nom}</span>
                                <span>{compte.solde.toLocaleString()} FCFA</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2 font-semibold">
                              <div className="flex justify-between">
                                <span>Total Actif</span>
                                <span>{soldeActif.toLocaleString()} FCFA</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2 text-red-700">Passif</h4>
                          <div className="space-y-2">
                            {comptes.filter(c => c.type === 'passif').map((compte) => (
                              <div key={compte.id} className="flex justify-between text-sm">
                                <span>{compte.nom}</span>
                                <span>{compte.solde.toLocaleString()} FCFA</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2 font-semibold">
                              <div className="flex justify-between">
                                <span>Total Passif</span>
                                <span>{soldePassif.toLocaleString()} FCFA</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compte de résultat */}
                    <div>
                      <h3 className="font-semibold mb-3">Répartition par Catégorie</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {statistiquesParCategorie.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucune statistique par catégorie disponible.</p>
                        ) : (
                          statistiquesParCategorie.map((stat) => (
                            <div key={stat.categorie} className="border border-slate-200 rounded-2xl p-3 flex items-center justify-between bg-white">
                              <div>
                                <p className="font-medium">{stat.categorie}</p>
                                <p className="text-xs text-gray-500">Entrées: {stat.entrees.toLocaleString()} FCFA • Sorties: {stat.sorties.toLocaleString()} FCFA</p>
                              </div>
                              <p className={`font-semibold ${stat.solde >= 0 ? "text-green-600" : "text-red-600"}`}>
                                Solde: {stat.solde.toLocaleString()} FCFA
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Compte de Résultat</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2 text-blue-700">Recettes scolaires</h4>
                          <div className="space-y-2">
                            {comptes.filter(c => c.type === 'produit').map((compte) => (
                              <div key={compte.id} className="flex justify-between text-sm">
                                <span>{compte.nom}</span>
                                <span>{compte.solde.toLocaleString()} FCFA</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2 font-semibold">
                              <div className="flex justify-between">
                                <span>Total Recettes</span>
                                <span>{soldeProduits.toLocaleString()} FCFA</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2 text-orange-700">Charges</h4>
                          <div className="space-y-2">
                            {comptes.filter(c => c.type === 'charge').map((compte) => (
                              <div key={compte.id} className="flex justify-between text-sm">
                                <span>{compte.nom}</span>
                                <span>{compte.solde.toLocaleString()} FCFA</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2 font-semibold">
                              <div className="flex justify-between">
                                <span>Total Charges</span>
                                <span>{soldeCharges.toLocaleString()} FCFA</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`mt-4 p-4 rounded-lg border ${resultatNet >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Résultat Net</span>
                          <span className={`text-xl font-bold ${resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {resultatNet.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Résumé mensuel */}
                    <div>
                      <h3 className="font-semibold mb-3">Résumé Mensuel</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                          <p className="text-sm text-gray-600">Recettes du mois</p>
                          <p className="text-xl font-bold text-green-600">{soldeProduits.toLocaleString()} FCFA</p>
                        </div>
                        <div className="border rounded-lg p-4">
                          <p className="text-sm text-gray-600">Dépenses du mois</p>
                          <p className="text-xl font-bold text-red-600">{soldeCharges.toLocaleString()} FCFA</p>
                        </div>
                        <div className="border rounded-lg p-4">
                          <p className="text-sm text-gray-600">Solde</p>
                          <p className={`text-xl font-bold ${resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {resultatNet.toLocaleString()} FCFA
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {statistiquesMensuelles.slice(0, 6).map((stat) => (
                          <div key={stat.mois} className="flex items-center justify-between border border-slate-200 rounded-2xl px-3 py-2 bg-white">
                            <span className="text-sm font-medium">{stat.mois}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600">Entrées: {stat.entrees.toLocaleString()} FCFA</span>
                              <span className="text-red-600">Sorties: {stat.sorties.toLocaleString()} FCFA</span>
                              <span className={stat.solde >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                                Solde: {stat.solde.toLocaleString()} FCFA
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Export */}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleExporterJournalCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Exporter CSV
                      </Button>
                      <Button variant="outline" onClick={() => alert("Export PDF en cours de développement")}>
                        <FileText className="h-4 w-4 mr-2" />
                        Exporter PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modal d'ajout de compte */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Nouveau Compte</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Numéro *</Label>
                  <Input
                    id="numero"
                    value={nouveauCompte.numero}
                    onChange={(e) => setNouveauCompte({ ...nouveauCompte, numero: e.target.value })}
                    placeholder="Ex: 15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom du compte *</Label>
                  <Input
                    id="nom"
                    value={nouveauCompte.nom}
                    onChange={(e) => setNouveauCompte({ ...nouveauCompte, nom: e.target.value })}
                    placeholder="Ex: Caisse"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={nouveauCompte.type} onValueChange={(value) => setNouveauCompte({ ...nouveauCompte, type: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="passif">Passif</SelectItem>
                      <SelectItem value="charge">Charge</SelectItem>
                      <SelectItem value="produit">Recette</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categorie">Catégorie *</Label>
                  <Input
                    id="categorie"
                    value={nouveauCompte.categorie}
                    onChange={(e) => setNouveauCompte({ ...nouveauCompte, categorie: e.target.value })}
                    placeholder="Ex: Classe 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent">Compte parent (optionnel)</Label>
                  <Select value={nouveauCompte.parentId} onValueChange={(value) => setNouveauCompte({ ...nouveauCompte, parentId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {comptesRacines.map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>{compte.numero} - {compte.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterCompte} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'ajout de mouvement */}
        {showAddMouvementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Nouveau Mouvement Financier</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <select
                    id="type"
                    aria-label="Type du mouvement"
                    value={nouveauMouvement.type}
                    onChange={(e) => setNouveauMouvement({ ...nouveauMouvement, type: e.target.value as "entree" | "sortie" })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="entree">Entrée</option>
                    <option value="sortie">Sortie</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categorie">Catégorie *</Label>
                  <Input
                    id="categorie"
                    value={nouveauMouvement.categorie}
                    onChange={(e) => setNouveauMouvement({ ...nouveauMouvement, categorie: e.target.value })}
                    placeholder="Ex: Scolarité, Salaires, Fournitures"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={nouveauMouvement.description}
                    onChange={(e) => setNouveauMouvement({ ...nouveauMouvement, description: e.target.value })}
                    placeholder="Ex: Paiement scolarité élève X"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montant">Montant (FCFA) *</Label>
                  <Input
                    id="montant"
                    type="number"
                    value={nouveauMouvement.montant}
                    onChange={(e) => setNouveauMouvement({ ...nouveauMouvement, montant: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={nouveauMouvement.date}
                    onChange={(e) => setNouveauMouvement({ ...nouveauMouvement, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Référence (optionnel)</Label>
                  <Input
                    id="reference"
                    value={nouveauMouvement.reference}
                    onChange={(e) => setNouveauMouvement({ ...nouveauMouvement, reference: e.target.value })}
                    placeholder="Ex: Facture #123"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterMouvement} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowAddMouvementModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'ajout d'employé */}
        {showAddEmployeeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Nouvel Employé</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={nouvelEmploye.nom}
                    onChange={(e) => setNouvelEmploye({ ...nouvelEmploye, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={nouvelEmploye.prenom}
                    onChange={(e) => setNouvelEmploye({ ...nouvelEmploye, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poste">Poste *</Label>
                  <Input
                    id="poste"
                    value={nouvelEmploye.poste}
                    onChange={(e) => setNouvelEmploye({ ...nouvelEmploye, poste: e.target.value })}
                    placeholder="Ex: Enseignant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeContrat">Type de contrat *</Label>
                  <Select value={nouvelEmploye.typeContrat} onValueChange={(value) => setNouvelEmploye({ ...nouvelEmploye, typeContrat: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="horaire">Horaire</SelectItem>
                      <SelectItem value="journalier">Journalier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeRemuneration">Type de rémunération *</Label>
                  <Select value={nouvelEmploye.typeRemuneration} onValueChange={(value) => setNouvelEmploye({ ...nouvelEmploye, typeRemuneration: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="horaire">Horaire</SelectItem>
                      <SelectItem value="journalier">Journalier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {nouvelEmploye.typeRemuneration === "mensuel" && (
                  <div className="space-y-2">
                    <Label htmlFor="salaireMensuel">Salaire mensuel (FCFA)</Label>
                    <Input
                      id="salaireMensuel"
                      type="number"
                      value={nouvelEmploye.salaireMensuel}
                      onChange={(e) => setNouvelEmploye({ ...nouvelEmploye, salaireMensuel: Number(e.target.value) })}
                    />
                  </div>
                )}
                {nouvelEmploye.typeRemuneration === "horaire" && (
                  <div className="space-y-2">
                    <Label htmlFor="tauxHoraire">Taux horaire (FCFA)</Label>
                    <Input
                      id="tauxHoraire"
                      type="number"
                      value={nouvelEmploye.tauxHoraire}
                      onChange={(e) => setNouvelEmploye({ ...nouvelEmploye, tauxHoraire: Number(e.target.value) })}
                    />
                  </div>
                )}
                {nouvelEmploye.typeRemuneration === "journalier" && (
                  <div className="space-y-2">
                    <Label htmlFor="tauxJournalier">Taux journalier (FCFA)</Label>
                    <Input
                      id="tauxJournalier"
                      type="number"
                      value={nouvelEmploye.tauxJournalier}
                      onChange={(e) => setNouvelEmploye({ ...nouvelEmploye, tauxJournalier: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterEmploye} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowAddEmployeeModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'ajout de dépense */}
        {showAddDepenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Nouvelle Dépense</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categorie">Catégorie *</Label>
                  <Select value={nouvelleDepense.categorieId} onValueChange={(value) => setNouvelleDepense({ ...nouvelleDepense, categorieId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesDepenses.map((categorie) => (
                        <SelectItem key={categorie.id} value={categorie.id}>{categorie.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de la dépense *</Label>
                  <Input
                    id="nom"
                    value={nouvelleDepense.nom}
                    onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, nom: e.target.value })}
                    placeholder="Ex: Facture d'électricité"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={nouvelleDepense.description}
                    onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montant">Montant (FCFA) *</Label>
                  <Input
                    id="montant"
                    type="number"
                    value={nouvelleDepense.montant}
                    onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, montant: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={nouvelleDepense.date}
                    onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fournisseur">Fournisseur</Label>
                  <Input
                    id="fournisseur"
                    value={nouvelleDepense.fournisseur}
                    onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, fournisseur: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Référence</Label>
                  <Input
                    id="reference"
                    value={nouvelleDepense.reference}
                    onChange={(e) => setNouvelleDepense({ ...nouvelleDepense, reference: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterDepense} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowAddDepenseModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
