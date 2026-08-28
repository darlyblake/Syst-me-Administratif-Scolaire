"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useClasses } from "@/hooks/useClasses"
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(classes.map((classe) => [classe.id, classe])), [classes])

  useEffect(() => {
    if (!isOpen || !enseignant) return
    const ids = enseignant.classes
      .map((value) => byId.has(value) ? value : classes.find((classe) => classe.nom === value)?.id)
      .filter((id): id is string => Boolean(id))
    setSelected([...new Set(ids)])
    setError(null)
  }, [isOpen, enseignant, classes, byId])

  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  const save = () => {
    if (!enseignant) return
    setLoading(true)
    setError(null)
    try {
      const previous = enseignant.classes
        .map((value) => byId.has(value) ? value : classes.find((classe) => classe.nom === value)?.id)
        .filter((id): id is string => Boolean(id))
      if (!serviceEnseignants.assignerClasses(enseignant.id, selected)) {
        throw new Error("Les affectations n'ont pas pu être enregistrées.")
      }

      selected.filter((id) => !previous.includes(id)).forEach((id) => {
        serviceEnseignants.enregistrerAffectationHistorique({
          enseignantId: enseignant.id,
          type: "classe",
          ancienneValeur: "",
          nouvelleValeur: byId.get(id)?.nom ?? id,
          motif: "Assignation de classe",
        })
      })
      previous.filter((id) => !selected.includes(id)).forEach((id) => {
        serviceEnseignants.enregistrerAffectationHistorique({
          enseignantId: enseignant.id,
          type: "classe",
          ancienneValeur: byId.get(id)?.nom ?? id,
          nouvelleValeur: "",
          motif: "Retrait de classe",
        })
      })

      onSuccess?.()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Affecter des classes</DialogTitle>
          <DialogDescription>
            Choisissez les classes de {enseignant.prenom} {enseignant.nom}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Classes sélectionnées</span>
            <strong>{selected.length}</strong>
          </div>
          <Separator />

          {classes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune classe disponible. Créez d'abord une classe.
            </p>
          ) : (
            <div className="space-y-1" role="group" aria-label="Classes disponibles">
              {classes.map((classe) => {
                const id = `classe-${classe.id}`
                return (
                  <div key={classe.id} className="flex items-center gap-3 rounded-md border px-3 py-2.5">
                    <Checkbox id={id} checked={selected.includes(classe.id)} onCheckedChange={() => toggle(classe.id)} />
                    <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
                      <span className="font-medium">{classe.nom}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{classe.niveau} · {classe.capacite} places</span>
                    </Label>
                  </div>
                )
              })}
            </div>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={save} disabled={loading || classes.length === 0}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
