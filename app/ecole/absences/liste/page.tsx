"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Filter, Download, Calendar } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"

export default function ListePresences() {
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
  const [selectedMois, setSelectedMois] = useState("")
  const [selectedStatut, setSelectedStatut] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const classes = ["PS1", "PS2", "MS1", "MS2", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]
  const mois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
  const statuts = ["tous", "present", "absent", "retard"]

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()
  const filteredStudents = selectedClasse
    ? allStudents.filter(s => s.classe === selectedClasse)
    : allStudents

  // Simulation des données de présence
  const presencesData = filteredStudents.map(student => ({
    id: student.id,
    nom: student.nom,
    prenom: student.prenom,
    classe: student.classe,
    totalJours: 20,
    presents: Math.floor(Math.random() * 5) + 15,
    absences: Math.floor(Math.random() * 3),
    retards: Math.floor(Math.random() * 2),
    tauxPresence: 0 as number,
  }))

  // Calculer le taux de présence
  presencesData.forEach(p => {
    p.tauxPresence = parseFloat(((p.presents / p.totalJours) * 100).toFixed(1))
  })

  const filteredPresences = presencesData.filter(p => {
    const matchSearch = p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.prenom.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatut = selectedStatut === "tous" || 
                        (selectedStatut === "present" && p.tauxPresence >= 90) ||
                        (selectedStatut === "absent" && p.absences > 0) ||
                        (selectedStatut === "retard" && p.retards > 0)
    return matchSearch && matchStatut
  })

  const handleExport = () => {
    console.log("Export des présences...")
    // TODO: Implémenter l'export CSV/Excel
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
              <Calendar className="h-6 w-6" />
              Liste des Présences
            </h1>
            <p className="text-gray-600">Historique et suivi des présences</p>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classe">Classe</Label>
                <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                  <SelectTrigger id="classe">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="mois">Mois</Label>
                <Select value={selectedMois} onValueChange={setSelectedMois}>
                  <SelectTrigger id="mois">
                    <SelectValue placeholder="Tous les mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les mois</SelectItem>
                    {mois.map((mois) => (
                      <SelectItem key={mois} value={mois}>
                        {mois}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select value={selectedStatut} onValueChange={setSelectedStatut}>
                  <SelectTrigger id="statut">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    <SelectItem value="present">Présents</SelectItem>
                    <SelectItem value="absent">Absences</SelectItem>
                    <SelectItem value="retard">Retards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Recherche</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    placeholder="Nom, prénom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="outline">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des présences */}
        <Card>
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
            <CardDescription>{filteredPresences.length} élève(s) trouvé(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Nom</th>
                    <th className="text-left p-3">Prénom</th>
                    <th className="text-left p-3">Classe</th>
                    <th className="text-center p-3">Jours</th>
                    <th className="text-center p-3">Présents</th>
                    <th className="text-center p-3">Absences</th>
                    <th className="text-center p-3">Retards</th>
                    <th className="text-center p-3">Taux</th>
                    <th className="text-center p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPresences.map((presence, index) => (
                    <tr key={presence.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-medium">{presence.nom}</td>
                      <td className="p-3">{presence.prenom}</td>
                      <td className="p-3">{presence.classe}</td>
                      <td className="p-3 text-center">{presence.totalJours}</td>
                      <td className="p-3 text-center text-green-600 font-semibold">{presence.presents}</td>
                      <td className="p-3 text-center text-red-600 font-semibold">{presence.absences}</td>
                      <td className="p-3 text-center text-yellow-600 font-semibold">{presence.retards}</td>
                      <td className="p-3 text-center font-bold">{presence.tauxPresence}%</td>
                      <td className="p-3 text-center">
                        {presence.tauxPresence >= 90 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Excellent</span>
                        ) : presence.tauxPresence >= 80 ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">Bon</span>
                        ) : presence.tauxPresence >= 70 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Moyen</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">Faible</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPresences.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun résultat trouvé
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques globales */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Statistiques Globales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Élèves</p>
                <p className="text-2xl font-bold">{filteredPresences.length}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Taux Présence Moyen</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredPresences.length > 0 
                    ? (filteredPresences.reduce((sum, p) => sum + p.tauxPresence, 0) / filteredPresences.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Absences</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredPresences.reduce((sum, p) => sum + p.absences, 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Retards</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredPresences.reduce((sum, p) => sum + p.retards, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
