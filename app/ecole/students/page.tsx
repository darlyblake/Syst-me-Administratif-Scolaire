"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Wrench, Printer } from "lucide-react"
import Link from "next/link"
import { printHtml } from "@/lib/print"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import type { DonneesEleve } from "@/types/models"

import StudentDetailsModal from "@/components/StudentDetailsModal"
import EditStudentModal from "@/components/students/EditStudentModal"
import { listStudentsPaginated } from "@/lib/supabase/services/student.service"

export default function StudentsPage() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedLevel, setSelectedLevel] = useState("all")
  // Ces états doivent être déclarés avant leur utilisation dans les filtres de useStudents.
  const [filterAgeMin, setFilterAgeMin] = useState("")
  const [filterAgeMax, setFilterAgeMax] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const { data: academicStructure } = useAcademicStructure(establishmentId)
  const { activeYear } = useAcademicYears(establishmentId)
  const { data: tuitionPlans } = useTuitionPlans(activeYear?.id ?? null)
  const { data: supabaseStudents, total, totalPages: backendTotalPages, isLoading: isLoadingSupabase, error: studentsError, create, update, deactivate, assignToClass, isCreating, isUpdating, isDeactivating, isAssigning, refresh } = useStudents(establishmentId, {
    page: currentPage,
    pageSize: 50,
    search: searchTerm,
    classId: selectedClass !== "all" ? selectedClass : null,
    active: selectedStatus === "all" ? null : selectedStatus === "actif",
    gradeLevelId: selectedLevel !== "all" ? selectedLevel : null,
    minAge: filterAgeMin.trim() ? Number(filterAgeMin) : null,
    maxAge: filterAgeMax.trim() ? Number(filterAgeMax) : null,
  })

  const assignmentClasses = useMemo(() =>
    academicStructure.flatMap((cycle) => (cycle.grade_levels ?? []).flatMap((level) => (level.school_classes ?? []).map((sc) => ({ id: sc.id, name: sc.name, gradeLevelId: level.id })))),
    [academicStructure]
  )

  const realGradeLevels = useMemo(() =>
    academicStructure.flatMap((cycle) => (cycle.grade_levels ?? []).map((level) => ({ id: level.id, name: level.name }))),
    [academicStructure]
  )

  const realClasses = useMemo(() =>
    selectedLevel === "all" ? assignmentClasses : assignmentClasses.filter((c) => c.gradeLevelId === selectedLevel),
    [assignmentClasses, selectedLevel]
  )

  const supabseStudentsConverted = useMemo(() => {
    return supabaseStudents.map((s) => {
      const parentFirstName = (s as any).guardian_first_name ?? ""
      const parentLastName = (s as any).guardian_last_name ?? ""
      const parentName = [parentFirstName, parentLastName].filter(Boolean).join(" ").trim()
      const parentPhone = (s as any).guardian_phone ?? s.phone ?? ""
      const parentEmail = (s as any).guardian_email ?? s.email ?? ""
      const parentAddress = (s as any).guardian_address ?? ""
      return {
        id: s.id,
        identifiant: s.student_number ?? "",
        motDePasse: "",
        nom: s.last_name ?? "",
        prenom: s.first_name ?? "",
        dateNaissance: s.birth_date ?? s.date_of_birth ?? "",
        lieuNaissance: (s as any).place_of_birth ?? "",
        sexe: s.sex ?? (s as any).gender ?? "",
        classe: (s as any).class_name ?? assignmentClasses.find((c) => c.id === (s as any).class_id)?.name ?? "",
        nomParent: parentName,
        contactParent: parentPhone,
        adresse: parentAddress,
        dateInscription: (s as any).enrollment_date ?? s.created_at ?? new Date().toISOString(),
        statut: s.active === true ? "actif" : "inactif",
        totalAPayer: 0,
        typeInscription: "inscription" as const,
        informationsContact: { telephone: parentPhone, email: parentEmail, adresse: parentAddress },
        modePaiement: "mensuel" as const,
        optionsSupplementaires: { tenueScolaire: false, carteScolaire: false, cooperative: false, tenueEPS: false, assurance: false },
        fraisOptionsSupplementaires: { tenueScolaire: 0, carteScolaire: 0, cooperative: 0, tenueEPS: 0, assurance: 0 },
      } as DonneesEleve
    })
  }, [supabaseStudents, assignmentClasses])

  const displayStudents = supabseStudentsConverted
  const [students, setStudents] = useState<DonneesEleve[]>([])
  const [filteredStudents, setFilteredStudents] = useState<DonneesEleve[]>([])
  const [selectedStudent, setSelectedStudent] = useState<DonneesEleve | null>(null)
  const [editingStudent, setEditingStudent] = useState<DonneesEleve | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const itemsPerPage = 50

  useEffect(() => { setStudents(displayStudents); setFilteredStudents(displayStudents) }, [displayStudents])
  useEffect(() => { setSelectedClass("all") }, [selectedLevel])
  useEffect(() => { setCurrentPage(1) }, [selectedClass, selectedStatus, selectedLevel, searchTerm, filterAgeMin, filterAgeMax])

  const handleDeleteStudent = async (id: string) => { if (confirm("Désactiver cet élève ?\n\nSon historique sera conservé.")) { const success = await deactivate(id); if (success) { toast.success("Élève désactivé avec succès"); setSelectedStudent(null) } else toast.error("Impossible de désactiver cet élève") } }
  const handleToggleStatus = async (student: DonneesEleve) => {
    const updatedStudent = { ...student, statut: (student.statut === "actif" ? "inactif" : "actif") as "actif" | "inactif" | "transfere" }
    const success = await update({ studentId: student.id, firstName: updatedStudent.prenom, lastName: updatedStudent.nom, studentNumber: updatedStudent.identifiant, birthDate: updatedStudent.dateNaissance, sex: updatedStudent.sexe, phone: updatedStudent.informationsContact.telephone, email: updatedStudent.informationsContact.email, active: updatedStudent.statut === "actif" })
    if (!success) toast.error("Impossible de modifier le statut de l'élève")
    if (selectedStudent && selectedStudent.id === student.id) setSelectedStudent(updatedStudent)
  }
  const handlePrintClassOrLevel = async () => {
    if (!establishmentId) return toast.error("Aucun établissement actif.")
    if (selectedClass === "all" && selectedLevel === "all") return toast.info("Sélectionnez une classe ou un niveau pour imprimer sa liste.")
    const classInfo = assignmentClasses.find((item) => item.id === selectedClass)
    const levelInfo = realGradeLevels.find((item) => item.id === selectedLevel)
    const title = selectedClass !== "all" ? "Liste des élèves — " + (classInfo?.name ?? "Classe") : "Liste des élèves — " + (levelInfo?.name ?? "Niveau")
    try {
      const allStudents: any[] = []
      let page = 1
      let pageCount = 1
      do {
        const result = await listStudentsPaginated(establishmentId, page, 500, "", selectedStatus === "all" ? null : selectedStatus === "actif", selectedClass !== "all" ? selectedClass : null, null, selectedClass === "all" ? selectedLevel : null, null, null, selectedStatus === "all" ? null : selectedStatus === "actif")
        allStudents.push(...result.items)
        pageCount = result.total_pages
        page += 1
      } while (page <= pageCount)
      if (allStudents.length === 0) return toast.info("Aucun élève à imprimer pour cette sélection.")
      const esc = (value: unknown) => String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      const rows = allStudents.map((student, index) => {
        const className = student.class_name || assignmentClasses.find((item) => item.id === student.class_id)?.name || "—"
        return "<tr><td>" + (index + 1) + "</td><td>" + esc(student.student_number) + "</td><td>" + esc(student.last_name) + " " + esc(student.first_name) + "</td><td>" + esc(student.sex || student.gender) + "</td><td>" + esc(className) + "</td><td>" + (student.active === false ? "Inactif" : "Actif") + "</td></tr>"
      }).join("")
      const html = '<html lang="fr"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>@page{size:A4 portrait;margin:15mm}body{font-family:Arial,sans-serif;color:#172033;font-size:11px}h1{font-size:18px;color:#00236f}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd2df;padding:7px 6px;text-align:left}th{background:#e9edff;font-size:10px;text-transform:uppercase}tbody tr:nth-child(even){background:#f7f8fc}footer{margin-top:18px;font-size:10px;color:#64748b}</style></head><body><h1>' + esc(title) + '</h1><p>Année scolaire : ' + esc(activeYear?.name || "—") + " · Effectif : " + allStudents.length + '</p><table><thead><tr><th>N°</th><th>Matricule</th><th>Nom et prénom</th><th>Sexe</th><th>Classe</th><th>Statut</th></tr></thead><tbody>' + rows + '</tbody></table><footer>Document généré le ' + new Date().toLocaleDateString("fr-FR") + '</footer></body></html>'
      printHtml(html)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de préparer la liste à imprimer.")
    }
  }
  const totalPages = backendTotalPages; const startIndex = (currentPage - 1) * itemsPerPage; const endIndex = startIndex + itemsPerPage; const paginatedStudents = filteredStudents

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
          <Button variant="outline" className="h-8 rounded px-2.5 text-[11px]" onClick={handlePrintClassOrLevel} disabled={isLoadingSupabase}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer la liste
          </Button>
          <Button asChild className="h-8 rounded bg-[#1e3a8a] px-3 text-[11px] text-white hover:bg-[#00236f]">
            <Link href="/ecole/inscriptions"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Nouvelle inscription</Link>
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
              placeholder="Rechercher par nom, prénom, matricule ou parent..."
              className="h-9 w-full border border-[#c5c5d3]/70 bg-white pl-9 pr-3 text-[12px] text-[#131b2e] outline-none focus:border-[#00236f]"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#515f74]">⌕</span>
          </label>

          <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="h-9 border border-[#c5c5d3]/70 bg-white px-2 text-[12px] text-[#131b2e]">
            <option value="all">Tous les niveaux</option>
            {realGradeLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
          </select>

          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="h-9 border border-[#c5c5d3]/70 bg-white px-2 text-[12px] text-[#131b2e]">
            <option value="all">Toutes les classes</option>
            {realClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-9 border border-[#c5c5d3]/70 bg-white px-2 text-[12px] text-[#131b2e]">
            <option value="all">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
          </select>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" variant="outline" className="h-8 rounded text-[11px]" onClick={() => setShowAdvancedFilters((value) => !value)}>
              <Wrench className="mr-1.5 h-3.5 w-3.5" /> Filtres avancés
            </Button>
            {showAdvancedFilters && (
              <>
                <input type="number" min="0" max="120" value={filterAgeMin} onChange={(e) => setFilterAgeMin(e.target.value)} placeholder="Âge min" aria-label="Âge minimum" className="h-8 w-20 border border-[#c5c5d3]/70 px-2 text-[11px]" />
                <input type="number" min="0" max="120" value={filterAgeMax} onChange={(e) => setFilterAgeMax(e.target.value)} placeholder="Âge max" aria-label="Âge maximum" className="h-8 w-20 border border-[#c5c5d3]/70 px-2 text-[11px]" />
              </>
            )}
            <Button type="button" variant="ghost" className="h-8 rounded text-[11px]" onClick={() => { setSearchTerm(""); setSelectedClass("all"); setSelectedStatus("all"); setSelectedLevel("all"); setFilterAgeMin(""); setFilterAgeMax(""); setCurrentPage(1) }}>
              Réinitialiser
            </Button>
          </div>
          <span className="font-mono text-[11px] text-[#515f74]">{total.toLocaleString("fr-FR")} résultat(s)</span>
        </div>
      </section>

      <section className="mt-2 min-w-0">
        <div className="min-w-0 overflow-hidden border border-[#c5c5d3]/60 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-[#c5c5d3]/60 bg-[#f2f3ff]">
                  <th className="px-2 py-2 text-left">Matricule</th>
                  <th className="px-2 py-2 text-left">Élève</th>
                  <th className="px-2 py-2 text-left">Sexe / âge</th>
                  <th className="px-2 py-2 text-left">Classe</th>
                  <th className="px-2 py-2 text-left">Contact</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-[12px] text-[#515f74]">Aucun élève trouvé.</td></tr>
                ) : paginatedStudents.map((student) => {
                  const className = assignmentClasses.find((item) => item.id === (student as any).class_id)?.name || student.classe || "—"
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
            <span>Affichage <strong className="text-[#131b2e]">{paginatedStudents.length ? startIndex + 1 : 0} à {Math.min(endIndex, total)}</strong> sur <strong className="text-[#131b2e]">{total.toLocaleString("fr-FR")}</strong> élèves</span>
            <div className="flex items-center gap-1.5">
              <span>Lignes :</span>
              <span className="rounded border border-[#c5c5d3]/60 px-2 py-1">50</span>
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Précédent</Button>
              <span className="rounded bg-[#1e3a8a] px-2.5 py-1.5 font-medium text-white">{currentPage}</span>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Suivant</Button>
            </div>
          </div>
        </div>
      </section>

      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onDelete={handleDeleteStudent}
          onToggleStatus={handleToggleStatus}
          onEdit={(student) => {
            setSelectedStudent(null)
            setEditingStudent(student)
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={update}
        />
      )}

    </div>
  )
}
