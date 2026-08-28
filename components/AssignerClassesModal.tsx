"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useClasses } from "@/hooks/useClasses"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"
import { CheckCircle, X } from "lucide-react"

interface AssignerClassesModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
  onSuccess?: () => void
}

export function AssignerClassesModal({ isOpen, onClose, enseignant, onSuccess }: AssignerClassesModalProps) {
  const { classes } = useClasses()
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const classesParId = useMemo(() => new Map(classes.map((classe) => [classe.id, classe])), [classes])

  useEffect(() => {
    if (!enseignant || !isOpen) return
    const affectations = enseignant.classes
      .map((value) => classesParId.has(value) ? value : classes.find((classe) => classe.nom === value)?.id)
      .filter((id): id is string => Boolean(id))
    setClassesSelectionnees([...new Set(affectations)])
    setError(null)
  }, [classes, classesParId, enseignant, isOpen])

  const nomClasse = (classeId: string) => classesParId.get(classeId)?.nom ?? classeId
  const handleClasseToggle = (classeId: string) => setClassesSelectionnees((current) => current.includes(classeId) ? current.filter((id) => id !== classeId) : [...current, classeId])

  const handleSubmit = async () => {
    if (!enseignant) return
    setLoading(true)
    setError(null)
    try {
      const anciennesClasses = enseignant.classes
        .map((value) => classesParId.has(value) ? value : classes.find((classe) => classe.nom === value)?.id)
        .filter((id): id is string => Boolean(id))
      const nouvellesClasses = classesSelectionnees.filter((id) => classesParId.has(id))
      if (!serviceEnseignants.assignerClasses(enseignant.id, nouvellesClasses)) throw new Error("Impossible d'enregistrer les affectations de cet enseignant.")

      for (const classeId of nouvellesClasses) {
        if (!anciennesClasses.includes(classeId)) serviceEnseignants.enregistrerAffectationHistorique({ enseignantId: enseignant.id, type: "classe", ancienneValeur: "", nouvelleValeur: nomClasse(classeId), motif: "Assignation de classe" })
      }
      for (const classeId of anciennesClasses) {
        if (!nouvellesClasses.includes(classeId)) serviceEnseignants.enregistrerAffectationHistorique({ enseignantId: enseignant.id, type: "classe", ancienneValeur: nomClasse(classeId), nouvelleValeur: "", motif: "Retrait de classe" })
      }

      setSuccess(true)
      onSuccess?.()
      window.setTimeout(() => { setSuccess(false); onClose() }, 1200)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'enregistrer les affectations.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => { setClassesSelectionnees([]); setSuccess(false); setError(null); onClose() }
  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader><DialogTitle className="flex items-center gap-2">Assigner des classes <Badge variant="secondary">{enseignant.prenom} {enseignant.nom}</Badge></DialogTitle></DialogHeader>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-sm">Classes assignées ({classesSelectionnees.length})</CardTitle></CardHeader><CardContent>
            {classesSelectionnees.length === 0 ? <p className="text-sm text-muted-foreground">Aucune classe assignée.</p> : <div className="flex flex-wrap gap-2">{classesSelectionnees.map((classeId) => <Badge key={classeId} className="flex items-center gap-1">{nomClasse(classeId)}<button type="button" onClick={() => handleClasseToggle(classeId)} aria-label={`Retirer ${nomClasse(classeId)}`}><X className="h-3 w-3" /></button></Badge>)}</div>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Classes disponibles</CardTitle></CardHeader><CardContent>
            {classes.length === 0 ? <p className="text-sm text-muted-foreground">Créez d’abord une classe dans le module Classes.</p> : <div className="grid gap-3 sm:grid-cols-2">{classes.map((classe) => { const inputId = `classe-${classe.id}`; return <div key={classe.id} className="flex items-center gap-2"><Checkbox id={inputId} checked={classesSelectionnees.includes(classe.id)} onCheckedChange={() => handleClasseToggle(classe.id)} /><Label htmlFor={inputId} className="cursor-pointer text-sm font-normal">{classe.nom} <span className="text-muted-foreground">— {classe.niveau}</span></Label></div> })}</div>}
          </CardContent></Card>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={handleClose} disabled={loading}>Annuler</Button><Button onClick={handleSubmit} disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</Button></DialogFooter>
        {success && <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/95"><div className="text-center"><CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" /><h3 className="text-lg font-semibold">Affectations enregistrées</h3><p className="text-sm text-muted-foreground">Les classes de {enseignant.prenom} {enseignant.nom} ont été mises à jour.</p></div></div>}
      </DialogContent>
    </Dialog>
  )
}
