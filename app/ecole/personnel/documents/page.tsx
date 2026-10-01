"use client"

import { useEffect,useState } from "react"
import Link from "next/link"
import { FileText, ExternalLink } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"

type Staff={id:string;first_name:string;last_name:string}
type Doc={id:string;owner_id:string|null;document_type:string;name:string;storage_path:string;mime_type:string|null;created_at:string}

export default function PersonnelDocumentsPage(){
 const {primaryEstablishment}=useUserContext();const establishmentId=primaryEstablishment?.id??null
 const [staff,setStaff]=useState<Staff[]>([]);const [docs,setDocs]=useState<Doc[]>([]);const [loading,setLoading]=useState(true)
 useEffect(()=>{if(!establishmentId)return;let cancelled=false;(async()=>{setLoading(true);const [s,d]=await Promise.all([supabaseBrowser.from("staff_members").select("id,first_name,last_name").eq("establishment_id",establishmentId).order("last_name"),supabaseBrowser.from("documents").select("id,owner_id,document_type,name,storage_path,mime_type,created_at").eq("establishment_id",establishmentId).eq("owner_type","staff").order("created_at",{ascending:false})]);if(!cancelled){setStaff(s.data??[]);setDocs(d.data??[])}setLoading(false)})();return()=>{cancelled=true}},[establishmentId])
 return <div className="min-h-screen p-4"><div className="max-w-7xl mx-auto"><div className="mb-6"><Link href="/ecole/personnel" className="text-sm text-gray-500">← Personnel</Link><h1 className="text-2xl font-bold mt-1">Documents du personnel</h1><p className="text-sm text-gray-500 mt-1">Centralisez les pièces du dossier de chaque membre.</p></div>
 <div className="bg-white border rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3">Personnel</th><th className="text-left px-4 py-3">Document</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Ajouté le</th><th className="text-right px-4 py-3">Fichier</th></tr></thead><tbody className="divide-y">{loading?<tr><td colSpan={5} className="p-8 text-center text-gray-500">Chargement…</td></tr>:docs.length===0?<tr><td colSpan={5} className="p-10 text-center text-gray-500"><FileText className="h-8 w-8 mx-auto mb-2 text-gray-300"/>Aucun document du personnel.</td></tr>:docs.map(d=>{const p=staff.find(s=>s.id===d.owner_id);return <tr key={d.id}><td className="px-4 py-3 font-medium">{p?(`${p.first_name} ${p.last_name}`):"—"}</td><td className="px-4 py-3">{d.name}</td><td className="px-4 py-3">{d.document_type}</td><td className="px-4 py-3">{new Date(d.created_at).toLocaleDateString("fr-FR")}</td><td className="px-4 py-3 text-right"><span className="text-gray-400 inline-flex items-center gap-1"><ExternalLink className="h-4 w-4"/>Stockage</span></td></tr>})}</tbody></table></div></div>
 </div></div>
}
