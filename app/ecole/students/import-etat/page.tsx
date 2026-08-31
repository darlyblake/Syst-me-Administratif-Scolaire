"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import { supabaseBrowser } from "@/lib/supabase/client"
import { getStateFinanceSettings, importStateStudents, type StateImportStudent } from "@/lib/supabase/services/state-financing.service"

declare global { interface Window { XLSX?: any } }
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

export default function ImportEtatStudentsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: years, activeYear, selectedYear } = useAcademicYears(establishmentId)
  const year = selectedYear ?? activeYear ?? years[0]
  const { data: structure } = useAcademicStructure(establishmentId)
  const { data: plans } = useTuitionPlans(year?.id ?? null)
  const [rows, setRows] = useState<StateImportStudent[]>([])
  const [classId, setClassId] = useState("")
  const [planId, setPlanId] = useState("")
  const [options, setOptions] = useState<Array<{id:string;name:string;amount:number}>>([])
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [caution, setCaution] = useState(0)
  const [refundable, setRefundable] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const classes = useMemo(() => structure.flatMap(c => (c.grade_levels ?? []).flatMap(l => (l.school_classes ?? []).map(sc => ({id:sc.id,name:sc.name,gradeLevelId:l.id})))), [structure])
  const target = classes.find(c => c.id === classId)
  const targetPlans = plans.filter(p => p.grade_level_id === target?.gradeLevelId)

  useEffect(() => {
    if (!establishmentId) return
    getStateFinanceSettings(establishmentId).then(s => { setEnabled(s.state_students_enabled); setCaution(s.state_caution_default_amount); setRefundable(s.state_caution_refundable) }).catch(() => undefined)
    supabaseBrowser.from("student_options").select("id,name,default_amount").eq("establishment_id", establishmentId).eq("active", true).order("name").then(({data}) => setOptions((data ?? []).map(x => ({id:x.id,name:x.name,amount:Number(x.default_amount)||0}))))
  }, [establishmentId])

  const parse = async (file: File) => {
    let matrix: any[][]
    if (file.name.toLowerCase().endsWith(".csv")) matrix = (await file.text()).split(/\r?\n/).filter(Boolean).map(l => l.split(",").map(v => v.trim().replace(/^"|"$/g,"")))
    else { if (!window.XLSX) { toast.error("Le moteur Excel n'est pas encore chargé."); return }; const wb = window.XLSX.read(await file.arrayBuffer(), {type:"array"}); matrix = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1,defval:""}) }
    if (matrix.length < 2) return toast.error("Le fichier est vide.")
    const h = matrix[0].map(norm), find = (a:string[]) => h.findIndex((x:string) => a.map(norm).includes(x))
    const fi=find(["prenom","first_name","firstname"]), li=find(["nom","last_name","lastname"])
    if (fi<0 || li<0) return toast.error("Colonnes obligatoires : Nom et Prénom.")
    const ni=find(["identifiant","student_number","matricule"]), bi=find(["date de naissance","birth_date","date_naissance"]), si=find(["sexe","sex"]), pi=find(["telephone","téléphone","phone"]), ei=find(["email","e-mail"])
    setRows(matrix.slice(1).map(r => ({first_name:String(r[fi]??"").trim(),last_name:String(r[li]??"").trim(),student_number:ni>=0?String(r[ni]??"").trim():undefined,birth_date:bi>=0?String(r[bi]??"").trim():undefined,sex:si>=0?String(r[si]??"").trim():undefined,phone:pi>=0?String(r[pi]??"").trim():undefined,email:ei>=0?String(r[ei]??"").trim():undefined})).filter(r=>r.first_name&&r.last_name))
    toast.success("Liste Excel chargée")
  }

  const submit = async () => {
    if (!establishmentId || !year?.id || !classId || !planId || !rows.length) return toast.error("Sélectionnez la classe, le forfait et importez un fichier.")
    setLoading(true)
    try { const r=await importStateStudents({establishmentId,academicYearId:year.id,classId,tuitionPlanId:planId,students:rows,optionIds:selectedOptions,cautionAmount:caution,cautionRefundable:refundable}); toast.success(`${r.imported} importé(s), ${r.failed} rejeté(s)`); if(r.failed) console.warn(r.errors) }
    catch(e){toast.error(e instanceof Error?e.message:"Import impossible")}
    finally{setLoading(false)}
  }

  return <><Script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js" strategy="afterInteractive"/><div className="space-y-6 p-4 md:p-6"><div className="flex items-center gap-3"><Button variant="ghost" asChild><Link href="/ecole/students"><ArrowLeft className="mr-2 h-4 w-4"/>Élèves</Link></Button><div><h1 className="text-2xl font-bold">Importer les élèves de l'État</h1><p className="text-sm text-slate-600">Un fichier Excel, une classe, un forfait et les options : le système crée les inscriptions automatiquement.</p></div></div>{!enabled&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">Activez d'abord la prise en charge dans <Link className="font-medium underline" href="/ecole/settings/scolarite">Paramètres → Scolarité</Link>.</div>}<div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Liste Excel</CardTitle><CardDescription>Nom et Prénom sont obligatoires. Matricule, naissance, sexe, téléphone et email sont facultatifs.</CardDescription></CardHeader><CardContent className="space-y-4"><input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>e.target.files?.[0]&&parse(e.target.files[0])}/><Button variant="outline" onClick={()=>input.current?.click()}><Upload className="mr-2 h-4 w-4"/>Choisir un fichier</Button>{rows.length>0&&<div className="rounded-md bg-green-50 p-3 text-sm text-green-700"><FileSpreadsheet className="mr-2 inline h-4 w-4"/>{rows.length} élève(s) détecté(s)</div>}</CardContent></Card><Card><CardHeader><CardTitle>Affectation commune</CardTitle><CardDescription>Ces choix s'appliquent à tous les élèves du fichier.</CardDescription></CardHeader><CardContent className="space-y-4"><Input value={year?.name??""} disabled/><Select value={classId} onValueChange={v=>{setClassId(v);setPlanId("")}}><SelectTrigger><SelectValue placeholder="Classe"/></SelectTrigger><SelectContent>{classes.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><Select value={planId} onValueChange={setPlanId} disabled={!classId}><SelectTrigger><SelectValue placeholder="Forfait de scolarité"/></SelectTrigger><SelectContent>{targetPlans.map(p=><SelectItem key={p.id} value={p.id}>{p.annual_amount.toLocaleString("fr-FR")} FCFA · {p.payment_mode}</SelectItem>)}</SelectContent></Select></CardContent></Card></div><Card><CardHeader><CardTitle>Frais famille</CardTitle><CardDescription>La scolarité de l'État reste séparée des sommes éventuellement dues par les familles.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 md:grid-cols-2">{options.map(o=><label key={o.id} className="flex items-center gap-3 rounded-lg border p-3"><Checkbox checked={selectedOptions.includes(o.id)} onCheckedChange={()=>setSelectedOptions(s=>s.includes(o.id)?s.filter(x=>x!==o.id):[...s,o.id])}/><span className="flex-1">{o.name}</span><span className="text-sm font-medium">{o.amount.toLocaleString("fr-FR")} FCFA</span></label>)}</div><div className="grid gap-4 md:grid-cols-2"><div><Label>Caution</Label><Input type="number" min={0} value={caution} onChange={e=>setCaution(Number(e.target.value)||0)}/></div><label className="flex items-center gap-2 rounded-lg border p-3 self-end"><Checkbox checked={refundable} onCheckedChange={v=>setRefundable(Boolean(v))}/>Caution remboursable</label></div><Button onClick={submit} disabled={!enabled||loading||!rows.length}>{loading?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Import...</>:"Importer les élèves"}</Button></CardContent></Card></div></>}
