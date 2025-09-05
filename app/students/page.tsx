"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Users, UserPlus, Download, FileText, RotateCcw } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import type { DonneesEleve } from "@/types/models"

// Import des composants
import StudentFilters from "@/components/StudentFilters"
import ImportExportTools from "@/components/ImportExportTools"
import ClassSection from "@/components/ClassSection"
import StudentListItem from "@/components/StudentListItem"
import StudentDetailsModal from "@/components/StudentDetailsModal"


export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<DonneesEleve[]>([])
  const [filteredStudents, setFilteredStudents] = useState<DonneesEleve[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<DonneesEleve | null>(null)

  const classes = [
    "Maternelle", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème",
    "2nde L", "2nde S", "1ère A1", "1ère A2", "1ère B", "Terminale A1", "Terminale B", "Terminale D", "Terminale S"
  ]

  useEffect(() => {
    const savedStudents = serviceEleves.obtenirTousLesEleves()
    setStudents(savedStudents)
    setFilteredStudents(savedStudents)
  }, [])

  useEffect(() => {
    let filtered = students
    if (selectedClass !== "all") filtered = filtered.filter((student) => student.classe === selectedClass)
    if (selectedStatus !== "all") filtered = filtered.filter((student) => student.statut === selectedStatus)
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.identifiant.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    setFilteredStudents(filtered)
  }, [students, selectedClass, selectedStatus, searchTerm])



  const handleDeleteStudent = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir archiver cet élève ?")) {
      serviceEleves.archiverEleve(id)
      const updatedStudents = serviceEleves.obtenirTousLesEleves()
      setStudents(updatedStudents)
      if (selectedStudent && selectedStudent.id === id) {
        setSelectedStudent(null)
      }
    }
  }

  const handleToggleStatus = (student: DonneesEleve) => {
    const updatedStudent = {
      ...student,
      statut: student.statut === "actif" ? "inactif" : "actif"
    }
    serviceEleves.modifierEleve(updatedStudent)
    const updatedStudents = serviceEleves.obtenirTousLesEleves()
    setStudents(updatedStudents)
    if (selectedStudent && selectedStudent.id === student.id) {
      setSelectedStudent(updatedStudent)
    }
  }

  const handleExportCSV = () => {
    const headers = "Nom,Prénom,Identifiant,Classe,Statut,Téléphone,Email,Date d'inscription\n"
    const csvContent = students.map(student => 
      `"${student.nom}","${student.prenom}","${student.identifiant}","${student.classe}","${student.statut}","${student.informationsContact.telephone}","${student.informationsContact.email}","${new Date(student.dateInscription).toLocaleDateString()}"`
    ).join("\n")
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "eleves.csv")
    link.click()
  }

  const handleExportIdentifiants = () => {
    const headers = "Nom,Prénom,Identifiant,Mot de passe\n"
    const csvContent = students.map(student => 
      `"${student.nom}","${student.prenom}","${student.identifiant}","${student.motDePasse}"`
    ).join("\n")
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "identifiants_eleves.csv")
    link.click()
  }

  const handleDownloadTemplate = () => {
    const template = "Nom,Prénom,Date de naissance,Lieu de naissance,Classe,Téléphone,Email,Adresse\nExemple: Dupont,Jean,2010-05-15,Libreville,CM1,+24101234567,jean.dupont@exemple.fr,123 Rue Exemple, Libreville"
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "template_import_eleves.csv")
    link.click()
  }

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      alert("Fonctionnalité d'import en cours de développement")
    }
    reader.readAsText(file)
  }

  const handlePrintReceipt = (student: DonneesEleve) => {
    router.push(`/receipt?id=${student.id}`)
  }






  const handlePrintSchoolCertificate = (student: DonneesEleve) => alert("Impression attestation")

  const getClassStats = () => {
    const stats: { [key: string]: number } = {}
    students.forEach((student) => {
      stats[student.classe] = (stats[student.classe] || 0) + 1
    })
    return stats
  }

  const classStats = getClassStats()
  const studentsByClass = filteredStudents.reduce(
    (acc, student) => {
      if (!acc[student.classe]) acc[student.classe] = []
      acc[student.classe].push(student)
      return acc
    },
    {} as { [key: string]: DonneesEleve[] },
  )

  function handlePrintSchoolCard(student: DonneesEleve): void {
    throw new Error("Function not implemented.")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/tableau-bord">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6" />
                Gestion des Élèves
              </h1>
              <p className="text-gray-600">
                {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""}
                {selectedClass !== "all" ? ` en ${selectedClass}` : ""}
                {selectedStatus !== "all" ? ` (${selectedStatus}s)` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button asChild>
              <Link href="/register?type=inscription">
                <FileText className="h-4 w-4 mr-2" />
                Nouvelle inscription
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register?type=reinscription">
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinscription
              </Link>
            </Button>
          </div>
        </div>



        <ImportExportTools
          onExportCSV={handleExportCSV}
          onExportIdentifiants={handleExportIdentifiants}
          onDownloadTemplate={handleDownloadTemplate}
          onImportCSV={handleImportCSV}
        />

        <Tabs defaultValue="by-class" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="by-class">Par classe</TabsTrigger>
            <TabsTrigger value="all-students">Tous les élèves</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <StudentFilters
                searchTerm={searchTerm}
                selectedClass={selectedClass}
                selectedStatus={selectedStatus}
                onSearchChange={setSearchTerm}
                onClassChange={setSelectedClass}
                onStatusChange={setSelectedStatus}
                classes={classes}
                classStats={classStats}
              />
            </CardContent>
          </Card>

          <TabsContent value="by-class" className="space-y-6">
            {Object.entries(studentsByClass).map(([classe, classStudents]) => (
              <ClassSection
                key={classe}
                classe={classe}
                students={classStudents}
                onViewDetails={setSelectedStudent}
              />
            ))}
          </TabsContent>

          <TabsContent value="all-students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tous les élèves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredStudents.map((student) => (
                    <StudentListItem
                      key={student.id}
                      student={student}
                      onViewDetails={setSelectedStudent}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {selectedStudent && (
          <StudentDetailsModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            onEdit={() => router.push(`/register?type=reinscription&id=${selectedStudent.id}`)}
            onDelete={handleDeleteStudent}
            onToggleStatus={handleToggleStatus}
            onPrintReceipt={handlePrintReceipt}
            onPrintSchoolCard={handlePrintSchoolCard}
            onPrintCertificate={handlePrintSchoolCertificate}
          />
        )}
      </div>
    </div>
  )
}
