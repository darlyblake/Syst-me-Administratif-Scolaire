"use client"

import { useState } from "react"
import { Download, HelpCircle, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const COLUMNS = [
  { header: "Prenom", required: true, example: "Jean", description: "Prénom de l'élève" },
  { header: "Nom", required: true, example: "Dupont", description: "Nom de famille" },
  { header: "Matricule", required: false, example: "EL2024001", description: "Numéro d'identifiant (généré auto si absent)" },
  { header: "Date de naissance", required: false, example: "15/03/2010", description: "Format JJ/MM/AAAA ou AAAA-MM-JJ" },
  { header: "Sexe", required: false, example: "M ou F", description: "M = Masculin, F = Féminin" },
  { header: "Telephone", required: false, example: "0708123456", description: "Numéro du parent/tuteur" },
  { header: "Email", required: false, example: "parent@email.com", description: "Email du parent/tuteur" },
]

function downloadTemplate() {
  const headers = ["Prenom", "Nom", "Matricule", "Date de naissance", "Sexe", "Telephone", "Email"]
  const rows = [
    ["Jean", "Dupont", "EL001", "15/03/2010", "M", "0708123456", "parent@email.com"],
    ["Marie", "Koné", "EL002", "22/07/2011", "F", "0706789012", ""],
    ["Paul", "Traoré", "", "05/11/2009", "M", "", ""],
  ]
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "modele_import_eleves.csv"
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  trigger?: React.ReactNode
}

export default function StudentImportGuideModal({ trigger }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <HelpCircle className="mr-2 h-4 w-4" />
            Guide d&apos;import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guide d&apos;importation des élèves</DialogTitle>
          <DialogDescription>
            Comment préparer votre fichier Excel ou CSV pour importer des élèves en masse.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">1. Format accepté</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">.xlsx (Excel)</Badge>
            <Badge variant="secondary">.xls</Badge>
            <Badge variant="secondary">.csv</Badge>
          </div>
          <p className="text-sm text-slate-600">
            La <strong>première ligne</strong> doit contenir les en-têtes de colonnes. Les noms ne sont pas sensibles à la casse.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">2. Colonnes du fichier</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Colonne</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Statut</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Exemple</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {COLUMNS.map((col) => (
                  <tr key={col.header} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono text-xs font-medium text-slate-800">{col.header}</td>
                    <td className="px-3 py-2">
                      {col.required ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Obligatoire</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-500">Optionnel</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{col.example}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{col.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">3. Affecter à une classe</h3>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm space-y-2 text-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p>
                  Lors de l&apos;import, vous choisissez <strong>une classe et un forfait de scolarité</strong> communs
                  à tous les élèves du fichier.
                </p>
                <p>
                  Pour des élèves de <strong>classes différentes</strong>, préparez <strong>un fichier par classe</strong> et
                  réalisez plusieurs imports successifs.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Déroulement de l&apos;import :</p>
            <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
              <li>Choisissez votre fichier Excel ou CSV</li>
              <li>Sélectionnez la <strong>classe cible</strong> (cycle → niveau → classe)</li>
              <li>Sélectionnez le <strong>forfait de scolarité</strong> applicable au niveau</li>
              <li>Configurez les options et frais annexes si nécessaire</li>
              <li>Cliquez sur <strong>Importer</strong> — le système crée les élèves et leurs inscriptions automatiquement</li>
            </ol>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">4. Import élèves de l&apos;État</h3>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>
                  Pour les élèves dont la scolarité est prise en charge par l&apos;État, utilisez le module
                  <strong> Importer les élèves de l&apos;État</strong> accessible depuis cette page.
                </p>
                <p className="mt-1">
                  Ce module gère séparément la part État et les frais familles (caution, options).
                  Il nécessite l&apos;activation dans <em>Paramètres → Scolarité</em>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Checklist avant import</h3>
          {[
            "La première ligne contient bien les en-têtes de colonnes",
            "Les colonnes Prenom et Nom sont présentes",
            "Les dates sont au format JJ/MM/AAAA ou AAAA-MM-JJ",
            "Le fichier ne contient pas de lignes entièrement vides",
            "La classe cible existe dans la structure académique",
            "Un forfait de scolarité est configuré pour le niveau concerné",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              {item}
            </div>
          ))}
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
          <Button onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger le modèle CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
