"use client"

import { BookOpen, ClipboardList, Search } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentCahier() {
 const [query,setQuery]=useState("")
 const tabs=[{label:"Cahier de textes",icon:BookOpen},{label:"Devoirs",icon:ClipboardList}]
 return <div className="space-y-6"><ParentPageHeader eyebrow="Travail scolaire" title="Cahier de textes & devoirs" description="Retrouvez les leçons, consignes et devoirs publiés par les enseignants."/><div className="flex flex-col gap-3 border-b border-terre/10 pb-3 sm:flex-row sm:items-end sm:justify-between"><div className="flex flex-wrap">{tabs.map(({label,icon:Icon},i)=><button key={label} className={i===0?"border-b-2 border-terre px-4 py-3 text-sm font-semibold text-terre":"px-4 py-3 text-sm text-pierre"}><Icon className="mr-2 inline h-4 w-4"/>{label}</button>)}</div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-pierre"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…" className="pl-9"/></div></div><ParentEmptyState title={query ? "Aucun contenu trouvé" : "Aucun contenu publié"} description={query ? "Aucun cahier de textes ou devoir ne correspond à votre recherche." : "Les cahiers de textes et devoirs de vos enfants apparaîtront ici dès qu’ils seront publiés par les enseignants."}/></div>
}
