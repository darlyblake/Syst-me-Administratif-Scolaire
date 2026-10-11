"use client"

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { DonneesEleve } from "@/types/models"

type SchoolClass = { id: string; name: string; gradeLevelId: string }
type TuitionPlan = { id: string; grade_level_id: string; annual_tuition: number }
type ImportedRow = { firstName: string; lastName: string; studentNumber: string; birthDate?: string; sex?: string; phone?: string; email?: string; line: number; error?: string }
type Props = {
  establishmentId: string | null
  academicYearId: string | null
  classes: SchoolClass[]
  tuitionPlans: TuitionPlan[]
  createStudent: (student: { establishmentId: string; firstName: string; lastName: string; studentNumber: string; birthDate?: string; sex?: string; phone?: string; email?: string; active?: boolean }) => Promise<string | false>
  assignToClass: (data: { establishmentId: string; studentIds: string[]; academicYearId: string; classId: string; tuitionPlanId: string; enrollmentDate: string }) => Promise<{ created: number; updated: number; total: number } | null>
  onImported: () => void
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const input = text.replace(/^\\uFEFF/, "")
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if ((char === "," || char === ";" || char === "\\t") && !quoted) {
      row.push(cell.trim()); cell = ""
    } else if ((char === "\\n" || char === "\\r") && !quoted) {
      if (char === "\\r" && input[i + 1] === "\\n") i++
      row.push(cell.trim()); cell = ""
      if (row.some((value) => value !== "")) rows.push(row)
      row = []
    } else cell += char
  }
  row.push(cell.trim())
  if (row.some((value) => value !== "")) rows.push(row)
  return rows
}

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim().replace(/[_-]+/g, " ")
}

function parseDate(value: string): string | undefined {
  if (!value.trim()) return undefined
  const match = value.trim().match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})$/)
  if (match) {
    const day = Number(match[1]), month = Number(match[2]), year = Number(match[3])
    const date = new Date(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }
  const iso = value.trim().match(/^(\\d{4})-(\\d{2})-(\\d{2})$/)
  if (iso) return value.trim()
  return undefined
}

function makeStudentNumber() {
  return `EL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

export default function StudentBulkImportModal({ establishmentId, academicYearId, classes, tuitionPlans, createStudent, assignToClass, onImported }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ImportedRow[]>([])
  const [fileName, setFileName] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedClass = classes.find((item) => item.id === selectedClassId)
  const availablePlans = useMemo(() => selectedClass ? tuitionPlans.filter((plan) => plan.grade_level_id === selectedClass.gradeLevelId) : [], [selectedClass, tuitionPlans])
  const validRows = rows.filter((row) => !row.error)
  const errorCount = rows.length - validRows.length

  const reset = () => { setRows([]); setFileName(""); setSelectedClassId(""); setSelectedPlanId(""); if (inputRef.current) inputRef.current.value = "" }
  const handleFile = async (file?: File) => {
    if (!file) return
    if (!/\\.csv$/i.test(file.name)) { toast.error("Choisissez un fichier CSV."); return }
    try {
      const content = await file.text()
      const matrix = parseCsv(content)
      if (matrix.length < 2) { toast.error("Le fichier est vide ou ne contient aucun élève."); return }
      const headers = matrix[0].map(normalizeHeader)
      const findColumn = (...names: string[]) => headers.findIndex((header) => names.includes(header))
      const firstIndex = findColumn("prenom", "prénom", "first name", "firstname")
      const lastIndex = findColumn("nom", "nom de famille", "lastname", "last name")
      if (firstIndex < 0 || lastIndex < 0) { toast.error("Colonnes introuvables : le fichier doit contenir « Prenom » et « Nom »."); return }
      const matriculeIndex = findColumn("matricule", "identifiant", "numero eleve", "student number")
      const birthIndex = findColumn("date de naissance", "date naissance", "date naissance", "birth date", "birthdate")
      const sexIndex = findColumn("sexe", "sex", "gender")
      const phoneIndex = findColumn("telephone", "téléphone", "tel", "phone", "telephone parent")
      const emailIndex = findColumn("email", "e-mail", "courriel")
      const seen = new Set<string>()
      const parsed = matrix.slice(1).map((cells, index): ImportedRow => {
        const value = (column: number) => column < 0 ? "" : (cells[column] ?? "").trim()
        const firstName = value(firstIndex), lastName = value(lastIndex)
        const birthRaw = value(birthIndex)
        const birthDate = parseDate(birthRaw)
        const sexRaw = value(sexIndex).toUpperCase()
        const key = `${lastName.toLocaleLowerCase("fr")}| ${firstName.toLocaleLowerCase("fr")}`
        let error = !firstName || !lastName ? "Prénom et nom obligatoires" : undefined
        if (!error && birthRaw && !birthDate) error = "Date invalide (JJ/MM/AAAA)"
        if (!error && sexRaw && !["M", "F", "H", "FEMININ", "FÉMININ", "MASCULIN"].includes(sexRaw)) error = "Sexe invalide (M ou F)"
        if (!error && seen.has(key)) error = "Doublon dans le fichier"
        if (firstName && lastName) seen.add(key)
        return { firstName, lastName, studentNumber: value(matriculeIndex), birthDate, sex: sexRaw ? (["F", "FEMININ", "FÉMININ"].includes(sexRaw) ? "F" : "M") : undefined, phone: value(phoneIndex) || undefined, email: value(emailIndex) || undefined, line: index + 2, error }
      })
      if (parsed.length > 500) { toast.error("Limite de 500 élèves par fichier. Divisez votre liste en plusieurs fichiers."); return }
      setRows(parsed); setFileName(file.name); setSelectedClassId(""); setSelectedPlanId("")
    } catch { toast.error("Impossible de lire ce fichier CSV.") }
  }

  const handleImport = async () => {
    if (!establishmentId) return toast.error("L'établissement n'est pas encore chargé.")
    if (!academicYearId) return toast.error("Aucune année académique active n'est configurée.")
    if (!rows.length || !validRows.length) return toast.error("Ajoutez un fichier contenant des lignes valides.")
    if (errorCount) return toast.error("Corrigez les lignes signalées avant de confirmer l'import.")
    if (!selectedClass || !selectedPlanId) return toast.error("Choisissez une classe et son forfait de scolarité.")
    setIsImporting(true)
    const createdIds: string[] = []
    let failedAt = ""
    try {
      for (const row of validRows) {
        const studentNumber = row.studentNumber || makeStudentNumber()
        const studentId = await createStudent({ establishmentId, firstName: row.firstName, lastName: row.lastName, studentNumber, birthDate: row.birthDate, sex: row.sex, phone: row.phone, email: row.email, active: true })
        if (!studentId) { failedAt = `ligne ${row.line} (${row.firstName} ${row.lastName})`; break }
        createdIds.push(studentId)
      }

      if (createdIds.length > 0) {
        const assignment = await assignToClass({
          establishmentId,
          studentIds: createdIds,
          academicYearId,
          classId: selectedClass.id,
          tuitionPlanId: selectedPlanId,
          enrollmentDate: new Date().toISOString().slice(0, 10),
        })
        if (!assignment) {
          toast.error(`${createdIds.length} élève(s) créé(s), mais l'affectation à la classe a échoué. Ouvrez la liste des élèves et utilisez « Affecter à une classe » avant de relancer l'import.`)
          onImported()
          return
        }
      }

      if (failedAt) {
        toast.error(`Import interrompu à ${failedAt}. ${createdIds.length} élève(s) ont été créés et affectés à la classe. Vérifiez la liste avant de recommencer.`)
        onImported()
        return
      }

      toast.success(`Import terminé : ${createdIds.length} élève(s) créé(s) et affecté(s) à ${selectedClass.name}.`)
      onImported()
      reset()
      setOpen(false)
    } finally { setIsImporting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isImporting) { setOpen(next); if (!next) reset() } }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="h-8 rounded bg-[#1e3a8a] px-2.5 text-[11px] text-white hover:bg-[#00236f]"><Upload className="mr-1.5 h-3.5 w-3.5" />Importer des élèves</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-md border border-[#c5c5d3] bg-white text-[#131b2e]">
        <DialogHeader>
          <DialogTitle>Importer une liste d'élèves</DialogTitle>
          <DialogDescription>Choisissez un fichier CSV, vérifiez les données, puis créez les dossiers élèves. Les lignes en erreur doivent être corrigées avant l'import.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border border-[#c5c5d3]/70 bg-[#f7f8ff] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><FileSpreadsheet className="mt-0.5 h-5 w-5 text-[#264191]" /><div><p className="text-sm font-medium">1. Sélectionner le fichier CSV</p><p className="mt-1 text-xs text-[#515f74]">Colonnes obligatoires : Prenom, Nom. Maximum 500 lignes.</p></div></div>
            <div className="flex items-center gap-2"><input ref={inputRef} type="file" accept=".csv,text/csv" className="max-w-full text-xs file:mr-2 file:border file:border-[#c5c5d3] file:bg-white file:px-2 file:py-1.5" onChange={(event) => void handleFile(event.target.files?.[0])} /></div>
          </div>
          {fileName && <p className="text-xs text-[#515f74]">Fichier : <strong>{fileName}</strong> — {rows.length} ligne(s), {validRows.length} valide(s), {errorCount} erreur(s).</p>}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium">2. Classe de destination
                  <select value={selectedClassId} onChange={(event) => { setSelectedClassId(event.target.value); setSelectedPlanId("") }} className="mt-1 h-9 w-full border border-[#c5c5d3] bg-white px-2 text-sm">
                    <option value="">Sélectionner une classe</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium">3. Forfait de scolarité
                  <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)} disabled={!selectedClassId} className="mt-1 h-9 w-full border border-[#c5c5d3] bg-white px-2 text-sm disabled:bg-[#f2f3ff]">
                    <option value="">Sélectionner un forfait</option>
                    {availablePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.annual_tuition.toLocaleString("fr-FR")} FCFA/an</option>)}
                  </select>
                </label>
              </div>
              <div className="overflow-x-auto border border-[#c5c5d3]/70">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-[#f2f3ff]"><tr><th className="px-2 py-2">Ligne</th><th className="px-2 py-2">Nom et prénom</th><th className="px-2 py-2">Matricule</th><th className="px-2 py-2">Date de naissance</th><th className="px-2 py-2">Contrôle</th></tr></thead>
                  <tbody>{rows.slice(0, 30).map((row) => <tr key={row.line} className="border-t border-[#c5c5d3]/40"><td className="px-2 py-2">{row.line}</td><td className="px-2 py-2">{row.lastName} {row.firstName}</td><td className="px-2 py-2 font-mono">{row.studentNumber || "Généré automatiquement"}</td><td className="px-2 py-2">{row.birthDate || "—"}</td><td className="px-2 py-2">{row.error ? <span className="inline-flex items-center gap-1 text-[#b42318]"><AlertTriangle className="h-3.5 w-3.5" />{row.error}</span> : <span className="inline-flex items-center gap-1 text-[#28734b]"><CheckCircle2 className="h-3.5 w-3.5" />Valide</span>}</td></tr>)}</tbody>
                </table>
                {rows.length > 30 && <p className="border-t px-3 py-2 text-xs text-[#515f74]">Aperçu limité aux 30 premières lignes.</p>}
              </div>
              {errorCount > 0 && <p className="text-sm text-[#b42318]">Corrigez les {errorCount} ligne(s) en erreur dans le fichier CSV, puis sélectionnez à nouveau le fichier.</p>}
              <p className="text-xs leading-5 text-[#515f74]">Important : l'import crée les dossiers élèves. Si l'opération s'interrompt, vérifiez les élèves déjà créés avant de relancer le fichier afin d'éviter les doublons.</p>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-[#c5c5d3]/60 pt-4 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset() }} disabled={isImporting}>Annuler</Button>
            <Button type="button" onClick={() => void handleImport()} disabled={isImporting || !rows.length || errorCount > 0 || !validRows.length || !selectedClassId || !selectedPlanId} className="bg-[#1e3a8a] text-white hover:bg-[#00236f]">{isImporting ? "Importation en cours…" : `Importer ${validRows.length} élève(s)`}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
