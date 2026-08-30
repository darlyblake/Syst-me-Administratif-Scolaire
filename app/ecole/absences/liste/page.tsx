"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Filter, Download, Calendar } from "lucide-react"
import Link from "next/link"
import { useUserContext } from "@/hooks/useUserContext"
import { useDailyAbsences } from "@/hooks/useAbsences"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"

export default function ListePresences() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedClasse, setSelectedClasse] = useState("all")
  const [selectedStatut, setSelectedStatut] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const { absences, isLoading, error } = useDailyAbsences(establishmentId, selectedDate)
  const { data: academicStructure } = useAcademicStructure(establishmentId)
  const classes = useMemo(() => academicStructure.flatMap((cycle) => (cycle.grade_levels ?? []).flatMap((level) => (level.school_classes ?? []).map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name })))), [academicStructure])
  const filteredPresences = useMemo(() => absences.filter((absence) => {
    const name = `${absence.student?.first_name || ""} ${absence.student?.last_name || ""}`.toLowerCase()
    return (selectedClasse === "all" || absence.class_id === selectedClasse) &&
      (!searchTerm || name.includes(searchTerm.toLowerCase())) &&
      (selectedStatut === "all" || absence.status === selectedStatut)
  }), [absences, searchTerm, selectedClasse, selectedStatut])

  const handleExport = () => {
    console.log("Export des présences...")
    // TODO: Implémenter l'export CSV/Excel
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {isLoading && <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Chargement des présences...</p>}
        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
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
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map((classe) => (
                      <SelectItem key={classe.id} value={classe.id}>
                        {classe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select value={selectedStatut} onValueChange={setSelectedStatut}>
                  <SelectTrigger id="statut">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="present">Présents</SelectItem>
                    <SelectItem value="absent">Absences</SelectItem>
                    <SelectItem value="late">Retards</SelectItem>
                    <SelectItem value="justified">Justifiées</SelectItem>
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
            <CardDescription>{filteredPresences.length} enregistrement(s) pour le {new Date(selectedDate).toLocaleDateString("fr-FR")}</CardDescription>
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
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Motif</th>
                    <th className="text-center p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPresences.map((presence, index) => (
                    <tr key={presence.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-medium">{presence.student?.last_name || "-"}</td>
                      <td className="p-3">{presence.student?.first_name || "-"}</td>
                      <td className="p-3">{classes.find((classe) => classe.id === presence.class_id)?.name || presence.class_id}</td>
                      <td className="p-3">{new Date(presence.date).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3">{presence.reason || presence.notes || "-"}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded text-sm">{presence.status}</span>
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

      </div>
    </div>
  )
}
