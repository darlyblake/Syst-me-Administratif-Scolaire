import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, Camera, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { DonneesEleve } from "@/types/models"

interface StudentListItemProps {
  student: DonneesEleve
  onViewDetails: (student: DonneesEleve) => void
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
}

export default function StudentListItem({ student, onViewDetails, isSelected, onSelect }: StudentListItemProps) {
  const getPaymentStatus = () => {
    if (!student.modePaiement) return { label: "Impayé", variant: "destructive" as const, color: "bg-rouge-terre" }
    if (student.modePaiement === "mensuel") {
      if (student.moisPaiement && student.moisPaiement.length === 10) return { label: "À jour", variant: "default" as const, color: "bg-jardin" }
      if (student.moisPaiement && student.moisPaiement.length > 0) return { label: "Acompte", variant: "secondary" as const, color: "bg-soleil" }
      return { label: "Impayé", variant: "destructive" as const, color: "bg-rouge-terre" }
    }
    if (student.modePaiement === "tranches") {
      const totalTranches = student.nombreTranches || 3
      if (student.moisPaiement && student.moisPaiement.length === totalTranches) return { label: "À jour", variant: "default" as const, color: "bg-jardin" }
      if (student.moisPaiement && student.moisPaiement.length > 0) return { label: "Acompte", variant: "secondary" as const, color: "bg-soleil" }
      return { label: "Impayé", variant: "destructive" as const, color: "bg-rouge-terre" }
    }
    return { label: "Impayé", variant: "destructive" as const, color: "bg-rouge-terre" }
  }

  const paymentStatus = getPaymentStatus()
  const hasPhoto = !!student.photo

  return (
    <Card className="bg-papier shadow-soft hover:shadow-soft-lg transition border-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {onSelect && (
                <Checkbox
                  checked={isSelected || false}
                  onCheckedChange={(checked) => onSelect(student.id, checked as boolean)}
                  className="rounded-xl"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-terre">
                    {student.prenom} {student.nom}
                  </h3>
                  {!hasPhoto && (
                    <Camera className="h-3 w-3 text-soleil" title="Photo manquante" />
                  )}
                </div>
                <p className="text-sm text-pierre">
                  ID: {student.identifiant} • <span className="font-medium text-terre">Classe: {student.classe}</span>
                </p>
                <p className="text-xs text-pierre">
                  Né(e) le: {new Date(student.dateNaissance).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge 
              className={`${paymentStatus.color} text-white rounded-full`}
              variant="outline"
            >
              {paymentStatus.label}
            </Badge>
            <Badge 
              className={student.statut === "actif" ? "bg-jardin text-white rounded-full" : "bg-pierre text-white rounded-full"}
              variant="outline"
            >
              {student.statut}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(student)}
              className="rounded-xl"
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
