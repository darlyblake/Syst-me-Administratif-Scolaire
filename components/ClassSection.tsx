import StudentListItem from "./StudentListItem"
import type { DonneesEleve } from "@/types/models"

interface ClassSectionProps {
  classe: string
  students: DonneesEleve[]
  onViewDetails: (student: DonneesEleve) => void
  selectedStudentIds?: string[]
  onSelectStudent?: (id: string, selected: boolean) => void
}

/**
 * Section de liste utilisée lorsqu'un écran doit regrouper des élèves par classe.
 * Le composant reste volontairement sobre : la classe est un contexte de liste,
 * pas une carte décorative.
 */
export default function ClassSection({
  classe,
  students,
  onViewDetails,
  selectedStudentIds = [],
  onSelectStudent,
}: ClassSectionProps) {
  return (
    <section aria-labelledby={`classe-${classe}`} className="border-y">
      <header className="flex items-center justify-between gap-4 border-b px-1 py-3">
        <div>
          <h2 id={`classe-${classe}`} className="font-semibold tracking-tight">
            {classe}
          </h2>
          <p className="text-sm text-muted-foreground">
            {students.length} élève{students.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <div className="divide-y">
        {students.map((student) => (
          <StudentListItem
            key={student.id}
            student={student}
            onViewDetails={onViewDetails}
            isSelected={selectedStudentIds.includes(student.id)}
            onSelect={onSelectStudent}
          />
        ))}
      </div>
    </section>
  )
}
