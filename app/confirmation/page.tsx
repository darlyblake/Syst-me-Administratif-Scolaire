"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, Users, Home, FileText } from "lucide-react"
import Link from "next/link"

interface StudentData {
  id: string
  type: string
  nom: string
  prenom: string
  dateNaissance: string
  lieuNaissance: string
  classe: string
  nomParent?: string
  contactParent?: string
  adresse?: string
  dateInscription: string
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get("id")
  const [student, setStudent] = useState<StudentData | null>(null)

  useEffect(() => {
    if (studentId) {
      const students = JSON.parse(localStorage.getItem("students") || "[]")
      const foundStudent = students.find((s: StudentData) => s.id === studentId)
      setStudent(foundStudent)
    }
  }, [studentId])

  const generateReceipt = () => {
    if (!student) return

    const receiptContent = `
REÇU D'INSCRIPTION SCOLAIRE
============================

ID Élève: ${student.id}
Date d'inscription: ${student.dateInscription}

INFORMATIONS ÉLÈVE:
- Nom: ${student.nom}
- Prénom: ${student.prenom}
- Date de naissance: ${student.dateNaissance}
- Lieu de naissance: ${student.lieuNaissance}
- Classe: ${student.classe}

TYPE DE JUSTIFICATIF: ${student.type === "carte" ? "Carte scolaire" : "Attestation de scolarité"}

${
  student.nomParent
    ? `
INFORMATIONS PARENT/TUTEUR:
- Nom: ${student.nomParent}
- Contact: ${student.contactParent}
- Adresse: ${student.adresse}
`
    : ""
}

Inscription validée avec succès.
    `

    const blob = new Blob([receiptContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `recu_inscription_${student.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Inscription réussie !</CardTitle>
            <CardDescription>L'élève a été inscrit avec succès dans le système</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ID généré */}
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="text-sm text-blue-600 font-medium">ID Élève généré</div>
              <div className="text-2xl font-bold text-blue-800">{student.id}</div>
            </div>

            {/* Informations de l'élève */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Informations élève</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Nom:</span> {student.nom}
                  </div>
                  <div>
                    <span className="font-medium">Prénom:</span> {student.prenom}
                  </div>
                  <div>
                    <span className="font-medium">Date de naissance:</span> {student.dateNaissance}
                  </div>
                  <div>
                    <span className="font-medium">Lieu de naissance:</span> {student.lieuNaissance}
                  </div>
                  <div>
                    <span className="font-medium">Classe:</span> {student.classe}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Détails inscription</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Type de justificatif:</span>{" "}
                    {student.type === "carte" ? "Carte scolaire" : "Attestation de scolarité"}
                  </div>
                  <div>
                    <span className="font-medium">Date d'inscription:</span> {student.dateInscription}
                  </div>
                  {student.nomParent && (
                    <>
                      <div>
                        <span className="font-medium">Parent/Tuteur:</span> {student.nomParent}
                      </div>
                      <div>
                        <span className="font-medium">Contact:</span> {student.contactParent}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={generateReceipt} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Télécharger le reçu
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" asChild>
                <Link href={`/generate-document?id=${student.id}&type=${student.type}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Générer le document
                </Link>
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" asChild>
                <Link href="/students">
                  <Users className="mr-2 h-4 w-4" />
                  Voir tous les élèves
                </Link>
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" asChild>
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Nouvelle inscription
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
