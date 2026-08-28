"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  Phone,
  DollarSign,
  Briefcase,
  UserCheck,
  X
} from "lucide-react"
import { servicePersonnel } from "@/services/personnel.service"
import type { DonneesPersonnel, FiltresPersonnel, StatistiquesPersonnel, StatutPersonnel, TypeContrat, ModeRemuneration } from "@/types/personnel"
import { ProtectionRoute } from "@/components/protection-route"

// Types locaux pour le formulaire
interface FormDataPersonnel {
  nom: string
  prenom: string
  poste: string
  typeContrat: TypeContrat
  modeRemuneration: ModeRemuneration
  salaireFixe: string
  tauxHoraire: string
  heuresPrevues: string
  telephone: string
  statut: StatutPersonnel
}

export default function PersonnelPage() {
  // États principaux
  const [personnel, setPersonnel] = useState<DonneesPersonnel[]>([])
  const [loading, setLoading] = useState(true)
  const [statistiques, setStatistiques] = useState<StatistiquesPersonnel | null>(null)

  // États pour les filtres
  const [filtres, setFiltres] = useState<FiltresPersonnel>({
    recherche: "",
    poste: "",
    statut: ""
  })

  // États pour la modal d'ajout
  const [modalAjoutOuvert, setModalAjoutOuvert] = useState(false)
  const [formData, setFormData] = useState<FormDataPersonnel>({
    nom: "",
    prenom: "",
    poste: "",
    typeContrat: "cdi",
    modeRemuneration: "fixe",
    salaireFixe: "",
    tauxHoraire: "",
    heuresPrevues: "",
    telephone: "",
    statut: "actif"
  })

  // États pour les notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Chargement initial des données
  useEffect(() => {
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    try {
      setLoading(true)
      const [donneesPersonnel, stats] = await Promise.all([
        servicePersonnel.obtenirToutLePersonnel(),
        servicePersonnel.genererStatistiques()
      ])
      setPersonnel(donneesPersonnel)
      setStatistiques(stats)
    } catch (error) {
      afficherToast("Erreur lors du chargement des données", "error")
    } finally {
      setLoading(false)
    }
  }

  // Personnel filtré
  const personnelFiltre = servicePersonnel.rechercherPersonnel(filtres)

  // Gestion du formulaire
  const reinitialiserFormulaire = () => {
    setFormData({
      nom: "",
      prenom: "",
      poste: "",
      typeContrat: "cdi",
      modeRemuneration: "fixe",
      salaireFixe: "",
      tauxHoraire: "",
      heuresPrevues: "",
      telephone: "",
      statut: "actif"
    })
  }

  const ouvrirModalAjout = () => {
    reinitialiserFormulaire()
    setModalAjoutOuvert(true)
  }

  const fermerModalAjout = () => {
    setModalAjoutOuvert(false)
    reinitialiserFormulaire()
  }

  const soumettreFormulaire = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const nouveauPersonnel = {
        nom: formData.nom,
        prenom: formData.prenom,
        poste: formData.poste,
        typeContrat: formData.typeContrat,
        modeRemuneration: formData.modeRemuneration,
        salaireFixe: formData.modeRemuneration === "fixe" ? parseFloat(formData.salaireFixe) || 0 : undefined,
        tauxHoraire: formData.modeRemuneration === "horaire" ? parseFloat(formData.tauxHoraire) || 0 : undefined,
        heuresPrevues: formData.modeRemuneration === "horaire" ? parseInt(formData.heuresPrevues) || 0 : undefined,
        telephone: formData.telephone,
        statut: formData.statut,
        dateEmbauche: new Date().toISOString().split('T')[0] // Date du jour
      }

      await servicePersonnel.ajouterPersonnel(nouveauPersonnel)
      await chargerDonnees()
      fermerModalAjout()
      afficherToast("Membre du personnel ajouté avec succès", "success")
    } catch (error) {
      afficherToast("Erreur lors de l'ajout du personnel", "error")
    }
  }

  const supprimerPersonnel = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce membre du personnel ?")) return

    try {
      await servicePersonnel.supprimerPersonnel(id)
      await chargerDonnees()
      afficherToast("Membre du personnel supprimé avec succès", "success")
    } catch (error) {
      afficherToast("Erreur lors de la suppression", "error")
    }
  }

  const afficherToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fonctions utilitaires
  const getCouleurStatut = (statut: StatutPersonnel) => {
    const couleurs = {
      actif: "bg-green-100 text-green-800 border-green-200",
      inactif: "bg-red-100 text-red-800 border-red-200",
      conge: "bg-blue-100 text-blue-800 border-blue-200",
      suspendu: "bg-orange-100 text-orange-800 border-orange-200"
    }
    return couleurs[statut] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getCouleurTypeContrat = (type: TypeContrat) => {
    const couleurs = {
      cdi: "bg-blue-100 text-blue-800 border-blue-200",
      cdd: "bg-yellow-100 text-yellow-800 border-yellow-200",
      vacataire: "bg-purple-100 text-purple-800 border-purple-200",
      consultant: "bg-green-100 text-green-800 border-green-200"
    }
    return couleurs[type] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const formaterMontant = (personnel: DonneesPersonnel) => {
    if (personnel.modeRemuneration === "fixe" && personnel.salaireFixe) {
      return `${personnel.salaireFixe.toLocaleString()} FCFA/mois`
    } else if (personnel.modeRemuneration === "horaire" && personnel.tauxHoraire && personnel.heuresPrevues) {
      return `${personnel.tauxHoraire.toLocaleString()} FCFA/h (${personnel.heuresPrevues}h/mois)`
    }
    return "-"
  }

  const postesUniques = servicePersonnel.obtenirPostesUniques()

  return (
    <ProtectionRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 lg:p-6">
          {/* En-tête */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestion du personnel</h1>
              <p className="text-gray-600 mt-1">Gérez l'ensemble du personnel administratif et technique</p>
            </div>

            <Button onClick={ouvrirModalAjout} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un membre du personnel
            </Button>
          </div>

          {/* Statistiques */}
          {statistiques && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Total personnel</p>
                      <p className="text-2xl font-bold text-blue-900">{statistiques.totalPersonnel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700">Masse salariale</p>
                      <p className="text-2xl font-bold text-green-900">
                        {statistiques.masseSalarialeTotale.toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <UserCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-700">Actifs</p>
                      <p className="text-2xl font-bold text-orange-900">{statistiques.parStatut.actif}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700">CDI</p>
                      <p className="text-2xl font-bold text-purple-900">{statistiques.parTypeContrat.cdi}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filtres et recherche */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, prénom ou poste..."
                    value={filtres.recherche}
                    onChange={(e) => setFiltres(prev => ({ ...prev, recherche: e.target.value }))}
                    className="pl-10 w-full"
                  />
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <Select
                    value={filtres.poste}
                    onValueChange={(value) => setFiltres(prev => ({ ...prev, poste: value }))}
                  >
                    <SelectTrigger className="w-full lg:w-48">
                      <SelectValue placeholder="Tous les postes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les postes</SelectItem>
                      {postesUniques.map((poste) => (
                        <SelectItem key={poste} value={poste}>
                          {poste}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filtres.statut}
                    onValueChange={(value) => setFiltres(prev => ({ ...prev, statut: value as StatutPersonnel | "" }))}
                  >
                    <SelectTrigger className="w-full lg:w-40">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="conge">En congé</SelectItem>
                      <SelectItem value="suspendu">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setFiltres({ recherche: "", poste: "", statut: "" })}
                    className="w-full lg:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tableau du personnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Liste du personnel ({personnelFiltre.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-semibold">Nom & Prénom</th>
                      <th className="text-left p-4 font-semibold">Poste / Fonction</th>
                      <th className="text-left p-4 font-semibold">Type de contrat</th>
                      <th className="text-left p-4 font-semibold">Mode de rémunération</th>
                      <th className="text-left p-4 font-semibold">Montant / Taux horaire</th>
                      <th className="text-left p-4 font-semibold">Téléphone</th>
                      <th className="text-left p-4 font-semibold">Statut</th>
                      <th className="text-left p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          Chargement...
                        </td>
                      </tr>
                    ) : personnelFiltre.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Aucun membre du personnel trouvé</p>
                          {(filtres.recherche || filtres.poste || filtres.statut) && (
                            <Button variant="outline" onClick={() => setFiltres({ recherche: "", poste: "", statut: "" })} className="mt-2">
                              Réinitialiser les filtres
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      personnelFiltre.map((membre) => (
                        <tr key={membre.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">
                              {membre.nom} {membre.prenom}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-gray-900">{membre.poste}</div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={getCouleurTypeContrat(membre.typeContrat)}>
                              {membre.typeContrat.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">
                              {membre.modeRemuneration === "fixe" ? "Salaire fixe" : "Paiement horaire"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-gray-900">{formaterMontant(membre)}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {membre.telephone}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={getCouleurStatut(membre.statut)}>
                              {membre.statut}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" title="Modifier">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => supprimerPersonnel(membre.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Modal d'ajout */}
          <Dialog open={modalAjoutOuvert} onOpenChange={setModalAjoutOuvert}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un membre du personnel</DialogTitle>
              </DialogHeader>

              <form onSubmit={soumettreFormulaire} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input
                      id="prenom"
                      value={formData.prenom}
                      onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="poste">Poste / Fonction *</Label>
                  <Input
                    id="poste"
                    value={formData.poste}
                    onChange={(e) => setFormData(prev => ({ ...prev, poste: e.target.value }))}
                    placeholder="ex: Secrétaire, Comptable, Surveillant..."
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="typeContrat">Type de contrat *</Label>
                    <Select
                      value={formData.typeContrat}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, typeContrat: value as TypeContrat }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cdi">CDI</SelectItem>
                        <SelectItem value="cdd">CDD</SelectItem>
                        <SelectItem value="vacataire">Vacataire</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="statut">Statut *</Label>
                    <Select
                      value={formData.statut}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value as StatutPersonnel }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="inactif">Inactif</SelectItem>
                        <SelectItem value="conge">En congé</SelectItem>
                        <SelectItem value="suspendu">Suspendu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="modeRemuneration">Mode de rémunération *</Label>
                  <Select
                    value={formData.modeRemuneration}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, modeRemuneration: value as ModeRemuneration }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixe">Salaire fixe (mensuel)</SelectItem>
                      <SelectItem value="horaire">Paiement horaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.modeRemuneration === "fixe" ? (
                  <div>
                    <Label htmlFor="salaireFixe">Salaire fixe (FCFA/mois) *</Label>
                    <Input
                      id="salaireFixe"
                      type="number"
                      value={formData.salaireFixe}
                      onChange={(e) => setFormData(prev => ({ ...prev, salaireFixe: e.target.value }))}
                      placeholder="ex: 150000"
                      required
                    />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tauxHoraire">Taux horaire (FCFA) *</Label>
                      <Input
                        id="tauxHoraire"
                        type="number"
                        value={formData.tauxHoraire}
                        onChange={(e) => setFormData(prev => ({ ...prev, tauxHoraire: e.target.value }))}
                        placeholder="ex: 5000"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="heuresPrevues">Heures prévues par mois *</Label>
                      <Input
                        id="heuresPrevues"
                        type="number"
                        value={formData.heuresPrevues}
                        onChange={(e) => setFormData(prev => ({ ...prev, heuresPrevues: e.target.value }))}
                        placeholder="ex: 160"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                    placeholder="ex: +225 01 02 03 04 05"
                    required
                  />
                </div>

                <DialogFooter className="flex gap-2">
                  <Button type="button" variant="outline" onClick={fermerModalAjout}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    Ajouter le membre
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Toast de notification */}
          {toast && (
            <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg border flex items-center gap-3 z-50 ${
              toast.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className={`p-1 rounded-full ${
                toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {toast.type === 'success' ? (
                  <UserCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
              </div>
              <span className="text-gray-800">{toast.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setToast(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtectionRoute>
  )
}
