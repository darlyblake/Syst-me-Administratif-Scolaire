"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Trash2, Edit, Search, Settings, Shuffle, Check, X } from "lucide-react"
import { AcademicStructureTree } from "@/components/academic/AcademicStructureTree"
import { useAuthentification } from "@/providers/authentification.provider"
import { useClasses } from "@/hooks/useClasses"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { serviceParametres } from "@/services/parametres.service"
import { serviceRepartition } from "@/services/repartition.service"
import { serviceEleves } from "@/services/eleves.service"
import type { Classe, ModeRepartition } from "@/types/models"
import type { TarificationTypeEcole } from "@/services/parametres.service"

type Tab = "liste" | "repartition" | "parametres"

export default function ClassesPage() {
  const { utilisateur, etablissementActif, estEnCoursDeChargement } = useAuthentification()
  // Ne jamais utiliser un établissement fictif : attendre le contexte authentifié réel.
  const establishmentId = etablissementActif?.id ?? (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null
  const {
    classes,
    loading,
    error,
    statistiques,
    refresh,
    ajouter,
    modifier,
    supprimer,
    getEleves,
    getEnseignants,
  } = useClasses()
  const { data: academicStructure, isLoading: isAcademicLoading, error: academicError } = useAcademicStructure(establishmentId)
  const academicClasses = useMemo(() => {
    if (!academicStructure.length) return []

    return academicStructure.flatMap((cycle) =>
      (cycle.grade_levels ?? []).flatMap((level) =>
        (level.school_classes ?? []).map((schoolClass) => ({
          id: schoolClass.id,
          nom: schoolClass.name,
          niveau: level.name,
          typeEcole: cycle.name,
          capacite: 0,
          fraisScolarite: 0,
        }))
      )
    )
  }, [academicStructure])

  const displayClasses = academicClasses.length ? academicClasses : classes
  const [activeTab, setActiveTab] = useState<Tab>("liste")
  const [tarificationTypesEcole, setTarificationTypesEcole] = useState<TarificationTypeEcole[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTypeEcole, setFilterTypeEcole] = useState("")
  const [filterNiveau, setFilterNiveau] = useState("")

  const [nouvelleClasse, setNouvelleClasse] = useState({
    nom: "",
    typeEcole: "",
    niveau: "",
    capacite: 30,
    fraisScolarite: 0
  })

  // Répartition
  const [selectedNiveau, setSelectedNiveau] = useState("")
  const [repartitionMode, setRepartitionMode] = useState<ModeRepartition>("aleatoire")
  const [repartitionPreview, setRepartitionPreview] = useState<any>(null)
  const [repartitionDepuisZero, setRepartitionDepuisZero] = useState(false)

  // Paramètres
  const [params, setParams] = useState({
    modeGlobal: "aleatoire" as ModeRepartition,
    modeParNiveau: {} as Record<string, ModeRepartition>,
    bloquerSiComplet: false
  })
  const [newNiveauOverride, setNewNiveauOverride] = useState("")
  const [newModeOverride, setNewModeOverride] = useState<ModeRepartition>("aleatoire")

  useEffect(() => {
    chargerTarification()
    chargerParametres()
  }, [])

  const chargerTarification = () => {
    const tarification = serviceParametres.obtenirTarificationParTypeEcole()
    setTarificationTypesEcole(tarification)
  }

  const chargerParametres = () => {
    const p = serviceRepartition.obtenirParametres()
    setParams(p)
  }

  const handleTypeEcoleChange = (typeEcole: string) => {
    setNouvelleClasse({ ...nouvelleClasse, typeEcole, niveau: "" })
  }

  const handleNiveauChange = (niveau: string) => {
    setNouvelleClasse({ 
      ...nouvelleClasse, 
      niveau
    })
  }

  const handleAjouterClasse = () => {
    try {
      ajouter(nouvelleClasse)
      setShowAddModal(false)
      setNouvelleClasse({
        nom: "",
        typeEcole: "",
        niveau: "",
        capacite: 30,
        fraisScolarite: 0
      })
      toast.success("Classe ajoutée")
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : "Erreur lors de l'ajout")
    }
  }

  const handleModifierClasse = () => {
    if (!editingClasse) return
    try {
      modifier(editingClasse.id, editingClasse)
      setShowEditModal(false)
      setEditingClasse(null)
      toast.success("Classe modifiée")
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : "Erreur lors de la modification")
    }
  }

  const handleSupprimerClasse = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette classe ?")) {
      supprimer(id)
      toast.success("Classe supprimée")
    }
  }

  const handleOuvrirEditModal = (classe: Classe) => {
    setEditingClasse({ ...classe })
    setShowEditModal(true)
  }

  const handlePrevisualiserRepartition = () => {
    if (!selectedNiveau) {
      toast.error("Sélectionnez un niveau")
      return
    }
    const preview = serviceRepartition.repartirNiveau(selectedNiveau, repartitionMode, {
      depuisZero: repartitionDepuisZero
    })
    setRepartitionPreview(preview)
  }

  const handleAppliquerRepartition = () => {
    if (!repartitionPreview) return
    const { ok, erreurs } = serviceRepartition.appliquerAffectations(repartitionPreview.affectations)
    toast.success(`${ok} élèves répartis`)
    if (erreurs > 0) toast.error(`${erreurs} erreurs`)
    if (repartitionPreview.nonAffectes.length > 0) {
      toast.message(`${repartitionPreview.nonAffectes.length} non affectés (capacité)`)
    }
    setRepartitionPreview(null)
    refresh()
  }

  const handleSauvegarderParametres = () => {
    serviceRepartition.sauvegarderParametres(params)
    toast.success("Paramètres sauvegardés")
  }

  const handleAjouterOverride = () => {
    if (!newNiveauOverride) return
    setParams({
      ...params,
      modeParNiveau: {
        ...params.modeParNiveau,
        [newNiveauOverride]: newModeOverride
      }
    })
    setNewNiveauOverride("")
    setNewModeOverride("aleatoire")
  }

  const handleSupprimerOverride = (niveau: string) => {
    const newOverrides = { ...params.modeParNiveau }
    delete newOverrides[niveau]
    setParams({ ...params, modeParNiveau: newOverrides })
  }

  const filteredClasses = displayClasses.filter(classe =>
    classe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classe.niveau.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (classe.typeEcole && classe.typeEcole.toLowerCase().includes(searchTerm.toLowerCase()))
  ).filter(classe =>
    !filterTypeEcole || classe.typeEcole === filterTypeEcole
  ).filter(classe =>
    !filterNiveau || classe.niveau === filterNiveau
  )

  const typesEcoleUniques = Array.from(new Set(displayClasses.map(c => c.typeEcole).filter(Boolean)))
  const niveauxUniques = Array.from(new Set(displayClasses.map(c => c.niveau)))
  if (estEnCoursDeChargement || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-terre/10 rounded w-1/4"></div>
          <div className="h-32 bg-papier rounded-3xl"></div>
          <div className="h-32 bg-papier rounded-3xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-2 border-b border-terre/10 pb-4">
        <button
          onClick={() => setActiveTab("liste")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition ${
            activeTab === "liste" ? "bg-terre text-white" : "bg-creme text-pierre hover:bg-terre-soft"
          }`}
        >
          Liste des classes
        </button>
        <button
          onClick={() => setActiveTab("repartition")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition ${
            activeTab === "repartition" ? "bg-terre text-white" : "bg-creme text-pierre hover:bg-terre-soft"
          }`}
        >
          Répartition
        </button>
        <button
          onClick={() => setActiveTab("parametres")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition ${
            activeTab === "parametres" ? "bg-terre text-white" : "bg-creme text-pierre hover:bg-terre-soft"
          }`}
        >
          Paramètres
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rouge-terre/30 bg-rouge-terre/5 px-4 py-3 text-sm text-rouge-terre">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Structure académique</h2>
          <Badge variant="outline">Supabase</Badge>
        </div>
        <AcademicStructureTree data={academicStructure} isLoading={isAcademicLoading} error={academicError} />
      </div>

      {/* Onglet Liste */}
      {activeTab === "liste" && (
        <>
          {/* Statistiques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-papier shadow-soft border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-pierre">Total classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-terre">{Number(statistiques?.totalClasses ?? statistiques?.total ?? 0)}</div>
              </CardContent>
            </Card>
            <Card className="bg-papier shadow-soft border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-pierre">Classes actives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-terre">{Number(statistiques?.classesActives ?? statistiques?.actives ?? 0)}</div>
              </CardContent>
            </Card>
            <Card className="bg-papier shadow-soft border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-pierre">Moyenne élèves/classe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-terre">{Number(statistiques?.moyenneElevesParClasse ?? 0).toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card className="bg-papier shadow-soft border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-pierre">Recettes totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-terre">{Number(statistiques?.recettesTotales ?? 0).toLocaleString()} FCFA</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres et recherche */}
          <Card className="bg-papier shadow-soft border-0">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pierre h-4 w-4" />
                  <Input
                    placeholder="Rechercher une classe..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-2xl border-terre/15 bg-creme/50"
                  />
                </div>
                <select
                  value={filterTypeEcole}
                  onChange={(e) => setFilterTypeEcole(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-terre/15 bg-creme/50"
                >
                  <option value="">Tous les types</option>
                  {typesEcoleUniques.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  value={filterNiveau}
                  onChange={(e) => setFilterNiveau(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-terre/15 bg-creme/50"
                >
                  <option value="">Tous les niveaux</option>
                  {niveauxUniques.map((niveau) => (
                    <option key={niveau} value={niveau}>{niveau}</option>
                  ))}
                </select>
                <Button onClick={() => setShowAddModal(true)} className="bg-terre hover:bg-terre-dark rounded-2xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle classe
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liste des classes */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Effectif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((classe) => {
                  const nombreEleves = getEleves(classe.id).length

                  return (
                    <TableRow key={classe.id}>
                      <TableCell>
                        <Badge variant="secondary">{classe.typeEcole || "—"}</Badge>
                      </TableCell>
                      <TableCell>{classe.niveau}</TableCell>
                      <TableCell className="font-medium">{classe.nom}</TableCell>
                      <TableCell>{nombreEleves}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOuvrirEditModal(classe)}>
                            Voir
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOuvrirEditModal(classe)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleSupprimerClasse(classe.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredClasses.length === 0 && (
            <Card className="bg-papier shadow-soft border-0">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-pierre mb-4" />
                <p className="text-pierre">Aucune classe n’a encore été créée pour ce niveau.</p>
                <Button onClick={() => setShowAddModal(true)} className="mt-4 bg-terre hover:bg-terre-dark rounded-2xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une classe
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Onglet Répartition */}
      {activeTab === "repartition" && (
        <div className="space-y-6">
          <Card className="bg-papier shadow-soft border-0">
            <CardHeader>
              <CardTitle className="text-terre">Répartition des élèves</CardTitle>
              <CardDescription>Choisissez un niveau et un mode de répartition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Niveau</Label>
                  <select
                    value={selectedNiveau}
                    onChange={(e) => setSelectedNiveau(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                  >
                    <option value="">Sélectionner un niveau</option>
                    {niveauxUniques.map((niveau) => (
                      <option key={niveau} value={niveau}>{niveau}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Mode de répartition</Label>
                  <select
                    value={repartitionMode}
                    onChange={(e) => setRepartitionMode(e.target.value as ModeRepartition)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                  >
                    <option value="aleatoire">Aléatoire</option>
                    <option value="equilibre_genre">Équilibre genre</option>
                    <option value="par_age">Par âge</option>
                    <option value="manuel">Manuel</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={repartitionDepuisZero}
                      onChange={(e) => setRepartitionDepuisZero(e.target.checked)}
                      className="rounded border-terre/15"
                    />
                    <span className="text-sm text-pierre">Repartir depuis zéro</span>
                  </label>
                </div>
              </div>
              <Button onClick={handlePrevisualiserRepartition} className="bg-terre hover:bg-terre-dark rounded-2xl">
                <Shuffle className="h-4 w-4 mr-2" />
                Prévisualiser
              </Button>
            </CardContent>
          </Card>

          {repartitionPreview && (
            <Card className="bg-papier shadow-soft border-0">
              <CardHeader>
                <CardTitle className="text-terre">Aperçu de la répartition</CardTitle>
                <CardDescription>Revoyez les affectations avant d'appliquer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {repartitionPreview.resume.map((r: any) => (
                    <Card key={r.classeId} className="bg-creme border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{r.classeNom}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-pierre">Total:</span>
                          <span className="font-medium">{r.total} / {r.capacite}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-pierre">Garçons:</span>
                          <span className="font-medium">{r.M}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-pierre">Filles:</span>
                          <span className="font-medium">{r.F}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-pierre">Autre:</span>
                          <span className="font-medium">{r.autre}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {repartitionPreview.nonAffectes.length > 0 && (
                  <div className="bg-soleil-soft rounded-2xl p-4">
                    <p className="text-sm font-medium text-soleil">
                      {repartitionPreview.nonAffectes.length} élèves non affectés (capacité insuffisante)
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button onClick={handleAppliquerRepartition} className="bg-jardin hover:bg-jardin/90 text-white rounded-2xl">
                    <Check className="h-4 w-4 mr-2" />
                    Appliquer la répartition
                  </Button>
                  <Button variant="outline" onClick={() => setRepartitionPreview(null)} className="rounded-2xl">
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Onglet Paramètres */}
      {activeTab === "parametres" && (
        <Card className="bg-papier shadow-soft border-0">
          <CardHeader>
            <CardTitle className="text-terre">Paramètres de répartition</CardTitle>
            <CardDescription>Configurez le comportement par défaut et les exceptions par niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Mode global par défaut</Label>
              <select
                value={params.modeGlobal}
                onChange={(e) => setParams({ ...params, modeGlobal: e.target.value as ModeRepartition })}
                className="w-full mt-1.5 px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
              >
                <option value="aleatoire">Aléatoire</option>
                <option value="equilibre_genre">Équilibre genre</option>
                <option value="par_age">Par âge</option>
                <option value="manuel">Manuel</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={params.bloquerSiComplet}
                  onChange={(e) => setParams({ ...params, bloquerSiComplet: e.target.checked })}
                  className="rounded border-terre/15"
                />
                <span className="text-sm text-pierre">Bloquer l'inscription si le niveau est complet</span>
              </label>
            </div>
            <div>
              <Label>Exceptions par niveau</Label>
              <div className="mt-2 space-y-2">
                {Object.entries(params.modeParNiveau).map(([niveau, mode]) => (
                  <div key={niveau} className="flex items-center justify-between bg-creme rounded-xl px-3 py-2">
                    <span className="text-sm font-medium">{niveau}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-pierre">{mode}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleSupprimerOverride(niveau)} className="rounded-lg">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <select
                  value={newNiveauOverride}
                  onChange={(e) => setNewNiveauOverride(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-terre/15 bg-creme/50"
                >
                  <option value="">Niveau</option>
                  {niveauxUniques.map((niveau) => (
                    <option key={niveau} value={niveau}>{niveau}</option>
                  ))}
                </select>
                <select
                  value={newModeOverride}
                  onChange={(e) => setNewModeOverride(e.target.value as ModeRepartition)}
                  className="flex-1 px-3 py-2 rounded-xl border border-terre/15 bg-creme/50"
                >
                  <option value="aleatoire">Aléatoire</option>
                  <option value="equilibre_genre">Équilibre genre</option>
                  <option value="par_age">Par âge</option>
                  <option value="manuel">Manuel</option>
                </select>
                <Button onClick={handleAjouterOverride} className="bg-terre hover:bg-terre-dark rounded-xl">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={handleSauvegarderParametres} className="bg-terre hover:bg-terre-dark rounded-2xl">
              <Settings className="h-4 w-4 mr-2" />
              Sauvegarder les paramètres
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-encre/30 flex items-center justify-center z-50">
          <div className="bg-papier rounded-3xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-soft">
            <h3 className="text-lg font-bold text-terre mb-4">Nouvelle classe</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom de la classe *</Label>
                <Input
                  id="nom"
                  value={nouvelleClasse.nom}
                  onChange={(e) => setNouvelleClasse({ ...nouvelleClasse, nom: e.target.value })}
                  placeholder="Ex: CM1-A"
                  className="rounded-2xl border-terre/15 bg-creme/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="typeEcole">Cycle *</Label>
                <select
                  id="typeEcole"
                  value={nouvelleClasse.typeEcole}
                  onChange={(e) => handleTypeEcoleChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                >
                  <option value="">Sélectionner un cycle</option>
                  {academicStructure.map((cycle) => (
                    <option key={cycle.id} value={cycle.name}>{cycle.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="niveau">Niveau *</Label>
                <select
                  id="niveau"
                  value={nouvelleClasse.niveau}
                  onChange={(e) => handleNiveauChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                  disabled={!nouvelleClasse.typeEcole}
                >
                  <option value="">Sélectionner d'abord le cycle</option>
                  {nouvelleClasse.typeEcole && academicStructure
                    .find(c => c.name === nouvelleClasse.typeEcole)
                    ?.grade_levels?.map((niveau) => (
                      <option key={niveau.id} value={niveau.name}>
                        {niveau.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacite">Capacité *</Label>
                <Input
                  id="capacite"
                  type="number"
                  value={nouvelleClasse.capacite}
                  onChange={(e) => setNouvelleClasse({ ...nouvelleClasse, capacite: parseInt(e.target.value) || 30 })}
                  className="rounded-2xl border border-terre/15 bg-creme/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleAjouterClasse} className="flex-1 bg-terre hover:bg-terre-dark rounded-2xl">
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 rounded-2xl">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification */}
      {showEditModal && editingClasse && (
        <div className="fixed inset-0 bg-encre/30 flex items-center justify-center z-50">
          <div className="bg-papier rounded-3xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-soft">
            <h3 className="text-lg font-bold text-terre mb-4">Modifier la classe</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom de la classe *</Label>
                <Input
                  id="edit-nom"
                  value={editingClasse.nom}
                  onChange={(e) => setEditingClasse({ ...editingClasse, nom: e.target.value })}
                  className="rounded-2xl border-terre/15 bg-creme/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-typeEcole">Cycle *</Label>
                <select
                  id="edit-typeEcole"
                  value={editingClasse.typeEcole || ""}
                  onChange={(e) => {
                    const typeEcole = e.target.value
                    setEditingClasse({ ...editingClasse, typeEcole, niveau: "" })
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                >
                  <option value="">Sélectionner un cycle</option>
                  {academicStructure.map((cycle) => (
                    <option key={cycle.id} value={cycle.name}>{cycle.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-niveau">Niveau *</Label>
                <select
                  id="edit-niveau"
                  value={editingClasse.niveau}
                  onChange={(e) => {
                    const niveau = e.target.value
                    setEditingClasse({ 
                      ...editingClasse, 
                      niveau
                    })
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                  disabled={!editingClasse.typeEcole}
                >
                  <option value="">Sélectionner d'abord le cycle</option>
                  {editingClasse.typeEcole && academicStructure
                    .find(c => c.name === editingClasse.typeEcole)
                    ?.grade_levels?.map((niveau) => (
                      <option key={niveau.id} value={niveau.name}>
                        {niveau.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacite">Capacité *</Label>
                <Input
                  id="edit-capacite"
                  type="number"
                  value={editingClasse.capacite}
                  onChange={(e) => setEditingClasse({ ...editingClasse, capacite: parseInt(e.target.value) || 30 })}
                  className="rounded-2xl border-terre/15 bg-creme/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleModifierClasse} className="flex-1 bg-terre hover:bg-terre-dark rounded-2xl">
                Modifier
              </Button>
              <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1 rounded-2xl">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
