import { Badge } from "@/components/ui/badge"
import { FolderTree, GraduationCap, Building2 } from "lucide-react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import type { AcademicStructureCycle } from "@/lib/supabase/types"

interface AcademicStructureTreeProps {
  data: AcademicStructureCycle[]
  isLoading?: boolean
  error?: string | null
}

function formatCycleName(name: string) {
  // Certains anciens libellés ont un préfixe technique "svg" qui ne doit pas
  // apparaître dans l'interface utilisateur.
  return name.replace(/^svg(?=[A-ZÀ-ÖØ-Þ])/, "")
}

export function AcademicStructureTree({ data, isLoading = false, error = null }: AcademicStructureTreeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-[#515f74]">
        <FolderTree className="h-4 w-4 animate-pulse" />
        Chargement de la structure académique…
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="flex items-center gap-2 py-2 text-xs text-destructive">
        <Building2 className="h-4 w-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-[#515f74]">
        <FolderTree className="h-4 w-4 shrink-0" />
        Aucun cycle créé. Ajoutez un cycle, puis ses niveaux et ses classes.
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((cycle) => {
        const levels = cycle.grade_levels ?? []
        const classCount = levels.reduce((total, level) => total + (level.school_classes?.length ?? 0), 0)

        return (
          <AccordionItem
            key={cycle.id}
            value={cycle.id}
            className="min-w-0 border border-[#d9deea] bg-white px-2.5"
          >
            <AccordionTrigger className="gap-2 py-2 text-left hover:no-underline [&>svg]:h-3.5 [&>svg]:w-3.5">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <FolderTree className="h-4 w-4 shrink-0 text-[#365b91]" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#17243b]">
                  {formatCycleName(cycle.name)}
                </span>
                <span className="shrink-0 text-[10px] text-[#68758b]">
                  {levels.length} niv. · {classCount} cl.
                </span>
              </span>
            </AccordionTrigger>

            <AccordionContent className="pb-2 pt-0">
              {levels.length === 0 ? (
                <p className="border-t border-[#edf0f5] py-2 text-[11px] text-[#68758b]">
                  Aucun niveau associé.
                </p>
              ) : (
                <div className="divide-y divide-[#edf0f5] border-t border-[#edf0f5]">
                  {levels.map((level) => (
                    <div key={level.id} className="flex items-start gap-2 py-2">
                      <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#68758b]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[#26354d]">{level.name}</p>
                        {level.school_classes?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {level.school_classes.map((schoolClass) => (
                              <Badge
                                key={schoolClass.id}
                                variant="secondary"
                                className="h-5 rounded-sm border border-[#e1e7f0] bg-[#f7f9fc] px-1.5 text-[10px] font-normal text-[#34445d]"
                              >
                                {schoolClass.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-0.5 text-[10px] text-[#8993a4]">Aucune classe</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
