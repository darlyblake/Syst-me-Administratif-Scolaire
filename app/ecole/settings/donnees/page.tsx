"use client"

import { useMemo, useRef, useState } from "react"
import Papa from "papaparse"
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, FileSpreadsheet, FileUp, Info, RefreshCw, ShieldCheck, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { supabaseBrowser } from "@/lib/supabase/client"

type ImportKind = "inscriptions" | "depenses"
type ExportKind = "eleves" | "inscriptions" | "classes" | "finance"
type ParsedFile = { id: string; name: string; kind: ImportKind; rows: Record<string, string>[]; headers: string[]; errors: string[] }
type ExistingStudent = { id: string; student_number: string | null; first_name: string | null; last_name: string | null; birth_date: string | null; place_of_birth?: string | null }
type ReviewIssue = { code: string; message: string; field?: string; severity: "error" | "warning"; candidate?: ExistingStudent }
type ReviewRow = { key: string; fileName: string; rowIndex: number; kind: ImportKind; values: Record<string, string>; issues: ReviewIssue[]; duplicateChoice?: "same" | "separate" | "pending" }
type ImportClass = { id: string; name: string; grade_level_id: string; grade_level_name: string }
type ImportTuitionPlan = { id: string; grade_level_id: string; academic_year_id: string; annual_tuition: number; registration_fee: number; payment_mode: string; installment_count: number; late_enrollment_billing_policy: string }
type ImportAcademicYear = { id: string; name: string }
function normalizeText(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("fr").replace(/\s+/g, " ")
}
function validIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return false
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() + 1 === Number(match[2]) && date.getUTCDate() === Number(match[3])
}

function validateEditedRow(values: Record<string, string>, kind: ImportKind, students: ExistingStudent[], classes: ImportClass[], plans: ImportTuitionPlan[], activeYear: ImportAcademicYear | null): ReviewIssue[] {
  const issues: ReviewIssue[] = []
  const required = importTypes.find(item => item.id === kind)?.required ?? []
  required.forEach(field => { if (!String(values[field] ?? "").trim()) issues.push({ code: "required", field, message: "Valeur obligatoire manquante : " + humanizeField(field), severity: "error" }) })
  if (values.amount?.trim()) {
    const amount = values.amount.trim().replace(/\s/g, "").replace(/FCFA/gi, "").replace(",", ".")
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) issues.push({ code: "amount-format", field: "amount", message: "Le montant contient des caractères non numériques.", severity: "error" })
    else if (Number(amount) < 0) issues.push({ code: "amount-negative", field: "amount", message: "Un montant ne peut pas être négatif.", severity: "error" })
    else if (kind === "depenses" && Number(amount) <= 0) issues.push({ code: "expense-amount-positive", field: "amount", message: "Le montant de la dépense doit être supérieur à zéro.", severity: "error" })
  }
  if (values.amount_paid?.trim()) {
    const paid = values.amount_paid.trim().replace(/\s/g, "").replace(/FCFA/gi, "").replace(",", ".")
    if (!/^\d+(\.\d{1,2})?$/.test(paid)) issues.push({ code: "paid-format", field: "amount_paid", message: "Le cumul déjà payé doit être un montant numérique valide.", severity: "error" })
    else if (Number(paid) < 0) issues.push({ code: "paid-negative", field: "amount_paid", message: "Le cumul déjà payé ne peut pas être négatif.", severity: "error" })
  }
  ;["enrollment_date", "expense_date", "due_date", "subscription_date", "birth_date"].forEach(field => { if (values[field] && !validIsoDate(values[field])) issues.push({ code: "date-format", field, message: "Date invalide. Utilisez une date réelle au format AAAA-MM-JJ.", severity: "error" }) })
  if (kind === "inscriptions") {
    const classValue = values.class_name || values.level || ""
    const matchedClass = classes.find(item => normalizeText(item.name) === normalizeText(classValue) || normalizeText(item.grade_level_name + " " + item.name) === normalizeText(classValue))
    if (!matchedClass) issues.push({ code: "class-not-found", field: "class_name", message: "Cette classe n’existe pas dans la structure de l’établissement.", severity: "error" })
    const plan = matchedClass && activeYear ? plans.find(item => item.grade_level_id === matchedClass?.grade_level_id && item.academic_year_id === activeYear.id) : undefined
    if (!activeYear) issues.push({ code: "active-year-not-found", message: "Aucune année scolaire active n’a été trouvée pour cet établissement.", severity: "error" })
    else if (matchedClass && !plan) issues.push({ code: "tuition-plan-not-found", message: "Aucun plan tarifaire actif n’est configuré pour cette classe et l’année scolaire active.", severity: "error" })
    else if (plan) {
      const paid = Number(String(values.amount_paid ?? "0").replace(/\s/g, "").replace(/FCFA/gi, "").replace(",", "."))
      const maximum = Number(plan.annual_tuition) + Number(plan.registration_fee || 0)
      if (Number.isFinite(paid) && paid > maximum) issues.push({ code: "paid-over-total", field: "amount_paid", message: "Le montant déjà payé dépasse le tarif annuel et les frais d’inscription configurés (" + maximum.toLocaleString("fr-FR") + " FCFA). Vérifiez le montant ou le plan tarifaire.", severity: "error" })
      issues.push({ code: "tuition-plan-found", message: "Plan tarifaire retrouvé : " + Number(plan.annual_tuition).toLocaleString("fr-FR") + " FCFA · mode " + plan.payment_mode + " · " + plan.installment_count + " échéance(s). Les échéances seront générées par le plan de ce niveau.", severity: "warning" })
    }
    const first = normalizeText(values.first_name), last = normalizeText(values.last_name)
    const matches = students.filter(item => normalizeText(item.first_name) === first && normalizeText(item.last_name) === last && (!values.birth_date || item.birth_date === values.birth_date))
    const candidate = matches.length === 1 ? matches[0] : undefined
    if (matches.length > 1) issues.push({ code: "student-ambiguous", message: "Plusieurs élèves ont le même nom, prénom et date de naissance. Vérification manuelle nécessaire.", severity: "error" })
    else if (candidate) issues.push({ code: "possible-duplicate", message: "Un élève correspondant existe déjà. Son lieu de naissance sera aussi vérifié avant toute réutilisation.", severity: "warning", candidate })
    if (candidate && normalizeText(candidate.place_of_birth) !== normalizeText(values.place_of_birth)) issues.push({ code: "birthplace-mismatch", field: "place_of_birth", message: "Le lieu de naissance ne correspond pas à la fiche existante. Vérifiez qu’il s’agit bien du même élève.", severity: "error" })
  }
  return issues
}


const importTypes: { id: ImportKind; label: string; required: string[]; description: string }[] = [
  { id: "inscriptions", label: "Élèves, inscriptions et situation financière", required: ["first_name", "last_name", "birth_date", "place_of_birth", "class_name", "enrollment_date", "amount_paid"], description: "Une ligne par élève : identité, lieu de naissance, classe, date d’entrée dans l’établissement et total déjà payé. Le tarif et les échéances viennent automatiquement du plan configuré pour son niveau." },
  { id: "depenses", label: "Dépenses", required: ["expense_date", "description", "amount"], description: "Une ligne par dépense : date, motif et montant. La catégorie est renseignée automatiquement." },
]

const exportTypes: { id: ExportKind; label: string; description: string }[] = [
  { id: "eleves", label: "Élèves", description: "Fiches et coordonnées des élèves." },
  { id: "inscriptions", label: "Inscriptions", description: "Années, classes et dates d'inscription." },
  { id: "classes", label: "Structure scolaire", description: "Années scolaires, niveaux et classes." },
  { id: "finance", label: "Données financières", description: "Échéances et paiements enregistrés." },
]

const fieldLabels: Record<string, string> = {
  student_number: "Matricule (attribué automatiquement)",
  level: "Niveau ou classe",
  receipt_number: "Ancien numéro de reçu",
  birth_date: "Date de naissance",
  place_of_birth: "Lieu de naissance",
  amount_paid: "Montant déjà payé (FCFA)",
  annual_tuition: "Tarif annuel attendu (FCFA)",
  tuition_amount: "Tarif annuel attendu (FCFA)",
  first_name: "Prénom",
  last_name: "Nom",
  relationship: "Lien avec l'élève",
  academic_year: "Année scolaire",
  class_name: "Classe",
  enrollment_date: "Date d'inscription",
  label: "Libellé du frais",
  due_date: "Date limite de paiement",
  amount: "Montant (FCFA)",
  payment_date: "Date du paiement",
  expense_date: "Date de la dépense",
  category: "Catégorie de dépense",
  description: "Motif de la dépense",
  payment_method: "Mode de règlement",
  method: "Mode de paiement",
  option_name: "Nom de l'option ou du service",
  subscription_date: "Date de souscription",
}

function humanizeField(field: string) {
  return fieldLabels[field] ?? field.replace(/_/g, " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase())
}

function downloadCsv(name: string, rows: Record<string, unknown>[], title = "Données de l'établissement") {
  const data = rows.length ? rows : [{ information: "Aucune donnée disponible" }]
  const headers = Array.from(new Set(data.flatMap((row) => Object.keys(row))))
  const csvRows: unknown[][] = [
    headers.map((header) => humanizeField(header)),
    ...data.map((row) => headers.map((header) => String(row[header] ?? ""))),
  ]
  const escapeCsvValue = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"'
  const csv = "\uFEFF" + csvRows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n") + "\r\n"
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name.replace(/\.(csv|xls|xlsx)$/i, "") + ".csv"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function normalizeImportHeaders(headers: string[]) {
  const reverseLabels = Object.fromEntries(Object.entries(fieldLabels).map(([key, label]) => [normalizeText(label), key]))
  const aliases: Record<string, string> = {
    nom: "last_name", prenom: "first_name", eleve: "student_name", "nom eleve": "last_name",
    classe: "class_name", "niveau ou classe": "class_name", "annee scolaire": "academic_year",
    "mode de paiement": "method", "date paiement": "payment_date", "date du paiement": "payment_date",
    "lieu de naissance": "place_of_birth", "ville de naissance": "place_of_birth",
    "montant deja paye": "amount_paid", "montant deja payé": "amount_paid", "total deja paye": "amount_paid", "total déjà payé": "amount_paid",
    montant: "amount", "montant fcfa": "amount", motif: "description", "motif de la depense": "description", "date": "expense_date", reference: "reference", notes: "notes",
  }
  return headers.map((header) => reverseLabels[normalizeText(header)] ?? aliases[normalizeText(header)] ?? header.trim())
}

export default function DataTransferPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null
  const fileInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [selectedKind, setSelectedKind] = useState<ImportKind>("inscriptions")
  const [isParsing, setIsParsing] = useState(false)
  const [activeTab, setActiveTab] = useState<"import" | "export">("import")
  const [selectedExports, setSelectedExports] = useState<ExportKind[]>(["eleves", "inscriptions", "classes", "finance"])
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState("")
  const [exportError, setExportError] = useState("")
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<"all" | "errors" | "duplicates">("all")
  const [importClasses, setImportClasses] = useState<ImportClass[]>([])
  const [importTuitionPlans, setImportTuitionPlans] = useState<ImportTuitionPlan[]>([])
  const [importActiveYear, setImportActiveYear] = useState<ImportAcademicYear | null>(null)
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([])
  const [manualOpen, setManualOpen] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [manualValues, setManualValues] = useState<Record<string, string>>({ first_name: "", last_name: "", birth_date: "", place_of_birth: "", class_name: "", enrollment_date: new Date().toISOString().slice(0, 10), amount_paid: "0" })
  const [manualErrors, setManualErrors] = useState<string[]>([])
  const [manualExpenseOpen, setManualExpenseOpen] = useState(false)
  const [manualExpenseValues, setManualExpenseValues] = useState({ expense_date: new Date().toISOString().slice(0, 10), description: "", amount: "" })
  const [isSavingExpenses, setIsSavingExpenses] = useState(false)
  const [expenseSaveMessage, setExpenseSaveMessage] = useState("")

  const totalRows = useMemo(() => files.reduce((sum, file) => sum + file.rows.length, 0), [files])
  const invalidFiles = files.filter((file) => file.errors.length > 0)

  const openManualEntry = async () => {
    setManualOpen(true)
    if (importClasses.length || manualLoading) return
    if (!establishmentId) { setManualErrors(["Établissement non identifié. Reconnectez-vous puis réessayez."]); return }
    setManualLoading(true)
    setManualErrors([])
    try {
      const [studentsResult, classesResult, yearResult] = await Promise.all([
        supabaseBrowser.from("students").select("id, student_number, first_name, last_name, birth_date, place_of_birth").eq("establishment_id", establishmentId).is("merged_into_student_id", null).limit(10000),
        supabaseBrowser.from("school_classes").select("id, name, grade_level_id, grade_levels(name)").eq("establishment_id", establishmentId).eq("active", true).limit(2000),
        supabaseBrowser.from("academic_years").select("id, name").eq("establishment_id", establishmentId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ])
      if (studentsResult.error) throw studentsResult.error
      if (classesResult.error) throw classesResult.error
      if (yearResult.error) throw yearResult.error
      const knownClasses = (classesResult.data ?? []).map((item: any) => ({ id: item.id, name: item.name, grade_level_id: item.grade_level_id, grade_level_name: item.grade_levels?.name ?? "" }))
      const activeYear = yearResult.data as ImportAcademicYear | null
      let plans: ImportTuitionPlan[] = []
      if (activeYear) {
        const result = await supabaseBrowser.from("tuition_plans").select("id, grade_level_id, academic_year_id, annual_tuition, registration_fee, payment_mode, installment_count, late_enrollment_billing_policy").eq("establishment_id", establishmentId).eq("academic_year_id", activeYear.id).eq("active", true).limit(1000)
        if (result.error) throw result.error
        plans = (result.data ?? []) as ImportTuitionPlan[]
      }
      setExistingStudents((studentsResult.data ?? []) as ExistingStudent[])
      setImportClasses(knownClasses)
      setImportActiveYear(activeYear)
      setImportTuitionPlans(plans)
      if (!knownClasses.length) setManualErrors(["Aucune classe active n’est configurée pour l’établissement."])
      else if (!activeYear) setManualErrors(["Aucune année scolaire active n’a été trouvée."])
    } catch (error) {
      setManualErrors([error instanceof Error ? error.message : "Impossible de charger les classes et tarifs."])
    } finally { setManualLoading(false) }
  }

  const submitManualEntry = () => {
    const values = { ...manualValues, amount_paid: String(Number(String(manualValues.amount_paid ?? "0").replace(/\s/g, "").replace(/FCFA/gi, "").replace(",", "."))) }
    const issues = validateEditedRow(values, "inscriptions", existingStudents, importClasses, importTuitionPlans, importActiveYear)
    const errors = issues.filter(issue => issue.severity === "error").map(issue => issue.message)
    if (errors.length) { setManualErrors(errors); return }
    const duplicate = issues.some(issue => issue.code === "possible-duplicate")
    const row: ReviewRow = { key: "manual-" + Date.now(), fileName: "Saisie manuelle", rowIndex: reviewRows.length + 1, kind: "inscriptions", values, issues, duplicateChoice: duplicate ? "pending" : undefined }
    setReviewRows(current => [...current, row])
    setReviewFilter("all")
    setManualOpen(false)
    setReviewOpen(true)
    setManualValues({ first_name: "", last_name: "", birth_date: "", place_of_birth: "", class_name: "", enrollment_date: new Date().toISOString().slice(0, 10), amount_paid: "0" })
    setManualErrors([])
  }

  const openManualExpense = () => {
    setManualExpenseValues({ expense_date: new Date().toISOString().slice(0, 10), description: "", amount: "" })
    setManualErrors([])
    setManualExpenseOpen(true)
  }

  const submitManualExpense = () => {
    const amountText = manualExpenseValues.amount.trim().replace(/\s/g, "").replace(/FCFA/gi, "").replace(",", ".")
    const values = { ...manualExpenseValues, amount: amountText }
    const issues = validateEditedRow(values, "depenses", [], [], [], null)
    if (!Number.isFinite(Number(amountText)) || Number(amountText) <= 0) issues.push({ code: "expense-amount-positive", field: "amount", message: "Le montant doit être supérieur à zéro.", severity: "error" })
    const errors = issues.filter(issue => issue.severity === "error").map(issue => issue.message)
    if (errors.length) { setManualErrors(errors); return }
    setReviewRows(current => [...current, { key: "expense-manual-" + Date.now(), fileName: "Saisie manuelle", rowIndex: current.length + 1, kind: "depenses", values, issues }])
    setReviewFilter("all")
    setManualExpenseOpen(false)
    setReviewOpen(true)
  }

  const saveReviewedExpenses = async () => {
    const expenses = reviewRows.filter(row => row.kind === "depenses")
    if (!expenses.length || !establishmentId) return
    const invalid = expenses.filter(row => row.issues.some(issue => issue.severity === "error") || !validIsoDate(row.values.expense_date || "") || !row.values.description?.trim() || !(Number(row.values.amount) > 0))
    if (invalid.length) { setExportError("Corrigez les erreurs des dépenses avant l’enregistrement."); return }
    setIsSavingExpenses(true)
    setExportError("")
    try {
      const { data: authData, error: authError } = await supabaseBrowser.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error("Votre session a expiré. Reconnectez-vous.")
      const payload = expenses.map(row => ({
        establishment_id: establishmentId,
        category: row.values.category?.trim() || "Autres",
        description: row.values.description.trim(),
        expense_date: row.values.expense_date,
        amount: Number(row.values.amount),
        payment_method: row.values.payment_method?.trim() || null,
        reference: row.values.reference?.trim() || null,
        created_by: authData.user.id,
      }))
      const { error } = await supabaseBrowser.from("expenses").insert(payload)
      if (error) throw error
      setExpenseSaveMessage(expenses.length + " dépense(s) enregistrée(s). Les mouvements financiers ont été actualisés automatiquement.")
      setReviewRows(current => current.filter(row => row.kind !== "depenses"))
      if (reviewRows.every(row => row.kind === "depenses")) setReviewOpen(false)
    } catch (error) {
      setExportError("Enregistrement des dépenses impossible : " + (error instanceof Error ? error.message : "erreur inconnue"))
    } finally { setIsSavingExpenses(false) }
  }

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return
    setIsParsing(true)
    try {
      const parsed = await Promise.all(Array.from(selected).map((file) => new Promise<ParsedFile>((resolve) => {
        void (async () => {
          try {
            const config = importTypes.find((item) => item.id === selectedKind)!
            const extension = file.name.toLowerCase().split(".").pop()
            let headers: string[] = []
            let rows: Record<string, string>[] = []
            const errors: string[] = []
            if (extension === "xls" || extension === "html" || extension === "htm") {
              const parsedExcel = parseExcelHtml(await file.text())
              headers = parsedExcel.headers
              rows = parsedExcel.rows
            } else {
              const result = await new Promise<Papa.ParseResult<Record<string, string>>>((done) => Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: "greedy", delimiter: "", complete: done }))
              const rawHeaders = (result.meta.fields ?? []).map((field) => field.trim().replace(/^\uFEFF/, ""))
              headers = normalizeImportHeaders(rawHeaders)
              rows = result.data.map((row) => {
                const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeImportHeaders([key.replace(/^\uFEFF/, "").trim()])[0], value ?? ""]))
                if (selectedKind === "inscriptions") {
                  delete normalized.student_number
                  delete normalized.annual_tuition
                  delete normalized.tuition_amount
                  delete normalized.amount
                }
                return normalized
              })
              if (result.errors.length) errors.push(result.errors.length + " ligne(s) contiennent une erreur de lecture.")
            }
            const missing = config.required.filter((field) => !headers.includes(field))
            errors.push(...missing.map((field) => "Colonne obligatoire absente : " + humanizeField(field)))
            resolve({ id: file.name + file.size + file.lastModified, name: file.name, kind: selectedKind, rows, headers, errors })
          } catch (error) {
            resolve({ id: file.name + file.size, name: file.name, kind: selectedKind, rows: [], headers: [], errors: [error instanceof Error ? error.message : "Impossible de lire ce fichier."] })
          }
        })()
      })))
      setFiles((current) => [...current.filter((item) => !parsed.some((next) => next.id === item.id)), ...parsed])
      setIsAnalyzing(true)
      try {
        let existing: ExistingStudent[] = []
        let knownClasses: ImportClass[] = []
        let knownPlans: ImportTuitionPlan[] = []
        let activeYear: ImportAcademicYear | null = null
        if (establishmentId) {
          const [studentsResult, classesResult, yearResult] = await Promise.all([
            supabaseBrowser.from("students").select("id, student_number, first_name, last_name, birth_date, place_of_birth").eq("establishment_id", establishmentId).is("merged_into_student_id", null).limit(10000),
            supabaseBrowser.from("school_classes").select("id, name, grade_level_id, grade_levels(name)").eq("establishment_id", establishmentId).eq("active", true).limit(2000),
            supabaseBrowser.from("academic_years").select("id, name").eq("establishment_id", establishmentId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
          ])
          if (studentsResult.error) throw studentsResult.error
          if (classesResult.error) throw classesResult.error
          if (yearResult.error) throw yearResult.error
          existing = (studentsResult.data ?? []) as ExistingStudent[]
          knownClasses = (classesResult.data ?? []).map((item: any) => ({ id: item.id, name: item.name, grade_level_id: item.grade_level_id, grade_level_name: item.grade_levels?.name ?? "" }))
          activeYear = yearResult.data as ImportAcademicYear | null
          if (activeYear) {
            const plansResult = await supabaseBrowser.from("tuition_plans").select("id, grade_level_id, academic_year_id, annual_tuition, registration_fee, payment_mode, installment_count, late_enrollment_billing_policy").eq("establishment_id", establishmentId).eq("academic_year_id", activeYear.id).eq("active", true).limit(1000)
            if (plansResult.error) throw plansResult.error
            knownPlans = (plansResult.data ?? []) as ImportTuitionPlan[]
          }
        }
        setExistingStudents(existing)
        setImportClasses(knownClasses)
        setImportActiveYear(activeYear)
        setImportTuitionPlans(knownPlans)
        const analyzed: ReviewRow[] = []
        for (const file of parsed) {
          file.rows.forEach((source, index) => {
            const values = { ...source }
            const issues: ReviewIssue[] = []
            const required = importTypes.find((item) => item.id === file.kind)?.required ?? []
            required.forEach((field) => {
              if (!String(values[field] ?? "").trim()) issues.push({ code: "required", field, message: "Valeur obligatoire manquante : " + humanizeField(field), severity: "error" })
            })
            ;["amount", "amount_paid", "annual_tuition", "tuition_amount"].forEach((field) => {
              if (!values[field]?.trim()) return
              const normalizedAmount = values[field].trim().replace(/\s/g, "").replace(/FCFA/gi, "").replace(",", ".")
              if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) issues.push({ code: "amount-format", field, message: "Le montant contient des caractères non numériques. Corrigez cette valeur.", severity: "error" })
              else if (Number(normalizedAmount) < 0) issues.push({ code: "amount-negative", field, message: "Un montant ne peut pas être négatif.", severity: "error" })
              else values[field] = String(Number(normalizedAmount))
            })
            ;["enrollment_date", "expense_date", "due_date", "subscription_date", "birth_date"].forEach((field) => {
              if (values[field] && !validIsoDate(values[field])) issues.push({ code: "date-format", field, message: "Date invalide. Utilisez le format AAAA-MM-JJ.", severity: "error" })
            })
            const rowIssues = validateEditedRow(values, file.kind, existing, knownClasses, knownPlans, activeYear)
            issues.push(...rowIssues)
            const first = normalizeText(values.first_name)
            const last = normalizeText(values.last_name)
            const duplicateInFile = file.kind === "inscriptions" && first && last && analyzed.find(item => item.kind === "inscriptions" && normalizeText(item.values.first_name) === first && normalizeText(item.values.last_name) === last && item.values.birth_date === values.birth_date)
            if (duplicateInFile) issues.push({ code: "possible-duplicate", message: "Ce nom et ce prénom apparaissent déjà dans une ligne précédente de cet import. Vérifiez s’il s’agit d’une réinscription ou d’un doublon.", severity: "warning" })
            analyzed.push({ key: file.id + ":" + index, fileName: file.name, rowIndex: index + 2, kind: file.kind, values, issues, duplicateChoice: candidate || duplicateInFile ? "pending" : undefined })
          })
        }
        setReviewRows(analyzed)
        setReviewOpen(true)
      } catch (error) {
        setReviewRows([])
        setReviewOpen(true)
        setExportError("Analyse des dossiers existants impossible : " + (error instanceof Error ? error.message : "erreur inconnue"))
      } finally {
        setIsAnalyzing(false)
      }
    } finally {
      setIsParsing(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  const downloadTemplate = (kind: ImportKind) => {
    const config = importTypes.find((item) => item.id === kind)!
    const example: Record<string, string> = Object.fromEntries([...config.required, ...(kind === "inscriptions" ? ["sex"] : ["payment_method", "reference"])].map((field) => [field, ""]))
    downloadCsv("modele_" + kind + ".csv", [example])
  }

  const exportSelected = async () => {
    if (!establishmentId) {
      setExportError("L'établissement actif est introuvable. Reconnectez-vous puis réessayez.")
      return
    }
    if (!selectedExports.length) {
      setExportError("Sélectionnez au moins une catégorie à exporter.")
      return
    }
    setIsExporting(true)
    setExportError("")
    setExportMessage("")
    const exported: string[] = []
    const failures: string[] = []
    try {
      for (const kind of selectedExports) {
        try {
          if (kind === "eleves") {
            const { data, error } = await supabaseBrowser.from("students").select("*").eq("establishment_id", establishmentId).order("last_name").limit(10000)
            if (error) throw error
            downloadCsv("eleves.csv", (data ?? []) as Record<string, unknown>[])
          } else if (kind === "inscriptions") {
            const { data, error } = await supabaseBrowser.from("enrollments").select("*").eq("establishment_id", establishmentId).order("enrollment_date").limit(10000)
            if (error) throw error
            downloadCsv("inscriptions.csv", (data ?? []) as Record<string, unknown>[])
          } else if (kind === "classes") {
            const [years, levels, classes] = await Promise.all([
              supabaseBrowser.from("academic_years").select("*").eq("establishment_id", establishmentId).limit(1000),
              supabaseBrowser.from("grade_levels").select("*").eq("establishment_id", establishmentId).limit(1000),
              supabaseBrowser.from("school_classes").select("*").eq("establishment_id", establishmentId).limit(1000),
            ])
            const error = years.error || levels.error || classes.error
            if (error) throw error
            downloadCsv("structure_scolaire.csv", [
              ...(years.data ?? []).map((row) => ({ type: "annee_scolaire", ...row })),
              ...(levels.data ?? []).map((row) => ({ type: "niveau", ...row })),
              ...(classes.data ?? []).map((row) => ({ type: "classe", ...row })),
            ] as Record<string, unknown>[])
          } else {
            const { data: enrollments, error: enrollmentError } = await supabaseBrowser.from("enrollments").select("id").eq("establishment_id", establishmentId).limit(10000)
            if (enrollmentError) throw enrollmentError
            const ids = (enrollments ?? []).map((row) => row.id)
            if (!ids.length) {
              downloadCsv("echeances_et_paiements.csv", [])
            } else {
              const [schedules, payments] = await Promise.all([
                supabaseBrowser.from("payment_schedules").select("*").in("enrollment_id", ids).limit(20000),
                supabaseBrowser.from("payments").select("*").in("enrollment_id", ids).limit(20000),
              ])
              if (schedules.error || payments.error) throw schedules.error || payments.error
              downloadCsv("echeances.csv", (schedules.data ?? []) as Record<string, unknown>[])
              downloadCsv("paiements.csv", (payments.data ?? []) as Record<string, unknown>[])
            }
          }
          exported.push(kind)
        } catch (error) {
          console.error("Export impossible pour", kind, error)
          failures.push(exportTypes.find((item) => item.id === kind)?.label ?? kind)
        }
      }
      if (exported.length) setExportMessage("Export terminé pour : " + exported.map((kind) => exportTypes.find((item) => item.id === kind)?.label).join(", ") + ".")
      if (failures.length) setExportError("Certaines données n'ont pas pu être exportées : " + failures.join(", ") + ". Vérifiez les droits d'accès ou réessayez.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="border-b border-[#d7dae3] pb-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#64748b]">Administration / Paramètres</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#172033]">Importation et exportation des données</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#64748b]">Importez en une seule opération les élèves, leurs inscriptions et leur situation financière. Les échéances sont déterminées à partir des tarifs configurés pour chaque niveau.</p>
          </div>
          <span className="text-xs text-[#64748b]">Fichiers CSV compatibles Excel et OnlyOffice</span>
        </div>
      </header>

      <div className="flex border-b border-[#d7dae3]">
        <button type="button" onClick={() => setActiveTab("import")} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${activeTab === "import" ? "border-[#173b8f] text-[#173b8f]" : "border-transparent text-[#64748b] hover:text-[#172033]"}`}>
          <ArrowDownToLine className="h-4 w-4" /> Importer des données
        </button>
        <button type="button" onClick={() => setActiveTab("export")} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${activeTab === "export" ? "border-[#173b8f] text-[#173b8f]" : "border-transparent text-[#64748b] hover:text-[#172033]"}`}>
          <ArrowUpFromLine className="h-4 w-4" /> Exporter des données
        </button>
      </div>

      {activeTab === "import" ? (
        <div className="space-y-5">
          <section className="border border-[#d7dae3] bg-white">
            <div className="border-b border-[#e5e7eb] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#172033]">1. Choisir le type de données</h2>
              <p className="mt-1 text-xs text-[#64748b]">Un fichier unique regroupe l’identité de chaque élève, son inscription et le montant total déjà payé. Les dépenses historiques restent un import séparé.</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {importTypes.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedKind(item.id)} className={`border p-3 text-left transition-colors ${selectedKind === item.id ? "border-[#173b8f] bg-[#f3f6ff]" : "border-[#d7dae3] hover:bg-[#f8fafc]"}`}>
                  <span className="block text-sm font-medium text-[#172033]">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#64748b]">{item.description}</span>
                </button>
              ))}
            </div>
            {selectedKind === "inscriptions" && (
              <div className="border-t border-[#dbe4f0] bg-[#f5f8ff] px-4 py-3">
                <p className="text-xs leading-5 text-[#334155]"><strong>Un seul fichier suffit :</strong> une ligne par élève avec son nom, prénom, date et lieu de naissance, sa classe, sa date d’entrée dans l’établissement et le cumul déjà payé depuis son arrivée.</p>
                <p className="mt-1 text-xs leading-5 text-[#64748b]">L’année scolaire active, le tarif du niveau, le mode de paiement et le nombre d’échéances sont récupérés dans les paramètres. Le montant déjà payé sera imputé sur les premières échéances, sans créer de faux encaissements historiques.</p>
                {importActiveYear && <p className="mt-1 text-xs font-medium text-[#173b8f]">Année scolaire utilisée : {importActiveYear.name}</p>}
                <p className="mt-1 text-xs leading-5 text-[#64748b]">L’import définitif et l’imputation du cumul restent à activer après validation de la transaction sécurisée.</p>
              </div>
            )}
            {(selectedKind === "inscriptions" || selectedKind === "depenses") && (
              <div className="flex flex-col gap-3 border-t border-[#e5e7eb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-medium text-[#172033]">{selectedKind === "depenses" ? "Ajouter une dépense sans fichier ?" : "Vous préférez saisir les élèves un par un ?"}</p><p className="mt-1 text-xs text-[#64748b]">{selectedKind === "depenses" ? "Saisissez la date, le motif et le montant." : "Renseignez directement l’identité, la classe et le cumul déjà payé, sans préparer de fichier."}</p></div>
                <Button type="button" onClick={() => selectedKind === "depenses" ? openManualExpense() : void openManualEntry()} className="w-full bg-[#173b8f] text-white hover:bg-[#123176] sm:w-auto"><UserPlus className="mr-2 h-4 w-4" /> {selectedKind === "depenses" ? "Ajouter une dépense" : "Saisie manuelle"}</Button>
              </div>
            )}
            <div className="flex flex-col gap-3 border-t border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#64748b]">Le tarif, le mode (mensuel, par tranches ou unique) et les échéances proviennent du plan tarifaire du niveau. Les dépenses historiques restent indépendantes.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate(selectedKind)} className="w-full sm:w-auto"><FileSpreadsheet className="mr-2 h-4 w-4" /> Télécharger le modèle CSV</Button>
            </div>
          </section>

          <section className="border border-[#d7dae3] bg-white">
            <div className="border-b border-[#e5e7eb] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#172033]">2. Ajouter le fichier à vérifier</h2>
              <p className="mt-1 text-xs text-[#64748b]">Format accepté : CSV standard (.csv). Utilisez le modèle correspondant au type de données sélectionné.</p>
            </div>
            <div className="p-4">
              <input ref={fileInput} type="file" accept=".csv,text/csv" multiple onChange={(event) => void handleFiles(event.target.files)} className="sr-only" id="data-import-file" />
              <label htmlFor="data-import-file" className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-[#9aa8bd] bg-[#fafbfc] px-4 py-8 text-center hover:bg-[#f3f6ff]">
                <FileUp className="mb-2 h-7 w-7 text-[#173b8f]" />
                <span className="text-sm font-medium text-[#172033]">{isParsing ? "Lecture du fichier…" : "Sélectionner un ou plusieurs fichiers CSV"}</span>
                <span className="mt-1 text-xs text-[#64748b]">Le contenu sera analysé et affiché avant toute validation.</span>
              </label>
            </div>
          </section>

          {files.length > 0 && (
            <section className="border border-[#d7dae3] bg-white">
              <div className="flex flex-col gap-2 border-b border-[#e5e7eb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#172033]">3. Vérifier les fichiers sélectionnés</h2>
                  <p className="mt-1 text-xs text-[#64748b]">{files.length} fichier(s) · {totalRows} ligne(s) détectée(s)</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setFiles([])}><RefreshCw className="mr-2 h-4 w-4" /> Réinitialiser</Button>
              </div>
              <div className="divide-y divide-[#e5e7eb]">
                {files.map((file) => (
                  <div key={file.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-[#172033]"><FileSpreadsheet className="h-4 w-4 shrink-0 text-[#64748b]" /><span className="truncate">{file.name}</span></div>
                      <p className="mt-1 text-xs text-[#64748b]">{importTypes.find((item) => item.id === file.kind)?.label} · {file.rows.length} ligne(s)</p>
                      {file.errors.length > 0 && <p className="mt-1 text-xs text-[#b42318]">{file.errors.join(" ")}</p>}
                      {file.errors.length === 0 && <p className="mt-1 flex items-center gap-1 text-xs text-[#237044]"><CheckCircle2 className="h-3.5 w-3.5" /> Colonnes obligatoires détectées</p>}
                    </div>
                    <button type="button" onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))} aria-label={"Retirer " + file.name} className="self-end rounded p-1 text-[#64748b] hover:bg-[#f1f5f9] sm:self-start"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              {files.some((file) => file.rows.length > 0) && (
                <div className="overflow-x-auto border-t border-[#e5e7eb]">
                  <div className="px-4 py-3 text-xs font-semibold text-[#172033]">Aperçu du premier fichier</div>
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="bg-[#f4f6fa]"><tr>{(files[0].headers).slice(0, 6).map((header) => <th key={header} className="whitespace-nowrap border-b border-[#e5e7eb] px-3 py-2 font-semibold text-[#475569]">{humanizeField(header)}</th>)}</tr></thead>
                    <tbody>{files[0].rows.slice(0, 5).map((row, index) => <tr key={index}>{files[0].headers.slice(0, 6).map((header) => <td key={header} className="max-w-48 truncate border-b border-[#eef0f3] px-3 py-2 text-[#334155]">{row[header] || "—"}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
              <div className="border-t border-[#e5e7eb] bg-[#fffaf0] px-4 py-3">
                <p className="flex items-start gap-2 text-xs leading-5 text-[#805b16]"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Cette étape vérifie les fichiers et prépare la reprise. Aucun enregistrement n’est encore effectué : la validation définitive devra être atomique pour éviter les doublons et préserver les soldes historiques.</p>
              </div>
            </section>
          )}


          {manualExpenseOpen && (
            <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="manual-expense-title">
              <div className="w-full max-w-lg overflow-hidden rounded-lg border border-[#d7dae3] bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">
                  <div><h2 id="manual-expense-title" className="text-lg font-semibold text-[#172033]">Ajouter une dépense</h2><p className="mt-1 text-sm text-[#64748b]">La dépense sera ajoutée aux mouvements financiers.</p></div>
                  <button type="button" onClick={() => setManualExpenseOpen(false)} className="rounded p-2 text-[#64748b] hover:bg-slate-100" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4 p-5">
                  <label className="block text-xs font-medium text-[#475569]">Date de la dépense<input type="date" value={manualExpenseValues.expense_date} onChange={event => setManualExpenseValues(current => ({ ...current, expense_date: event.target.value }))} className="mt-1 w-full rounded border border-[#cbd5e1] px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#173b8f]" /></label>
                  <label className="block text-xs font-medium text-[#475569]">Motif de la dépense<textarea rows={3} value={manualExpenseValues.description} onChange={event => setManualExpenseValues(current => ({ ...current, description: event.target.value }))} placeholder="Ex. Achat de fournitures, réparation…" className="mt-1 w-full rounded border border-[#cbd5e1] px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#173b8f]" /></label>
                  <label className="block text-xs font-medium text-[#475569]">Montant (FCFA)<input inputMode="decimal" value={manualExpenseValues.amount} onChange={event => setManualExpenseValues(current => ({ ...current, amount: event.target.value }))} placeholder="Ex. 25 000" className="mt-1 w-full rounded border border-[#cbd5e1] px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#173b8f]" /></label>
                  {manualErrors.length > 0 && <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{manualErrors.map((error,index) => <p key={index}>{error}</p>)}</div>}
                </div>
                <div className="flex justify-end gap-2 border-t border-[#e5e7eb] bg-[#fafbfc] px-5 py-4">
                  <Button type="button" variant="outline" onClick={() => setManualExpenseOpen(false)}>Annuler</Button>
                  <Button type="button" onClick={submitManualExpense} className="bg-[#173b8f] text-white hover:bg-[#123176]">Vérifier la dépense</Button>
                </div>
              </div>
            </div>
          )}

          {manualOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="manual-entry-title">
              <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#d7dae3] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
                  <div><h2 id="manual-entry-title" className="text-lg font-semibold text-[#172033]">Ajouter un élève et son inscription</h2><p className="mt-1 text-sm text-[#64748b]">Saisie individuelle · année active : {importActiveYear?.name ?? "chargement…"}</p></div>
                  <button type="button" onClick={() => setManualOpen(false)} className="rounded p-2 text-[#64748b] hover:bg-slate-100" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </div>
                <div className="min-h-0 space-y-4 overflow-y-auto p-5">
                  {manualLoading && <p className="text-sm text-[#64748b]">Chargement des classes, tarifs et dossiers existants…</p>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([["last_name","Nom"],["first_name","Prénom"],["birth_date","Date de naissance"],["place_of_birth","Lieu de naissance"]] as const).map(([field,label]) => <label key={field} className="block text-xs font-medium text-[#475569]">{label}<input type={field === "birth_date" ? "date" : "text"} value={manualValues[field] ?? ""} onChange={event => setManualValues(current => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded border border-[#cbd5e1] px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#173b8f] focus:ring-2 focus:ring-[#173b8f]/10" /></label>)}
                    <label className="block text-xs font-medium text-[#475569]">Classe<select value={manualValues.class_name ?? ""} onChange={event => setManualValues(current => ({ ...current, class_name: event.target.value }))} className="mt-1 w-full rounded border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#173b8f]"><option value="">Sélectionner une classe</option>{importClasses.map(item => <option key={item.id} value={item.name}>{item.grade_level_name ? item.grade_level_name + " · " : ""}{item.name}</option>)}</select></label>
                    <label className="block text-xs font-medium text-[#475569]">Date d'inscription<input type="date" value={manualValues.enrollment_date ?? ""} onChange={event => setManualValues(current => ({ ...current, enrollment_date: event.target.value }))} className="mt-1 w-full rounded border border-[#cbd5e1] px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#173b8f]" /></label>
                    <label className="block text-xs font-medium text-[#475569] sm:col-span-2">Total déjà payé depuis l’arrivée (FCFA)<input inputMode="decimal" value={manualValues.amount_paid ?? "0"} onChange={event => setManualValues(current => ({ ...current, amount_paid: event.target.value }))} placeholder="0" className="mt-1 w-full rounded border border-[#cbd5e1] px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#173b8f]" /><span className="mt-1 block font-normal text-[#64748b]">Le tarif et le nombre d’échéances sont récupérés depuis le plan du niveau. Aucun faux reçu ne sera créé.</span></label>
                  </div>
                  {manualErrors.length > 0 && <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{manualErrors.map((error,index) => <p key={index}>{error}</p>)}</div>}
                  {importClasses.length > 0 && importActiveYear && <p className="border border-[#dbe4f0] bg-[#f5f8ff] px-3 py-2 text-xs text-[#334155]">Année active : <strong>{importActiveYear.name}</strong>. Plan tarifaire recherché automatiquement selon la classe sélectionnée.</p>}
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-[#e5e7eb] bg-[#fafbfc] px-5 py-4 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>Annuler</Button>
                  <Button type="button" disabled={manualLoading || !importClasses.length} onClick={submitManualEntry} className="bg-[#173b8f] text-white hover:bg-[#123176]">Vérifier cette saisie</Button>
                </div>
              </div>
            </div>
          )}

          {reviewOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="import-review-title">
              <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[#d7dae3] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
                  <div><h2 id="import-review-title" className="text-lg font-semibold text-[#172033]">{isAnalyzing ? "Analyse des fichiers…" : "Analyse et vérification des données"}</h2><p className="mt-1 text-sm text-[#64748b]">Aucune donnée n'est enregistrée pendant cette vérification.</p></div>
                  <button type="button" onClick={() => setReviewOpen(false)} className="rounded p-2 text-[#64748b] hover:bg-slate-100" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-[#e5e7eb] bg-[#fafbfc] px-5 py-3 text-center text-xs">
                  <div><strong className="block text-lg text-[#172033]">{reviewRows.length}</strong>Lignes analysées</div>
                  <div><strong className="block text-lg text-[#b54708]">{reviewRows.filter(row => row.issues.some(issue => issue.severity === "warning")).length}</strong>À vérifier</div>
                  <div><strong className="block text-lg text-[#b42318]">{reviewRows.filter(row => row.issues.some(issue => issue.severity === "error")).length}</strong>Erreurs</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-[#e5e7eb] px-5 py-3">
                  <span className="text-xs font-medium text-[#475569]">Afficher :</span>
                  {(["all", "errors", "duplicates"] as const).map(filter => <button key={filter} type="button" onClick={() => setReviewFilter(filter)} className={"rounded border px-3 py-1.5 text-xs " + (reviewFilter === filter ? "border-[#173b8f] bg-[#f3f6ff] text-[#173b8f]" : "border-[#d7dae3] text-[#475569]")}>{filter === "all" ? "Toutes" : filter === "errors" ? "Erreurs" : "Doublons"}</button>)}
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {reviewRows.filter(row => reviewFilter === "all" || (reviewFilter === "errors" ? row.issues.some(issue => issue.severity === "error") : row.issues.some(issue => issue.code === "possible-duplicate"))).map(row => (
                    <div key={row.key} className="border-b border-[#eef0f3] px-5 py-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#172033]">Ligne {row.rowIndex} · {row.fileName}</strong><span className="text-xs text-[#64748b]">{row.kind}</span></div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(row.values).map(([field, value]) => <label key={field} className="block min-w-0 text-xs text-[#64748b]">{humanizeField(field)}<input value={value} onChange={event => { const values = { ...row.values, [field]: event.target.value }; const issues = validateEditedRow(values, row.kind, existingStudents, importClasses, importTuitionPlans, importActiveYear); const duplicate = issues.find(issue => issue.code === "possible-duplicate"); setReviewRows(current => current.map(item => item.key === row.key ? { ...item, values, issues, duplicateChoice: duplicate ? item.duplicateChoice ?? "pending" : undefined } : item)); }} className="mt-1 w-full rounded border border-[#cbd5e1] px-2.5 py-2 text-sm text-[#172033] outline-none focus:border-[#173b8f] focus:ring-2 focus:ring-[#173b8f]/10" /></label>)}
                      </div>
                      {row.issues.map((issue, index) => <div key={issue.code + index} className={"mt-3 rounded border px-3 py-2 text-xs " + (issue.severity === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
                        <strong>{issue.message}</strong>
                        {issue.candidate && <p className="mt-1">Dossier existant : {issue.candidate.first_name} {issue.candidate.last_name} · Matricule : {issue.candidate.student_number || "non renseigné"}</p>}
                        {issue.code === "possible-duplicate" && <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" onClick={() => setReviewRows(current => current.map(item => item.key === row.key ? { ...item, duplicateChoice: "same" } : item))} className={"rounded border px-3 py-1.5 " + (row.duplicateChoice === "same" ? "border-[#173b8f] bg-[#173b8f] text-white" : "border-amber-300 bg-white")}>Même élève : réinscrire</button>
                          <button type="button" onClick={() => setReviewRows(current => current.map(item => item.key === row.key ? { ...item, duplicateChoice: "separate" } : item))} className={"rounded border px-3 py-1.5 " + (row.duplicateChoice === "separate" ? "border-[#173b8f] bg-[#173b8f] text-white" : "border-amber-300 bg-white")}>Deux élèves différents</button>
                          <button type="button" onClick={() => setReviewRows(current => current.map(item => item.key === row.key ? { ...item, duplicateChoice: "pending" } : item))} className="rounded border border-amber-300 bg-white px-3 py-1.5">À vérifier</button>
                        </div>}
                      </div>)}
                    </div>
                  ))}
                  {reviewRows.length === 0 && <p className="p-8 text-center text-sm text-[#64748b]">Aucune ligne à analyser.</p>}
                </div>
                <div className="flex flex-col gap-2 border-t border-[#e5e7eb] bg-[#fafbfc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-[#64748b]">
                    {reviewRows.some(row => row.kind === "depenses") ? "Les dépenses valides seront enregistrées dans Supabase et intégrées aux mouvements financiers." : "Les erreurs sont recalculées après chaque correction."}
                    {expenseSaveMessage && <p className="mt-1 font-medium text-[#166534]">{expenseSaveMessage}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>Fermer</Button>
                    {reviewRows.some(row => row.kind === "depenses") && <Button type="button" disabled={isSavingExpenses || reviewRows.filter(row => row.kind === "depenses").some(row => row.issues.some(issue => issue.severity === "error"))} onClick={() => void saveReviewedExpenses()} className="bg-[#173b8f] text-white hover:bg-[#123176]">{isSavingExpenses ? "Enregistrement…" : "Enregistrer les dépenses"}</Button>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs leading-5 text-[#64748b]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Les dates d’inscription, de paiement et de dépense restent les dates réelles. La date de migration sera conservée séparément.</div>
          {invalidFiles.length > 0 && <p className="flex items-center gap-2 text-xs text-[#b42318]"><AlertCircle className="h-4 w-4" /> Corrigez les colonnes manquantes avant de poursuivre.</p>}
          {expenseSaveMessage && <p className="border border-[#b7dfc5] bg-[#f0faf3] px-3 py-2 text-xs text-[#237044]">{expenseSaveMessage}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <section className="border border-[#d7dae3] bg-white">
            <div className="border-b border-[#e5e7eb] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#172033]">Choisir les données à exporter</h2>
              <p className="mt-1 text-xs text-[#64748b]">Les fichiers sont générés à partir des données accessibles à votre établissement.</p>
            </div>
            <div className="divide-y divide-[#e5e7eb]">
              {exportTypes.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-[#fafbfc]">
                  <input type="checkbox" checked={selectedExports.includes(item.id)} onChange={(event) => setSelectedExports((current) => event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id))} className="mt-1 h-4 w-4 accent-[#173b8f]" />
                  <span><span className="block text-sm font-medium text-[#172033]">{item.label}</span><span className="mt-0.5 block text-xs text-[#64748b]">{item.description}</span></span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-[#64748b]">{selectedExports.length} catégorie(s) sélectionnée(s) · format CSV (.csv)</span>
              <Button type="button" onClick={() => void exportSelected()} disabled={isExporting || selectedExports.length === 0} className="w-full bg-[#173b8f] text-white hover:bg-[#123176] sm:w-auto">{isExporting ? "Préparation…" : "Exporter les données"} <ArrowUpFromLine className="ml-2 h-4 w-4" /></Button>
            </div>
          </section>
          {exportMessage && <p className="flex items-center gap-2 border border-[#b7dfc5] bg-[#f0faf3] px-3 py-2 text-xs text-[#237044]"><CheckCircle2 className="h-4 w-4" />{exportMessage}</p>}
          {exportError && <p className="flex items-center gap-2 border border-[#f0c4c0] bg-[#fff6f5] px-3 py-2 text-xs text-[#b42318]"><AlertCircle className="h-4 w-4" />{exportError}</p>}
          <p className="flex items-start gap-2 text-xs leading-5 text-[#64748b]"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Les exports respectent les droits d'accès Supabase du compte connecté. Les données non autorisées ou indisponibles ne sont pas extraites.</p>
        </div>
      )}
    </div>
  )
}
