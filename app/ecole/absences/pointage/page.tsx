"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, CheckCircle, XCircle, Clock, Save } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"

export default function PointagePresences() {
  const [selectedClasse, setSelectedClasse] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [presences, setPresences] = useState<Record<string, { statut: string; heureArrivee: string; motif: string }>>({})

  const classes = ["PS1", "PS2", "MS1", "MS2", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]
  const allStudents = serviceEleves.obtenirTousLesEleves()
  const filteredStudents = selectedClasse 
    ? allStudents.filter(s => s.classe === selectedClasse)
    : []

  const handleStatutChange = (studentId: string, statut: string) => {
    setPresences(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        statut
      }
    }))
  }

  const handleHeureChange = (studentId: string, heure: string) => {
    setPresences(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        heureArrivee: heure
      }
    }))
  }

  const handleMotifChange = (studentId: string, motif: string) => {
    setPresences(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        motif
      }
    }))
  }

  const calculerStatistiques = () => {
    const total = filteredStudents.length
    const presents = Object.values(presences).filter(p => p.statut === "present").length
    const absents = Object.values(presences).filter(p => p.statut === "absent").length
    const retards = Object.values(presences).filter(p => p.statut === "retard").length
    
    return { total, presents, absents, retards }
  }

  const stats = calculerStatistiques()

  const handleSave = () => {
    console.log("Pointage sauvegardé:", presences)
    console.log("Classe:", selectedClasse)
    console.log("Date:", selectedDate)
    console.log("Statistiques:", stats)
    // TODO: Implémenter la sauvegarde dans la base de données
  }

  const handleToutPresent = () => {
    const newPresences: Record<string, { statut: string; heureArrivee: string; motif: string }> = {}
    filteredStudents.forEach(student => {
      newPresences[student.id] = {
        statut: "present",
        heureArrivee: "08:00",
        motif: ""
      }
    })
    setPresences(newPresences)
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Pointage des Présences
            </h1>
            <p className="text-gray-600">Enregistrement quotidien des présences</p>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sélection</CardTitle>
            <CardDescription>Choisissez la classe et la date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classe">Classe</Label>
                <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                  <SelectTrigger id="classe">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classe) => (
                      <SelectItem key={classe} value={classe}>
                        {classe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        {selectedClasse && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Présents</p>
                  <p className="text-2xl font-bold text-green-600">{stats.presents}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Absents</p>
                  <p className="text-2xl font-bold text-red-600">{stats.absents}</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Retards</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.retards}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tableau de pointage */}
        {selectedClasse && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Pointage - {selectedClasse}</CardTitle>
                  <CardDescription>Date: {new Date(selectedDate).toLocaleDateString('fr-FR')}</CardDescription>
                </div>
                <Button variant="outline" onClick={handleToutPresent}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Tous Présents
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">N°</th>
                      <th className="text-left p-3">Nom</th>
                      <th className="text-left p-3">Prénom</th>
                      <th className="text-center p-3">Statut</th>
                      <th className="text-center p-3">Heure Arrivée</th>
                      <th className="text-left p-3">Motif (si absent)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-medium">{student.nom}</td>
                        <td className="p-3">{student.prenom}</td>
                        <td className="p-3">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant={presences[student.id]?.statut === "present" ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleStatutChange(student.id, "present")}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              P
                            </Button>
                            <Button
                              variant={presences[student.id]?.statut === "absent" ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleStatutChange(student.id, "absent")}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              A
                            </Button>
                            <Button
                              variant={presences[student.id]?.statut === "retard" ? "outline" : "outline"}
                              size="sm"
                              onClick={() => handleStatutChange(student.id, "retard")}
                              className="flex-1"
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              R
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <Input
                            type="time"
                            className="w-32 text-center"
                            value={presences[student.id]?.heureArrivee || ""}
                            onChange={(e) => handleHeureChange(student.id, e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            placeholder="Motif..."
                            className="w-48"
                            value={presences[student.id]?.motif || ""}
                            onChange={(e) => handleMotifChange(student.id, e.target.value)}
                            disabled={presences[student.id]?.statut !== "absent"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-4 mt-6">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder le Pointage
                </Button>
                <Button variant="outline" onClick={() => setPresences({})}>
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
