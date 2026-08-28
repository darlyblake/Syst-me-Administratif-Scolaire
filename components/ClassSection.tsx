import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StudentListItem from "./StudentListItem"
import type { DonneesEleve } from "@/types/models"

interface ClassSectionProps {
  classe: string
  students: DonneesEleve[]
  onViewDetails: (student: DonneesEleve) => void
}

export default function ClassSection({ classe, students, onViewDetails }: ClassSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Classe {classe}</span>
          <Badge variant="secondary">
            {students.length} élève{students.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {students.map((student) => (
            <StudentListItem
              key={student.id}
              student={student}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
