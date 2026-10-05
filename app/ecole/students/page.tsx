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
import StudentImportGuideModal from "@/components/students/StudentImportGuideModal"

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
  const { activeYear } = useAcademicYears(establishmentId)
  const { data: tuitionPlans } = useTuitionPlans(activeYear?.id ?? null)
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
      adresse: "",
      dateInscription: s.created_at ?? new Date().toISOString(),
      statut: s.status === "active" ? "actif" : (s.status === "inactive" ? "inactif" : "transfere") as "actif" | "inactif" | "transfere",
      totalAPayer: 0,
      typeInscription: "inscription" as const,
      informationsContact: { telephone: s.phone ?? "", email: s.email ?? "", adresse: "" },
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
    if (!establishmentId || !activeYear?.id || selectedIds.size === 0) return toast.error("Le contexte académique est indisponible")
    if (assignmentClasses.length === 0 || tuitionPlans.length === 0) return toast.error("Aucune classe ou aucun forfait actif disponible")
    const classChoice = prompt(`Classe cible (1-${assignmentClasses.length}) :\n${assignmentClasses.map((item, index) => `${index + 1}. ${item.name}`).join("\n")}`)
    const classIndex = Number(classChoice) - 1; const targetClass = assignmentClasses[classIndex]; if (!targetClass) return
    const classPlans = tuitionPlans.filter((plan) => plan.grade_level_id === targetClass.gradeLevelId)
    const targetPlan = classPlans.length === 1 ? classPlans[0] : classPlans[Number(prompt(`Forfait (1-${classPlans.length}) :\n${classPlans.map((plan, index) => `${index + 1}. ${plan.annual_tuition.toLocaleString()} FCFA`).join("\n")}`)) - 1]
    if (!targetPlan) return toast.error("Aucun forfait valide sélectionné")
    const result = await assignToClass({ establishmentId, studentIds: Array.from(selectedIds), academicYearId: activeYear.id, classId: targetClass.id, tuitionPlanId: targetPlan.id, enrollmentDate: new Date().toISOString().slice(0, 10) })
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
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => { const reader = new FileReader(); reader.onload = () => toast.info("Import CSV en cours"); const file = e.target.files?.[0]; if (!file) return; reader.readAsText(file) }
  const handlePrintReceipt = (student: DonneesEleve) => router.push(`/receipt?id=${student.id}`)
  const handlePrintSchoolCertificate = (student: DonneesEleve) => alert("Impression attestation")
  const getClassStats = () => { const stats: { [key: string]: number } = {}; students.forEach(student => { stats[student.classe] = (stats[student.classe] || 0) + 1 }); return stats }
  const getQuickStats = () => { const activeStudents = students.filter(s => s.statut === 'actif'); const studentsWithoutPhoto = activeStudents.filter(s => !s.photo); return { total: activeStudents.length, withoutPhoto: studentsWithoutPhoto.length, absentToday: 0, byLevel: Object.entries(getClassStats()).reduce((acc, [classe, count]) => { const level = classe.split(' ')[0]; acc[level] = (acc[level] || 0) + count; return acc }, {} as Record<string, number>) } }
  const quickStats = getQuickStats(); const classStats = getClassStats(); const studentsByClass = filteredStudents.reduce((acc, student) => { if (!acc[student.classe]) acc[student.classe] = []; acc[student.classe].push(student); return acc }, {} as { [key: string]: DonneesEleve[] }); const totalPages = backendTotalPages || Math.ceil(filteredStudents.length / itemsPerPage); const startIndex = (currentPage - 1) * itemsPerPage; const endIndex = startIndex + itemsPerPage; const paginatedStudents = filteredStudents.slice(startIndex, endIndex)
  function handlePrintSchoolCard(student: DonneesEleve): void { throw new Error("Function not implemented.") }

  return (
    <div className="w-full min-w-0">
      {(estEnCoursDeChargement || isLoadingSupabase) && (
        <div className="mb-3 border border-[#c5c5d3]/55 bg-white px-3 py-2 text-[12px] text-[#515f74]">Chargement des élèves...</div>
      )}
      {studentsError && (
        <div className="mb-3 border border-[#ffdad6] bg-[#ffefed] px-3 py-2 text-[12px] text-[#93000a]">{studentsError}</div>
      )}

      <header className="flex flex-col gap-3 border-b border-[#c5c5d3]/45 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[23px] font-semibold leading-7 tracking-tight text-[#131b2e]">Élèves</h1>
            <span className="rounded bg-[#dce1ff] px-2 py-1 font-mono text-[12px] font-medium text-[#00236f]">{total.toLocaleString("fr-FR")} effectif total</span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#515f74]">Gestion administrative et académique des effectifs scolaires</p>
        </div>

        <div className="flex flex-wrap justify-start gap-1.5 md:justify-end">
          <Button variant="outline" className="h-8 rounded px-2.5 text-[11px]" onClick={handleBulkClassChange} disabled={selectedIds.size === 0}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Réinscription groupée
          </Button>
          <StudentImportGuideModal />
          <Button variant="outline" className="h-8 rounded px-2.5 text-[11px]" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter (.xlsx)
          </Button>
          <Button asChild className="h-8 rounded bg-[#1e3a8a] px-3 text-[11px] hover:bg-[#00236f]">
            <Link href="/ecole/inscriptions"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Nouvel élève</Link>
          </Button>
        </div>
      </header>

      <section className="mt-3 border border-[#c5c5d3]/60 bg-white p-2">
        <div className="grid gap-1.5 lg:grid-cols-[1.7fr_.7fr_.8fr_.8fr]">
          <label className="relative block">
            <span className="sr-only">Rechercher</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, matricule, tuteur..."
              className="h-9 w-full border border-[#c5c5d3]/70 bg-white pl-9 pr-3 text-[12px] text-[#131b2e] outline-none focus:border-[#00236f]"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#515f74]">⌕</span>
          </label>

          <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="h-9 border border-[#c5c5d3]/70 bg-white px-2 text-[12px] text-[#131b2e]">
            <option value="all">Tous les niveaux</option>
            {Object.keys(levels).map((level) => <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>)}
          </select>

          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="h-9 border border-[#c5c5d3]/70 bg-white px-2 text-[12px] text-[#131b2e]">
            <option value="all">Toutes les classes</option>
            {classes.map((classe) => <option key={classe} value={classe}>{classe} ({classStats[classe] || 0})</option>)}
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-9 border border-[#c5c5d3]/70 bg-white px-2 text-[12px] text-[#131b2e]">
            <option value="all">Inscrit / Actif</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
          </select>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" className="h-8 rounded text-[11px]" onClick={() => setShowAdvancedFilters((value) => !value)}>
              <Wrench className="mr-1.5 h-3.5 w-3.5" /> Filtres avancés
            </Button>
            {showAdvancedFilters && (
              <>
                <input value={filterAgeMin} onChange={(e) => setFilterAgeMin(e.target.value)} placeholder="Âge min" inputMode="numeric" className="h-8 w-20 border border-[#c5c5d3]/70 px-2 text-[11px]" />
                <input value={filterAgeMax} onChange={(e) => setFilterAgeMax(e.target.value)} placeholder="Âge max" inputMode="numeric" className="h-8 w-20 border border-[#c5c5d3]/70 px-2 text-[11px]" />
              </>
            )}
          </div>
          <span className="font-mono text-[11px] text-[#515f74]">{filteredStudents.length.toLocaleString("fr-FR")} résultats&nbsp; ↻</span>
        </div>
      </section>

      <section className="mt-2 grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.95fr)]">
        <div className="min-w-0 overflow-hidden border border-[#c5c5d3]/60 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-[#c5c5d3]/60 bg-[#f2f3ff]">
                  <th className="w-10 px-2 py-2 text-left"><input type="checkbox" aria-label="Sélectionner les élèves visibles" onChange={(e) => setSelectedIds(e.target.checked ? new Set(paginatedStudents.map((s) => s.id)) : new Set())} /></th>
                  <th className="px-2 py-2 text-left">Matricule</th>
                  <th className="px-2 py-2 text-left">Élève</th>
                  <th className="px-2 py-2 text-left">Sexe / âge</th>
                  <th className="px-2 py-2 text-left">Classe</th>
                  <th className="px-2 py-2 text-left">Contact</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-[12px] text-[#515f74]">Aucun élève trouvé.</td></tr>
                ) : paginatedStudents.map((student) => {
                  const className = assignmentClasses.find((item) => item.id === student.id || item.id === (student as any).class_id)?.name || student.classe || "—"
                  const birth = student.dateNaissance ? new Date(student.dateNaissance) : null
                  const age = birth && !Number.isNaN(birth.getTime()) ? Math.max(0, new Date().getFullYear() - birth.getFullYear()) : null
                  const initials = ((student.prenom?.[0] || "") + (student.nom?.[0] || "")).toUpperCase() || "—"
                  const selected = selectedStudent?.id === student.id
                  return (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={["cursor-pointer border-b border-[#c5c5d3]/45 last:border-b-0 hover:bg-[#f7f8ff]", selected ? "bg-[#eef2ff]" : ""].join(" ")}
                    >
                      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(student.id)} onChange={(e) => handleSelectStudent(student.id, e.target.checked)} aria-label={`Sélectionner ${student.nom} ${student.prenom}`} />
                      </td>
                      <td className="px-2 py-2 font-mono text-[11px] text-[#264191]">{student.identifiant || "—"}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d5e3fc] text-[10px] font-semibold text-[#264191]">{initials}</span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-[#131b2e]">{student.nom} {student.prenom}</p>
                            <p className="truncate text-[10px] text-[#515f74]">Régime non renseigné</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-[#303746]">{student.sexe || "—"} {age !== null ? `- ${age} ans` : ""}<div className="text-[10px] text-[#515f74]">{birth ? birth.toLocaleDateString("fr-FR") : "—"}</div></td>
                      <td className="px-2 py-2"><span className="rounded bg-[#dce1ff] px-2 py-1 text-[10px] text-[#264191]">{className}</span></td>
                      <td className="px-2 py-2 text-[11px] text-[#303746]">{student.informationsContact.telephone || student.informationsContact.email || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#c5c5d3]/60 px-3 py-2.5 text-[11px] text-[#515f74] sm:flex-row sm:items-center sm:justify-between">
            <span>Affichage <strong className="text-[#131b2e]">{paginatedStudents.length ? startIndex + 1 : 0} à {Math.min(endIndex, filteredStudents.length)}</strong> sur <strong className="text-[#131b2e]">{total.toLocaleString("fr-FR")}</strong> élèves</span>
            <div className="flex items-center gap-1.5">
              <span>Lignes :</span>
              <span className="rounded border border-[#c5c5d3]/60 px-2 py-1">50</span>
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Précédent</Button>
              <span className="rounded bg-[#1e3a8a] px-2.5 py-1.5 font-medium text-white">{currentPage}</span>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Suivant</Button>
            </div>
          </div>
        </div>

        <aside className="min-w-0 overflow-hidden border border-[#c5c5d3]/60 bg-white">
          {selectedStudent ? (
            <>
              <div className="flex items-start justify-between border-b border-[#c5c5d3]/60 bg-[#f2f3ff] px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#1e3a8a] text-[12px] font-semibold text-white">
                    {((selectedStudent.prenom?.[0] || "") + (selectedStudent.nom?.[0] || "")).toUpperCase() || "—"}
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#131b2e]">{selectedStudent.nom} {selectedStudent.prenom}</h2>
                    <p className="font-mono text-[11px] text-[#264191]">{selectedStudent.identifiant || "Matricule non renseigné"} <span className="text-[#515f74]">|</span> {assignmentClasses.find((item) => item.id === (selectedStudent as any).class_id)?.name || selectedStudent.classe || "Classe non renseignée"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} className="text-[18px] text-[#515f74] hover:text-[#131b2e]" aria-label="Fermer">×</button>
              </div>

              <div className="flex border-b border-[#c5c5d3]/60 bg-white text-[11px]">
                {["Identité", "Scolarité", "Finances", "Absences/Notes", "Documents"].map((tab, index) => (
                  <span key={tab} className={["px-2.5 py-2", index === 0 ? "border-b-2 border-[#00236f] font-semibold text-[#00236f]" : "text-[#515f74]"].join(" ")}>{tab}</span>
                ))}
              </div>

              <div className="space-y-3 p-3">
                <div>
                  <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#515f74]">État civil & régime</h3>
                  <div className="grid grid-cols-2 gap-1 border border-[#c5c5d3]/50 bg-[#f2f3ff] p-2.5 text-[11px]">
                    <div><span className="text-[#515f74]">Date de naissance :</span><div className="font-medium">{selectedStudent.dateNaissance ? new Date(selectedStudent.dateNaissance).toLocaleDateString("fr-FR") : "Non renseignée"}</div></div>
                    <div><span className="text-[#515f74]">Lieu :</span><div className="font-medium">{selectedStudent.lieuNaissance || "Non renseigné"}</div></div>
                    <div><span className="text-[#515f74]">Sexe :</span><div className="font-medium">{selectedStudent.sexe || "Non renseigné"}</div></div>
                    <div><span className="text-[#515f74]">Statut :</span><div className="font-medium text-[#00236f]">{selectedStudent.statut}</div></div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#515f74]">Responsable légal principal</h3>
                  <div className="border border-[#c5c5d3]/50 bg-[#f2f3ff] p-2.5 text-[11px]">
                    <p className="font-semibold text-[#131b2e]">{selectedStudent.nomParent || "Responsable non renseigné"}</p>
                    <p className="mt-1 text-[#515f74]">{selectedStudent.informationsContact.telephone || "Téléphone non renseigné"}</p>
                    <p className="text-[#515f74]">{selectedStudent.informationsContact.email || "Email non renseigné"}</p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#515f74]">Indicateurs de suivi</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="border border-[#c5c5d3]/50 p-2"><p className="text-[10px] text-[#515f74]">Solde scolarité</p><p className="mt-1 text-[14px] font-semibold text-[#131b2e]">—</p><p className="text-[10px] text-[#515f74]">Données financières disponibles selon le dossier</p></div>
                    <div className="border border-[#c5c5d3]/50 p-2"><p className="text-[10px] text-[#515f74]">Assiduité</p><p className="mt-1 text-[14px] font-semibold text-[#131b2e]">—</p><p className="text-[10px] text-[#515f74]">Voir Absences</p></div>
                    <div className="border border-[#c5c5d3]/50 p-2"><p className="text-[10px] text-[#515f74]">Moy. trimestre</p><p className="mt-1 text-[14px] font-semibold text-[#131b2e]">—</p><p className="text-[10px] text-[#515f74]">Voir Évaluations / Notes</p></div>
                    <div className="border border-[#c5c5d3]/50 p-2"><p className="text-[10px] text-[#515f74]">Dossier</p><p className="mt-1 text-[14px] font-semibold text-[#131b2e]">—</p><p className="text-[10px] text-[#515f74]">Pièces à consulter</p></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[#c5c5d3]/60 bg-[#f2f3ff] p-2.5">
                <Button variant="outline" size="sm" className="h-8 rounded text-[11px]" onClick={() => handleToggleStatus(selectedStudent)}>{selectedStudent.statut === "actif" ? "Désactiver" : "Activer"}</Button>
                <Button variant="outline" size="sm" className="h-8 rounded text-[11px]" onClick={() => handlePrintSchoolCertificate(selectedStudent)}><FileText className="mr-1.5 h-3.5 w-3.5" /> Certificat</Button>
                <Button size="sm" className="h-8 rounded bg-[#1e3a8a] text-[11px] hover:bg-[#00236f]" onClick={() => router.push(`/ecole/students/${selectedStudent.id}`)}>Dossier</Button>
              </div>
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
              <div>
                <Users className="mx-auto h-8 w-8 text-[#515f74]" strokeWidth={1.5} />
                <p className="mt-2 text-[13px] font-semibold text-[#131b2e]">Sélectionnez un élève</p>
                <p className="mt-1 text-[11px] leading-5 text-[#515f74]">Le dossier administratif s'affichera ici.</p>
              </div>
            </div>
          )}
        </aside>
      </section>

      {selectedIds.size > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 border border-[#c5c5d3] bg-white px-3 py-2 shadow-[0_3px_12px_rgba(19,27,46,.10)]">
          <span className="text-[11px] font-medium text-[#131b2e]">{selectedIds.size} élève(s) sélectionné(s)</span>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={handleBulkStatusChange}>Modifier le statut</Button>
            <Button size="sm" variant="outline" onClick={handleBulkClassChange}>Affecter à une classe</Button>
            <Button size="sm" variant="outline" onClick={handleBulkGenerateCertificates}><FileText className="mr-1.5 h-3.5 w-3.5" /> Attestations</Button>
            <Button size="sm" variant="destructive" onClick={handleBulkArchive}>Désactiver</Button>
          </div>
        </div>
      )}
    </div>
  )
}
