"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useClasses } from "@/hooks/useClasses"
import { useAuthentification } from "@/providers/authentification.provider"
import { serviceMatieres } from "@/services/matieres.service"
import { serviceAffectationsEnseignants, type AffectationEnseignant } from "@/services/affectations-enseignants.service"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"

interface AssignerClassesModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
  onSuccess?: () => void
}

export function AssignerClassesModal({ isOpen, onClose, enseignant, onSuccess }: AssignerClassesModalProps) {
  const { classes } = useClasses()
  const [selected, setSelected] = useState<string[]>([])
  const [subjectByClass, setSubjectByClass] = useState<Record<string, string>>({})
  const [weeklyHoursByClass, setWeeklyHoursByClass] = useState<Record<string, string>>({})
  const [subjects, setSubjects] = useState<Array<{id:string;name:string}>>([])
  const [assignments, setAssignments] = useState<AffectationEnseignant[]>([])
  const { etablissementActif } = useAuthentification()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(classes.map((classe) => [classe.id, classe])), [classes])

  useEffect(() => {
    if (!isOpen || !enseignant || !etablissementActif?.id) return
    let cancelled = false
    const load = async () => {
      try {
        const [allSubjects, currentAssignments] = await Promise.all([
          serviceMatieres.obtenirToutesLesMatieres(etablissementActif.id),
          serviceAffectationsEnseignants.obtenir(enseignant.id, etablissementActif.id),
        ])
        if (cancelled) return
        setSubjects(allSubjects.filter((s: any) => s.id && s.nom).map((s: any) => ({ id: s.id, name: s.nom })))
        setAssignments(currentAssignments)
        setSelected([...new Set(currentAssignments.map((a) => a.classId))])
        const nextSubjects: Record<string,string> = {}
        const nextHours: Record<string,string> = {}
        currentAssignments.forEach((a) => { nextSubjects[a.classId] = a.subjectId; nextHours[a.classId] = a.weeklyHours == null ? "" : String(a.weeklyHours) })
        setSubjectByClass(nextSubjects)
        setWeeklyHoursByClass(nextHours)
        setError(null)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Impossible de charger les affectations.")
      }
    }
    void load()
    return () => { cancelled = true }
  }, [isOpen, enseignant, etablissementActif?.id])


  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  const save = async () => {
    if (!enseignant || !etablissementActif?.id) return
    setLoading(true)
    setError(null)
    try {
      const currentByClass = new Map(assignments.map((a) => [a.classId, a]))
      for (const classId of selected) {
        const subjectId = subjectByClass[classId]
        if (!subjectId) throw new Error("Chaque classe sélectionnée doit avoir une matière.")
        const existing = currentByClass.get(classId)
        if (!existing) {
          await serviceAffectationsEnseignants.ajouter({
            teacherId: enseignant.id,
            classId,
            subjectId,
            weeklyHours: weeklyHoursByClass[classId] ? Number(weeklyHoursByClass[classId]) : null,
          })
        }
      }
      for (const existing of assignments) {
        if (!selected.includes(existing.classId)) await serviceAffectationsEnseignants.supprimer(existing.id)
      }
      onSuccess?.()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Les affectations n'ont pas pu être enregistrées.")
    } finally {
      setLoading(false)
    }
  }
  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Affecter des classes et matières</DialogTitle>
          <DialogDescription>
            Choisissez les classes de {enseignant.prenom} {enseignant.nom}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Pour chaque classe, choisissez la matière que cet enseignant est autorisé à enseigner.
          </div>
          {classes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune classe disponible.</p>
          ) : (
            <div className="space-y-2" role="group" aria-label="Classes et matières">
              {classes.map((classe) => {
                const active = selected.includes(classe.id)
                return (
                  <div key={classe.id} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox id={`classe-${classe.id}`} checked={active} onCheckedChange={() => toggle(classe.id)} />
                      <Label htmlFor={`classe-${classe.id}`} className="font-medium cursor-pointer">{classe.nom}</Label>
                    </div>
                    {active && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                        <select
                          className="border rounded px-3 py-2 bg-background"
                          value={subjectByClass[classe.id] ?? ""}
                          onChange={(e) => setSubjectByClass((v) => ({...v, [classe.id]: e.target.value}))}
                        >
                          <option value="">Choisir une matière</option>
                          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                        </select>
                        <input
                          type="number" min="0" step="0.5" placeholder="Heures / semaine"
                          className="border rounded px-3 py-2 bg-background"
                          value={weeklyHoursByClass[classe.id] ?? ""}
                          onChange={(e) => setWeeklyHoursByClass((v) => ({...v, [classe.id]: e.target.value}))}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {subjects.length === 0 && classes.length > 0 && <p className="text-sm text-amber-600">Aucune matière n'est encore configurée dans cet établissement.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={() => void save()} disabled={loading || classes.length === 0}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
