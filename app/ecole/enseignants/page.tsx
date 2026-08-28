"use client"

import { useState } from "react"
import { useTeachers } from "@/hooks/useTeachers"
import { usePermissions } from "@/hooks/usePermissions"
import { useNotifications } from "@/hooks/useNotifications"
import { DashboardSummary } from "@/components/DashboardSummary"
import { TeacherTable } from "@/components/TeacherTable"
import { TeacherFilters } from "@/components/TeacherFilters"
import { TeacherDetailsModal } from "@/components/TeacherDetailsModal"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { CreerEnseignantModal } from "@/components/CreerEnseignantModal"
import { AssignerClassesModal } from "@/components/AssignerClassesModal"
import { ContacterProfesseurModal } from "@/components/ContacterProfesseurModal"
import { HistoriqueAffectationsModal } from "@/components/HistoriqueAffectationsModal"
import { DocumentsAdministratifsModal } from "@/components/DocumentsAdministratifsModal"
import { AttribuerNotificationsModal } from "@/components/AttribuerNotificationsModal"
import { GestionSalairesModal } from "@/components/GestionSalairesModal"

export default function EnseignantsPageRefactored() {
  const {
    teachers, loading, selectedTeacher, filters, currentPage, totalPages,
    setSearchQuery, setSubjectFilter, setStatusFilter, setCurrentPage,
    selectTeacher, refreshTeachers, permissions, deactivateTeacher, deleteTeacher,
  } = useTeachers()
  const { can } = usePermissions()
  const { success, error, info } = useNotifications()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showAssignClassesModal, setShowAssignClassesModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [showSalaryModal, setShowSalaryModal] = useState(false)

  const stats = {
    total: teachers.length,
    active: teachers.filter((teacher) => teacher.statut === "actif").length,
    inactive: teachers.filter((teacher) => teacher.statut === "inactif").length,
    onLeave: teachers.filter((teacher) => teacher.statut === "conge").length,
    suspended: teachers.filter((teacher) => teacher.statut === "suspendu").length,
  }
  const uniqueSubjects = Array.from(new Set(teachers.flatMap((teacher) => teacher.matieres)))

  const handleCreateTeacher = () => {
    if (!permissions.canCreate) {
      error("Accès refusé", { description: "Vous n'avez pas l'autorisation de créer un enseignant." })
      return
    }
    setShowCreateModal(true)
  }

  const handleSelectTeacher = (teacher: (typeof teachers)[number]) => {
    selectTeacher(teacher)
    setShowDetailsModal(true)
  }

  const handleDeleteTeacher = async (id: string) => {
    const teacher = teachers.find((item) => item.id === id)
    if (!teacher || !permissions.canEdit) return

    const ok = await deactivateTeacher(id)
    if (ok) success("Enseignant désactivé", { description: "Le dossier et son historique sont conservés." })
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setSubjectFilter("")
    setStatusFilter("")
    setCurrentPage(1)
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-5 md:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Personnel / Enseignants</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Enseignants</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Consultez les dossiers, affectations et suivis dont vous avez besoin.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/tableau-bord"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Link>
            </Button>
            {permissions.canCreate && (
              <Button onClick={handleCreateTeacher}>
                <Plus className="h-4 w-4 mr-2" />Ajouter
              </Button>
            )}
          </div>
        </header>

        <DashboardSummary stats={stats} uniqueSubjects={uniqueSubjects} teachers={teachers} />

        <TeacherFilters
          searchQuery={filters.searchQuery}
          subjectFilter={filters.subjectFilter}
          statusFilter={filters.statusFilter}
          uniqueSubjects={uniqueSubjects}
          onSearchChange={(query) => { setSearchQuery(query); setCurrentPage(1) }}
          onSubjectChange={(subject) => { setSubjectFilter(subject); setCurrentPage(1) }}
          onStatusChange={(status) => { setStatusFilter(status); setCurrentPage(1) }}
          onResetFilters={handleResetFilters}
        />

        <TeacherTable
          teachers={teachers}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onSelectTeacher={handleSelectTeacher}
          onDeleteTeacher={handleDeleteTeacher}
          canEdit={permissions.canEdit}
          canDelete={permissions.canEdit}
        />

        <TeacherDetailsModal
          teacher={selectedTeacher}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          actions={{
            onDelete: permissions.canEdit ? handleDeleteTeacher : undefined,
            onAssignClasses: permissions.canAssign ? () => setShowAssignClassesModal(true) : undefined,
            onContactTeacher: can("documents.view") ? () => setShowContactModal(true) : undefined,
            onViewHistory: () => setShowHistoryModal(true),
            onManageDocuments: can("documents.view") ? () => setShowDocumentsModal(true) : undefined,
            onAssignNotifications: permissions.canEdit ? () => setShowNotificationsModal(true) : undefined,
            onManageSalary: can("salaires.view") ? () => setShowSalaryModal(true) : undefined,
            onViewEvaluations: () => info("Évaluations", { description: "Cette fonctionnalité sera disponible prochainement." }),
          }}
        />

        {permissions.canCreate && (
          <CreerEnseignantModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); success("Enseignant créé avec succès"); void refreshTeachers() }} />
        )}

        {selectedTeacher && (
          <>
            {permissions.canAssign && <AssignerClassesModal isOpen={showAssignClassesModal} onClose={() => setShowAssignClassesModal(false)} enseignant={selectedTeacher} onSuccess={() => { success("Classes assignées avec succès"); void refreshTeachers() }} />}
            {can("documents.view") && <ContacterProfesseurModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} enseignant={selectedTeacher} onSuccess={() => success("Message envoyé avec succès")} />}
            <HistoriqueAffectationsModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} enseignant={selectedTeacher} />
            {can("documents.view") && <DocumentsAdministratifsModal isOpen={showDocumentsModal} onClose={() => setShowDocumentsModal(false)} enseignant={selectedTeacher} onSuccess={() => success("Document ajouté avec succès")} />}
            {permissions.canEdit && <AttribuerNotificationsModal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} enseignant={selectedTeacher} onSuccess={() => success("Notification attribuée avec succès")} />}
            {can("salaires.view") && <GestionSalairesModal isOpen={showSalaryModal} onClose={() => setShowSalaryModal(false)} enseignant={selectedTeacher} onSuccess={() => { success("Salaire mis à jour avec succès"); void refreshTeachers() }} />}
          </>
        )}
      </div>
    </main>
  )
}
