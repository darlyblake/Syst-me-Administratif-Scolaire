"use client"

import { BookOpen } from "lucide-react"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentCahier() {
 return <div className="space-y-6"><ParentPageHeader eyebrow="Travail scolaire" title="Cahier de textes & devoirs" description="Retrouvez les leçons, consignes et devoirs publiés par les enseignants."/><div className="flex flex-wrap border-b border-terre/10"><button className="border-b-2 border-terre px-4 py-3 text-sm font-semibold text-terre">Cahier de textes</button><button className="px-4 py-3 text-sm text-pierre">Devoirs</button></div><ParentEmptyState title="Aucun contenu publié" description="Les cahiers de textes et devoirs de vos enfants apparaîtront ici dès qu’ils seront publiés par les enseignants." action={<div className="flex gap-2 text-sm text-pierre"><BookOpen className="h-4 w-4"/>Contenu scolaire</div>}/></div>
}
