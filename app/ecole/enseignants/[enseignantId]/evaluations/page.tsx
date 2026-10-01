"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { serviceEnseignants } from "@/services/enseignants.service"
import { serviceEvaluation, type Evaluation } from "@/services/evaluation.service"
import type { DonneesEnseignant } from "@/types/models"

export default function EvaluationsEnseignantPage() {
  const params = useParams()
  const router = useRouter()
  const enseignantId = params.enseignantId as string
  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [items, setItems] = useState<Evaluation[]>([])
  const [note, setNote] = useState("5")
  const [commentaire, setCommentaire] = useState("")

  const charger = () => setItems(serviceEvaluation.obtenirEvaluationsPersonnel(enseignantId).sort((a, b) => b.date.localeCompare(a.date)))

  useEffect(() => {
    setEnseignant(serviceEnseignants.obtenirTousLesEnseignants().find((item) => item.id === enseignantId) ?? null)
    charger()
  }, [enseignantId])

  if (!enseignant) return <div className="p-6">Enseignant introuvable.</div>

  const enregistrer = () => {
    const valeur = Number(note)
    if (!Number.isFinite(valeur) || valeur < 0 || valeur > 10) return
    serviceEvaluation.ajouterEvaluation({
      personnelId: enseignantId,
      type: "administration",
      date: new Date().toISOString().slice(0, 10),
      note: valeur,
      commentaire,
      criteres: { pedagogie: valeur, ponctualite: valeur, communication: valeur, discipline: valeur },
    })
    setCommentaire("")
    charger()
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" />Évaluations — {enseignant.prenom} {enseignant.nom}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
              <label className="text-sm font-medium">Note / 10<input type="number" min="0" max="10" step="0.5" className="mt-1 block w-full rounded-md border px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <label className="text-sm font-medium">Commentaire<textarea className="mt-1 min-h-10 w-full rounded-md border px-3 py-2" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Commentaire de l'administration" /></label>
              <Button className="self-end" onClick={enregistrer}>Enregistrer</Button>
            </div>
            <div className="space-y-2">
              {items.map((item) => <div key={item.id} className="rounded-md border p-3"><div className="flex items-center justify-between gap-3"><strong>{new Date(item.date).toLocaleDateString("fr-FR")}</strong><span className="font-semibold">{item.note}/10</span></div><p className="text-sm text-muted-foreground mt-1">{item.commentaire || "Sans commentaire"}</p></div>)}
              {!items.length && <p className="py-8 text-center text-muted-foreground">Aucune évaluation enregistrée.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
