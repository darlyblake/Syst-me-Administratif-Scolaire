"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, FileSpreadsheet, Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { supabaseBrowser } from "@/lib/supabase/client"

declare global { interface Window { XLSX?: any } }
type StudentRow = { first_name: string; last_name: string; student_number?: string; enrollmentId?: string; studentId?: string; className?: string; error?: string }
type EnrollmentRow = { id: string; student_id: string; student: { first_name: string; last_name: string; student_number: string | null }; className: string }
const norm = (value: unknown) => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

export default function ImportOrganizationStudentsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { activeYear } = useAcademicYears(establishmentId)
  const [organizationId, setOrganizationId] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const id = new URLSearchParams(window.location.search).get("organizationId") || ""
    setOrganizationId(id)
  }, [])

  useEffect(() => {
    if (!establishmentId || !organizationId) return
    let cancelled = false
    setLoadingData(true)
    Promise.all([
      supabaseBrowser.from("sponsoring_organizations").select("id,name").eq("id", organizationId).eq("establishment_id", establishmentId).single(),
    ]).then(([org]) => {
      if (cancelled) return
      if (org.error) throw org.error
      setOrganizationName(org.data.name)
    }).catch((error) => {
      if (!cancelled) toast.error(error instanceof Error ? error.message : "Organisme introuvable.")
    }).finally(() => { if (!cancelled) setLoadingData(false) })
    return () => { cancelled = true }
  }, [establishmentId, organizationId])

  useEffect(() => {
    if (!establishmentId || !activeYear?.id) return
    let cancelled = false
    setLoadingData(true)
    supabaseBrowser.from("enrollments")
      .select("id,student_id,students!inner(first_name,last_name,student_number),school_classes(name)")
      .eq("establishment_id", establishmentId)
      .eq("academic_year_id", activeYear.id)
      .eq("status", "active")
      .then(({ data, error }) => {
        if (error) throw error
        if (cancelled) return
        setEnrollments((data ?? []).map((item: any) => ({
          id: item.id,
          student_id: item.student_id,
          student: item.students,
          className: item.school_classes?.name ?? "Classe non renseignée",
        })))
      })
      .catch((error) => { if (!cancelled) toast.error(error instanceof Error ? error.message : "Impossible de charger les élèves inscrits.") })
      .finally(() => { if (!cancelled) setLoadingData(false) })
    return () => { cancelled = true }
  }, [establishmentId, activeYear?.id])

  const matchedCount = useMemo(() => rows.filter((row) => row.enrollmentId && !row.error).length, [rows])
  const unmatchedCount = useMemo(() => rows.filter((row) => row.error).length, [rows])

  const parse = async (file: File) => {
    let matrix: any[][]
    if (file.name.toLowerCase().endsWith(".csv")) {
      matrix = (await file.text()).split(/\r?\n/).filter(Boolean).map((line) => line.split(/[;,\t]/).map((value) => value.trim().replace(/^"|"$/g, "")))
    } else {
      if (!window.XLSX) return toast.error("Le moteur Excel n’est pas encore chargé.")
      const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array" })
      matrix = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" })
    }
    if (matrix.length < 2) return toast.error("Le fichier ne contient aucune ligne d’élève.")
    const headers = matrix[0].map(norm)
    const index = (names: string[]) => headers.findIndex((header: string) => names.includes(header))
    const matriculeIndex = index(["matricule", "student_number", "identifiant", "numero eleve", "numéro élève"])
    const firstIndex = index(["prenom", "prénom", "first_name", "firstname"])
    const lastIndex = index(["nom", "last_name", "lastname"])
    if (matriculeIndex < 0 && (firstIndex < 0 || lastIndex < 0)) {
      return toast.error("Ajoutez une colonne Matricule, ou les deux colonnes Nom et Prénom.")
    }
    const parsed = matrix.slice(1).map((line) => ({
      first_name: firstIndex >= 0 ? String(line[firstIndex] ?? "").trim() : "",
      last_name: lastIndex >= 0 ? String(line[lastIndex] ?? "").trim() : "",
      student_number: matriculeIndex >= 0 ? String(line[matriculeIndex] ?? "").trim() : "",
    })).filter((row) => row.student_number || (row.first_name && row.last_name))
    const seen = new Set<string>()
    const resolved = parsed.map((row): StudentRow => {
      const key = row.student_number ? "n:" + norm(row.student_number) : "p:" + norm(row.first_name) + "|" + norm(row.last_name)
      if (seen.has(key)) return { ...row, error: "Doublon dans le fichier." }
      seen.add(key)
      const candidates = enrollments.filter((entry) => row.student_number
        ? norm(entry.student.student_number) === norm(row.student_number)
        : norm(entry.student.first_name) === norm(row.first_name) && norm(entry.student.last_name) === norm(row.last_name))
      if (candidates.length === 0) return { ...row, error: "Élève introuvable dans les inscriptions de l’année active." }
      if (candidates.length > 1) return { ...row, error: "Correspondance ambiguë : utilisez le matricule." }
      return { ...row, first_name: row.first_name || candidates[0].student.first_name, last_name: row.last_name || candidates[0].student.last_name, student_number: row.student_number || candidates[0].student.student_number || "", enrollmentId: candidates[0].id, studentId: candidates[0].student_id, className: candidates[0].className }
    })
    setRows(resolved)
    setImportDone(false)
    toast.success(`${resolved.length} ligne(s) analysée(s).`)
  }

  const submit = async () => {
    if (!establishmentId || !organizationId || !activeYear?.id) return toast.error("Organisme ou année scolaire active manquant.")
    const validRows = rows.filter((row) => row.enrollmentId && !row.error)
    if (!validRows.length) return toast.error("Aucun élève valide à importer.")
    setLoading(true)
    let imported = 0
    const failures: string[] = []
    try {
      for (const row of validRows) {
        const { error } = await supabaseBrowser.rpc("manage_organization_student_assignment", {
          p_establishment_id: establishmentId,
          p_organization_id: organizationId,
          p_enrollment_id: row.enrollmentId,
          p_action: "assign",
          p_renewed_from_assignment_id: null,
        })
        if (error) failures.push(`${row.first_name} ${row.last_name}: ${error.message}`)
        else imported++
      }
      setImportDone(true)
      toast.success(`${imported} élève(s) ajouté(s) à ${organizationName}.`)
      if (failures.length) toast.error(`${failures.length} ligne(s) n’ont pas pu être importées. Consultez les erreurs.`)
      if (imported) setRows((current) => current.map((row) => row.enrollmentId && !row.error ? { ...row, error: "Déjà importé." } : row))
    } finally {
      setLoading(false)
    }
  }

  return <>
    <Script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js" strategy="afterInteractive" />
    <main className="space-y-5 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild><Link href="/ecole/settings/prises-en-charge"><ArrowLeft className="mr-2 h-4 w-4" />Organismes</Link></Button>
        <div><h1 className="text-xl font-semibold">Importer des élèves dans un organisme</h1><p className="text-sm text-slate-500">Importation commune à l’État, aux ONG, associations, entreprises et autres organismes.</p></div>
      </div>
      <section className="border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm text-slate-600">Organisme sélectionné</p>
        <p className="text-lg font-semibold">{loadingData ? "Chargement…" : organizationName || "Organisme non sélectionné"}</p>
        <p className="text-sm text-slate-500">Année scolaire : {activeYear?.name ?? "Aucune année active"}. Seuls les élèves déjà inscrits pour cette année peuvent être rattachés. Les inscriptions et les anciennes données ne sont pas recréées.</p>
      </section>
      {!organizationId && <p className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Ouvrez cette page depuis le bouton Importer de la fiche d’un organisme.</p>}
      <section className="border border-slate-200 bg-white p-4 space-y-4">
        <div><h2 className="font-semibold">Fichier Excel ou CSV</h2><p className="text-sm text-slate-500">Colonnes acceptées : Matricule (recommandé), ou Nom et Prénom. Les élèves sont recherchés dans les inscriptions de l’année active.</p></div>
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void parse(file) }} />
        <Button variant="outline" onClick={() => input.current?.click()} disabled={!organizationId || !activeYear || loadingData}><Upload className="mr-2 h-4 w-4" />Choisir un fichier</Button>
        {rows.length > 0 && <>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" />{matchedCount} ligne(s) reconnue(s)</span>
            <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-4 w-4" />{unmatchedCount} erreur(s)</span>
          </div>
          <div className="max-h-80 overflow-auto border border-slate-200">
            <table className="w-full min-w-[520px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left"><tr><th className="p-2">Élève</th><th className="p-2">Matricule</th><th className="p-2">Classe</th><th className="p-2">Résultat</th></tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={index}><td className="p-2">{row.first_name} {row.last_name}</td><td className="p-2">{row.student_number || "—"}</td><td className="p-2">{row.className || "—"}</td><td className="p-2">{row.error ? <span className="text-amber-700">{row.error}</span> : <span className="text-emerald-700">Prêt</span>}</td></tr>)}</tbody></table>
          </div>
          <Button onClick={submit} disabled={loading || !organizationId || matchedCount === 0 || importDone}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importation…</> : `Ajouter les ${matchedCount} élève(s) reconnus`}</Button>
        </>}
      </section>
    </main>
  </>
}
