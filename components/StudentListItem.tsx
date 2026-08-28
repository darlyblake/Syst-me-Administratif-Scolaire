import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Camera, Eye } from "lucide-react"
import type { DonneesEleve } from "@/types/models"

interface StudentListItemProps {
  student: DonneesEleve
  onViewDetails: (student: DonneesEleve) => void
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
}

function getPaymentStatus(student: DonneesEleve) {
  if (student.modePaiement === "mensuel") {
    const months = student.moisPaiement?.length ?? 0
    if (months >= 10) return "À jour"
    if (months > 0) return "Acompte"
  }

  if (student.modePaiement === "tranches") {
    const paid = student.moisPaiement?.length ?? 0
    const total = student.nombreTranches || 3
    if (paid >= total) return "À jour"
    if (paid > 0) return "Acompte"
  }

  return "Impayé"
}

function statusClass(status: string) {
  if (status === "À jour") return "text-foreground"
  if (status === "Acompte") return "text-muted-foreground"
  return "text-destructive"
}

export default function StudentListItem({
  student,
  onViewDetails,
  isSelected = false,
  onSelect,
}: StudentListItemProps) {
  const paymentStatus = getPaymentStatus(student)
  const birthDate = new Date(student.dateNaissance)
  const formattedBirthDate = Number.isNaN(birthDate.getTime())
    ? "Date inconnue"
    : birthDate.toLocaleDateString("fr-FR")

  return (
    <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {onSelect ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(student.id, checked === true)}
            aria-label={`Sélectionner ${student.prenom} ${student.nom}`}
          />
        ) : null}

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-medium">
          {student.prenom?.charAt(0)?.toUpperCase()}
          {student.nom?.charAt(0)?.toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">
              {student.prenom} {student.nom}
            </p>
            {!student.photo ? (
              <Camera
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-label="Photo manquante"
              />
            ) : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {student.identifiant} · Né(e) le {formattedBirthDate}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 md:justify-end">
        <div className="text-left text-sm md:text-right">
          <p className={`font-medium ${statusClass(paymentStatus)}`}>{paymentStatus}</p>
          <p className="text-xs text-muted-foreground">
            {student.statut === "actif" ? "Élève actif" : "Élève inactif"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onViewDetails(student)}>
          <Eye className="mr-2 h-4 w-4" />
          Voir
        </Button>
      </div>
    </div>
  )
}
