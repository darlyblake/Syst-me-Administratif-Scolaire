"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, CheckCircle, Clock, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { serviceHeuresVacataires } from "@/services/heures-vacataires.service"
import { servicePersonnel } from "@/services/personnel.service"
import type { HeureVacataire } from "@/services/heures-vacataires.service"

const formatMontant = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`

export default function HeuresVacatairesPage() {
  const [heures, setHeures] = useState<HeureVacataire[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedVacataire, setSelectedVacataire] = useState("")
  const [date, setDate] = useState("")
  const [heuresTravaillees, setHeuresTravaillees] = useState("")
  const [tauxHoraire, setTauxHoraire] = useState("")
  const [motif, setMotif] = useState("")
  const [classe, setClasse] = useState("")
  const [matiere, setMatiere] = useState("")
  const [filterStatut, setFilterStatut] = useState("tous")
  const [filterVacataire, setFilterVacataire] = useState("tous")
  const [filterMois, setFilterMois] = useState("tous")

  const refresh = () => setHeures(serviceHeuresVacataires.obtenirToutesLesHeures())

  useEffect(() => {
    refresh()
    setPersonnel(servicePersonnel.obtenirToutLePersonnel())
  }, [])

  const filteredHeures = useMemo(() => {
    return heures.filter((heure) => {
      const d = new Date(heure.date)
      const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      return (filterStatut === "tous" || heure.statut === filterStatut)
        && (filterVacataire === "tous" || heure.vacataireId === filterVacataire)
        && (filterMois === "tous" || mois === filterMois)
    })
  }, [heures, filterStatut, filterVacataire, filterMois])

  const moisDisponibles = useMemo(() => {
    return Array.from(new Set(heures.map((h) => {
      const d = new Date(h.date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    }))).sort().reverse()
  }, [heures])

  const statistiques = useMemo(() => ({
    heures: filteredHeures.reduce((sum, h) => sum + h.heuresTravaillees, 0),
    montant: filteredHeures.reduce((sum, h) => sum + h.montant, 0),
    attente: filteredHeures.filter((h) => h.statut === "en_attente").length,
    validees: filteredHeures.filter((h) => h.statut === "valide").length,
  }), [filteredHeures])

  const getNom = (id: string) => {
    const p = personnel.find((item) => item.id === id)
    return p ? `${p.prenom} ${p.nom}` : "Vacataire inconnu"
  }

  const handleAjouter = () => {
    if (!selectedVacataire || !date || !heuresTravaillees || !tauxHoraire) {
      alert("Veuillez renseigner le vacataire, la date, le nombre d'heures et le taux horaire.")
      return
    }

    serviceHeuresVacataires.creerHeure({
      vacataireId: selectedVacataire,
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
    setSelectedVacataire("")
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
    if (confirm("Supprimer cette saisie d'heures ?")) {
      serviceHeuresVacataires.supprimerHeure(id)
      refresh()
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/personnel"><ArrowLeft className="mr-2 h-4 w-4" />Personnel</Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Clock className="h-6 w-6" />Heures vacataires
            </h1>
            <p className="text-sm text-gray-600">Saisir et valider les heures effectuées par les personnels vacataires.</p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="w-full md:w-56">
              <Label>Vacataire</Label>
              <Select value={filterVacataire} onValueChange={setFilterVacataire}>
                <SelectTrigger><SelectValue placeholder="Tous les vacataires" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les vacataires</SelectItem>
                  {personnel.map((p) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label>Mois</Label>
              <Select value={filterMois} onValueChange={setFilterMois}>
                <SelectTrigger><SelectValue placeholder="Tous les mois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les mois</SelectItem>
                  {moisDisponibles.map((mois) => <SelectItem key={mois} value={mois}>{new Date(`${mois}-01T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label>Statut</Label>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous</SelectItem>
                  <SelectItem value="en_attente">À valider</SelectItem>
                  <SelectItem value="valide">Validées</SelectItem>
                  <SelectItem value="paye">Payées</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="md:ml-auto" onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />Ajouter des heures
            </Button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Heures affichées</p><p className="text-2xl font-bold">{statistiques.heures} h</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Montant correspondant</p><p className="text-xl font-bold">{formatMontant(statistiques.montant)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-gray-500">À valider</p><p className="text-2xl font-bold">{statistiques.attente}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Validées</p><p className="text-2xl font-bold">{statistiques.validees}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Vacataire</th>
                    <th className="px-4 py-3 text-left">Activité</th><th className="px-4 py-3 text-right">Heures</th>
                    <th className="px-4 py-3 text-right">Taux</th><th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredHeures.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Aucune heure enregistrée pour ces critères.</td></tr>
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
                          : heure.statut === "valide" ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle className="h-4 w-4" />Validée</span>
                          : <span className="inline-flex items-center gap-1 text-blue-700"><CheckCircle className="h-4 w-4" />Payée</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {heure.statut === "en_attente" && <Button variant="outline" size="sm" onClick={() => handleValider(heure.id)}><CheckCircle className="mr-1 h-4 w-4" />Valider</Button>}
                        {heure.statut !== "paye" && <Button variant="ghost" size="sm" onClick={() => handleSupprimer(heure.id)}><Trash2 className="h-4 w-4" /></Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-gray-500">Les heures validées servent de base à la paie des vacataires dans le module Finance. Le paiement n'est pas effectué depuis cette page.</p>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-1 text-lg font-semibold">Ajouter des heures</h2>
              <p className="mb-5 text-sm text-gray-500">Enregistrez une prestation réalisée par un vacataire.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label>Vacataire *</Label><Select value={selectedVacataire} onValueChange={setSelectedVacataire}><SelectTrigger><SelectValue placeholder="Sélectionner un vacataire" /></SelectTrigger><SelectContent>{personnel.map((p) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}</SelectContent></Select></div>
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
    </div>
  )
}
