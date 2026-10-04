"use client"

import { FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentDocuments() {
 return <div className="space-y-6"><ParentPageHeader eyebrow="Documents" title="Documents & bulletins" description="Bulletins, relevés et documents officiels mis à votre disposition."/><div className="border border-terre/10 bg-papier divide-y divide-terre/10"><div className="flex items-center gap-3 px-5 py-4"><FileText className="h-5 w-5 text-terre"/><div className="flex-1"><p className="font-medium text-terre">Bulletins scolaires</p><p className="text-sm text-pierre">Les bulletins publiés apparaîtront ici.</p></div><Button variant="outline" size="sm" disabled><Download className="mr-2 h-4 w-4"/>Télécharger</Button></div></div><ParentEmptyState title="Aucun document disponible" description="Les documents officiels seront ajoutés ici lorsqu’ils seront publiés par l’établissement."/></div>
}
