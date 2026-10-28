"use client"

import { useEffect, useMemo, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, FileText, Download, Printer, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"

type BulletinAssessment = {
  id: string
  title: string
  assessment_date: string
  term: string | null
  max_score: number
  subject_id: string
  class_id: string
  establishment_id: string
}

type BulletinGrade = {
  id: string
  student_id: string
  score: number | null
  comment: string | null
  assessment: BulletinAssessment
}

type BulletinRow = {
  subject: string
  score: number
  classAverage: number
  rank: number | null
  appreciation: string
}

function appreciationFor(score: number) {
  if (score >= 16) return "Excellent"
  if (score >= 14) return "Très bien"
  if (score >= 12) return "Bien"
  if (score >= 10) return "Assez bien"
  return "À améliorer"
}

function isSelectedPeriod(term: string | null, selected: string) {
  if (selected === "annuel") return true
  if (!term) return false
  const normalized = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const patterns: Record<string, RegExp> = {
    "1": /(trimestre\s*1|1er\s*trimestre|premier\s*trimestre|periode\s*1|(^|\D)t1(\D|$))/,
    "2": /(trimestre\s*2|2e\s*trimestre|2eme\s*trimestre|deuxieme\s*trimestre|periode\s*2|(^|\D)t2(\D|$))/,
    "3": /(trimestre\s*3|3e\s*trimestre|3eme\s*trimestre|troisieme\s*trimestre|periode\s*3|(^|\D)t3(\D|$))/,
  }
  return patterns[selected]?.test(normalized) ?? normalized === selected
}

function currentAcademicYear() {
  const now = new Date()
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return startYear + "-" + (startYear + 1)
}

export default function Bulletins() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: academicStructure, isLoading: isLoadingStructure, error: structureError } = useAcademicStructure(establishmentId)
  const [selectedClasse, setSelectedClasse] = useState("")
  const [selectedTrimestre, setSelectedTrimestre] = useState("1")
  const [selectedStudent, setSelectedStudent] = useState("")
  const [grades, setGrades] = useState<BulletinGrade[]>([])
  const [subjectNames, setSubjectNames] = useState<Record<string, string>>({})
  const [isLoadingGrades, setIsLoadingGrades] = useState(false)
  const [gradesError, setGradesError] = useState<string | null>(null)
  const [bulletinGenere, setBulletinGenere] = useState(false)

  const academicClasses = useMemo(() => academicStructure.flatMap((cycle) =>
    (cycle.grade_levels ?? []).flatMap((level) =>
      (level.school_classes ?? []).map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))
    )
  ), [academicStructure])

  const selectedClass = academicClasses.find((schoolClass) => schoolClass.id === selectedClasse)
  const { data: supabaseStudents, isLoading: isLoadingStudents, error: studentsError } = useStudents(
    establishmentId,
    { classId: selectedClasse || null, active: true, page: 1, pageSize: 500 }
  )

  const students = useMemo(() => (supabaseStudents ?? []).map((student) => ({
    id: student.id,
    number: student.student_number || student.id.slice(0, 8).toUpperCase(),
    firstName: student.first_name || "",
    lastName: student.last_name || "",
  })).sort((a, b) => (a.lastName + " " + a.firstName).localeCompare(b.lastName + " " + b.firstName, "fr")), [supabaseStudents])

  useEffect(() => {
    setSelectedStudent("")
    setBulletinGenere(false)
  }, [selectedClasse, selectedTrimestre])

  useEffect(() => {
    let active = true
    async function loadGrades() {
      if (!establishmentId || !selectedClasse) {
        setGrades([])
        setSubjectNames({})
        setIsLoadingGrades(false)
        setGradesError(null)
        return
      }

      setIsLoadingGrades(true)
      setGradesError(null)
      try {
        const { data, error } = await supabaseBrowser
          .from("grades")
          .select("id,student_id,score,comment,assessment:assessments!inner(id,title,assessment_date,term,max_score,subject_id,class_id,establishment_id)")
          .eq("assessment.class_id", selectedClasse)
          .eq("assessment.establishment_id", establishmentId)
          .limit(5000)

        if (error) throw error

        const rows = ((data ?? []) as unknown as Array<Omit<BulletinGrade, "assessment"> & { assessment: BulletinAssessment | BulletinAssessment[] }>)
          .map((row) => ({ ...row, assessment: Array.isArray(row.assessment) ? row.assessment[0] : row.assessment }))
          .filter((row): row is BulletinGrade => Boolean(row.assessment?.id))

        const subjectIds = [...new Set(rows.map((row) => row.assessment.subject_id).filter(Boolean))]
        let names: Record<string, string> = {}
        if (subjectIds.length) {
          const { data: subjects, error: subjectsError } = await supabaseBrowser
            .from("subjects")
            .select("id,name")
            .in("id", subjectIds)
          if (subjectsError) throw subjectsError
          names = Object.fromEntries((subjects ?? []).map((subject) => [subject.id, subject.name]))
        }

        if (active) {
          setGrades(rows)
          setSubjectNames(names)
        }
      } catch (error) {
        if (active) {
          setGrades([])
          setSubjectNames({})
          setGradesError(error instanceof Error ? error.message : "Impossible de charger les notes de cette classe.")
        }
      } finally {
        if (active) setIsLoadingGrades(false)
      }
    }

    void loadGrades()
    return () => { active = false }
  }, [establishmentId, selectedClasse])

  const filteredGrades = useMemo(() => grades.filter((grade) =>
    isSelectedPeriod(grade.assessment.term, selectedTrimestre) &&
    grade.score !== null &&
    Number.isFinite(Number(grade.score)) &&
    Number(grade.assessment.max_score) > 0
  ), [grades, selectedTrimestre])

  const selectedStudentData = students.find((student) => student.id === selectedStudent) ?? null

  const bulletinRows = useMemo(() => {
    if (!selectedStudentData) return []
    const subjectIds = [...new Set(filteredGrades.map((grade) => grade.assessment.subject_id))]
    const rows: BulletinRow[] = []

    for (const subjectId of subjectIds) {
      const subjectGrades = filteredGrades.filter((grade) => grade.assessment.subject_id === subjectId)
      const byStudent = new Map<string, number[]>()
      for (const grade of subjectGrades) {
        const normalizedScore = Number(grade.score) / Number(grade.assessment.max_score) * 20
        if (!Number.isFinite(normalizedScore)) continue
        const scores = byStudent.get(grade.student_id) ?? []
        scores.push(normalizedScore)
        byStudent.set(grade.student_id, scores)
      }
      const averages = [...byStudent.entries()].map(([studentId, scores]) => ({
        studentId,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      })).sort((a, b) => b.average - a.average)
      const selectedAverage = averages.find((item) => item.studentId === selectedStudentData.id)
      if (!selectedAverage) continue
      const classAverage = averages.reduce((sum, item) => sum + item.average, 0) / averages.length
      const rank = averages.findIndex((item) => item.studentId === selectedStudentData.id) + 1
      rows.push({
        subject: subjectNames[subjectId] ?? "Matière",
        score: selectedAverage.average,
        classAverage,
        rank,
        appreciation: appreciationFor(selectedAverage.average),
      })
    }

    return rows.sort((a, b) => a.subject.localeCompare(b.subject, "fr"))
  }, [filteredGrades, selectedStudentData, subjectNames])

  const moyenneGenerale = bulletinRows.length
    ? bulletinRows.reduce((sum, row) => sum + row.score, 0) / bulletinRows.length
    : null

  const classAverages = useMemo(() => {
    const subjectScores = new Map<string, Map<string, number[]>>()
    for (const grade of filteredGrades) {
      const normalizedScore = Number(grade.score) / Number(grade.assessment.max_score) * 20
      if (!Number.isFinite(normalizedScore)) continue
      const byStudent = subjectScores.get(grade.assessment.subject_id) ?? new Map<string, number[]>()
      const studentScores = byStudent.get(grade.student_id) ?? []
      studentScores.push(normalizedScore)
      byStudent.set(grade.student_id, studentScores)
      subjectScores.set(grade.assessment.subject_id, byStudent)
    }
    const averages: number[] = []
    for (const byStudent of subjectScores.values()) {
      for (const scores of byStudent.values()) averages.push(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    }
    return averages.length ? averages.reduce((sum, score) => sum + score, 0) / averages.length : null
  }, [filteredGrades])

  const observations = useMemo(() => {
    if (!selectedStudent) return []
    return [...new Set(filteredGrades
      .filter((grade) => grade.student_id === selectedStudent && grade.comment?.trim())
      .map((grade) => grade.comment!.trim()))]
  }, [filteredGrades, selectedStudent])

  const handleGenererBulletin = () => {
    if (!selectedClasse || !selectedStudent) return
    setBulletinGenere(true)
  }

  const handleTelecharger = () => {
    if (!selectedStudentData || !bulletinRows.length || moyenneGenerale === null) return
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(16)
    pdf.text("BULLETIN SCOLAIRE", 105, 18, { align: "center" })
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.text("Année scolaire " + currentAcademicYear(), 105, 25, { align: "center" })
    pdf.text("Établissement : " + (primaryEstablishment?.name ?? ""), 14, 36)
    pdf.text("Élève : " + selectedStudentData.lastName + " " + selectedStudentData.firstName, 14, 44)
    pdf.text("Classe : " + (selectedClass?.name ?? "—"), 14, 51)
    pdf.text("Matricule : " + selectedStudentData.number, 14, 58)
    pdf.text("Période : " + (selectedTrimestre === "annuel" ? "Année complète" : "Trimestre " + selectedTrimestre), 14, 65)
    autoTable(pdf, {
      startY: 72,
      head: [["Matière", "Note /20", "Moy. classe /20", "Rang", "Appréciation"]],
      body: bulletinRows.map((row) => [row.subject, row.score.toFixed(2), row.classAverage.toFixed(2), String(row.rank ?? "—"), row.appreciation]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [24, 54, 112] },
    })
    const finalY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100
    pdf.setFont("helvetica", "bold")
    pdf.text("Moyenne générale : " + moyenneGenerale.toFixed(2) + "/20", 14, finalY + 12)
    pdf.setFont("helvetica", "normal")
    pdf.text("Appréciation : " + appreciationFor(moyenneGenerale), 14, finalY + 19)
    if (observations.length) {
      pdf.text("Observations :", 14, finalY + 29)
      const lines = pdf.splitTextToSize(observations.join(" · "), 180)
      pdf.text(lines, 14, finalY + 35)
    }
    const safeName = (selectedStudentData.lastName + "_" + selectedStudentData.firstName).replace(/[^a-zA-Z0-9_-]/g, "_")
    pdf.save("bulletin_" + safeName + "_" + selectedTrimestre + ".pdf")
  }

  const hasSelectedStudentGrades = bulletinRows.length > 0

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4 print:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FileText className="h-6 w-6" />Bulletins scolaires</h1>
            <p className="text-gray-600">Bulletins calculés à partir des évaluations enregistrées.</p>
          </div>
        </div>

        <Card className="mb-6 print:hidden">
          <CardHeader>
            <CardTitle>Sélection</CardTitle>
            <CardDescription>Choisissez une classe, une période et un élève.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="classe">Classe</Label>
                <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                  <SelectTrigger id="classe"><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                  <SelectContent>
                    {academicClasses.map((schoolClass) => <SelectItem key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trimestre">Période</Label>
                <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                  <SelectTrigger id="trimestre"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1er trimestre</SelectItem>
                    <SelectItem value="2">2e trimestre</SelectItem>
                    <SelectItem value="3">3e trimestre</SelectItem>
                    <SelectItem value="annuel">Année complète</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eleve">Élève</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger id="eleve"><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                  <SelectContent>
                    {students.map((student) => <SelectItem key={student.id} value={student.id}>{student.lastName} {student.firstName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(structureError || studentsError || gradesError) && <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{structureError || studentsError || gradesError}</div>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={handleGenererBulletin} disabled={!selectedClasse || !selectedStudent || isLoadingGrades || isLoadingStudents}>
                <FileText className="mr-2 h-4 w-4" />Générer le bulletin
              </Button>
              <Button type="button" variant="outline" onClick={() => { setBulletinGenere(false); setSelectedStudent(""); setGradesError(null) }} disabled={!selectedClasse}>
                <RefreshCw className="mr-2 h-4 w-4" />Réinitialiser
              </Button>
              {(isLoadingStructure || isLoadingStudents || isLoadingGrades) && <span className="inline-flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Chargement des données…</span>}
            </div>
          </CardContent>
        </Card>

        {bulletinGenere && selectedStudentData && (
          <Card className="border-2 print:border-0 print:shadow-none">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Bulletin scolaire</CardTitle>
                  <CardDescription>{selectedTrimestre === "annuel" ? "Année scolaire " : "Trimestre " + selectedTrimestre + " · année scolaire "}{currentAcademicYear()}</CardDescription>
                  <p className="mt-1 text-sm text-gray-600">{primaryEstablishment?.name ?? "Établissement scolaire"}</p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
                  <Button variant="outline" size="sm" onClick={handleTelecharger} disabled={!hasSelectedStudentGrades}><Download className="mr-2 h-4 w-4" />Télécharger PDF</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div><Label>Nom et prénom</Label><p className="font-semibold">{selectedStudentData.lastName} {selectedStudentData.firstName}</p></div>
                <div><Label>Classe</Label><p className="font-semibold">{selectedClass?.name ?? "—"}</p></div>
                <div><Label>Matricule</Label><p className="font-semibold">{selectedStudentData.number}</p></div>
                <div><Label>Période</Label><p className="font-semibold">{selectedTrimestre === "annuel" ? "Année complète" : "Trimestre " + selectedTrimestre}</p></div>
              </div>

              {hasSelectedStudentGrades ? <>
                <div>
                  <h3 className="mb-3 text-lg font-bold">Relevé de notes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead><tr className="border-b-2"><th className="border p-2 text-left">Matière</th><th className="border p-2 text-center">Note /20</th><th className="border p-2 text-center">Moy. classe /20</th><th className="border p-2 text-center">Rang</th><th className="border p-2 text-center">Appréciation</th></tr></thead>
                      <tbody>{bulletinRows.map((row) => <tr key={row.subject} className="border-b"><td className="border p-2 font-medium">{row.subject}</td><td className="border p-2 text-center font-bold">{row.score.toFixed(2)}</td><td className="border p-2 text-center">{row.classAverage.toFixed(2)}</td><td className="border p-2 text-center">{row.rank ?? "—"}</td><td className="border p-2 text-center">{row.appreciation}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-blue-50 p-4">
                  <div><Label className="text-lg font-bold">Moyenne générale</Label><p className="text-3xl font-bold text-blue-700">{moyenneGenerale?.toFixed(2)}/20</p></div>
                  <div><Label className="text-lg font-bold">Appréciation générale</Label><p className="text-2xl font-bold">{moyenneGenerale === null ? "—" : appreciationFor(moyenneGenerale)}</p></div>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-bold">Observations</h3>
                  <p className="rounded-lg bg-gray-50 p-4">{observations.length ? observations.join(" · ") : "Aucune observation enregistrée pour cette période."}</p>
                </div>
              </> : <div role="status" className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aucune note enregistrée pour cet élève et cette période. Le bulletin ne peut pas être calculé tant que les notes ne sont pas disponibles.</div>}

              <div className="flex justify-between gap-8 border-t pt-8">
                <div className="text-center"><p className="mb-8 font-semibold">Le Chef d’établissement</p><div className="w-48 border-t border-black" /></div>
                <div className="text-center"><p className="mb-8 font-semibold">Les Parents</p><div className="w-48 border-t border-black" /></div>
              </div>
              <p className="text-right text-xs text-gray-500">Document généré le {new Date().toLocaleDateString("fr-FR")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
