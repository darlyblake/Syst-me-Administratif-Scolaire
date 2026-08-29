"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, FileText, Download, Printer } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"

export default function Bulletins() {
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
  const [selectedTrimestre, setSelectedTrimestre] = useState("1")
  const [selectedStudent, setSelectedStudent] = useState("")
  const [bulletinGenere, setBulletinGenere] = useState(false)

  const classes = ["PS1", "PS2", "MS1", "MS2", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]
  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()
  const filteredStudents = selectedClasse
    ? allStudents.filter(s => s.classe === selectedClasse)
    : []

  const selectedStudentData = selectedStudent 
    ? filteredStudents.find(s => s.id === selectedStudent)
    : null

  // Simulation des notes par matière
  const mockNotes = [
    { matiere: "Français", note: 15.5, appreciation: "Bien", moyenneClasse: 14.2, rang: 3 },
    { matiere: "Mathématiques", note: 17.0, appreciation: "Très Bien", moyenneClasse: 13.8, rang: 1 },
    { matiere: "Histoire-Géographie", note: 14.0, appreciation: "Assez Bien", moyenneClasse: 13.5, rang: 5 },
    { matiere: "Sciences", note: 16.5, appreciation: "Très Bien", moyenneClasse: 14.0, rang: 2 },
    { matiere: "Anglais", note: 13.0, appreciation: "Assez Bien", moyenneClasse: 12.5, rang: 6 },
    { matiere: "EPS", note: 18.0, appreciation: "Excellent", moyenneClasse: 15.0, rang: 1 },
  ]

  const moyenneGenerale = (mockNotes.reduce((sum, n) => sum + n.note, 0) / mockNotes.length).toFixed(2)
  const appreciationGenerale = parseFloat(moyenneGenerale) >= 16 ? "Excellent" 
    : parseFloat(moyenneGenerale) >= 14 ? "Très Bien"
    : parseFloat(moyenneGenerale) >= 12 ? "Bien"
    : parseFloat(moyenneGenerale) >= 10 ? "Assez Bien"
    : "À améliorer"

  const handleGenererBulletin = () => {
    setBulletinGenere(true)
  }

  const handleImprimer = () => {
    window.print()
  }

  const handleTelecharger = () => {
    console.log("Téléchargement du bulletin...")
    // TODO: Implémenter le téléchargement PDF
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
              <FileText className="h-6 w-6" />
              Bulletins Scolaires
            </h1>
            <p className="text-gray-600">Génération et impression des bulletins</p>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sélection</CardTitle>
            <CardDescription>Choisissez la classe, le trimestre et l'élève</CardDescription>
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
                <Label htmlFor="trimestre">Trimestre</Label>
                <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                  <SelectTrigger id="trimestre">
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

              <div className="space-y-2">
                <Label htmlFor="eleve">Élève</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger id="eleve">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.prenom} {student.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenererBulletin} 
              className="mt-4"
              disabled={!selectedStudent}
            >
              <FileText className="mr-2 h-4 w-4" />
              Générer le Bulletin
            </Button>
          </CardContent>
        </Card>

        {/* Bulletin généré */}
        {bulletinGenere && selectedStudentData && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Bulletin Scolaire</CardTitle>
                  <CardDescription>
                    {selectedTrimestre === "annuel" ? "Année scolaire 2024-2025" : `Trimestre ${selectedTrimestre} - 2024-2025`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleImprimer}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleTelecharger}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations de l'élève */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Nom:</Label>
                  <p className="font-semibold">{selectedStudentData.nom}</p>
                </div>
                <div>
                  <Label>Prénom:</Label>
                  <p className="font-semibold">{selectedStudentData.prenom}</p>
                </div>
                <div>
                  <Label>Classe:</Label>
                  <p className="font-semibold">{selectedStudentData.classe}</p>
                </div>
                <div>
                  <Label>Identifiant:</Label>
                  <p className="font-semibold">{selectedStudentData.identifiant}</p>
                </div>
              </div>

              {/* Tableau des notes */}
              <div>
                <h3 className="font-bold text-lg mb-3">Relevé de Notes</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left p-2 border">Matière</th>
                      <th className="text-center p-2 border">Note</th>
                      <th className="text-center p-2 border">Moy. Classe</th>
                      <th className="text-center p-2 border">Rang</th>
                      <th className="text-center p-2 border">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockNotes.map((note, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 border font-medium">{note.matiere}</td>
                        <td className="p-2 border text-center font-bold">{note.note}/20</td>
                        <td className="p-2 border text-center">{note.moyenneClasse}/20</td>
                        <td className="p-2 border text-center">{note.rang}</td>
                        <td className="p-2 border text-center">{note.appreciation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Moyenne générale */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <Label className="text-lg font-bold">Moyenne Générale:</Label>
                  <p className="text-3xl font-bold text-blue-600">{moyenneGenerale}/20</p>
                </div>
                <div>
                  <Label className="text-lg font-bold">Appréciation Générale:</Label>
                  <p className="text-2xl font-bold text-green-600">{appreciationGenerale}</p>
                </div>
              </div>

              {/* Observations */}
              <div>
                <h3 className="font-bold text-lg mb-2">Observations du Conseil de Classe</h3>
                <p className="p-4 bg-gray-50 rounded-lg">
                  L'élève a fourni un bon travail ce trimestre. Il est assidu et participe activement en classe.
                  Des efforts sont à poursuivre en anglais pour atteindre le niveau attendu.
                </p>
              </div>

              {/* Signature */}
              <div className="flex justify-between items-end pt-8 border-t">
                <div className="text-center">
                  <p className="font-semibold mb-8">Le Chef d'Établissement</p>
                  <div className="border-t border-black w-48"></div>
                </div>
                <div className="text-center">
                  <p className="font-semibold mb-8">Les Parents</p>
                  <div className="border-t border-black w-48"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
