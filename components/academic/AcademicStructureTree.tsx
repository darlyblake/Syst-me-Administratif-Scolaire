import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderTree, GraduationCap, Building2 } from "lucide-react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import type { AcademicStructureCycle } from "@/lib/supabase/types"

interface AcademicStructureTreeProps {
  data: AcademicStructureCycle[]
  isLoading?: boolean
  error?: string | null
}

export function AcademicStructureTree({ data, isLoading = false, error = null }: AcademicStructureTreeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground bg-muted/20 rounded-xl">
        <FolderTree className="h-4 w-4 animate-pulse" />
        Chargement de la structure...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
        <Building2 className="h-4 w-4" />
        {error}
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-muted/20 rounded-xl">
        <div className="flex items-center gap-2 font-medium mb-2">
          <FolderTree className="h-4 w-4" />
          Aucune structure académique
        </div>
        <p>Aucun cycle n’a encore été créé pour cet établissement.</p>
        <p>Ajoutez un cycle, puis des niveaux et des classes pour organiser la scolarité.</p>
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {data.map((cycle) => (
        <AccordionItem key={cycle.id} value={cycle.id} className="border bg-card rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2 font-medium text-base">
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                {cycle.name}
              </div>
              <Badge variant="secondary" className="font-normal text-xs">Cycle</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            <div className="space-y-3 mt-2">
              {(!cycle.grade_levels || cycle.grade_levels.length === 0) && (
                <p className="text-sm text-muted-foreground italic px-2">Aucun niveau associé à ce cycle.</p>
              )}

              {cycle.grade_levels?.map((level) => (
                <div key={level.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      {level.name}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(!level.school_classes || level.school_classes.length === 0) && (
                      <span className="text-xs text-muted-foreground px-1">Aucune classe pour ce niveau.</span>
                    )}

                    {level.school_classes?.map((schoolClass) => (
                      <Badge key={schoolClass.id} variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium bg-background border">
                        {schoolClass.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
