"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Clock3, LogIn, LogOut, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { serviceEnseignants } from "@/services/enseignants.service"
import { servicePointage, type Pointage } from "@/services/pointage.service"
import type { DonneesEnseignant } from "@/types/models"

export default function PointageEnseignantPage() {
  const params = useParams()
  const router = useRouter()
  const enseignantId = params.enseignantId as string
  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [pointages, setPointages] = useState<Pointage[]>([])
  const [message, setMessage] = useState("")

  const charger = () => {
    const tous = servicePointage.obtenirPointagesParPersonnel(enseignantId)
    setPointages([...tous].sort((a, b) => b.date.localeCompare(a.date)))
  }

  useEffect(() => {
    const tous = serviceEnseignants.obtenirTousLesEnseignants()
    setEnseignant(tous.find((item) => item.id === enseignantId) ?? null)
    charger()
  }, [enseignantId])

  const actuel = useMemo(() => servicePointage.obtenirPointage(enseignantId, date), [enseignantId, date, pointages])

  const action = (fn: () => Pointage | null, success: string) => {
    const result = fn()
    if (!result) {
      setMessage("Aucun pointage à compléter pour cette date.")
      return
    }
    setMessage(success)
    charger()
  }

  if (!enseignant) return <div className="p-6">Enseignant introuvable.</div>

  return (
    <main className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" />Présence / pointage — {enseignant.prenom} {enseignant.nom}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm font-medium">Date<input type="date" className="mt-1 block rounded-md border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => action(() => servicePointage.enregistrerArrivee(enseignantId, date), "Arrivée enregistrée.")}><LogIn className="mr-2 h-4 w-4" />Enregistrer l'arrivée</Button>
                <Button variant="outline" onClick={() => action(() => servicePointage.enregistrerDepart(enseignantId, date), "Départ enregistré.")}><LogOut className="mr-2 h-4 w-4" />Enregistrer le départ</Button>
                <Button variant="outline" onClick={() => { servicePointage.enregistrerAbsence(enseignantId, date, "Absence enregistrée par l'administration"); setMessage("Absence enregistrée."); charger() }}><UserX className="mr-2 h-4 w-4" />Marquer absent</Button>
              </div>
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40 text-left"><th className="p-3">Date</th><th className="p-3">Statut</th><th className="p-3">Arrivée</th><th className="p-3">Départ</th><th className="p-3">Conforme emploi</th></tr></thead>
                <tbody>
                  {pointages.map((p) => <tr key={p.id} className="border-b last:border-0"><td className="p-3">{new Date(p.date).toLocaleDateString("fr-FR")}</td><td className="p-3"><Badge variant="outline">{p.statut}</Badge></td><td className="p-3">{p.heureArrivee ?? "—"}</td><td className="p-3">{p.heureDepart ?? "—"}</td><td className="p-3">{p.conformeEmploiDuTemps == null ? "—" : p.conformeEmploiDuTemps ? "Oui" : "Non"}</td></tr>)}
                  {!pointages.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun pointage enregistré.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
