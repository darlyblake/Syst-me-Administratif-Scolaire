"use client"

import { useMemo, useState } from "react"
import { useClasses } from "@/hooks/useClasses"
import type { Classe } from "@/types/models"

const emptyForm: Omit<Classe, "id"> = { nom: "", niveau: "", capacite: 30, fraisScolarite: 0 }

export default function ClassesPage() {
  const { classes, loading, error, statistiques, ajouter, modifier, supprimer, getEleves, getEnseignants } = useClasses()
  const [query, setQuery] = useState("")
  const [niveau, setNiveau] = useState("all")
  const [selected, setSelected] = useState<Classe | null>(null)
  const [form, setForm] = useState<Omit<Classe, "id">>(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const niveaux = useMemo(() => Array.from(new Set(classes.map(c => c.niveau).filter(Boolean))).sort(), [classes])
  const filtered = useMemo(() => classes.filter(c => `${c.nom} ${c.niveau}`.toLowerCase().includes(query.toLowerCase().trim()) && (niveau === "all" || c.niveau === niveau)), [classes, query, niveau])
  const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value)

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(null); setFormOpen(true) }
  const openEdit = (c: Classe) => { setEditing(c.id); setForm({ nom: c.nom, niveau: c.niveau, typeEcole: c.typeEcole, capacite: c.capacite, fraisScolarite: c.fraisScolarite }); setFormError(null); setFormOpen(true) }
  const save = () => {
    const data = { ...form, nom: form.nom.trim(), niveau: form.niveau.trim() }
    if (!data.nom || !data.niveau) return setFormError("Le nom et le niveau sont obligatoires.")
    if (!Number.isFinite(data.capacite) || data.capacite < 1) return setFormError("La capacité doit être supérieure à 0.")
    if (!Number.isFinite(data.fraisScolarite) || data.fraisScolarite < 0) return setFormError("Le montant de la scolarité est invalide.")
    if (editing) modifier(editing, data); else ajouter(data)
    setFormOpen(false); setEditing(null); setForm(emptyForm)
  }
  const remove = (c: Classe) => {
    const count = getEleves(c.id).length
    const message = count ? `Cette classe contient ${count} élève(s). Voulez-vous vraiment la supprimer ?` : `Supprimer la classe « ${c.nom} » ?`
    if (window.confirm(message)) { supprimer(c.id); if (selected?.id === c.id) setSelected(null) }
  }

  return (
    <main className="min-h-full bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div><p className="text-sm text-muted-foreground">Administration scolaire</p><h1 className="text-2xl font-semibold tracking-tight">Classes</h1><p className="mt-1 text-sm text-muted-foreground">Organisez les classes, leurs effectifs et leurs responsables.</p></div>
          <button onClick={openCreate} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Nouvelle classe</button>
        </header>

        <section aria-label="Indicateurs" className="flex flex-wrap gap-x-8 gap-y-2 border-b pb-4 text-sm"><span><strong>{statistiques.totalClasses}</strong> classes</span><span><strong>{statistiques.totalEleves}</strong> élèves actifs</span><span><strong>{Math.round(statistiques.moyenneElevesParClasse)}</strong> élèves/classe</span><span><strong>{money(statistiques.recettesTotales)}</strong> FCFA estimés</span></section>

        <div className="flex flex-col gap-3 md:flex-row"><label className="flex-1"><span className="sr-only">Rechercher une classe</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une classe…" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></label><select value={niveau} onChange={e => setNiveau(e.target.value)} aria-label="Filtrer par niveau" className="rounded-md border bg-background px-3 py-2 text-sm"><option value="all">Tous les niveaux</option>{niveaux.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
        {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}

        {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Chargement des classes…</p> : filtered.length === 0 ? <div className="border-y py-12 text-center"><p className="font-medium">Aucune classe trouvée</p><p className="mt-1 text-sm text-muted-foreground">Modifiez votre recherche ou créez une nouvelle classe.</p></div> : <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Classe</th><th className="px-4 py-3 font-medium">Niveau</th><th className="px-4 py-3 font-medium">Effectif</th><th className="px-4 py-3 font-medium">Enseignants</th><th className="px-4 py-3 font-medium">Scolarité</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y">{filtered.map(c => { const count = getEleves(c.id).length; const teachers = getEnseignants(c.id); return <tr key={c.id} className="hover:bg-muted/20"><td className="px-4 py-3 font-medium">{c.nom}</td><td className="px-4 py-3">{c.niveau}</td><td className="px-4 py-3"><span className={count >= c.capacite ? "font-medium text-destructive" : ""}>{count}</span> / {c.capacite}</td><td className="px-4 py-3">{teachers.length}</td><td className="px-4 py-3">{money(c.fraisScolarite)} FCFA</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => setSelected(c)} className="rounded px-2 py-1 hover:bg-muted">Voir</button><button onClick={() => openEdit(c)} className="rounded px-2 py-1 hover:bg-muted">Modifier</button><button onClick={() => remove(c)} className="rounded px-2 py-1 text-destructive hover:bg-destructive/10">Supprimer</button></div></td></tr>})}</tbody></table></div>}

        {selected && <div role="dialog" aria-modal="true" aria-labelledby="class-details-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.currentTarget === e.target) setSelected(null) }}><div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl"><div className="flex items-start justify-between border-b pb-4"><div><p className="text-sm text-muted-foreground">Détails de la classe</p><h2 id="class-details-title" className="text-xl font-semibold">{selected.nom}</h2></div><button onClick={() => setSelected(null)} aria-label="Fermer" className="rounded px-2 py-1 hover:bg-muted">×</button></div><dl className="grid grid-cols-2 gap-4 py-5 text-sm"><div><dt className="text-muted-foreground">Niveau</dt><dd className="font-medium">{selected.niveau}</dd></div><div><dt className="text-muted-foreground">Capacité</dt><dd className="font-medium">{selected.capacite}</dd></div><div><dt className="text-muted-foreground">Élèves actifs</dt><dd className="font-medium">{getEleves(selected.id).length}</dd></div><div><dt className="text-muted-foreground">Enseignants</dt><dd className="font-medium">{getEnseignants(selected.id).length}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Scolarité annuelle</dt><dd className="font-medium">{money(selected.fraisScolarite)} FCFA</dd></div></dl><div className="flex justify-end gap-2 border-t pt-4"><button onClick={() => { const c = selected; setSelected(null); openEdit(c) }} className="rounded-md border px-4 py-2 text-sm">Modifier</button><button onClick={() => setSelected(null)} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Fermer</button></div></div></div>}

        {formOpen && <div role="dialog" aria-modal="true" aria-labelledby="class-form-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl"><div className="border-b pb-4"><h2 id="class-form-title" className="text-xl font-semibold">{editing ? "Modifier la classe" : "Nouvelle classe"}</h2><p className="mt-1 text-sm text-muted-foreground">Renseignez les informations nécessaires.</p></div><div className="space-y-4 py-5"><label className="block text-sm font-medium">Nom<input autoFocus value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-normal" placeholder="Ex. 6ème A" /></label><label className="block text-sm font-medium">Niveau<input value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-normal" placeholder="Ex. 6ème" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Capacité<input type="number" min="1" value={form.capacite} onChange={e => setForm({ ...form, capacite: Number(e.target.value) })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Scolarité (FCFA)<input type="number" min="0" value={form.fraisScolarite} onChange={e => setForm({ ...form, fraisScolarite: Number(e.target.value) })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-normal" /></label></div>{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}</div><div className="flex justify-end gap-2 border-t pt-4"><button onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Annuler</button><button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Enregistrer</button></div></div></div>}
      </div>
    </main>
  )
}
