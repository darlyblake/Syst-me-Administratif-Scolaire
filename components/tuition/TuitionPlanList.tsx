import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AcademicStructureCycle, TuitionPlan } from "@/lib/supabase/types"

interface TuitionPlanListProps {
  data: AcademicStructureCycle[]
  plans: Map<string, TuitionPlan>
  isLoading?: boolean
  error?: string | null
  onEdit: (levelId: string, levelName: string) => void
}

const modeLabels: Record<string, string> = {
  monthly: "Mensuel",
  installments: "Par tranches",
  single: "Paiement unique",
}

export function TuitionPlanList({ data, plans, isLoading = false, error = null, onEdit }: TuitionPlanListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chargement de la scolarité...</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Récupération des tarifs et des niveaux en cours.
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Impossible de charger la scolarité</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aucune structure académique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>La structure académique n’a pas encore été configurée.</p>
          <p>Créez un cycle et des niveaux pour définir les tarifs.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((cycle) => (
        <Card key={cycle.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{cycle.name}</CardTitle>
              <Badge variant="secondary">Cycle</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Niveau</th>
                    <th className="py-2 pr-4 font-medium">Frais d’inscription</th>
                    <th className="py-2 pr-4 font-medium">Scolarité annuelle</th>
                    <th className="py-2 pr-4 font-medium">Mode de paiement</th>
                    <th className="py-2 pr-4 font-medium">Échéances</th>
                    <th className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cycle.grade_levels?.map((level) => {
                    const plan = plans.get(level.id)

                    return (
                      <tr key={level.id} className="border-b last:border-b-0 align-top">
                        <td className="py-3 pr-4 font-medium">{level.name}</td>
                        <td className="py-3 pr-4">{plan ? `${plan.registration_fee.toLocaleString("fr-FR")} FCFA` : "-"}</td>
                        <td className="py-3 pr-4">{plan ? `${plan.annual_amount.toLocaleString("fr-FR")} FCFA` : "-"}</td>
                        <td className="py-3 pr-4">{plan ? modeLabels[plan.payment_mode] ?? plan.payment_mode : "Non défini"}</td>
                        <td className="py-3 pr-4">{plan?.installment_count ? `${plan.installment_count} tranches` : "-"}</td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => onEdit(level.id, level.name)}>
                            Modifier
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
