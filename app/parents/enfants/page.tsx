"use client"

import { useMemo } from "react"
import Link from "next/link"
import { GraduationCap, MapPin, Phone, Mail, CreditCard, FileText, UserX } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { serviceParents } from "@/services/parents.service"

function formatMontant(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function ParentsEnfantsPage() {
  const enfants = useMemo(() => serviceParents.obtenirEnfants(), [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-terre">Mes enfants</h1>
        <p className="text-pierre">
          {enfants.length} enfant{enfants.length > 1 ? "s" : ""} scolarisé
          {enfants.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {enfants.map((enfant) => {
          const paye = serviceParents.totalPaye(enfant.id)
          const reste = serviceParents.resteAPayer(enfant.id)
          const options = Object.entries(enfant.optionsSupplementaires)
            .filter(([, v]) => v)
            .map(([k]) => {
              const labels: Record<string, string> = {
                tenueScolaire: "Tenue scolaire",
                carteScolaire: "Carte scolaire",
                cooperative: "Coopérative",
                tenueEPS: "Tenue EPS",
                assurance: "Assurance",
              }
              return labels[k] ?? k
            })

          return (
            <Card key={enfant.id} className="overflow-hidden border-terre/10">
              <div className="bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-papier/20 text-xl font-bold">
                    {enfant.prenom[0]}
                    {enfant.nom[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {enfant.prenom} {enfant.nom}
                    </h2>
                    <p className="flex items-center gap-1 text-sm text-white/90">
                      <GraduationCap className="h-4 w-4" />
                      Classe {enfant.classe} · {enfant.typeInscription}
                    </p>
                  </div>
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    {enfant.statut}
                  </Badge>
                  <Badge variant="outline">ID : {enfant.identifiant}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-pierre">Date de naissance</p>
                    <p className="font-medium">{formatDate(enfant.dateNaissance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-pierre">Lieu de naissance</p>
                    <p className="font-medium">{enfant.lieuNaissance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-pierre">Inscription</p>
                    <p className="font-medium">{formatDate(enfant.dateInscription)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-pierre">Moyenne générale</p>
                    <p className="font-medium text-terre">
                      {enfant.moyenneGenerale?.toFixed(1) ?? "—"} / 20
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-pierre">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {enfant.adresse}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {enfant.contactParent}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {enfant.informationsContact.email}
                  </p>
                </div>

                {options.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase text-pierre">Options</p>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((o) => (
                        <Badge key={o} variant="secondary" className="font-normal">
                          {o}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-creme p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-pierre">Payé</span>
                    <span className="font-semibold text-emerald-700">{formatMontant(paye)}</span>
                  </div>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-pierre">Reste à payer</span>
                    <span className="font-semibold text-amber-700">{formatMontant(reste)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-terre-soft0"
                      style={{
                        width: `${Math.min(100, (paye / (paye + reste || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/parents/notes?eleve=${enfant.id}`}>
                      <FileText className="mr-1.5 h-4 w-4" />
                      Notes
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/parents/absences?eleve=${enfant.id}`}>
                      <UserX className="mr-1.5 h-4 w-4" />
                      Absences
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/parents/paiements?eleve=${enfant.id}`}>
                      <CreditCard className="mr-1.5 h-4 w-4" />
                      Paiements
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
