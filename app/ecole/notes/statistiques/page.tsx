"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, BarChart3, TrendingUp, Award } from "lucide-react"
import Link from "next/link"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"

export default function StatistiquesNotes() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: academicStructure } = useAcademicStructure(establishmentId)
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
  const [selectedTrimestre, setSelectedTrimestre] = useState("1")

  const academicClasses = academicStructure.flatMap((cycle) =>
    (cycle.grade_levels ?? []).flatMap((level) =>
      (level.school_classes ?? []).map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))
    )
  )
  const classes = academicClasses.length > 0
    ? academicClasses.map((schoolClass) => schoolClass.name)
    : ["PS1", "PS2", "MS1", "MS2", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]
  const allStudents = mappedSupabaseStudents
  const filteredStudents = selectedClasse ? allStudents.filter((student) => student.classe === selectedClasse || !student.classe) : allStudents

  // Simulation des statistiques
  const stats = {
    moyenneClasse: 14.5,
    meilleureNote: 19.5,
    moinsBonneNote: 8.0,
    tauxReussite: 85,
    nombreEleves: 25,
    nombreAdmis: 21,
    nombreEncouragement: 3,
    nombreAvertissement: 1,
    parMatiere: [
      { matiere: "Français", moyenne: 14.2, meilleure: 18.5, plusFaible: 9.0 },
      { matiere: "Mathématiques", moyenne: 13.8, meilleure: 19.5, plusFaible: 8.0 },
      { matiere: "Histoire-Géographie", moyenne: 15.0, meilleure: 18.0, plusFaible: 10.5 },
      { matiere: "Sciences", moyenne: 14.5, meilleure: 17.5, plusFaible: 9.5 },
      { matiere: "Anglais", moyenne: 12.5, meilleure: 16.0, plusFaible: 7.5 },
      { matiere: "EPS", moyenne: 16.0, meilleure: 20.0, plusFaible: 12.0 },
    ],
    distributionNotes: [
      { tranche: "0-5", nombre: 2 },
      { tranche: "5-10", nombre: 5 },
      { tranche: "10-12", nombre: 6 },
      { tranche: "12-14", nombre: 5 },
      { tranche: "14-16", nombre: 4 },
      { tranche: "16-18", nombre: 2 },
      { tranche: "18-20", nombre: 1 },
    ],
    topEleves: [
      { nom: "DUPONT", prenom: "Marie", moyenne: 18.5, rang: 1 },
      { nom: "MARTIN", prenom: "Jean", moyenne: 17.8, rang: 2 },
      { nom: "BERNARD", prenom: "Sophie", moyenne: 17.2, rang: 3 },
      { nom: "PETIT", prenom: "Lucas", moyenne: 16.9, rang: 4 },
      { nom: "ROBERT", prenom: "Emma", moyenne: 16.5, rang: 5 },
    ],
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
              Statistiques des Notes
            </h1>
            <p className="text-gray-600">Analyse des résultats par classe et trimestre</p>
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
              <Label>Trimestre:</Label>
              <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1er Trimestre</SelectItem>
                  <SelectItem value="2">2ème Trimestre</SelectItem>
                  <SelectItem value="3">3ème Trimestre</SelectItem>
                  <SelectItem value="annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Moyenne Classe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.moyenneClasse}/20</div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taux de Réussite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.tauxReussite}%</div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Meilleure Note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.meilleureNote}/20</div>
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Élèves Admis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.nombreAdmis}/{stats.nombreEleves}</div>
                <Award className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Moyennes par matière */}
          <Card>
            <CardHeader>
              <CardTitle>Moyennes par Matière</CardTitle>
              <CardDescription>Performance par discipline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.parMatiere.map((matiere) => (
                  <div key={matiere.matiere} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{matiere.matiere}</span>
                      <span className="font-bold">{matiere.moyenne}/20</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(matiere.moyenne / 20) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Min: {matiere.plusFaible}</span>
                      <span>Max: {matiere.meilleure}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Distribution des notes */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution des Notes</CardTitle>
              <CardDescription>Répartition par tranche</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.distributionNotes.map((item) => (
                  <div key={item.tranche} className="flex items-center justify-between">
                    <span className="font-medium w-16">{item.tranche}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(item.nombre / stats.nombreEleves) * 100}%` }}
                        />
                      </div>
                      <span className="font-semibold w-8 text-right">{item.nombre}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top élèves */}
        <Card>
          <CardHeader>
            <CardTitle>Classement - Top 5</CardTitle>
            <CardDescription>Meilleurs élèves de la classe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topEleves.map((eleve, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                      {eleve.rang}
                    </div>
                    <div>
                      <p className="font-semibold">{eleve.prenom} {eleve.nom}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{eleve.moyenne}/20</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Décisions du conseil de classe */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Décisions du Conseil de Classe</CardTitle>
            <CardDescription>Répartition des décisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg bg-green-50">
                <p className="text-sm text-gray-600">Admis</p>
                <p className="text-3xl font-bold text-green-600">{stats.nombreAdmis}</p>
                <p className="text-xs text-gray-500">{((stats.nombreAdmis / stats.nombreEleves) * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center p-4 border rounded-lg bg-yellow-50">
                <p className="text-sm text-gray-600">Encouragement</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.nombreEncouragement}</p>
                <p className="text-xs text-gray-500">{((stats.nombreEncouragement / stats.nombreEleves) * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center p-4 border rounded-lg bg-red-50">
                <p className="text-sm text-gray-600">Avertissement</p>
                <p className="text-3xl font-bold text-red-600">{stats.nombreAvertissement}</p>
                <p className="text-xs text-gray-500">{((stats.nombreAvertissement / stats.nombreEleves) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
