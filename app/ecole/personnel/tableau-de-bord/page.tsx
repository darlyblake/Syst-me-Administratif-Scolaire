"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Users, UserCheck, UserX, CalendarDays, FileText, ArrowRight } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"

type StaffRow = { id:string; first_name:string; last_name:string; position:string; active:boolean; hire_date:string|null }
type LeaveRow = { id:string; staff_id:string; starts_on:string; ends_on:string; leave_type:string; status:string }

export default function PersonnelDashboardPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [staff,setStaff]=useState<StaffRow[]>([])
  const [leaves,setLeaves]=useState<LeaveRow[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{ if(!establishmentId) return
    let cancelled=false
    ;(async()=>{
      setLoading(true)
      const [s,l]=await Promise.all([
        supabaseBrowser.from("staff_members").select("id,first_name,last_name,position,active,hire_date").eq("establishment_id",establishmentId).order("last_name"),
        supabaseBrowser.from("leave_requests").select("id,staff_id,starts_on,ends_on,leave_type,status").eq("establishment_id",establishmentId).order("created_at",{ascending:false}).limit(20)
      ])
      if(!cancelled){ setStaff(s.data??[]); setLeaves(l.data??[]) }
      setLoading(false)
    })()
    return()=>{cancelled=true}
  },[establishmentId])

  const stats=useMemo(()=>({
    total:staff.length,
    actifs:staff.filter(x=>x.active).length,
    inactifs:staff.filter(x=>!x.active).length,
    conges:leaves.filter(x=>x.status==="approved" && x.starts_on<=new Date().toISOString().slice(0,10) && x.ends_on>=new Date().toISOString().slice(0,10)).length,
    demandes:leaves.filter(x=>x.status==="pending").length
  }),[staff,leaves])

  if(loading) return <div className="p-6 text-sm text-gray-500">Chargement du personnel…</div>

  return <div className="min-h-screen p-4"><div className="max-w-7xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Tableau de bord du personnel</h1><p className="text-sm text-gray-500 mt-1">Vue rapide des effectifs, congés et dossiers.</p></div>
      <Link href="/ecole/personnel" className="text-sm text-gray-600 hover:text-gray-900">← Tous les personnels</Link>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {[["Total",stats.total,Users],["Actifs",stats.actifs,UserCheck],["Inactifs",stats.inactifs,UserX],["En congé",stats.conges,CalendarDays],["Demandes en attente",stats.demandes,FileText]].map(([label,value,Icon])=>{
        const C=Icon as typeof Users
        return <div key={String(label)} className="bg-white border border-gray-200 rounded-lg p-4"><div className="flex items-center gap-2 text-gray-500 text-sm"><C className="h-4 w-4"/>{label}</div><p className="text-2xl font-semibold text-gray-900 mt-2">{String(value)}</p></div>
      })}
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between"><h2 className="font-semibold">Effectif actuel</h2><Link href="/ecole/personnel" className="text-sm text-gray-600">Voir tout <ArrowRight className="inline h-3.5 w-3.5"/></Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Poste</th><th className="text-left px-4 py-3">Embauche</th><th className="text-left px-4 py-3">État</th></tr></thead><tbody className="divide-y">{staff.slice(0,8).map(p=><tr key={p.id}><td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}</td><td className="px-4 py-3 text-gray-600">{p.position}</td><td className="px-4 py-3 text-gray-600">{p.hire_date?new Date(p.hire_date).toLocaleDateString("fr-FR"):"—"}</td><td className="px-4 py-3">{p.active?<span className="text-green-700">Actif</span>:<span className="text-gray-500">Inactif</span>}</td></tr>)}</tbody></table></div>
      </section>
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between"><h2 className="font-semibold">Dernières demandes de congé</h2><Link href="/ecole/personnel/conges" className="text-sm text-gray-600">Gérer <ArrowRight className="inline h-3.5 w-3.5"/></Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3">Personnel</th><th className="text-left px-4 py-3">Période</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Statut</th></tr></thead><tbody className="divide-y">{leaves.slice(0,8).map(l=>{const p=staff.find(s=>s.id===l.staff_id);return <tr key={l.id}><td className="px-4 py-3 font-medium">{p?(`${p.first_name} ${p.last_name}`):"—"}</td><td className="px-4 py-3">{new Date(l.starts_on).toLocaleDateString("fr-FR")} → {new Date(l.ends_on).toLocaleDateString("fr-FR")}</td><td className="px-4 py-3">{l.leave_type}</td><td className="px-4 py-3">{l.status}</td></tr>})}</tbody></table></div>
      </section>
    </div>
  </div></div>
}
