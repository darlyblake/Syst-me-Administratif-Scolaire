"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Clock } from "lucide-react"
import { serviceParametres } from "@/services/parametres.service"
import type { HorairesGeneraux } from "@/types/models"

interface ConfigurationHorairesModalProps {
  children: React.ReactNode
}

export function ConfigurationHorairesModal({ children }: ConfigurationHorairesModalProps) {
  const [open, setOpen] = useState(false)
  const [horaires, setHoraires] = useState<HorairesGeneraux[]>([])
  const [loading, setLoading] = useState(false)

  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const

  useEffect(() => {
    if (open) {
      chargerHoraires()
    }
  }, [open])

  const chargerHoraires = () => {
    const horairesExistants = serviceParametres.obtenirHorairesGeneraux()
    setHoraires(horairesExistants)
  }

  const mettreAJourHoraire = (jour: HorairesGeneraux["jour"], champ: keyof HorairesGeneraux, valeur: any) => {
    setHoraires(prev => prev.map(h => {
      if (h.jour === jour) {
        return { ...h, [champ]: valeur }
      }
      return h
    }))
  }

  const sauvegarderHoraires = async () => {
    setLoading(true)
    try {
      serviceParametres.mettreAJourHorairesGeneraux(horaires)
      setOpen(false)
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
    } finally {
      setLoading(false)
    }
  }

  const reinitialiserHoraires = () => {
    // Créer les horaires par défaut manuellement
    const horairesDefaut: HorairesGeneraux[] = [
      {
        id: "lundi-default",
        jour: "lundi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "mardi-default",
        jour: "mardi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "mercredi-default",
        jour: "mercredi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "jeudi-default",
        jour: "jeudi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "vendredi-default",
        jour: "vendredi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "samedi-default",
        jour: "samedi",
        heureOuverture: "08:00",
        heureFermeture: "12:00",
        actif: true
      }
    ]
    setHoraires(horairesDefaut)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration des horaires scolaires
          </DialogTitle>
          <DialogDescription>
            Définissez les horaires d'ouverture et de fermeture de l'école pour chaque jour de la semaine.
            Ces horaires seront utilisés pour générer automatiquement la grille horaire des enseignants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={reinitialiserHoraires}>
              Réinitialiser aux valeurs par défaut
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button onClick={sauvegarderHoraires} disabled={loading}>
                {loading ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
          </div>

          {/* Configuration par jour */}
          <div className="grid gap-4">
            {jours.map((jour) => {
              const horaireJour = horaires.find(h => h.jour === jour)
              if (!horaireJour) return null

              return (
                <Card key={jour}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="capitalize">{jour}</span>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`${jour}-actif`} className="text-sm">
                          Actif
                        </Label>
                        <Switch
                          id={`${jour}-actif`}
                          checked={horaireJour.actif}
                          onCheckedChange={(checked) =>
                            mettreAJourHoraire(jour, "actif", checked)
                          }
                        />
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Configurez les horaires pour le {jour}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {horaireJour.actif && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Horaires d'ouverture et fermeture */}
                        <div className="space-y-2">
                          <Label htmlFor={`${jour}-ouverture`}>Heure d'ouverture</Label>
                          <Input
                            id={`${jour}-ouverture`}
                            type="time"
                            value={horaireJour.heureOuverture}
                            onChange={(e) =>
                              mettreAJourHoraire(jour, "heureOuverture", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${jour}-fermeture`}>Heure de fermeture</Label>
                          <Input
                            id={`${jour}-fermeture`}
                            type="time"
                            value={horaireJour.heureFermeture}
                            onChange={(e) =>
                              mettreAJourHoraire(jour, "heureFermeture", e.target.value)
                            }
                          />
                        </div>

                        {/* Pauses matin */}
                        <div className="space-y-2">
                          <Label htmlFor={`${jour}-pause-debut-matin`}>
                            Début pause matin
                          </Label>
                          <Input
                            id={`${jour}-pause-debut-matin`}
                            type="time"
                            value={horaireJour.pauseDebutMatin || ""}
                            onChange={(e) =>
                              mettreAJourHoraire(jour, "pauseDebutMatin", e.target.value || undefined)
                            }
                            placeholder="Optionnel"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${jour}-pause-fin-matin`}>
                            Fin pause matin
                          </Label>
                          <Input
                            id={`${jour}-pause-fin-matin`}
                            type="time"
                            value={horaireJour.pauseFinMatin || ""}
                            onChange={(e) =>
                              mettreAJourHoraire(jour, "pauseFinMatin", e.target.value || undefined)
                            }
                            placeholder="Optionnel"
                          />
                        </div>

                        {/* Pauses après-midi */}
                        <div className="space-y-2">
                          <Label htmlFor={`${jour}-pause-debut-apres-midi`}>
                            Début pause après-midi
                          </Label>
                          <Input
                            id={`${jour}-pause-debut-apres-midi`}
                            type="time"
                            value={horaireJour.pauseDebutApresMidi || ""}
                            onChange={(e) =>
                              mettreAJourHoraire(jour, "pauseDebutApresMidi", e.target.value || undefined)
                            }
                            placeholder="Optionnel"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${jour}-pause-fin-apres-midi`}>
                            Fin pause après-midi
                          </Label>
                          <Input
                            id={`${jour}-pause-fin-apres-midi`}
                            type="time"
                            value={horaireJour.pauseFinApresMidi || ""}
                            onChange={(e) =>
                              mettreAJourHoraire(jour, "pauseFinApresMidi", e.target.value || undefined)
                            }
                            placeholder="Optionnel"
                          />
                        </div>
                      </div>
                    )}

                    {!horaireJour.actif && (
                      <div className="text-center py-4 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Ce jour n'est pas actif</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Informations sur les horaires générés */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aperçu des créneaux générés</CardTitle>
              <CardDescription>
                Ces créneaux seront utilisés pour la grille horaire des enseignants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {jours.slice(0, 3).map(jour => {
                  const horaire = horaires.find(h => h.jour === jour && h.actif)
                  if (!horaire) return null

                  const creneaux = serviceParametres.genererCreneauxHoraires(jour, 30)
                  return (
                    <div key={jour}>
                      <h4 className="font-medium capitalize">{jour}</h4>
                      <p className="text-gray-600">
                        {creneaux.length} créneaux ({creneaux[0]} - {creneaux[creneaux.length - 1]})
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
