"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { FileText, Settings2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { payrollService } from "@/lib/supabase/services/payroll.service"
import { getAcademicYears, getActiveAcademicYear } from "@/lib/supabase/services/academic-year.service"

const money = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FCFA"

function dateOnly(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number)
  return `${MOIS_FR[month - 1]} ${year}`
}

function periodDates(key: string) {
  const [year, month] = key.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return { start: dateOnly(start), end: dateOnly(end) }
}

function previousMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number)
  return monthKey(new Date(year, month - 2, 1))
}

function nextMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number)
  return monthKey(new Date(year, month, 1))
}

export function FinancePaie() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const [periods,setPeriods]=useState<any[]>([]), [periodId,setPeriodId]=useState("")
  const [academicYears,setAcademicYears]=useState<any[]>([]), [selectedYearId,setSelectedYearId]=useState("")
  const [payableMonths,setPayableMonths]=useState<number[]>([])
  const [selectedMonth,setSelectedMonth]=useState("")
  const [rows,setRows]=useState<any[]>([]), [loading,setLoading]=useState(true), [generating,setGenerating]=useState(false)
  const [selected,setSelected]=useState<any>(null), [amount,setAmount]=useState("")
  const [method,setMethod]=useState("cash"), [date,setDate]=useState(dateOnly(new Date()))
  const [config,setConfig]=useState<any>(null), [remType,setRemType]=useState("fixed"), [salary,setSalary]=useState(""), [rate,setRate]=useState("")

  const availableMonthKeys = useMemo(() => {
    const year = academicYears.find((item) => item.id === selectedYearId)
    if (!year?.start_date || !year?.end_date || !payableMonths.length) return []
    const result: string[] = []
    const cursor = new Date(year.start_date + "T12:00:00")
    const end = new Date(year.end_date + "T12:00:00")
    while (cursor <= end) {
      const month = cursor.getMonth() + 1
      if (payableMonths.includes(month)) result.push(monthKey(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return result
  }, [academicYears, selectedYearId, payableMonths])

  const load=async()=>{if(!establishmentId)return;try{
    setLoading(true)
    const [p, years, active] = await Promise.all([
      payrollService.getPeriods(establishmentId),
      getAcademicYears(establishmentId),
      getActiveAcademicYear(establishmentId),
    ])
    setPeriods(p)
    setAcademicYears(years)
    const year = active ?? years[0]
    if (year) {
      setSelectedYearId(year.id)
      const config = await payrollService.getAcademicYearPayrollSettings(establishmentId, year.id)
      const months = Array.isArray(config?.payable_months) ? config.payable_months.map(Number) : []
      const cursor = new Date(year.start_date + "T12:00:00")
      const end = new Date(year.end_date + "T12:00:00")
      const allowed = months.length ? months : Array.from({length: 12}, (_, i) => i + 1)
      const keys: string[] = []
      while (cursor <= end) {
        if (allowed.includes(cursor.getMonth() + 1)) keys.push(monthKey(cursor))
        cursor.setMonth(cursor.getMonth() + 1)
      }
      setPayableMonths(allowed)
      if (keys.length) setSelectedMonth((current) => keys.includes(current) ? current : keys[0])
      else setSelectedMonth("")
    } else {
      setSelectedYearId("")
      setPayableMonths([])
      setSelectedMonth("")
    }
  }catch(e:any){toast.error(e.message||"Erreur de chargement")}finally{setLoading(false)}}
  const loadState=async()=>{if(!establishmentId||!periodId)return setRows([]);try{setRows(await payrollService.getState(establishmentId,periodId))}catch(e:any){toast.error(e.message||"Impossible de charger l'état")}}
  useEffect(()=>{load()},[establishmentId])
  useEffect(()=>{
    const period=periods.find((p:any)=>String(p.starts_on).slice(0,7)===selectedMonth)
    setPeriodId(period?.id || "")
  },[periods,selectedMonth])
  useEffect(()=>{loadState()},[establishmentId,periodId])

  const totals=useMemo(()=>rows.reduce((a,r)=>({net:a.net+r.net_amount,advances:a.advances+r.advances,arrears:a.arrears+r.arrears,advanceBalance:a.advanceBalance+r.advance_balance,paid:a.paid+r.amount_paid,remaining:a.remaining+r.remaining_amount}),{net:0,advances:0,arrears:0,advanceBalance:0,paid:0,remaining:0}),[rows])

  const changeYear = async (yearId: string) => {
    if (!establishmentId) return
    const year = academicYears.find((item) => item.id === yearId)
    if (!year) return
    setSelectedYearId(yearId)
    const config = await payrollService.getAcademicYearPayrollSettings(establishmentId, yearId)
    const configured = Array.isArray(config?.payable_months) ? config.payable_months.map(Number) : []
    const cursor = new Date(year.start_date + "T12:00:00")
    const end = new Date(year.end_date + "T12:00:00")
    const allowed = configured.length ? configured : Array.from({length: 12}, (_, i) => i + 1)
    const keys: string[] = []
    while (cursor <= end) {
      if (allowed.includes(cursor.getMonth() + 1)) keys.push(monthKey(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }
    setPayableMonths(allowed)
    setSelectedMonth(keys[0] || "")
  }

  const moveMonth = (direction: number) => {
    const index = availableMonthKeys.indexOf(selectedMonth)
    if (index < 0) return setSelectedMonth(availableMonthKeys[0] || "")
    const next = availableMonthKeys[index + direction]
    if (next) setSelectedMonth(next)
  }

  const generate=async()=>{if(!establishmentId||!selectedMonth)return;const{start,end}=periodDates(selectedMonth);try{setGenerating(true);const id=await payrollService.generatePeriod(establishmentId,start,end);const p=await payrollService.getPeriods(establishmentId);setPeriods(p);setPeriodId(id);toast.success("État de salaire généré")}catch(e:any){toast.error(e.message||"Impossible de générer l'état")}finally{setGenerating(false)}}

  const openConfig=(r:any)=>{setConfig(r);setRemType(r.remuneration_type==="hourly"?"hourly":"fixed");setSalary(r.monthly_salary?String(r.monthly_salary):"");setRate(r.hourly_rate?String(r.hourly_rate):"")}
  const saveConfig=async()=>{if(!establishmentId||!config)return;try{await payrollService.saveCompensation({establishmentId,staffType:config.staff_type,staffId:config.staff_id,remunerationType:remType,monthlySalary:Number(salary||0),hourlyRate:Number(rate||0)});toast.success("Rémunération enregistrée");setConfig(null);await load();await loadState()}catch(e:any){toast.error(e.message||"Impossible d'enregistrer")}}

  const pay=async()=>{if(!establishmentId||!selected)return;const n=Number(amount);if(n<=0)return toast.error("Montant invalide");try{const out=await payrollService.getOutstandingEntries(establishmentId,selected.staff_type,selected.staff_id);let left=n;const allocations:any[]=[];for(const e of out){if(left<=0)break;const part=Math.min(left,Number(e.remaining_amount));if(part>0)allocations.push({payroll_entry_id:e.id,amount:part});left-=part}if(left>0.01)return toast.error("Le montant dépasse le reste dû.");await payrollService.createPayment({establishmentId,amount:n,paymentDate:date,method,allocations});toast.success("Paiement enregistré");setSelected(null);setAmount("");await loadState()}catch(e:any){toast.error(e.message||"Impossible d'enregistrer le paiement")}}

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><h1 className="text-xl font-semibold">Paie et salaires</h1><p className="text-sm text-gray-500 mt-1">État de salaire de tout le personnel, avances, paiements et arriérés.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/ecole/finance/avances"><Button variant="outline">Avances sur salaire</Button></Link>
        <Button onClick={generate} disabled={generating} className="bg-gray-900 text-white hover:bg-gray-800"><FileText className="h-4 w-4 mr-2"/>{generating?"Génération...":"Générer l'état"}</Button>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[["Net à payer",totals.net],["Avances",totals.advances],["Arriérés",totals.arrears],["Avance à récupérer",totals.advanceBalance],["Déjà payé",totals.paid],["Reste",totals.remaining]].map(([l,v])=><div key={String(l)} className="border rounded bg-white p-4"><p className="text-xs text-gray-500">{l}</p><p className="font-semibold mt-1">{money(Number(v))}</p></div>)}</div>

    <div className="border rounded bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-gray-500">Mois de paie</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <select value={selectedYearId} onChange={(e)=>void changeYear(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white">
              {academicYears.map((year)=><option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={()=>moveMonth(-1)} disabled={!selectedMonth || availableMonthKeys.indexOf(selectedMonth)<=0} aria-label="Mois précédent"><ChevronLeft className="h-4 w-4"/></Button>
            <div className="min-w-[170px] text-center font-semibold">{selectedMonth ? <><CalendarDays className="inline h-4 w-4 mr-2"/>{monthLabel(selectedMonth)}</> : "Aucun mois payable"}</div>
            <Button variant="outline" size="sm" onClick={()=>moveMonth(1)} disabled={!selectedMonth || availableMonthKeys.indexOf(selectedMonth)>=availableMonthKeys.length-1} aria-label="Mois suivant"><ChevronRight className="h-4 w-4"/></Button>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500">{availableMonthKeys.length} mois payable(s) configuré(s)</span>
          {!periodId && <Button onClick={generate} disabled={generating}>{generating?"Génération...":"Générer cet état"}</Button>}
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">{periodId ? "État déjà généré pour ce mois." : selectedMonth ? "Aucun état généré pour ce mois. Vous pouvez le créer depuis cette page." : "Aucun mois payable n'est configuré pour cette année académique."}</div>
    </div>

    <div className="border rounded bg-white overflow-x-auto"><table className="w-full min-w-[1150px] text-sm"><thead className="bg-gray-50 border-b"><tr>{["Personnel","Fonction","Type","Base / heures","Avance du mois","Report avance","Arriéré","Payé","Reste","État",""].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody className="divide-y">{loading?<tr><td colSpan={11} className="p-10 text-center text-gray-500">Chargement...</td></tr>:rows.length===0?<tr><td colSpan={10} className="p-10 text-center text-gray-500">Aucun état pour cette période.</td></tr>:rows.map(r=><tr key={r.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{r.first_name} {r.last_name}</td><td className="px-4 py-3">{r.position}</td><td className="px-4 py-3">{r.remuneration_type==="hourly"?"Horaire":"Fixe"}</td><td className="px-4 py-3">{r.remuneration_type==="hourly"?`${r.hours_worked} h × ${money(r.hourly_rate)}`:money(r.base_amount)}</td><td className="px-4 py-3">{money(r.advances)}</td><td className="px-4 py-3">{r.prior_advance_balance>0 ? <span className="font-medium text-amber-700">{money(r.prior_advance_balance)}</span> : "—"}</td><td className="px-4 py-3">{money(r.arrears)}</td><td className="px-4 py-3">{money(r.amount_paid)}</td><td className="px-4 py-3 font-semibold">{money(r.remaining_amount)}</td><td className="px-4 py-3">{r.remuneration_type==="hourly" && Number(r.hours_worked||0)<=0 ? "Pointage requis" : r.payment_status==="advance_excess" ? <span className="text-amber-700">Avance à récupérer : {money(r.advance_balance)}</span> : r.payment_status==="paid"?"Soldé":r.payment_status==="partial"?"Partiel":r.payment_status==="overdue"?"En retard":"À payer"}</td><td className="px-4 py-3"><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>openConfig(r)} title="Rémunération"><Settings2 className="h-4 w-4"/></Button>{r.remaining_amount>0&&<Button size="sm" onClick={()=>setSelected(r)} className="bg-gray-900 text-white">Payer</Button>}</div></td></tr>)}</tbody></table></div>

    {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setSelected(null)}/><div className="relative bg-white rounded border w-full max-w-md p-5 space-y-4"><h2 className="font-semibold">Paiement — {selected.first_name} {selected.last_name}</h2><p className="text-sm text-gray-500">Reste : {money(selected.remaining_amount)}</p><div className="grid grid-cols-2 gap-3"><div><label className="text-xs">Montant</label><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></div><div><label className="text-xs">Date</label><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div></div><select value={method} onChange={e=>setMethod(e.target.value)} className="w-full border rounded px-3 py-2 text-sm"><option value="cash">Espèces</option><option value="transfer">Virement</option><option value="check">Chèque</option><option value="mobile_money">Mobile Money</option></select><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Annuler</Button><Button onClick={pay} className="bg-gray-900 text-white">Enregistrer</Button></div></div></div>}

    {config&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setConfig(null)}/><div className="relative bg-white rounded border w-full max-w-md p-5 space-y-4"><h2 className="font-semibold">Rémunération — {config.first_name} {config.last_name}</h2><div className="grid grid-cols-2 gap-2"><Button variant={remType==="fixed"?"default":"outline"} onClick={()=>setRemType("fixed")}>Salaire fixe</Button><Button variant={remType==="hourly"?"default":"outline"} onClick={()=>setRemType("hourly")}>Taux horaire</Button></div>{remType==="fixed"?<div><label className="text-xs">Salaire mensuel</label><Input type="number" value={salary} onChange={e=>setSalary(e.target.value)}/></div>:<div><label className="text-xs">Taux horaire</label><Input type="number" value={rate} onChange={e=>setRate(e.target.value)}/></div>}<p className="text-xs text-gray-500">Les heures des personnels horaires viendront du pointage validé.</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setConfig(null)}>Annuler</Button><Button onClick={saveConfig}>Enregistrer</Button></div></div></div>}
  </div>
}
