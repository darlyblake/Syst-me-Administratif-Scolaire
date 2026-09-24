"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Receipt } from "lucide-react"

export default function FacturationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facturation</h1>
        <p className="text-sm text-slate-500 mt-1">Gérez les factures, reçus et remboursements.</p>
      </div>
      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Facturation</CardTitle>
          <CardDescription>Section en cours de construction</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500 text-center py-10">Les fonctionnalités de facturation seront bientôt disponibles ici.</p>
        </CardContent>
      </Card>
    </div>
  )
}
