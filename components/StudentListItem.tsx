import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye } from "lucide-react"
import type { DonneesEleve } from "@/types/models"

interface StudentListItemProps {
  student: DonneesEleve
  onViewDetails: (student: DonneesEleve) => void
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
}

export default function StudentListItem({ student, onViewDetails, isSelected, onSelect }: StudentListItemProps) {
  const getPaymentStatus = () => {
    if (!student.modePaiement) return { label: "Impayé", variant: "destructive" as const }
    if (student.modePaiement === "mensuel") {
      if (student.moisPaiement && student.moisPaiement.length === 10) return { label: "À jour", variant: "default" as const }
      if (student.moisPaiement && student.moisPaiement.length > 0) return { label: "Acompte", variant: "secondary" as const }
      return { label: "Impayé", variant: "destructive" as const }
    }
    if (student.modePaiement === "tranches") {
      const totalTranches = student.nombreTranches || 3
      if (student.moisPaiement && student.moisPaiement.length === totalTranches) return { label: "À jour", variant: "default" as const }
      if (student.moisPaiement && student.moisPaiement.length > 0) return { label: "Acompte", variant: "secondary" as const }
      return { label: "Impayé", variant: "destructive" as const }
    }
    return { label: "Impayé", variant: "destructive" as const }
  }

  const paymentStatus = getPaymentStatus()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {onSelect && (
                <Checkbox
                  checked={isSelected || false}
                  onCheckedChange={(checked) => onSelect(student.id, checked as boolean)}
                />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {student.prenom} {student.nom}
                </h3>
                <p className="text-sm text-gray-600">
                  ID: {student.identifiant} • <span className="font-semibold">Classe: {student.classe}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Né(e) le: {new Date(student.dateNaissance).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={student.statut === "actif" ? "default" : "secondary"}>
              {student.statut}
            </Badge>
            <Badge variant={paymentStatus.variant}>
              {paymentStatus.label}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(student)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Détails
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
