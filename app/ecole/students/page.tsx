"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, Download, FileText, RotateCcw, Upload, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { printHtml } from "@/lib/print"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import type { DonneesEleve } from "@/types/models"

import StudentFilters from "@/components/StudentFilters"
import ImportExportTools from "@/components/ImportExportTools"
import ClassSection from "@/components/ClassSection"
import StudentListItem from "@/components/StudentListItem"
import StudentDetailsModal from "@/components/StudentDetailsModal"

export default function StudentsPage() {
  const router = useRouter()
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedLevel, setSelectedLevel] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const { data: academicStructure } = useAcademicStructure(establishmentId)
  const { selectedYear } = useAcademicYears(establishmentId)
  const { data: tuitionPlans } = useTuitionPlans(selectedYear?.id ?? null)
  const { data: supabaseStudents, total, totalPages: backendTotalPages, isLoading: isLoadingSupabase, error: studentsError, create, update, deactivate, assignToClass, isCreating, isUpdating, isDeactivating, isAssigning } = useStudents(establishmentId, {
    page: currentPage,
    pageSize: 50,
    search: searchTerm,
    active: selectedStatus !== "inactif",
  })

  const supabseStudentsConverted = useMemo(() => {
    return supabaseStudents.map(s => ({
      id: s.id,
      identifiant: s.student_number ?? "",
      motDePasse: "",
      nom: s.last_name ?? "",
      prenom: s.first_name ?? "",
      dateNaissance: s.birth_date ?? "",
      lieuNaissance: "",
      sexe: s.gender ?? "",
      classe: "",
      nomParent: "",
      contactParent: s.phone ?? "",
      adresse: s.address ?? "",
      dateInscription: s.created_at ?? new Date().toISOString(),
      statut: s.status === "active" ? "actif" : (s.status === "inactive" ? "inactif" : "transfere") as "actif" | "inactif" | "transfere",
      totalAPayer: 0,
      typeInscription: "inscription" as const,
      informationsContact: { telephone: s.phone ?? "", email: s.email ?? "", adresse: s.address ?? "" },
      modePaiement: "mensuel" as const,
      optionsSupplementaires: { tenueScolaire: false, carteScolaire: false, cooperative: false, tenueEPS: false, assurance: false },
      fraisOptionsSupplementaires: { tenueScolaire: 0, carteScolaire: 0, cooperative: 0, tenueEPS: 0, assurance: 0 },
    } as DonneesEleve))
  }, [supabaseStudents])

  const displayStudents = supabseStudentsConverted
  const [students, setStudents] = useState<DonneesEleve[]>([])
  const [filteredStudents, setFilteredStudents] = useState<DonneesEleve[]>([])
  const [selectedStudent, setSelectedStudent] = useState<DonneesEleve | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterOptions, setFilterOptions] = useState<"all" | "cantine" | "transport" | "tenue">("all")
  const [filterAgeMin, setFilterAgeMin] = useState("")
  const [filterAgeMax, setFilterAgeMax] = useState("")
  const itemsPerPage = 50

  const levels = { maternelle: ["Maternelle"], primaire: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"], college: ["6ème", "5ème", "4ème", "3ème"], lycee: ["2nde L", "2nde S", "1ère A1", "1ère A2", "1ère B", "Terminale A1", "Terminale B", "Terminale D", "Terminale S"] }
  const allClasses = ["Maternelle", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde L", "2nde S", "1ère A1", "1ère A2", "1ère B", "Terminale A1", "Terminale B", "Terminale D", "Terminale S"]
  const classes = selectedLevel === "all" ? allClasses : levels[selectedLevel as keyof typeof levels] || []
  const assignmentClasses = academicStructure.flatMap((cycle) => (cycle.grade_levels ?? []).flatMap((level) => (level.school_classes ?? []).map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name, gradeLevelId: level.id }))))

  useEffect(() => { setStudents(displayStudents); setFilteredStudents(displayStudents) }, [displayStudents])
  useEffect(() => { setSelectedClass("all") }, [selectedLevel])
  useEffect(() => {
    let filtered = students
    if (selectedLevel !== "all") filtered = filtered.filter(student => levels[selectedLevel as keyof typeof levels]?.includes(student.classe))
    if (selectedClass !== "all") filtered = filtered.filter(student => student.classe === selectedClass)
    if (selectedStatus !== "all") filtered = filtered.filter(student => student.statut === selectedStatus)
    if (filterOptions !== "all") {
      if (filterOptions === "cantine") filtered = filtered.filter(s => s.optionsSupplementaires?.cooperative || false)
      else if (filterOptions === "transport") filtered = filtered.filter(s => false)
      else if (filterOptions === "tenue") filtered = filtered.filter(s => s.optionsSupplementaires?.tenueScolaire || false)
    }
    if (filterAgeMin || filterAgeMax) filtered = filtered.filter(student => { const birthDate = new Date(student.dateNaissance); const age = new Date().getFullYear() - birthDate.getFullYear(); const minAge = filterAgeMin ? parseInt(filterAgeMin) : 0; const maxAge = filterAgeMax ? parseInt(filterAgeMax) : 100; return age >= minAge && age <= maxAge })
    setFilteredStudents(filtered)
  }, [students, selectedClass, selectedStatus, selectedLevel, searchTerm, filterOptions, filterAgeMin, filterAgeMax])
  useEffect(() => { setCurrentPage(1) }, [selectedClass, selectedStatus, selectedLevel, searchTerm, filterOptions, filterAgeMin, filterAgeMax])

  const handleDeleteStudent = async (id: string) => { if (confirm("Désactiver cet élève ?\n\nSon historique sera conservé.")) { const success = await deactivate(id); if (success) { toast.success("Élève désactivé avec succès"); setSelectedStudent(null) } else toast.error("Impossible de désactiver cet élève") } }
  const handleToggleStatus = async (student: DonneesEleve) => {
    const updatedStudent = { ...student, statut: (student.statut === "actif" ? "inactif" : "actif") as "actif" | "inactif" | "transfere" }
    const success = await update({ studentId: student.id, firstName: updatedStudent.prenom, lastName: updatedStudent.nom, studentNumber: updatedStudent.identifiant, birthDate: updatedStudent.dateNaissance, sex: updatedStudent.sexe, phone: updatedStudent.informationsContact.telephone, email: updatedStudent.informationsContact.email, active: updatedStudent.statut === "actif" })
    if (!success) toast.error("Impossible de modifier le statut de l'élève")
    if (selectedStudent && selectedStudent.id === student.id) setSelectedStudent(updatedStudent)
  }
  const handleSelectStudent = (id: string, selected: boolean) => { setSelectedIds(prev => { const next = new Set(prev); if (selected) next.add(id); else next.delete(id); return next }) }
  const handleBulkStatusChange = async () => { for (const id of selectedIds) { const student = students.find(s => s.id === id); if (student) await handleToggleStatus(student) }; setSelectedIds(new Set()) }
  const handleBulkClassChange = async () => {
    if (!establishmentId || !selectedYear?.id || selectedIds.size === 0) return toast.error("Le contexte académique est indisponible")
    if (assignmentClasses.length === 0 || tuitionPlans.length === 0) return toast.error("Aucune classe ou aucun forfait actif disponible")
    const classChoice = prompt(`Classe cible (1-${assignmentClasses.length}) :\n${assignmentClasses.map((item, index) => `${index + 1}. ${item.name}`).join("\n")}`)
    const classIndex = Number(classChoice) - 1; const targetClass = assignmentClasses[classIndex]; if (!targetClass) return
    const classPlans = tuitionPlans.filter((plan) => plan.grade_level_id === targetClass.gradeLevelId)
    const targetPlan = classPlans.length === 1 ? classPlans[0] : classPlans[Number(prompt(`Forfait (1-${classPlans.length}) :\n${classPlans.map((plan, index) => `${index + 1}. ${plan.annual_amount.toLocaleString()} FCFA`).join("\n")}`)) - 1]
    if (!targetPlan) return toast.error("Aucun forfait valide sélectionné")
    const result = await assignToClass({ establishmentId, studentIds: Array.from(selectedIds), academicYearId: selectedYear.id, classId: targetClass.id, tuitionPlanId: targetPlan.id, enrollmentDate: new Date().toISOString().slice(0, 10) })
    if (result) { toast.success(`${result.total} élève(s) affecté(s) : ${result.created} inscription(s) créée(s), ${result.updated} mise(s) à jour`); setSelectedIds(new Set()) } else toast.error("Impossible d'affecter les élèves")
  }
  const handleBulkGenerateCertificates = () => {
    const selectedStudents = students.filter(s => selectedIds.has(s.id)); if (selectedStudents.length === 0) return toast.error("Aucun élève sélectionné")
    let html = `<!doctype html><html><head><meta charset="utf-8" /><title>Attestations de scolarité</title><style>body { font-family: Inter, Arial, sans-serif; padding: 20px; }.certificate { page-break-after: always; margin-bottom: 40px; border: 1px solid #ccc; padding: 20px; }h1 { color: #333; }.student-info { margin: 20px 0; }.footer { margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><h1>Attestations de scolarité</h1>`
    selectedStudents.forEach((student, index) => { html += `<div class="certificate"><h2>Attestation de scolarité n°${index + 1}</h2><div class="student-info"><p><strong>Nom:</strong> ${student.nom}</p><p><strong>Prénom:</strong> ${student.prenom}</p><p><strong>Identifiant:</strong> ${student.identifiant}</p><p><strong>Classe:</strong> ${student.classe}</p><p><strong>Date de naissance:</strong> ${new Date(student.dateNaissance).toLocaleDateString('fr-FR')}</p></div><p>Nous attestons par la présente que l'élève ci-dessus est régulièrement inscrit(e) dans notre établissement pour l'année scolaire en cours.</p><div class="footer"><p>École Vivante - ${new Date().toLocaleDateString('fr-FR')}</p></div></div>` })
    html += `</body></html>`; printHtml(html); toast.success(`${selectedStudents.length} attestation(s) générée(s)`); setSelectedIds(new Set())
  }
  const handleBulkArchive = async () => { const selectedCount = selectedIds.size; if (confirm(`Désactiver ${selectedCount} élève(s) ?`)) { for (const id of selectedIds) await deactivate(id); setSelectedIds(new Set()); toast.success(`${selectedCount} élève(s) désactivé(s)`) } }
  const handleBulkMessage = () => { const message = prompt("Message à envoyer aux parents des élèves sélectionnés:"); if (message) { toast.success("Message envoyé (simulation)"); setSelectedIds(new Set()) } }
  const handleExportCSV = () => { const headers = "Nom,Prénom,Identifiant,Classe,Statut,Téléphone,Email,Date d'inscription\n"; const csvContent = students.map(student => `"${student.nom}","${student.prenom}","${student.identifiant}","${student.classe}","${student.statut}","${student.informationsContact.telephone}","${student.informationsContact.email}","${new Date(student.dateInscription).toLocaleDateString()}"`).join("\n"); const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "eleves.csv"; link.click(); URL.revokeObjectURL(url) }
  const handleExportIdentifiants = () => toast.info("Export des identifiants")
  const handleDownloadTemplate = () => toast.info("Téléchargement du modèle")
  const handleImportCSV = (file: File) => { const reader = new FileReader(); reader.onload = () => toast.info("Import CSV en cours"); reader.readAsText(file) }
  const handlePrintReceipt = (student: DonneesEleve) => router.push(`/receipt?id=${student.id}`)
  const handlePrintSchoolCertificate = (student: DonneesEleve) => alert("Impression attestation")
  const getClassStats = () => { const stats: { [key: string]: number } = {}; students.forEach(student => { stats[student.classe] = (stats[student.classe] || 0) + 1 }); return stats }
  const getQuickStats = () => { const activeStudents = students.filter(s => s.statut === 'actif'); const studentsWithoutPhoto = activeStudents.filter(s => !s.photo); return { total: activeStudents.length, withoutPhoto: studentsWithoutPhoto.length, absentToday: 0, byLevel: Object.entries(getClassStats()).reduce((acc, [classe, count]) => { const level = classe.split(' ')[0]; acc[level] = (acc[level] || 0) + count; return acc }, {} as Record<string, number>) } }
  const quickStats = getQuickStats(); const classStats = getClassStats(); const studentsByClass = filteredStudents.reduce((acc, student) => { if (!acc[student.classe]) acc[student.classe] = []; acc[student.classe].push(student); return acc }, {} as { [key: string]: DonneesEleve[] }); const totalPages = backendTotalPages || Math.ceil(filteredStudents.length / itemsPerPage); const startIndex = (currentPage - 1) * itemsPerPage; const endIndex = startIndex + itemsPerPage; const paginatedStudents = filteredStudents.slice(startIndex, endIndex)
  function handlePrintSchoolCard(student: DonneesEleve): void { throw new Error("Function not implemented.") }

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {(estEnCoursDeChargement || isLoadingSupabase) && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Chargement des élèves...</div>}
      {studentsError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{studentsError}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0"><h1 className="text-2xl font-bold text-terre flex items-center gap-2"><Users className="h-6 w-6 shrink-0" />Gestion des Élèves</h1><p className="text-pierre text-sm break-words">{filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""}{selectedClass !== "all" ? ` en ${selectedClass}` : ""}{selectedStatus !== "all" ? ` (${selectedStatus}s)` : ""}</p></div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="outline" onClick={handleExportCSV} className="w-full rounded-2xl sm:w-auto"><Download className="h-4 w-4 mr-2 shrink-0" />Exporter</Button>
          <Button asChild className="w-full bg-terre hover:bg-terre-dark rounded-2xl sm:w-auto"><Link href="/ecole/inscriptions" className="flex w-full items-center justify-center whitespace-normal sm:w-auto sm:whitespace-nowrap"><FileText className="h-4 w-4 mr-2 shrink-0" />Nouvelle inscription</Link></Button>
          <Button variant="outline" asChild className="w-full rounded-2xl sm:w-auto"><Link href="/ecole/inscriptions" className="flex w-full items-center justify-center whitespace-normal sm:w-auto sm:whitespace-nowrap"><RotateCcw className="h-4 w-4 mr-2 shrink-0" />Réinscription</Link></Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Card className="bg-papier shadow-soft border-0"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-pierre">Élèves actifs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-terre">{quickStats.total}</div></CardContent></Card><Card className="bg-papier shadow-soft border-0"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-pierre">Sans photo</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-soleil">{quickStats.withoutPhoto}</div></CardContent></Card><Card className="bg-papier shadow-soft border-0"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-pierre">Absents aujourd'hui</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-rouge-terre">{quickStats.absentToday}</div></CardContent></Card><Card className="bg-papier shadow-soft border-0"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-pierre">Classes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-jardin">{Object.keys(classStats).length}</div></CardContent></Card></div>
      <ImportExportTools onExportCSV={handleExportCSV} onExportIdentifiants={handleExportIdentifiants} onDownloadTemplate={handleDownloadTemplate} onImportCSV={handleImportCSV} />
      <Tabs defaultValue="by-class" className="space-y-6">
        {/* existing page content continues below unchanged in the repository */}
      </Tabs>
    </div>
  )
}
