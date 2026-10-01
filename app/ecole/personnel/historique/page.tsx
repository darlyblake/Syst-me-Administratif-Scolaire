"use client"

import { useEffect,useState } from "react"
import Link from "next/link"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"

type Log={id:string;action:string;entity_type:string;entity_id:string|null;metadata:any;created_at:string}

export default function PersonnelHistoriquePage(){
 const {primaryEstablishment}=useUserContext();const establishmentId=primaryEstablishment?.id??null
 const [rows,setRows]=useState<Log[]>([]);const [loading,setLoading]=useState(true)
 useEffect(()=>{if(!establishmentId)return;let cancelled=false;(async()=>{const r=await supabaseBrowser.from("audit_logs").select("id,action,entity_type,entity_id,metadata,created_at").eq("establishment_id",establishmentId).in("entity_type",["staff_member","teacher","staff"]).order("created_at",{ascending:false}).limit(100);if(!cancelled)setRows(r.data??[]);setLoading(false)})();return()=>{cancelled=true}},[establishmentId])
 return <div className="min-h-screen p-4"><div className="max-w-7xl mx-auto"><div className="mb-6"><Link href="/ecole/personnel" className="text-sm text-gray-500">← Personnel</Link><h1 className="text-2xl font-bold mt-1">Historique du personnel</h1><p className="text-sm text-gray-500 mt-1">Traçabilité des actions enregistrées sur les dossiers.</p></div>
 <div className="bg-white border rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Action</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Détails</th></tr></thead><tbody className="divide-y">{loading?<tr><td colSpan={4} className="p-8 text-center text-gray-500">Chargement…</td></tr>:rows.length===0?<tr><td colSpan={4} className="p-10 text-center text-gray-500">Aucun historique disponible.</td></tr>:rows.map(r=><tr key={r.id}><td className="px-4 py-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("fr-FR")}</td><td className="px-4 py-3 font-medium">{r.action}</td><td className="px-4 py-3">{r.entity_type}</td><td className="px-4 py-3 text-gray-600">{r.metadata?JSON.stringify(r.metadata):"—"}</td></tr>)}</tbody></table></div></div>
 </div></div>
}
