"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Calculator } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"

export default function SaisieNotes() {
  const [selectedClasse, setSelectedClasse] = useState("")
  const [selectedMatiere, setSelectedMatiere] = useState("")
  const [selectedTrimestre, setSelectedTrimestre] = useState("1")
  const [notes, setNotes] = useState<Record<string, { note: number; appreciation: string }>>({})

  const classes = ["PS1", "PS2", "MS1", "MS2", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]
  const matieres = [
    "Français", "Mathématiques", "Histoire-Géographie", "Sciences",
    "Anglais", "EPS", "Arts Plastiques", "Musique", "Informatique"
  ]

  const allStudents = serviceEleves.obtenirTousLesEleves()
  const filteredStudents = selectedClasse 
    ? allStudents.filter(s => s.classe === selectedClasse)
    : []

  const handleNoteChange = (studentId: string, value: string) => {
    const note = parseFloat(value) || 0
    setNotes(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note: Math.min(20, Math.max(0, note))
      }
    }))
  }

  const handleAppreciationChange = (studentId: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        appreciation: value
      }
    }))
  }

  const calculerMoyenneClasse = () => {
    const notesArray = Object.values(notes).map(n => n.note)
    if (notesArray.length === 0) return 0
    const sum = notesArray.reduce((a, b) => a + b, 0)
    return (sum / notesArray.length).toFixed(2)
  }

  const handleSave = () => {
    console.log("Notes sauvegardées:", notes)
    console.log("Classe:", selectedClasse)
    console.log("Matière:", selectedMatiere)
    console.log("Trimestre:", selectedTrimestre)
    // TODO: Implémenter la sauvegarde dans la base de données
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
              <Calculator className="h-6 w-6" />
              Saisie des Notes
            </h1>
            <p className="text-gray-600">Enregistrement des notes par matière et classe</p>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sélection</CardTitle>
            <CardDescription>Choisissez la classe, la matière et le trimestre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
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
                <Label htmlFor="matiere">Matière</Label>
                <Select value={selectedMatiere} onValueChange={setSelectedMatiere}>
                  <SelectTrigger id="matiere">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {matieres.map((matiere) => (
                      <SelectItem key={matiere} value={matiere}>
                        {matiere}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trimestre">Trimestre</Label>
                <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                  <SelectTrigger id="trimestre">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1er Trimestre</SelectItem>
                    <SelectItem value="2">2ème Trimestre</SelectItem>
                    <SelectItem value="3">3ème Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau de saisie */}
        {selectedClasse && selectedMatiere && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedClasse} - {selectedMatiere} - Trimestre {selectedTrimestre}
              </CardTitle>
              <CardDescription>
                Moyenne de classe: <span className="font-bold">{calculerMoyenneClasse()}/20</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">N°</th>
                      <th className="text-left p-3">Nom</th>
                      <th className="text-left p-3">Prénom</th>
                      <th className="text-center p-3">Note (/20)</th>
                      <th className="text-left p-3">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-medium">{student.nom}</td>
                        <td className="p-3">{student.prenom}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            className="w-20 text-center"
                            value={notes[student.id]?.note || ""}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            placeholder="Ex: TB, B, AB..."
                            className="w-24"
                            value={notes[student.id]?.appreciation || ""}
                            onChange={(e) => handleAppreciationChange(student.id, e.target.value)}
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
                  Sauvegarder les Notes
                </Button>
                <Button variant="outline" onClick={() => setNotes({})}>
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
