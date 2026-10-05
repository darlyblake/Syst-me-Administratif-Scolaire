"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Clock, Plus, Trash2 } from "lucide-react"
import { serviceHeuresVacataires } from "@/services/heures-vacataires.service"
import { servicePersonnel } from "@/services/personnel.service"
import type { HeureVacataire } from "@/services/heures-vacataires.service"

const formatMontant = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`

export default function PointagePage() {
  const [heures, setHeures] = useState<HeureVacataire[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState("")
  const [date, setDate] = useState("")
  const [heuresTravaillees, setHeuresTravaillees] = useState("")
  const [tauxHoraire, setTauxHoraire] = useState("")
  const [motif, setMotif] = useState("")
  const [classe, setClasse] = useState("")
  const [matiere, setMatiere] = useState("")
  const [filterStatut, setFilterStatut] = useState("tous")
  const [filterPersonnel, setFilterPersonnel] = useState("tous")
  const [filterMois, setFilterMois] = useState("tous")

  const refresh = () => setHeures(serviceHeuresVacataires.obtenirToutesLesHeures())

  useEffect(() => {
    refresh()
    setPersonnel(servicePersonnel.obtenirToutLePersonnel())
  }, [])

  const filteredHeures = useMemo(() => heures.filter((heure) => {
    const d = new Date(heure.date)
    const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    return (filterStatut === "tous" || heure.statut === filterStatut)
      && (filterPersonnel === "tous" || heure.vacataireId === filterPersonnel)
      && (filterMois === "tous" || mois === filterMois)
  }), [heures, filterStatut, filterPersonnel, filterMois])

  const moisDisponibles = useMemo(() => Array.from(new Set(heures.map((h) => {
    const d = new Date(h.date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }))).sort().reverse(), [heures])

  const statistiques = useMemo(() => ({
    heures: filteredHeures.reduce((sum, h) => sum + h.heuresTravaillees, 0),
    montant: filteredHeures.reduce((sum, h) => sum + h.montant, 0),
    attente: filteredHeures.filter((h) => h.statut === "en_attente").length,
  }), [filteredHeures])

  const getNom = (id: string) => {
    const p = personnel.find((item) => item.id === id)
    return p ? `${p.prenom} ${p.nom}` : "Personnel inconnu"
  }

  const handleAjouter = () => {
    if (!selectedPersonnel || !date || !heuresTravaillees || !tauxHoraire) {
      alert("Veuillez renseigner le personnel, la date, le nombre d'heures et le taux horaire.")
      return
    }

    serviceHeuresVacataires.creerHeure({
      vacataireId: selectedPersonnel,
      date,
      heuresTravaillees: Number(heuresTravaillees),
      tauxHoraire: Number(tauxHoraire),
      motif: motif || undefined,
      classe: classe || undefined,
      matiere: matiere || undefined,
      statut: "en_attente",
    })

    refresh()
    setShowAddModal(false)
    setSelectedPersonnel("")
    setDate("")
    setHeuresTravaillees("")
    setTauxHoraire("")
    setMotif("")
    setClasse("")
    setMatiere("")
  }

  const handleValider = (id: string) => {
    serviceHeuresVacataires.validerHeure(id, "Administrateur")
    refresh()
  }

  const handleSupprimer = (id: string) => {
    if (confirm("Supprimer cette saisie de pointage ?")) {
      serviceHeuresVacataires.supprimerHeure(id)
      refresh()
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Personnel · Suivi du temps</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Pointage</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Consultez et validez les heures enregistrées pour le personnel de l'établissement.
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle saisie
          </Button>
        </div>
      </header>

      <section className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Filtres</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <div>
            <Label>Personnel</Label>
            <Select value={filterPersonnel} onValueChange={setFilterPersonnel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Tout le personnel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tout le personnel</SelectItem>
                {personnel.map((p) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mois</Label>
            <Select value={filterMois} onValueChange={setFilterMois}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Tous les mois" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les mois</SelectItem>
                {moisDisponibles.map((mois) => (
                  <SelectItem key={mois} value={mois}>
                    {new Date(`${mois}-01T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous</SelectItem>
                <SelectItem value="en_attente">À valider</SelectItem>
                <SelectItem value="valide">Validées</SelectItem>
                <SelectItem value="paye">Payées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white">
        <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-4"><p className="text-xs text-gray-500">Heures enregistrées</p><p className="mt-1 text-xl font-semibold text-gray-900">{statistiques.heures} h</p></div>
          <div className="px-4 py-4"><p className="text-xs text-gray-500">Montant correspondant</p><p className="mt-1 text-xl font-semibold text-gray-900">{formatMontant(statistiques.montant)}</p></div>
          <div className="px-4 py-4"><p className="text-xs text-gray-500">Saisies à valider</p><p className="mt-1 text-xl font-semibold text-gray-900">{statistiques.attente}</p></div>
        </div>
      </section>

      <section className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Saisies de pointage</h2>
          <p className="mt-1 text-xs text-gray-500">Les saisies validées alimentent le suivi de paie.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Personnel</th>
                <th className="px-4 py-3 text-left font-medium">Activité</th>
                <th className="px-4 py-3 text-right font-medium">Heures</th>
                <th className="px-4 py-3 text-right font-medium">Taux</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHeures.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Aucune saisie pour ces critères.</td></tr>
              ) : filteredHeures.map((heure) => (
                <tr key={heure.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">{new Date(heure.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 font-medium">{getNom(heure.vacataireId)}</td>
                  <td className="px-4 py-3">{heure.matiere || heure.motif || "—"}{heure.classe ? ` · ${heure.classe}` : ""}</td>
                  <td className="px-4 py-3 text-right">{heure.heuresTravaillees} h</td>
                  <td className="px-4 py-3 text-right">{formatMontant(heure.tauxHoraire)}/h</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMontant(heure.montant)}</td>
                  <td className="px-4 py-3">
                    {heure.statut === "en_attente" ? <span className="inline-flex items-center gap-1 text-amber-700"><Clock className="h-4 w-4" />À valider</span>
                      : heure.statut === "valide" ? <span className="inline-flex items-center gap-1 text-green-700"><Check className="h-4 w-4" />Validée</span>
                      : <span className="inline-flex items-center gap-1 text-blue-700"><Check className="h-4 w-4" />Payée</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {heure.statut === "en_attente" && <Button variant="outline" size="sm" onClick={() => handleValider(heure.id)}><Check className="mr-1 h-4 w-4" />Valider</Button>}
                    {heure.statut !== "paye" && <Button variant="ghost" size="sm" onClick={() => handleSupprimer(heure.id)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="pointage-modal-title">
          <div className="w-full max-w-lg border border-gray-200 bg-white p-6 shadow-xl">
            <h2 id="pointage-modal-title" className="text-lg font-semibold text-gray-900">Nouvelle saisie de pointage</h2>
            <p className="mb-5 mt-1 text-sm text-gray-500">Renseignez la prestation ou les heures à enregistrer.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2"><Label>Personnel *</Label><Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}><SelectTrigger><SelectValue placeholder="Sélectionner un membre du personnel" /></SelectTrigger><SelectContent>{personnel.map((p) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Heures effectuées *</Label><Input type="number" min="0.5" step="0.5" value={heuresTravaillees} onChange={(e) => setHeuresTravaillees(e.target.value)} placeholder="2" /></div>
              <div className="space-y-2"><Label>Taux horaire (FCFA) *</Label><Input type="number" min="0" value={tauxHoraire} onChange={(e) => setTauxHoraire(e.target.value)} placeholder="5000" /></div>
              <div className="space-y-2"><Label>Classe</Label><Input value={classe} onChange={(e) => setClasse(e.target.value)} placeholder="6e A" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Matière ou activité</Label><Input value={matiere} onChange={(e) => setMatiere(e.target.value)} placeholder="Mathématiques" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Motif</Label><Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Remplacement, cours supplémentaire..." /></div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button><Button onClick={handleAjouter}>Enregistrer</Button></div>
          </div>
        </div>
      )}
    </div>
  )
}
