"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpen, Edit, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabaseBrowser } from "@/lib/supabase/client"
import { serviceMatieres } from "@/services/matieres.service"
import { getEnabledEstablishmentScopes, getEnabledGradeLevels, type EstablishmentLevelScope, type GradeLevel } from "@/services/establishment-levels.service"
import type { Matiere } from "@/types/models"

type FormState = {
  code: string
  nom: string
  gradeLevelId: string
  coefficient: number
  description: string
  scope: EstablishmentLevelScope
  primaryGeneralist: boolean
}

const EMPTY_FORM: FormState = {
  code: "",
  nom: "",
  gradeLevelId: "",
  coefficient: 1,
  description: "",
  scope: "secondary",
  primaryGeneralist: false,
}

const SCOPE_LABELS: Record<EstablishmentLevelScope, string> = {
  pre_primary: "Pré-primaire",
  primary: "Primaire",
  secondary: "Secondaire",
  high_school: "Lycée",
  university: "Université",
  center: "Centre",
}

export default function MatieresPage() {
  const [etablissementId, setEtablissementId] = useState<string | null>(null)
  const [scopes, setScopes] = useState<EstablishmentLevelScope[]>([])
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<Matiere | null>(null)
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedScope, setSelectedScope] = useState<EstablishmentLevelScope | "all">("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const levelsById = useMemo(() => new Map(gradeLevels.map((level) => [level.id, level])), [gradeLevels])
  const visibleLevels = useMemo(
    () => gradeLevels.filter((level) => selectedScope === "all" || level.scope === selectedScope),
    [gradeLevels, selectedScope]
  )

  const filteredMatieres = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return matieres.filter((matiere) => {
      const level = levelsById.get(matiere.niveau[0])
      const matchesScope = selectedScope === "all" || level?.scope === selectedScope
      const matchesSearch = !query || matiere.nom.toLowerCase().includes(query) || matiere.code.toLowerCase().includes(query)
      return matchesScope && matchesSearch
    })
  }, [matieres, searchTerm, selectedScope, levelsById])

  const statistiques = useMemo(() => {
    const total = matieres.length
    const coefficients = matieres.map((m) => Number(m.coefficient) || 0)
    return {
      total,
      levels: new Set(matieres.flatMap((m) => m.niveau)).size,
      average: total ? coefficients.reduce((sum, value) => sum + value, 0) / total : 0,
    }
  }, [matieres])

  async function resolveEstablishmentId() {
    const { data: { user } } = await supabaseBrowser.auth.getUser()
    if (!user) throw new Error("Session expirée. Veuillez vous reconnecter.")
    const { data, error: memberError } = await supabaseBrowser
      .from("establishment_members")
      .select("establishment_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle()
    if (memberError) throw new Error(`Impossible de déterminer l'établissement: ${memberError.message}`)
    if (!data?.establishment_id) throw new Error("Aucun établissement actif n'est associé à votre compte.")
    return data.establishment_id as string
  }

  async function charger() {
    setLoading(true)
    setError(null)
    try {
      const id = etablissementId ?? await resolveEstablishmentId()
      setEtablissementId(id)
      const [enabledScopes, levels, subjects] = await Promise.all([
        getEnabledEstablishmentScopes(id),
        getEnabledGradeLevels(id),
        serviceMatieres.obtenirToutesLesMatieres(id),
      ])
      setScopes(enabledScopes)
      setGradeLevels(levels)
      setMatieres(subjects)
      if (selectedScope !== "all" && !enabledScopes.includes(selectedScope)) setSelectedScope("all")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les matières.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void charger() }, [])

  function ouvrirAjout() {
    const firstLevel = gradeLevels[0]
    setEditing(null)
    setForm({ ...EMPTY_FORM, gradeLevelId: firstLevel?.id ?? "", scope: firstLevel?.scope ?? scopes[0] ?? "secondary", primaryGeneralist: firstLevel?.scope === "primary" })
    setOpen(true)
  }

  function ouvrirEdition(matiere: Matiere) {
    const level = levelsById.get(matiere.niveau[0])
    setEditing(matiere)
    setForm({
      code: matiere.code,
      nom: matiere.nom,
      gradeLevelId: level?.id ?? "",
      coefficient: Number(matiere.coefficient) || 1,
      description: matiere.description ?? "",
      scope: level?.scope ?? scopes[0] ?? "secondary",
      primaryGeneralist: level?.scope === "primary",
    })
    setOpen(true)
  }

  async function enregistrer() {
    if (!etablissementId || !form.code.trim() || !form.nom.trim() || !form.gradeLevelId) {
      setError("Le code, le nom et le niveau sont obligatoires.")
      return
    }
    const level = levelsById.get(form.gradeLevelId)
    if (!level || !scopes.includes(level.scope)) {
      setError("Ce niveau n'est pas activé pour cet établissement.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.nom.trim(),
        coefficient: Math.max(1, Number(form.coefficient) || 1),
        description: form.description.trim() || null,
        grade_level_id: level.id,
        level_scope: level.scope,
        is_primary_generalist: level.scope === "primary" && form.primaryGeneralist,
      }
      if (editing) await serviceMatieres.modifierMatiere(editing.id, payload)
      else await serviceMatieres.ajouterMatiere(etablissementId, payload)
      setOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      await charger()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer la matière.")
    } finally {
      setSaving(false)
    }
  }

  async function supprimer(id: string) {
    if (!window.confirm("Archiver cette matière ? Elle ne sera plus proposée dans les nouvelles affectations.")) return
    try {
      await serviceMatieres.supprimerMatiere(id)
      await charger()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'archiver la matière.")
    }
  }

  return (
    <div className="min-h-screen p-3 sm:p-4">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm" asChild className="w-fit">
            <Link href="/ecole/tableau-bord"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><BookOpen className="h-6 w-6" />Gestion des matières</h1>
            <p className="text-sm text-muted-foreground">Les niveaux affichés suivent la configuration de l'établissement.</p>
          </div>
        </div>

        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total matières</p><p className="text-2xl font-bold">{statistiques.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Niveaux couverts</p><p className="text-2xl font-bold">{statistiques.levels}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Coefficient moyen</p><p className="text-2xl font-bold">{statistiques.average.toFixed(2)}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
            <Input className="min-w-0 flex-1" placeholder="Rechercher une matière..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Button onClick={ouvrirAjout} disabled={loading || gradeLevels.length === 0} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
          </CardContent>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button variant={selectedScope === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedScope("all")}>Tous</Button>
          {scopes.map((scope) => <Button key={scope} variant={selectedScope === scope ? "default" : "outline"} size="sm" onClick={() => setSelectedScope(scope)} className="shrink-0">{SCOPE_LABELS[scope]}</Button>)}
        </div>

        <Card>
          <CardHeader><CardTitle>Liste des matières</CardTitle><CardDescription>{loading ? "Chargement..." : `${filteredMatieres.length} matière(s)`}</CardDescription></CardHeader>
          <CardContent>
            {filteredMatieres.length === 0 && !loading ? <p className="py-10 text-center text-sm text-muted-foreground">{gradeLevels.length === 0 ? "Aucun niveau activé dans les paramètres de l'établissement." : "Aucune matière trouvée."}</p> :
              <div className="space-y-2">
                {filteredMatieres.map((matiere) => {
                  const level = levelsById.get(matiere.niveau[0])
                  return <div key={matiere.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{matiere.code}</div>
                      <div className="min-w-0"><p className="font-semibold truncate">{matiere.nom}</p><p className="text-sm text-muted-foreground">{level?.name ?? "Niveau"} · Coefficient {matiere.coefficient}</p>{matiere.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{matiere.description}</p>}</div>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto"><Button variant="outline" size="sm" onClick={() => ouvrirEdition(matiere)} className="flex-1 sm:flex-none"><Edit className="mr-1 h-4 w-4" />Modifier</Button><Button variant="ghost" size="sm" onClick={() => void supprimer(matiere.id)} aria-label={`Archiver ${matiere.nom}`}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                })}
              </div>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Modifier la matière" : "Nouvelle matière"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="subject-code">Code *</Label><Input id="subject-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MAT" /></div>
              <div className="space-y-2"><Label htmlFor="subject-coefficient">Coefficient *</Label><Input id="subject-coefficient" type="number" min="1" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: Number(e.target.value) || 1 })} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="subject-name">Nom *</Label><Input id="subject-name" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Mathématiques" /></div>
            <div className="space-y-2"><Label htmlFor="subject-scope">Catégorie</Label><select id="subject-scope" value={form.scope} onChange={(e) => { const scope = e.target.value as EstablishmentLevelScope; const first = gradeLevels.find((l) => l.scope === scope); setForm({ ...form, scope, gradeLevelId: first?.id ?? "", primaryGeneralist: scope === "primary" }) }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Sélectionner</option>{scopes.map((scope) => <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="subject-level">Niveau *</Label><select id="subject-level" value={form.gradeLevelId} onChange={(e) => setForm({ ...form, gradeLevelId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner un niveau</option>{visibleLevels.filter((l) => l.scope === form.scope).map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></div>
            {form.scope === "primary" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.primaryGeneralist} onChange={(e) => setForm({ ...form, primaryGeneralist: e.target.checked })} />Enseignant polyvalent pour le primaire</label>}
            <div className="space-y-2"><Label htmlFor="subject-description">Description</Label><textarea id="subject-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Description de la matière..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => void enregistrer()} disabled={saving || !form.gradeLevelId}>{saving ? "Enregistrement..." : editing ? "Modifier" : "Ajouter"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
