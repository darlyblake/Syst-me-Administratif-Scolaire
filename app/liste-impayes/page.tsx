"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"

interface StudentData {
  id: string
  nom: string
  prenom: string
  classe: string
  nomParent: string
  contactParent: string
  totalAPayer: number
}

interface Payment {
  studentId: string
  amount: number
}

export default function ListeImpayesPage() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedClass, setSelectedClass] = useState("all")

  const classes = [
    "Maternelle",
    "CP1",
    "CP2",
    "CE1",
    "CE2",
    "CM1",
    "CM2",
    "6ème",
    "5ème",
    "4ème",
    "3ème",
    "2nde L",
    "2nde S",
    "1ère A1",
    "1ère A2",
    "1ère B",
    "Terminale A1",
    "Terminale B",
    "Terminale D",
    "Terminale S",
  ]

  useEffect(() => {
    const savedStudents = JSON.parse(localStorage.getItem("students") || "[]")
    const savedPayments = JSON.parse(localStorage.getItem("payments") || "[]")
    setStudents(savedStudents)
    setPayments(savedPayments)
  }, [])

  const getUnpaidStudents = () => {
    return students
      .filter((student) => {
        if (selectedClass !== "all" && student.classe !== selectedClass) return false

        const studentPayments = payments.filter((p) => p.studentId === student.id)
        const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0)
        return totalPaid < student.totalAPayer
      })
      .map((student) => {
        const studentPayments = payments.filter((p) => p.studentId === student.id)
        const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0)
        const remaining = student.totalAPayer - totalPaid

        return {
          ...student,
          totalPaid,
          remaining,
        }
      })
      .sort((a, b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom))
  }

  const unpaidStudents = getUnpaidStudents()

  // Grouper par classe
  const studentsByClass = unpaidStudents.reduce(
    (acc, student) => {
      if (!acc[student.classe]) {
        acc[student.classe] = []
      }
      acc[student.classe].push(student)
      return acc
    },
    {} as { [key: string]: typeof unpaidStudents },
  )

  const totalUnpaid = unpaidStudents.reduce((sum, s) => sum + s.remaining, 0)

  const handlePrint = () => {
    window.print()
  }

  const exportToCSV = () => {
    const headers = ["Classe", "Nom", "Prénom", "Parent", "Contact", "Total à payer", "Payé", "Reste à payer"]
    const csvContent = [
      headers.join(","),
      ...unpaidStudents.map((s) =>
        [s.classe, s.nom, s.prenom, s.nomParent, s.contactParent, s.totalAPayer, s.totalPaid, s.remaining].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `liste_impayes_${selectedClass === "all" ? "toutes_classes" : selectedClass}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto">
        {/* Actions - masquées à l'impression */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/payments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Liste des impayés</h1>
          </div>
          <div className="flex gap-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((classe) => (
                  <SelectItem key={classe} value={classe}>
                    {classe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>

        {/* Document */}
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:rounded-none">
          {/* En-tête */}
          <div className="text-center mb-8 border-b pb-6">
            <h1 className="text-2xl font-bold mb-2">COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO</h1>
            <p className="text-gray-600">B.P: 16109 Estuaire - Tél: 077947410</p>
            <p className="text-gray-600">Libreville, Gabon</p>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-red-600 mb-2">LISTE DES ÉLÈVES EN SITUATION D'IMPAYÉ</h2>
            <div className="text-lg">{selectedClass === "all" ? "Toutes les classes" : selectedClass}</div>
            <p className="text-sm text-gray-600 mt-2">
              Année scolaire 2024-2025 - Document généré le {new Date().toLocaleDateString("fr-FR")}
            </p>
          </div>

          {/* Résumé */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{unpaidStudents.length}</div>
                <div className="text-sm text-red-800">Élèves concernés</div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalUnpaid.toLocaleString()}</div>
                <div className="text-sm text-orange-800">Total impayé (FCFA)</div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Object.keys(studentsByClass).length}</div>
                <div className="text-sm text-blue-800">Classes concernées</div>
              </div>
            </div>
          </div>

          {/* Liste par classe */}
          {Object.entries(studentsByClass).map(([classe, classStudents]) => (
            <div key={classe} className="mb-8">
              <div className="bg-gray-100 p-3 border-l-4 border-red-500 mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {classe} - {classStudents.length} élève{classStudents.length > 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-gray-600">
                  Total impayé: {classStudents.reduce((sum, s) => sum + s.remaining, 0).toLocaleString()} FCFA
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 mb-6">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left font-medium">N°</th>
                      <th className="border border-gray-300 p-2 text-left font-medium">NOM ET PRÉNOM</th>
                      <th className="border border-gray-300 p-2 text-left font-medium">PARENT/TUTEUR</th>
                      <th className="border border-gray-300 p-2 text-left font-medium">CONTACT</th>
                      <th className="border border-gray-300 p-2 text-right font-medium">TOTAL À PAYER</th>
                      <th className="border border-gray-300 p-2 text-right font-medium">DÉJÀ PAYÉ</th>
                      <th className="border border-gray-300 p-2 text-right font-medium">RESTE À PAYER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                        <td className="border border-gray-300 p-2 font-medium">
                          {student.prenom} {student.nom.toUpperCase()}
                        </td>
                        <td className="border border-gray-300 p-2">{student.nomParent}</td>
                        <td className="border border-gray-300 p-2">{student.contactParent}</td>
                        <td className="border border-gray-300 p-2 text-right">
                          {student.totalAPayer.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 p-2 text-right text-green-600">
                          {student.totalPaid.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-bold text-red-600">
                          {student.remaining.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={4} className="border border-gray-300 p-2 text-right">
                        TOTAL {classe}:
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        {classStudents.reduce((sum, s) => sum + s.totalAPayer, 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-green-600">
                        {classStudents.reduce((sum, s) => sum + s.totalPaid, 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-red-600">
                        {classStudents.reduce((sum, s) => sum + s.remaining, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {unpaidStudents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-green-600 mb-2">Félicitations !</h3>
              <p className="text-gray-600">
                {selectedClass === "all" ? "Aucun impayé dans l'établissement" : `Aucun impayé en ${selectedClass}`}
              </p>
            </div>
          )}

          {/* Signature */}
          <div className="flex justify-between items-end mt-12">
            <div>
              <p className="text-sm text-gray-600 mb-4">L'Économe</p>
              <div className="w-40 h-16 border-b border-gray-400"></div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-4">Le Directeur</p>
              <div className="w-40 h-16 border-b border-gray-400"></div>
              <p className="text-xs text-gray-500 mt-2">Cachet et signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
