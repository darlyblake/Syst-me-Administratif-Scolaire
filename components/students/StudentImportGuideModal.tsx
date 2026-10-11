"use client"

import { useState } from "react"
import { Download, HelpCircle, Check, FileSpreadsheet, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const COLUMNS = [
  { header: "Prenom", required: true, example: "Jean", description: "Prénom de l'élève" },
  { header: "Nom", required: true, example: "Dupont", description: "Nom de famille de l'élève" },
  { header: "Matricule", required: false, example: "EL2024001", description: "Laissez vide si le matricule doit être généré automatiquement." },
  { header: "Date de naissance", required: false, example: "15/03/2010", description: "Format jour/mois/année, par exemple 15/03/2010." },
  { header: "Sexe", required: false, example: "M ou F", description: "M pour masculin, F pour féminin." },
  { header: "Telephone", required: false, example: "0708123456", description: "Téléphone du parent ou du tuteur." },
  { header: "Email", required: false, example: "parent@email.com", description: "Adresse e-mail du parent ou du tuteur." },
]

function downloadTemplate() {
  const headers = ["Prenom", "Nom", "Matricule", "Date de naissance", "Sexe", "Telephone", "Email"]
  const rows = [
    ["Jean", "Dupont", "EL001", "15/03/2010", "M", "0708123456", "parent@email.com"],
    ["Marie", "Kone", "EL002", "22/07/2011", "F", "0706789012", ""],
    ["Paul", "Traore", "", "05/11/2009", "M", "", ""],
  ]
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${value}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "modele_import_eleves.csv"
  link.click()
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
          <Button type="button" variant="outline" size="sm" className="h-8 rounded px-2.5 text-[11px]">
            <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
            Aide à l'import
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto rounded-md border border-[#c5c5d3] bg-white p-0 text-[#131b2e]">
        <div className="border-b border-[#c5c5d3]/60 px-5 py-4 pr-12 sm:px-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight text-[#131b2e]">
              Importer une liste d'élèves
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-[#515f74]">
              Préparez un tableau avec les informations des élèves, puis utilisez-le dans l'outil d'importation.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[#131b2e]">Avant de commencer</h3>
            <div className="flex items-start gap-3 border-l-2 border-[#264191] bg-[#f5f7ff] px-3 py-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-[#264191]" />
              <div className="text-sm leading-5 text-[#303746]">
                <p className="font-medium text-[#131b2e]">Téléchargez le modèle CSV ci-dessous.</p>
                <p>Ouvrez-le avec Excel ou un tableur, remplacez les exemples par vos élèves, puis enregistrez le fichier au format CSV.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-[#131b2e]">Les informations à renseigner</h3>
            <p className="mb-3 text-sm leading-5 text-[#515f74]">
              Seuls le prénom et le nom sont obligatoires. Les autres informations peuvent être ajoutées si vous les connaissez.
            </p>
            <div className="overflow-x-auto border border-[#c5c5d3]/70">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-[#f2f3ff] text-[#303746]">
                  <tr>
                    <th className="border-b border-[#c5c5d3]/70 px-3 py-2.5 font-semibold">Nom de colonne</th>
                    <th className="border-b border-[#c5c5d3]/70 px-3 py-2.5 font-semibold">À remplir ?</th>
                    <th className="border-b border-[#c5c5d3]/70 px-3 py-2.5 font-semibold">Exemple</th>
                    <th className="border-b border-[#c5c5d3]/70 px-3 py-2.5 font-semibold">Explication</th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMNS.map((column, index) => (
                    <tr key={column.header} className={index % 2 === 0 ? "bg-white" : "bg-[#fafbff]"}>
                      <td className="border-b border-[#c5c5d3]/40 px-3 py-2.5 font-mono font-medium text-[#264191]">{column.header}</td>
                      <td className="border-b border-[#c5c5d3]/40 px-3 py-2.5">
                        <span className={column.required ? "font-semibold text-[#9a3412]" : "text-[#515f74]"}>
                          {column.required ? "Obligatoire" : "Facultatif"}
                        </span>
                      </td>
                      <td className="border-b border-[#c5c5d3]/40 px-3 py-2.5 font-mono text-[#303746]">{column.example}</td>
                      <td className="border-b border-[#c5c5d3]/40 px-3 py-2.5 leading-5 text-[#515f74]">{column.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-[#131b2e]">Comment procéder ?</h3>
            <ol className="space-y-3">
              {[
                ["Téléchargez le modèle", "Cliquez sur « Télécharger le modèle CSV » en bas de cette fenêtre."],
                ["Remplissez le tableau", "Une ligne correspond à un élève. Ne supprimez pas la première ligne qui contient les noms des colonnes."],
                ["Séparez les classes", "L'import s'applique à une classe à la fois : préparez un fichier distinct pour chaque classe."],
                ["Lancez l'importation", "Dans l'outil d'import, choisissez le fichier, puis vérifiez la classe et les paramètres demandés avant de confirmer."],
              ].map(([title, description], index) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dce1ff] text-xs font-semibold text-[#264191]">{index + 1}</span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-[#131b2e]">{title}</p>
                    <p className="mt-0.5 text-sm leading-5 text-[#515f74]">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-t border-[#c5c5d3]/60 pt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#131b2e]">
              <Info className="h-4 w-4 text-[#264191]" />
              À vérifier avant l'import
            </h3>
            <ul className="space-y-2 text-sm text-[#515f74]">
              {[
                "Chaque élève a un prénom et un nom.",
                "Les dates de naissance utilisent le format JJ/MM/AAAA.",
                "Le fichier ne contient pas de lignes vides inutiles.",
                "Les élèves du fichier appartiennent tous à la même classe.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#28734b]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#c5c5d3]/60 bg-[#fafbff] px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
          <Button type="button" variant="outline" className="h-9 rounded border-[#c5c5d3] text-[#303746]" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          <Button type="button" className="h-9 rounded bg-[#1e3a8a] text-white hover:bg-[#00236f]" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger le modèle CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
