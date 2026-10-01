"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, Search } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"

type Log = { id:string; action:string; entity_type:string; entity_id:string|null; metadata:Record<string,any>|null; created_at:string }

const actionLabels: Record<string,string> = {
 "teacher.create_account":"Compte enseignant créé","teacher.update":"Informations de l'enseignant modifiées",
 "teacher.assign_class":"Classe affectée à l'enseignant","teacher.assign_subject":"Matière affectée à l'enseignant",
 "teacher.create":"Enseignant ajouté","teacher.delete":"Enseignant supprimé","teacher.activate":"Enseignant activé","teacher.deactivate":"Enseignant désactivé",
 "document.upload":"Document envoyé","document.approve":"Document validé","document.reject":"Document rejeté",
 "leave.request":"Demande de congé créée","leave.approve":"Congé validé","leave.reject":"Congé refusé",
}
const entityLabels: Record<string,string> = { teacher:"Enseignant", staff_member:"Personnel", staff:"Personnel" }

function personName(m: Record<string,any>|null){ return m?.target_name || m?.teacher_name || m?.staff_name || m?.person_name || "—" }
function actorName(m: Record<string,any>|null){ return m?.actor_name || m?.created_by_name || m?.performed_by_name || "Utilisateur de l'établissement" }
function details(m: Record<string,any>|null){
 const ignored=new Set(["actor_user_id","target_user_id","role_id","user_id","profile_id"])
 return Object.entries(m||{}).filter(([k])=>!ignored.has(k)).map(([k,v])=>{
   if(v===null||v===undefined||v==="") return ""
   const label=k.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase())
   return `${label} : ${typeof v==="object"?JSON.stringify(v):String(v)}`
 }).filter(Boolean).join(" · ")
}

export default function PersonnelHistoriquePage(){
 const {primaryEstablishment}=useUserContext(); const establishmentId=primaryEstablishment?.id??null
 const [rows,setRows]=useState<Log[]>([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState(""); const [filter,setFilter]=useState("all"); const [expanded,setExpanded]=useState<string|null>(null)

 useEffect(()=>{ if(!establishmentId)return; let cancelled=false; (async()=>{ const r=await supabaseBrowser.from("audit_logs").select("id,action,entity_type,entity_id,metadata,created_at").eq("establishment_id",establishmentId).in("entity_type",["staff_member","teacher","staff"]).order("created_at",{ascending:false}).limit(200); if(!cancelled)setRows((r.data??[]) as Log[]); setLoading(false) })(); return()=>{cancelled=true} },[establishmentId])

 const actions=useMemo(()=>Array.from(new Set(rows.map(r=>r.action))).sort(),[rows])
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase(); return rows.filter(r=>{if(filter!=="all"&&r.action!==filter)return false; return !q||[actionLabels[r.action]||r.action,entityLabels[r.entity_type]||r.entity_type,personName(r.metadata),actorName(r.metadata),details(r.metadata)].join(" ").toLowerCase().includes(q)})},[rows,search,filter])

 return <div className="min-h-screen p-4"><div className="mx-auto max-w-7xl">
  <div className="mb-6"><Link href="/ecole/personnel" className="text-sm text-gray-500 hover:text-gray-900">← Personnel</Link><h1 className="mt-1 text-2xl font-bold">Historique du personnel</h1><p className="mt-1 text-sm text-gray-500">Retrouvez les actions effectuées sur les dossiers du personnel.</p></div>
  <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une personne ou une action..." className="h-10 w-full rounded-md border pl-9 pr-3 text-sm outline-none"/></div><select value={filter} onChange={e=>setFilter(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="all">Toutes les actions</option>{actions.map(a=><option key={a} value={a}>{actionLabels[a]||a}</option>)}</select></div>
  <div className="overflow-hidden rounded-lg border bg-white"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead className="border-b bg-gray-50"><tr><th className="w-10 px-4 py-3"/><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Action</th><th className="px-4 py-3 text-left">Personne concernée</th><th className="px-4 py-3 text-left">Effectué par</th></tr></thead><tbody className="divide-y">
   {loading?<tr><td colSpan={5} className="p-8 text-center text-gray-500">Chargement…</td></tr>:filtered.length===0?<tr><td colSpan={5} className="p-10 text-center text-gray-500">Aucun historique trouvé.</td></tr>:filtered.map(r=>{const open=expanded===r.id; return <>{/* eslint-disable react/jsx-key */}<tr key={r.id} className="hover:bg-gray-50"><td className="px-4 py-3"><button onClick={()=>setExpanded(open?null:r.id)} className="rounded p-1 hover:bg-gray-100" aria-label="Afficher les détails">{open?<ChevronDown className="h-4 w-4"/>:<ChevronRight className="h-4 w-4"/>}</button></td><td className="whitespace-nowrap px-4 py-3">{new Date(r.created_at).toLocaleString("fr-FR")}</td><td className="px-4 py-3 font-medium">{actionLabels[r.action]||r.action}</td><td className="px-4 py-3">{personName(r.metadata)}<div className="text-xs text-gray-400">{entityLabels[r.entity_type]||r.entity_type}</div></td><td className="px-4 py-3 text-gray-600">{actorName(r.metadata)}</td></tr>{open&&<tr key={r.id+"-details"} className="bg-gray-50"><td colSpan={5} className="px-14 py-4"><p className="text-sm font-medium">Détails</p><p className="mt-1 text-sm text-gray-600">{details(r.metadata)||"Aucun détail supplémentaire."}</p></td></tr>}</>})}
  </tbody></table></div></div>
 </div></div>
}
