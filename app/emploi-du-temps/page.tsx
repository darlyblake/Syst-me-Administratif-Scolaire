"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { CreneauEmploiDuTemps } from "@/types/models"

const joursSemaine = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
const plagesHoraires = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00",
]

const classesParDefaut = [
  "Maternelle", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème",
  "2nde L", "2nde S", "1ère A1", "1ère A2", "1ère B", "Terminale A1", "Terminale B", "Terminale D", "Terminale S",
]

export default function EmploiDuTempsPage() {
  const [emploisDuTemps, setEmploisDuTemps] = useState<CreneauEmploiDuTemps[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClasse, setSelectedClasse] = useState("CP1")
  const [published, setPublished] = useState(false)

  const chargerEmploisDuTemps = () => {
    setLoading(true)
    try {
      const emplois = serviceEnseignants
        .obtenirTousLesEnseignants()
        .flatMap((enseignant) => serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignant.id))

      setEmploisDuTemps(emplois)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerEmploisDuTemps()
  }, [])

  const classesDisponibles = useMemo(() => {
    const classes = new Set(emploisDuTemps.map((creneau) => creneau.classe).filter(Boolean))
    return classes.size > 0 ? Array.from(classes).sort() : classesParDefaut
  }, [emploisDuTemps])

  const creneauxClasse = useMemo(
    () => emploisDuTemps.filter((creneau) => creneau.classe === selectedClasse),
    [emploisDuTemps, selectedClasse],
  )

  const emploiParJourEtHeure = useMemo(() => {
    const resultat: Record<string, Record<string, CreneauEmploiDuTemps[]>> = {}

    joursSemaine.forEach((jour) => {
      resultat[jour] = {}
      plagesHoraires.forEach((heure) => {
        resultat[jour][heure] = []
      })
    })

    creneauxClasse.forEach((creneau) => {
      if (resultat[creneau.jour]?.[creneau.heureDebut]) {
        resultat[creneau.jour][creneau.heureDebut].push(creneau)
      }
    })

    return resultat
  }, [creneauxClasse])

  const enseignantsClasse = useMemo(() => {
    const ids = new Set(creneauxClasse.map((creneau) => creneau.enseignantId))
    return serviceEnseignants
      .obtenirTousLesEnseignants()
      .filter((enseignant) => ids.has(enseignant.id))
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`))
  }, [creneauxClasse])

  const imprimer = () => {
    if (typeof window !== "undefined") window.print()
  }

  const joursAvecCours = joursSemaine.filter((jour) =>
    creneauxClasse.some((creneau) => creneau.jour === jour),
  ).length

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" asChild aria-label="Retour au tableau de bord">
              <Link href="/tableau-bord">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Emploi du temps</h1>
                {published && <Badge variant="secondary">Publié</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Consultez le planning hebdomadaire de la classe sélectionnée.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={imprimer}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer / PDF
            </Button>
            <Button variant={published ? "outline" : "default"} onClick={() => setPublished((value) => !value)}>
              {published ? "Retirer la publication" : "Publier"}
            </Button>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-sm space-y-2">
            <label htmlFor="classe" className="text-sm font-medium">Classe</label>
            <Select value={selectedClasse} onValueChange={setSelectedClasse}>
              <SelectTrigger id="classe" className="w-full">
                <SelectValue placeholder="Sélectionner une classe" />
              </SelectTrigger>
              <SelectContent>
                {classesDisponibles.map((classe) => (
                  <SelectItem key={classe} value={classe}>{classe}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{creneauxClasse.length}</strong> cours</span>
            <span><strong className="text-foreground">{joursAvecCours}</strong> jours</span>
            <span><strong className="text-foreground">{enseignantsClasse.length}</strong> enseignants</span>
          </div>
        </section>

        {loading ? (
          <section className="rounded-lg border p-10 text-center" aria-live="polite">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <p className="text-sm text-muted-foreground">Chargement de l'emploi du temps…</p>
          </section>
        ) : creneauxClasse.length === 0 ? (
          <section className="rounded-lg border p-10 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-medium">Aucun cours programmé</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun créneau n'est actuellement enregistré pour {selectedClasse}.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="font-medium">Planning de {selectedClasse}</h2>
                <p className="text-sm text-muted-foreground">Semaine scolaire</p>
              </div>
              <Badge variant="outline">{creneauxClasse.length} cours</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <caption className="sr-only">Emploi du temps de la classe {selectedClasse}</caption>
                <thead>
                  <tr className="bg-muted/40">
                    <th scope="col" className="w-32 border-b border-r px-3 py-3 text-left font-medium">Horaire</th>
                    {joursSemaine.map((jour) => (
                      <th key={jour} scope="col" className="border-b px-3 py-3 text-left font-medium capitalize">{jour}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plagesHoraires.map((heure, index) => {
                    const heureSuivante = plagesHoraires[index + 1] ?? "18:30"
                    return (
                      <tr key={heure}>
                        <th scope="row" className="border-b border-r bg-muted/20 px-3 py-3 text-left font-normal text-muted-foreground">
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5" />
                            {heure} – {heureSuivante}
                          </span>
                        </th>
                        {joursSemaine.map((jour) => {
                          const cours = emploiParJourEtHeure[jour]?.[heure] ?? []
                          return (
                            <td key={jour} className="h-20 border-b border-l p-2 align-top">
                              {cours.length > 0 ? (
                                <div className="space-y-1">
                                  {cours.map((creneau) => (
                                    <div key={creneau.id} className="rounded-md border p-2">
                                      <p className="font-medium leading-tight">{creneau.matiere}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {creneau.heureDebut} – {creneau.heureFin}
                                        {creneau.salle ? ` · Salle ${creneau.salle}` : ""}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {creneauxClasse.length > 0 && (
          <section className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="font-medium">Enseignants affectés</h2>
              <p className="text-sm text-muted-foreground">Enseignants ayant au moins un cours dans cette classe.</p>
            </div>
            <div className="divide-y">
              {enseignantsClasse.map((enseignant) => {
                const cours = creneauxClasse.filter((creneau) => creneau.enseignantId === enseignant.id)
                return (
                  <div key={enseignant.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{enseignant.prenom} {enseignant.nom}</p>
                      <p className="text-sm text-muted-foreground">{enseignant.matieres.join(", ")}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{cours.length} cours</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
