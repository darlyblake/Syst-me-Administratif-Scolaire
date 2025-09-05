import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import type { DonneesEleve } from "@/types/models"

interface StudentListItemProps {
  student: DonneesEleve
  onViewDetails: (student: DonneesEleve) => void
}

export default function StudentListItem({ student, onViewDetails }: StudentListItemProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {student.prenom} {student.nom}
                </h3>
                <p className="text-sm text-gray-600">
                  ID: {student.identifiant} • Classe: {student.classe}
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
