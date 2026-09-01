"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, ArrowLeft, Download, Info } from "lucide-react"
import Link from "next/link"

interface StudentData {
  id: string
  nom: string
  prenom: string
  classe: string
  nomParent: string
  contactParent: string
  totalAPayer: number
  financingType?: "family" | "state" | "other"
  familyAmountDue?: number
}

interface Payment {
  studentId: string
  amount: number
  payerType?: "family" | "state" | "other"
}

export default function ListeImpayesPage() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedClass, setSelectedClass] = useState("all")

  const classes = ["Maternelle","CP1","CP2","CE1","CE2","CM1","CM2","6ème","5ème","4ème","3ème","2nde L","2nde S","1ère A1","1ère A2","1ère B","Terminale A1","Terminale B","Terminale D","Terminale S"]

  useEffect(() => {
    setStudents(JSON.parse(localStorage.getItem("students") || "[]"))
    setPayments(JSON.parse(localStorage.getItem("payments") || "[]"))
  }, [])

  // Important: cette liste représente uniquement les dettes de la famille.
  // Les échéances financées par l'État doivent être suivies dans le module
  // "Financement par l'État" et ne doivent jamais déclencher de relance parent.
  const getFamilyDue = (student: StudentData) => {
    if (typeof student.familyAmountDue === "number") return student.familyAmountDue
    return student.financingType === "state" ? 0 : student.totalAPayer
  }

  const getUnpaidStudents = () => students
    .filter((student) => {
      if (selectedClass !== "all" && student.classe !== selectedClass) return false
      const familyDue = getFamilyDue(student)
      if (familyDue <= 0) return false
      const familyPaid = payments
        .filter((p) => p.studentId === student.id && (p.payerType ?? "family") === "family")
        .reduce((sum, p) => sum + p.amount, 0)
      return familyPaid < familyDue
    })
    .map((student) => {
      const totalAPayer = getFamilyDue(student)
      const totalPaid = payments
        .filter((p) => p.studentId === student.id && (p.payerType ?? "family") === "family")
        .reduce((sum, p) => sum + p.amount, 0)
      return { ...student, totalAPayer, totalPaid, remaining: totalAPayer - totalPaid }
    })
    .sort((a, b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom))

  const unpaidStudents = getUnpaidStudents()
  const studentsByClass = unpaidStudents.reduce((acc, student) => {
    ;(acc[student.classe] ??= []).push(student)
    return acc
  }, {} as Record<string, typeof unpaidStudents>)
  const totalUnpaid = unpaidStudents.reduce((sum, s) => sum + s.remaining, 0)

  const exportToCSV = () => {
    const headers = ["Classe","Nom","Prénom","Parent","Contact","Total famille","Payé famille","Reste famille"]
    const rows = unpaidStudents.map((s) => [s.classe,s.nom,s.prenom,s.nomParent,s.contactParent,s.totalAPayer,s.totalPaid,s.remaining])
    const blob = new Blob([[headers, ...rows].map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `liste_impayes_familles_${selectedClass === "all" ? "toutes_classes" : selectedClass}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-creme p-4 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild><Link href="/payments"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Link></Button>
            <div><h1 className="text-2xl font-bold text-gray-900">Impayés des familles</h1><p className="text-sm text-gray-500">Les financements État sont exclus automatiquement.</p></div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les classes</SelectItem>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Button onClick={exportToCSV} variant="outline"><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
          </div>
        </div>

        <div className="mb-6 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 print:hidden">
          <Info className="h-5 w-5 shrink-0" />
          <div><strong>Règle automatique :</strong> un élève dont la scolarité est prise en charge par l'État n'apparaît jamais ici pour cette scolarité. Seuls ses frais explicitement à la charge de la famille peuvent apparaître.</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:rounded-none">
          <div className="text-center mb-8 border-b pb-6"><h2 className="text-xl font-bold text-red-600 mb-2">LISTE DES ÉLÈVES EN SITUATION D'IMPAYÉ FAMILIAL</h2><div>{selectedClass === "all" ? "Toutes les classes" : selectedClass}</div><p className="text-sm text-gray-600 mt-2">Document généré le {new Date().toLocaleDateString("fr-FR")}</p></div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center"><div className="text-2xl font-bold text-red-600">{unpaidStudents.length}</div><div className="text-sm text-red-800">Familles concernées</div></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center"><div className="text-2xl font-bold text-orange-600">{totalUnpaid.toLocaleString()}</div><div className="text-sm text-orange-800">Impayés familiaux (FCFA)</div></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center"><div className="text-2xl font-bold text-blue-600">{Object.keys(studentsByClass).length}</div><div className="text-sm text-blue-800">Classes concernées</div></div>
          </div>

          {Object.entries(studentsByClass).map(([classe, classStudents]) => (
            <div key={classe} className="mb-8">
              <div className="bg-gray-100 p-3 border-l-4 border-red-500 mb-4"><h3 className="text-lg font-bold">{classe} — {classStudents.length} élève(s)</h3></div>
              <div className="overflow-x-auto"><table className="w-full border-collapse border border-gray-300"><thead><tr className="bg-gray-50">{["N°","NOM ET PRÉNOM","PARENT/TUTEUR","CONTACT","DÛ FAMILLE","PAYÉ","RESTE"].map(h => <th key={h} className="border border-gray-300 p-2 text-left">{h}</th>)}</tr></thead><tbody>{classStudents.map((s,i)=><tr key={s.id}><td className="border p-2">{i+1}</td><td className="border p-2 font-medium">{s.prenom} {s.nom.toUpperCase()}</td><td className="border p-2">{s.nomParent}</td><td className="border p-2">{s.contactParent}</td><td className="border p-2 text-right">{s.totalAPayer.toLocaleString()}</td><td className="border p-2 text-right">{s.totalPaid.toLocaleString()}</td><td className="border p-2 text-right font-bold text-red-600">{s.remaining.toLocaleString()}</td></tr>)}</tbody></table></div>
            </div>
          ))}

          {unpaidStudents.length === 0 && <div className="text-center py-12"><div className="text-6xl mb-4">🎉</div><h3 className="text-xl font-bold text-green-600">Aucun impayé familial</h3><p className="text-gray-600 mt-2">Les financements attendus de l'État sont suivis séparément.</p></div>}
        </div>
      </div>
    </div>
  )
}
