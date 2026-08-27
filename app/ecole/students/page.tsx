"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Fuse from "fuse.js"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, Download, FileText, RotateCcw, Upload, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { printHtml } from "@/lib/print"
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
  const [selectedLevel, setSelectedLevel] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<DonneesEleve | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterOptions, setFilterOptions] = useState<"all" | "cantine" | "transport" | "tenue">("all")
  const [filterAgeMin, setFilterAgeMin] = useState("")
  const [filterAgeMax, setFilterAgeMax] = useState("")
  const itemsPerPage = 50

  const levels = {
    maternelle: ["Maternelle"],
    primaire: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
    college: ["6ème", "5ème", "4ème", "3ème"],
    lycee: ["2nde L", "2nde S", "1ère A1", "1ère A2", "1ère B", "Terminale A1", "Terminale B", "Terminale D", "Terminale S"]
  }

  const allClasses = [
    "Maternelle", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème",
    "2nde L", "2nde S", "1ère A1", "1ère A2", "1ère B", "Terminale A1", "Terminale B", "Terminale D", "Terminale S"
  ]

  const classes = selectedLevel === "all" ? allClasses : levels[selectedLevel as keyof typeof levels] || []

  useEffect(() => {
    const savedStudents = serviceEleves.obtenirTousLesEleves()
    setStudents(savedStudents)
    setFilteredStudents(savedStudents)
  }, [])

  useEffect(() => {
    setSelectedClass("all")
  }, [selectedLevel])

  useEffect(() => {
    let filtered = students
    if (selectedLevel !== "all") {
      filtered = filtered.filter(student => levels[selectedLevel as keyof typeof levels]?.includes(student.classe))
    }
    if (selectedClass !== "all") filtered = filtered.filter((student) => student.classe === selectedClass)
    if (selectedStatus !== "all") filtered = filtered.filter((student) => student.statut === selectedStatus)
    
    // Advanced filters
    if (filterOptions !== "all") {
      if (filterOptions === "cantine") {
        filtered = filtered.filter(s => s.optionsSupplementaires?.cooperative || false)
      } else if (filterOptions === "transport") {
        filtered = filtered.filter(s => false) // Not in current model
      } else if (filterOptions === "tenue") {
        filtered = filtered.filter(s => s.optionsSupplementaires?.tenueScolaire || false)
      }
    }
    
    if (filterAgeMin || filterAgeMax) {
      filtered = filtered.filter(student => {
        const birthDate = new Date(student.dateNaissance)
        const age = new Date().getFullYear() - birthDate.getFullYear()
        const minAge = filterAgeMin ? parseInt(filterAgeMin) : 0
        const maxAge = filterAgeMax ? parseInt(filterAgeMax) : 100
        return age >= minAge && age <= maxAge
      })
    }
    
    if (searchTerm) {
      const fuse = new Fuse(filtered, {
        keys: ['nom', 'prenom', 'identifiant'],
        threshold: 0.3,
        ignoreLocation: true
      })
      const results = fuse.search(searchTerm).map(result => result.item)
      filtered = results
    }
    setFilteredStudents(filtered)
  }, [students, selectedClass, selectedStatus, selectedLevel, searchTerm, filterOptions, filterAgeMin, filterAgeMax])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedClass, selectedStatus, selectedLevel, searchTerm, filterOptions, filterAgeMin, filterAgeMax])



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
      statut: (student.statut === "actif" ? "inactif" : "actif") as "actif" | "inactif" | "transfere"
    }
    serviceEleves.modifierEleve(updatedStudent)
    const updatedStudents = serviceEleves.obtenirTousLesEleves()
    setStudents(updatedStudents)
    if (selectedStudent && selectedStudent.id === student.id) {
      setSelectedStudent(updatedStudent)
    }
  }

  const handleSelectStudent = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (selected) newSet.add(id)
      else newSet.delete(id)
      return newSet
    })
  }

  const handleBulkStatusChange = () => {
    selectedIds.forEach(id => {
      const student = students.find(s => s.id === id)
      if (student) handleToggleStatus(student)
    })
    setSelectedIds(new Set())
  }

  const handleBulkClassChange = () => {
    const newClass = prompt("Nouvelle classe pour les élèves sélectionnés:")
    if (newClass) {
      selectedIds.forEach(id => {
        const student = students.find(s => s.id === id)
        if (student) {
          const updatedStudent = { ...student, classe: newClass }
          serviceEleves.modifierEleve(updatedStudent)
        }
      })
      const updatedStudents = serviceEleves.obtenirTousLesEleves()
      setStudents(updatedStudents)
      setSelectedIds(new Set())
    }
  }

  const handleBulkGenerateCertificates = () => {
    const selectedStudents = students.filter(s => selectedIds.has(s.id))
    if (selectedStudents.length === 0) {
      toast.error("Aucun élève sélectionné")
      return
    }

    // Generate HTML for all certificates
    let html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Attestations de scolarité</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 20px; }
            .certificate { page-break-after: always; margin-bottom: 40px; border: 1px solid #ccc; padding: 20px; }
            h1 { color: #333; }
            .student-info { margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Attestations de scolarité</h1>
    `

    selectedStudents.forEach((student, index) => {
      html += `
        <div class="certificate">
          <h2>Attestation de scolarité n°${index + 1}</h2>
          <div class="student-info">
            <p><strong>Nom:</strong> ${student.nom}</p>
            <p><strong>Prénom:</strong> ${student.prenom}</p>
            <p><strong>Identifiant:</strong> ${student.identifiant}</p>
            <p><strong>Classe:</strong> ${student.classe}</p>
            <p><strong>Date de naissance:</strong> ${new Date(student.dateNaissance).toLocaleDateString('fr-FR')}</p>
          </div>
          <p>Nous attestons par la présente que l'élève ci-dessus est régulièrement inscrit(e) dans notre établissement pour l'année scolaire en cours.</p>
          <div class="footer">
            <p>École Vivante - ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      `
    })

    html += `
        </body>
      </html>
    `

    printHtml(html)
    toast.success(`${selectedStudents.length} attestation(s) générée(s)`)
    setSelectedIds(new Set())
  }

  const handleBulkArchive = () => {
    if (confirm(`Archiver ${selectedIds.size} élève(s) ?`)) {
      selectedIds.forEach(id => {
        serviceEleves.archiverEleve(id)
      })
      const updatedStudents = serviceEleves.obtenirTousLesEleves()
      setStudents(updatedStudents)
      setSelectedIds(new Set())
      toast.success(`${selectedIds.size} élève(s) archivé(s)`)
    }
  }

  const handleBulkMessage = () => {
    const message = prompt("Message à envoyer aux parents des élèves sélectionnés:")
    if (message) {
      toast.success("Message envoyé (simulation)")
      setSelectedIds(new Set())
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
    try {
      link.click()
    } finally {
      try { URL.revokeObjectURL(url) } catch (e) {}
      if (link.parentNode) link.parentNode.removeChild(link)
    }
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
    try {
      link.click()
    } finally {
      try { URL.revokeObjectURL(url) } catch (e) {}
      if (link.parentNode) link.parentNode.removeChild(link)
    }
  }

  const handleDownloadTemplate = () => {
    const template = "Nom,Prénom,Date de naissance,Lieu de naissance,Classe,Sexe,Téléphone,Email,Adresse,Nom parent,Téléphone parent,Tenue\nExemple: Dupont,Jean,2010-05-15,Libreville,CM1,M,+24101234567,jean.dupont@exemple.fr,123 Rue Exemple,Libreville,M. Dupont,+24109876543,oui"
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "template_import_eleves.csv")
    try {
      link.click()
    } finally {
      try { URL.revokeObjectURL(url) } catch (e) {}
      if (link.parentNode) link.parentNode.removeChild(link)
    }
  }

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error("Le fichier CSV est vide ou invalide")
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      const dataLines = lines.slice(1)
      
      const requiredFields = ['nom', 'prénom', 'classe']
      const missingFields = requiredFields.filter(f => !headers.includes(f))
      
      if (missingFields.length > 0) {
        toast.error(`Colonnes manquantes: ${missingFields.join(', ')}`)
        return
      }

      const importedStudents: DonneesEleve[] = []
      const errors: string[] = []

      dataLines.forEach((line, index) => {
        try {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const student: any = {}
          
          headers.forEach((header, i) => {
            student[header] = values[i] || ''
          })

          if (!student.nom || !student.prénom) {
            errors.push(`Ligne ${index + 2}: Nom ou prénom manquant`)
            return
          }

          const newStudent: DonneesEleve = {
            id: crypto.randomUUID(),
            nom: student.nom,
            prenom: student.prénom,
            identifiant: student.identifiant || `ELE${Date.now()}${index}`,
            motDePasse: student['mot de passe'] || 'password123',
            dateNaissance: student['date de naissance'] || '',
            lieuNaissance: student['lieu de naissance'] || '',
            sexe: student.sexe || 'autre',
            classe: student.classe,
            statut: 'actif',
            dateInscription: new Date().toISOString(),
            nomParent: student['nom parent'] || '',
            contactParent: student['téléphone parent'] || student['telephone parent'] || student.téléphone || student.telephone || '',
            adresse: student.adresse || '',
            informationsContact: {
              telephone: student.téléphone || student.telephone || '',
              email: student.email || '',
              adresse: student.adresse || ''
            },
            modePaiement: 'mensuel',
            optionsSupplementaires: {
              tenueScolaire: student.tenue === 'true' || student.tenue === 'oui',
              carteScolaire: false,
              cooperative: false,
              tenueEPS: false,
              assurance: false
            },
            fraisOptionsSupplementaires: {
              tenueScolaire: 0,
              carteScolaire: 0,
              cooperative: 0,
              tenueEPS: 0,
              assurance: 0
            },
            photo: '',
            totalAPayer: 0,
            typeInscription: 'inscription'
          }

          importedStudents.push(newStudent)
        } catch (err) {
          errors.push(`Ligne ${index + 2}: Erreur de parsing`)
        }
      })

      if (errors.length > 0) {
        toast.error(`${errors.length} erreur(s) lors de l'import. Premier: ${errors[0]}`)
      }

      if (importedStudents.length > 0) {
        importedStudents.forEach(student => {
          serviceEleves.ajouterEleve(student)
        })
        const updatedStudents = serviceEleves.obtenirTousLesEleves()
        setStudents(updatedStudents)
        toast.success(`${importedStudents.length} élève(s) importé(s) avec succès`)
      }
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

  const getQuickStats = () => {
    const activeStudents = students.filter(s => s.statut === 'actif')
    const studentsWithoutPhoto = activeStudents.filter(s => !s.photo)
    
    return {
      total: activeStudents.length,
      withoutPhoto: studentsWithoutPhoto.length,
      absentToday: 0,
      byLevel: Object.entries(getClassStats()).reduce((acc, [classe, count]) => {
        const level = classe.split(' ')[0]
        acc[level] = (acc[level] || 0) + count
        return acc
      }, {} as Record<string, number>)
    }
  }

  const quickStats = getQuickStats()
  const classStats = getClassStats()
  const studentsByClass = filteredStudents.reduce(
    (acc, student) => {
      if (!acc[student.classe]) acc[student.classe] = []
      acc[student.classe].push(student)
      return acc
    },
    {} as { [key: string]: DonneesEleve[] },
  )

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  function handlePrintSchoolCard(student: DonneesEleve): void {
    throw new Error("Function not implemented.")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-terre flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestion des Élèves
          </h1>
          <p className="text-pierre text-sm">
            {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""}
            {selectedClass !== "all" ? ` en ${selectedClass}` : ""}
            {selectedStatus !== "all" ? ` (${selectedStatus}s)` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="rounded-2xl">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button asChild className="bg-terre hover:bg-terre-dark rounded-2xl">
            <Link href="/ecole/inscriptions">
              <FileText className="h-4 w-4 mr-2" />
              Nouvelle inscription
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-2xl">
            <Link href="/ecole/inscriptions">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinscription
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-papier shadow-soft border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pierre">Élèves actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-terre">{quickStats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-papier shadow-soft border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pierre">Sans photo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-soleil">{quickStats.withoutPhoto}</div>
          </CardContent>
        </Card>
        <Card className="bg-papier shadow-soft border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pierre">Absents aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rouge-terre">{quickStats.absentToday}</div>
          </CardContent>
        </Card>
        <Card className="bg-papier shadow-soft border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pierre">Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-jardin">{Object.keys(classStats).length}</div>
          </CardContent>
        </Card>
      </div>

      <ImportExportTools
        onExportCSV={handleExportCSV}
        onExportIdentifiants={handleExportIdentifiants}
        onDownloadTemplate={handleDownloadTemplate}
        onImportCSV={handleImportCSV}
      />

      <Tabs defaultValue="by-class" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-creme p-1 rounded-2xl">
            <TabsTrigger value="by-class" className="rounded-xl data-[state=active]:bg-papier">Par classe</TabsTrigger>
            <TabsTrigger value="all-students" className="rounded-xl data-[state=active]:bg-papier">Tous les élèves</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 bg-creme p-1 rounded-2xl">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xl text-sm transition ${
                viewMode === "list" ? "bg-papier text-terre" : "text-pierre hover:text-terre"
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-xl text-sm transition ${
                viewMode === "grid" ? "bg-papier text-terre" : "text-pierre hover:text-terre"
              }`}
            >
              Grille
            </button>
          </div>
        </div>

        <Card className="bg-papier shadow-soft border-0">
          <CardContent className="pt-6">
            <StudentFilters
              searchTerm={searchTerm}
              selectedClass={selectedClass}
              selectedStatus={selectedStatus}
              selectedLevel={selectedLevel}
              onSearchChange={setSearchTerm}
              onClassChange={setSelectedClass}
              onStatusChange={setSelectedStatus}
              onLevelChange={setSelectedLevel}
              classes={classes}
              classStats={classStats}
              levels={Object.keys(levels)}
            />
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-terre/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-pierre mb-1 block">Options</label>
                  <select
                    value={filterOptions}
                    onChange={(e) => setFilterOptions(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-terre/15 bg-creme/50"
                  >
                    <option value="all">Toutes</option>
                    <option value="cantine">Cantine (Coopérative)</option>
                    <option value="tenue">Tenue scolaire</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-pierre mb-1 block">Âge minimum</label>
                  <input
                    type="number"
                    value={filterAgeMin}
                    onChange={(e) => setFilterAgeMin(e.target.value)}
                    placeholder="Ex: 6"
                    className="w-full px-3 py-2 rounded-xl border border-terre/15 bg-creme/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-pierre mb-1 block">Âge maximum</label>
                  <input
                    type="number"
                    value={filterAgeMax}
                    onChange={(e) => setFilterAgeMax(e.target.value)}
                    placeholder="Ex: 18"
                    className="w-full px-3 py-2 rounded-xl border border-terre/15 bg-creme/50"
                  />
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="mt-4 rounded-xl"
            >
              {showAdvancedFilters ? "Masquer les filtres avancés" : "Afficher les filtres avancés"}
            </Button>
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
          {selectedIds.size > 0 && (
            <div className="p-4 bg-terre-soft rounded-2xl border border-terre/20">
              <p className="text-sm font-medium text-terre">{selectedIds.size} élève{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Button size="sm" onClick={handleBulkStatusChange} className="rounded-xl">Changer statut</Button>
                <Button size="sm" onClick={handleBulkClassChange} className="rounded-xl">Changer classe</Button>
                <Button size="sm" onClick={handleBulkGenerateCertificates} className="rounded-xl">Générer certificats</Button>
                <Button size="sm" onClick={handleBulkArchive} className="rounded-xl">Archiver</Button>
                <Button size="sm" onClick={handleBulkMessage} className="rounded-xl">Message</Button>
              </div>
            </div>
          )}
          <Card className="bg-papier shadow-soft border-0">
            <CardHeader>
              <CardTitle className="text-terre">Tous les élèves</CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === "list" ? (
                <div className="space-y-3">
                  {paginatedStudents.map((student) => (
                    <StudentListItem
                      key={student.id}
                      student={student}
                      onViewDetails={setSelectedStudent}
                      isSelected={selectedIds.has(student.id)}
                      onSelect={handleSelectStudent}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedStudents.map((student) => (
                    <Card 
                      key={student.id} 
                      className="bg-creme shadow-soft hover:shadow-soft-lg transition cursor-pointer border-0"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-terre-soft flex items-center justify-center text-terre font-bold">
                            {student.prenom[0]}{student.nom[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-terre truncate">{student.prenom} {student.nom}</h3>
                            <p className="text-xs text-pierre truncate">{student.classe}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <Badge className="text-xs bg-terre text-white rounded-full">{student.statut}</Badge>
                          {!student.photo && (
                            <Badge className="text-xs bg-soleil text-white rounded-full">Sans photo</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-terre/10">
                  <p className="text-sm text-pierre">
                    Page {currentPage} sur {totalPages} ({filteredStudents.length} élèves)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl"
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onEdit={() => router.push(`/ecole/inscriptions`)}
          onDelete={handleDeleteStudent}
          onToggleStatus={handleToggleStatus}
          onPrintReceipt={handlePrintReceipt}
        />
      )}
    </div>
  )
}
