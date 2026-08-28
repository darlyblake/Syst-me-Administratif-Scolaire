"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Clock } from "lucide-react"
import { serviceParametres } from "@/services/parametres.service"
import type { HorairesGeneraux } from "@/types/models"

interface ConfigurationHorairesModalProps {
  children: React.ReactNode
}

const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

export function ConfigurationHorairesModal({ children }: ConfigurationHorairesModalProps) {
  const [open, setOpen] = useState(false)
  const [horaires, setHoraires] = useState<HorairesGeneraux[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setHoraires(serviceParametres.obtenirHorairesGeneraux())
  }, [open])

  const mettreAJourHoraire = <K extends keyof HorairesGeneraux>(
    jour: string,
    champ: K,
    valeur: HorairesGeneraux[K],
  ) => {
    setHoraires((prev) =>
      prev.map((horaire) =>
        horaire.jour === jour ? { ...horaire, [champ]: valeur } : horaire,
      ),
    )
  }

  const sauvegarder = () => {
    setLoading(true)
    setError(null)
    try {
      serviceParametres.mettreAJourHorairesGeneraux(horaires)
      setOpen(false)
    } catch {
      setError("Impossible d'enregistrer les horaires. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  const reinitialiser = () => {
    setHoraires(serviceParametres.getHorairesParDefaut())
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horaires scolaires</DialogTitle>
          <DialogDescription>
            Définissez les horaires d'ouverture, de fermeture et les pauses de chaque jour.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y border-y">
          {jours.map((jour) => {
            const horaire = horaires.find((item) => item.jour === jour)
            if (!horaire) return null

            return (
              <section key={jour} className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium capitalize">{jour}</p>
                    <p className="text-sm text-muted-foreground">
                      {horaire.actif
                        ? `${horaire.heureOuverture} – ${horaire.heureFermeture}`
                        : "Jour non travaillé"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${jour}-actif`} className="text-sm">Actif</Label>
                    <Switch
                      id={`${jour}-actif`}
                      checked={horaire.actif}
                      onCheckedChange={(value) => mettreAJourHoraire(jour, "actif", value)}
                    />
                  </div>
                </div>

                {horaire.actif && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`${jour}-ouverture`}>Ouverture</Label>
                      <Input
                        id={`${jour}-ouverture`}
                        type="time"
                        value={horaire.heureOuverture}
                        onChange={(e) => mettreAJourHoraire(jour, "heureOuverture", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${jour}-fermeture`}>Fermeture</Label>
                      <Input
                        id={`${jour}-fermeture`}
                        type="time"
                        value={horaire.heureFermeture}
                        onChange={(e) => mettreAJourHoraire(jour, "heureFermeture", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${jour}-pause-matin`}>Pause matin</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          id={`${jour}-pause-matin`}
                          aria-label={`Début pause matin ${jour}`}
                          type="time"
                          value={horaire.pauseDebutMatin ?? ""}
                          onChange={(e) => mettreAJourHoraire(jour, "pauseDebutMatin", e.target.value || undefined)}
                        />
                        <Input
                          aria-label={`Fin pause matin ${jour}`}
                          type="time"
                          value={horaire.pauseFinMatin ?? ""}
                          onChange={(e) => mettreAJourHoraire(jour, "pauseFinMatin", e.target.value || undefined)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${jour}-pause-apres-midi`}>Pause après-midi</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          id={`${jour}-pause-apres-midi`}
                          aria-label={`Début pause après-midi ${jour}`}
                          type="time"
                          value={horaire.pauseDebutApresMidi ?? ""}
                          onChange={(e) => mettreAJourHoraire(jour, "pauseDebutApresMidi", e.target.value || undefined)}
                        />
                        <Input
                          aria-label={`Fin pause après-midi ${jour}`}
                          type="time"
                          value={horaire.pauseFinApresMidi ?? ""}
                          onChange={(e) => mettreAJourHoraire(jour, "pauseFinApresMidi", e.target.value || undefined)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="flex items-start gap-3 rounded-md border p-3 text-sm text-muted-foreground">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Ces horaires servent de base à la génération des créneaux des emplois du temps.</p>
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={reinitialiser}>Réinitialiser</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={sauvegarder} disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
