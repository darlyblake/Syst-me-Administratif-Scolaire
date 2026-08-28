"use client"

import { useMemo, useState } from "react"
import { useClasses } from "@/hooks/useClasses"
import type { Classe } from "@/types/models"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, SlidersHorizontal, Users, UserRound, MoreHorizontal } from "lucide-react"

const emptyForm: Omit<Classe, "id"> = {
  nom: "",
  niveau: "",
  capacite: 30,
  fraisScolarite: 0,
}

export default function ClassesPage() {
  const {
    classes,
    loading,
    error,
    statistiques,
    ajouter,
    modifier,
    supprimer,
    getEleves,
    getEnseignants,
  } = useClasses()

  const [query, setQuery] = useState("")
  const [niveau, setNiveau] = useState("all")
  const [selected, setSelected] = useState<Classe | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Classe, "id">>(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const niveaux = useMemo(
    () => Array.from(new Set(classes.map((c) => c.niveau).filter(Boolean))).sort(),
    [classes],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return classes.filter((classe) => {
      const matchesSearch = !normalized || `${classe.nom} ${classe.niveau}`.toLowerCase().includes(normalized)
      const matchesLevel = niveau === "all" || classe.niveau === niveau
      return matchesSearch && matchesLevel
    })
  }, [classes, query, niveau])

  const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (classe: Classe) => {
    setEditing(classe.id)
    setForm({
      nom: classe.nom,
      niveau: classe.niveau,
      typeEcole: classe.typeEcole,
      capacite: classe.capacite,
      fraisScolarite: classe.fraisScolarite,
    })
    setFormError(null)
    setFormOpen(true)
  }

  const save = () => {
    const data = { ...form, nom: form.nom.trim(), niveau: form.niveau.trim() }
    if (!data.nom || !data.niveau) return setFormError("Le nom et le niveau sont obligatoires.")
    if (!Number.isFinite(data.capacite) || data.capacite < 1) return setFormError("La capacité doit être supérieure à 0.")
    if (!Number.isFinite(data.fraisScolarite) || data.fraisScolarite < 0) return setFormError("Le montant de la scolarité est invalide.")

    if (editing) modifier(editing, data)
    else ajouter(data)

    setFormOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const remove = (classe: Classe) => {
    const count = getEleves(classe.id).length
    const message = count
      ? `Cette classe contient ${count} élève(s). Voulez-vous vraiment la supprimer ?`
      : `Supprimer la classe « ${classe.nom} » ?`

    if (window.confirm(message)) {
      supprimer(classe.id)
      if (selected?.id === classe.id) setSelected(null)
    }
  }

  return (
    <main className="min-h-full bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Administration scolaire</p>
            <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organisez les classes, leurs effectifs et leurs responsables.
            </p>
          </div>
          <Button onClick={openCreate}>Nouvelle classe</Button>
        </header>

        <section aria-label="Résumé" className="flex flex-wrap gap-x-8 gap-y-2 border-b pb-4 text-sm">
          <span><strong>{statistiques.totalClasses}</strong> classes</span>
          <span><strong>{statistiques.totalEleves}</strong> élèves actifs</span>
          <span><strong>{Math.round(statistiques.moyenneElevesParClasse)}</strong> élèves/classe</span>
          <span><strong>{money(statistiques.recettesTotales)}</strong> FCFA estimés</span>
        </section>

        <section aria-label="Recherche et filtres" className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une classe…"
              aria-label="Rechercher une classe"
              className="pl-9"
            />
          </div>
          <div className="relative md:w-56">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={niveau}
              onChange={(event) => setNiveau(event.target.value)}
              aria-label="Filtrer par niveau"
              className="h-10 w-full appearance-none rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Tous les niveaux</option>
              {niveaux.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="border-y py-12 text-center text-sm text-muted-foreground" role="status">
            Chargement des classes…
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-y py-12 text-center">
            <Users className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
            <p className="font-medium">Aucune classe trouvée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query || niveau !== "all" ? "Modifiez vos critères de recherche." : "Commencez par créer une classe."}
            </p>
            {!query && niveau === "all" && <Button className="mt-4" onClick={openCreate}>Créer une classe</Button>}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Liste des classes</caption>
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Classe</th>
                    <th className="px-4 py-3 font-medium">Niveau</th>
                    <th className="px-4 py-3 font-medium">Effectif</th>
                    <th className="px-4 py-3 font-medium">Enseignants</th>
                    <th className="px-4 py-3 font-medium">Scolarité</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((classe) => {
                    const count = getEleves(classe.id).length
                    const teacherCount = getEnseignants(classe.id).length
                    const full = count >= classe.capacite

                    return (
                      <tr key={classe.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{classe.nom}</td>
                        <td className="px-4 py-3">{classe.niveau}</td>
                        <td className="px-4 py-3">
                          <span className={full ? "font-medium text-destructive" : undefined}>{count}</span> / {classe.capacite}
                        </td>
                        <td className="px-4 py-3">{teacherCount}</td>
                        <td className="px-4 py-3">{money(classe.fraisScolarite)} FCFA</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelected(classe)}>Voir</Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(classe)}>Modifier</Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(classe)}>
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t px-4 py-3 text-xs text-muted-foreground">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.nom}</DialogTitle>
                <DialogDescription>Informations principales de la classe.</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-5 py-4 text-sm">
                <div><dt className="text-muted-foreground">Niveau</dt><dd className="mt-1 font-medium">{selected.niveau}</dd></div>
                <div><dt className="text-muted-foreground">Capacité</dt><dd className="mt-1 font-medium">{selected.capacite}</dd></div>
                <div><dt className="text-muted-foreground">Élèves actifs</dt><dd className="mt-1 flex items-center gap-1 font-medium"><Users className="h-4 w-4" />{getEleves(selected.id).length}</dd></div>
                <div><dt className="text-muted-foreground">Enseignants</dt><dd className="mt-1 flex items-center gap-1 font-medium"><UserRound className="h-4 w-4" />{getEnseignants(selected.id).length}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Scolarité annuelle</dt><dd className="mt-1 font-medium">{money(selected.fraisScolarite)} FCFA</dd></div>
              </dl>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
                <Button onClick={() => { const classe = selected; setSelected(null); openEdit(classe) }}>Modifier</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la classe" : "Nouvelle classe"}</DialogTitle>
            <DialogDescription>Renseignez uniquement les informations nécessaires.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="classe-nom">Nom</Label>
              <Input id="classe-nom" autoFocus value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex. 6ème A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classe-niveau">Niveau</Label>
              <Input id="classe-niveau" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} placeholder="Ex. 6ème" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classe-capacite">Capacité</Label>
                <Input id="classe-capacite" type="number" min="1" value={form.capacite} onChange={(e) => setForm({ ...form, capacite: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classe-frais">Scolarité (FCFA)</Label>
                <Input id="classe-frais" type="number" min="0" value={form.fraisScolarite} onChange={(e) => setForm({ ...form, fraisScolarite: Number(e.target.value) })} />
              </div>
            </div>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
