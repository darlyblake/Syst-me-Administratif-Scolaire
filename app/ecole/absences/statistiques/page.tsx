"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, BarChart3, TrendingUp, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"

export default function StatistiquesAbsences() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? "demo-establishment"
  const { data: supabaseStudents } = useStudents(establishmentId)

  const mappedSupabaseStudents = useMemo(() => {
    return (supabaseStudents ?? []).map((student) => ({
      id: student.id,
      identifiant: student.id.slice(0, 8).toUpperCase(),
      motDePasse: "",
      nom: student.last_name || "",
      prenom: student.first_name || "",
      dateNaissance: student.date_of_birth || "",
      lieuNaissance: student.place_of_birth || "",
      sexe: student.gender || "",
      classe: "",
      classeAncienne: "",
      nomParent: "",
      contactParent: "",
      adresse: "",
      dateInscription: student.created_at || "",
      statut: "actif" as const,
      totalAPayer: 0,
      typeInscription: "inscription" as const,
      informationsContact: {
        telephone: student.phone || "",
        email: student.email || "",
        adresse: "",
      },
      modePaiement: "mensuel" as const,
      optionsSupplementaires: {
        tenueScolaire: false,
        carteScolaire: false,
        cooperative: false,
        tenueEPS: false,
        assurance: false,
      },
      fraisOptionsSupplementaires: {
        tenueScolaire: 0,
        carteScolaire: 0,
        cooperative: 0,
        tenueEPS: 0,
        assurance: 0,
      },
      moisPaiement: [],
      optionsPersonnalisees: [],
    }))
  }, [supabaseStudents])

  const [selectedClasse, setSelectedClasse] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("mois")

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()
  const classes = Array.from(new Set(allStudents.map((student) => student.classe).filter(Boolean))).sort()

  // Simulation des statistiques d'absences
  const stats = {
    tauxPresence: 92.5,
    tauxAbsence: 7.5,
    totalAbsences: 18,
    totalRetards: 12,
    elevesAvecAbsencesRepetees: 3,
    parClasse: {
      "PS1": { taux: 95, absences: 2 },
      "PS2": { taux: 93, absences: 3 },
      "GS": { taux: 94, absences: 2 },
      "CP": { taux: 91, absences: 4 },
      "CE1": { taux: 90, absences: 5 },
      "CM1": { taux: 92, absences: 3 },
    },
    parMois: [
      { mois: "Septembre", taux: 96, absences: 8 },
      { mois: "Octobre", taux: 94, absences: 10 },
      { mois: "Novembre", taux: 91, absences: 15 },
      { mois: "Décembre", taux: 89, absences: 18 },
    ],
    elevesProblematiques: [
      { nom: "DUPONT", prenom: "Lucas", classe: "CE1", absences: 8, taux: 85 },
      { nom: "MARTIN", prenom: "Emma", classe: "CM1", absences: 6, taux: 88 },
      { nom: "BERNARD", prenom: "Hugo", classe: "CP", absences: 5, taux: 90 },
    ],
    motifsAbsences: {
      "Maladie": 45,
      "Familial": 25,
      "Sans motif": 20,
      "Autre": 10,
    },
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Statistiques de Présence
            </h1>
            <p className="text-gray-600">Analyse des absences et présences</p>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Classe:</Label>
              <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les classes</SelectItem>
                  {classes.map((classe) => (
                    <SelectItem key={classe} value={classe}>
                      {classe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label>Période:</Label>
              <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semaine">Cette semaine</SelectItem>
                  <SelectItem value="mois">Ce mois</SelectItem>
                  <SelectItem value="trimestre">Ce trimestre</SelectItem>
                  <SelectItem value="annee">Cette année</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taux de Présence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">{stats.tauxPresence}%</div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taux d'Absence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-red-600">{stats.tauxAbsence}%</div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Absences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.totalAbsences}</div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Retards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.totalRetards}</div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Taux par classe */}
          <Card>
            <CardHeader>
              <CardTitle>Taux de Présence par Classe</CardTitle>
              <CardDescription>Performance de chaque classe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.parClasse).map(([classe, data]) => (
                  <div key={classe} className="flex items-center justify-between">
                    <span className="font-medium">{classe}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${data.taux >= 90 ? 'bg-green-600' : data.taux >= 80 ? 'bg-yellow-600' : 'bg-red-600'}`}
                          style={{ width: `${data.taux}%` }}
                        />
                      </div>
                      <span className="font-semibold w-12 text-right">{data.taux}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Motifs d'absences */}
          <Card>
            <CardHeader>
              <CardTitle>Motifs d'Absences</CardTitle>
              <CardDescription>Répartition par raison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.motifsAbsences).map(([motif, pourcentage]) => (
                  <div key={motif} className="flex items-center justify-between">
                    <span className="font-medium">{motif}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${pourcentage}%` }}
                        />
                      </div>
                      <span className="font-semibold w-12 text-right">{pourcentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Évolution mensuelle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Évolution Mensuelle</CardTitle>
            <CardDescription>Tendance des absences sur les derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.parMois.map((mois) => (
                <div key={mois.mois} className="flex items-center justify-between">
                  <span className="font-medium">{mois.mois}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${mois.taux >= 90 ? 'bg-green-600' : mois.taux >= 80 ? 'bg-yellow-600' : 'bg-red-600'}`}
                          style={{ width: `${mois.taux}%` }}
                        />
                      </div>
                      <span className="font-semibold w-12 text-right">{mois.taux}%</span>
                    </div>
                    <span className="text-sm text-gray-600 w-20">{mois.absences} absences</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Élèves problématiques */}
        <Card className="mb-6 border-orange-500">
          <CardHeader>
            <CardTitle className="text-orange-600">Élèves avec Absences Répétées</CardTitle>
            <CardDescription>Élèves nécessitant une attention particulière</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.elevesProblematiques.map((eleve, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{eleve.prenom} {eleve.nom}</p>
                    <p className="text-sm text-gray-600">{eleve.classe}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{eleve.absences} absences</p>
                    <p className="text-sm text-gray-600">Taux: {eleve.taux}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alertes */}
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Alertes</CardTitle>
            <CardDescription>Situations nécessitant une intervention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p>3 élèves ont un taux de présence inférieur à 90%</p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p>Le taux d'absence sans motif est de 20%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
