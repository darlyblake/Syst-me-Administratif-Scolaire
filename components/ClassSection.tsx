import StudentListItem from "./StudentListItem"
import type { DonneesEleve } from "@/types/models"

interface ClassSectionProps {
  classe: string
  students: DonneesEleve[]
  onViewDetails: (student: DonneesEleve) => void
  selectedStudentIds?: string[]
  onSelectStudent?: (id: string, selected: boolean) => void
}

/** Section de liste utilisée lorsqu'un écran doit regrouper des élèves par classe. */
export default function ClassSection({ classe, students, onViewDetails, selectedStudentIds = [], onSelectStudent }: ClassSectionProps) {
  return (
    <section aria-labelledby={`classe-${classe}`} className="w-full min-w-0 border-y overflow-hidden">
      <header className="flex min-w-0 flex-col gap-1 border-b px-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 id={`classe-${classe}`} className="truncate font-semibold tracking-tight">{classe}</h2>
          <p className="text-sm text-muted-foreground">{students.length} élève{students.length > 1 ? "s" : ""}</p>
        </div>
      </header>
      <div className="min-w-0 divide-y">
        {students.map((student) => (
          <StudentListItem key={student.id} student={student} onViewDetails={onViewDetails} isSelected={selectedStudentIds.includes(student.id)} onSelect={onSelectStudent} />
        ))}
      </div>
    </section>
  )
}
