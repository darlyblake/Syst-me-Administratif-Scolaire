/**
 * PAGE DE GESTION DES ENSEIGNANTS - VERSION REFACTORISÉE
 *
 * La page consomme uniquement les hooks du module. Les règles de rôle sont
 * centralisées dans usePermissions / types/authorization.
 */
"use client"

import { useState } from "react"
import { useTeachers } from "@/hooks/useTeachers"
import { usePermissions } from "@/hooks/usePermissions"
import { useNotifications } from "@/hooks/useNotifications"
import { DashboardSummary } from "@/components/DashboardSummary"
import { TeacherTable } from "@/components/TeacherTable"
import { TeacherFilters } from "@/components/TeacherFilters"
import { TeacherDetailsModal } from "@/components/TeacherDetailsModal"
import { FloatingToolbar } from "@/components/FloatingToolbar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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
    teachers,
    loading,
    selectedTeacher,
    filters,
    currentPage,
    totalPages,
    setSearchQuery,
    setSubjectFilter,
    setStatusFilter,
    setCurrentPage,
    selectTeacher,
    refreshTeachers,
    permissions,
    deactivateTeacher,
    deleteTeacher,
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
    active: teachers.filter(t => t.statut === "actif").length,
    inactive: teachers.filter(t => t.statut === "inactif").length,
    onLeave: teachers.filter(t => t.statut === "conge").length,
    suspended: teachers.filter(t => t.statut === "suspendu").length
  }

  const uniqueSubjects = Array.from(new Set(teachers.flatMap(teacher => teacher.matieres)))

  const handleCreateTeacher = () => {
    if (!permissions.canCreate) {
      error("Accès refusé", { description: "Vous n'avez pas l'autorisation de créer un enseignant." })
      return
    }
    setShowCreateModal(true)
  }

  const handleAddTeacherById = () => {
    info("Fonctionnalité à implémenter", { description: "L'ajout d'enseignant par ID sera bientôt disponible." })
  }

  const handleExport = () => {
    info("Fonctionnalité à implémenter", { description: "L'export des données sera bientôt disponible." })
  }

  const handleBulkActions = () => {
    info("Fonctionnalité à implémenter", { description: "Les actions groupées seront bientôt disponibles." })
  }

  const handleSelectTeacher = (teacher: (typeof teachers)[number]) => {
    selectTeacher(teacher)
    setShowDetailsModal(true)
  }

  const handleDeleteTeacher = async (id: string) => {
    // On privilégie la désactivation afin de préserver l'historique scolaire.
    if (!permissions.canEdit) {
      error("Accès refusé", { description: "Vous ne pouvez pas modifier cet enseignant." })
      return
    }

    const teacher = teachers.find(item => item.id === id)
    if (!teacher) return

    if (teacher.statut !== "inactif") {
      const ok = await deactivateTeacher(id)
      if (ok) success("Enseignant désactivé", { description: "Son historique est conservé." })
      return
    }

    if (!permissions.canDelete) {
      error("Suppression non autorisée", { description: "Seul un administrateur autorisé peut supprimer définitivement un dossier." })
      return
    }

    const ok = await deleteTeacher(id)
    if (ok) success("Enseignant supprimé", { description: "Le dossier a été retiré." })
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setSubjectFilter("")
    setStatusFilter("")
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des enseignants</h1>
            <p className="text-gray-600">Gestion des dossiers, affectations et suivi des enseignants</p>
          </div>
          <Button variant="outline" asChild className="mt-4 md:mt-0">
            <Link href="/tableau-bord"><ArrowLeft className="h-4 w-4 mr-2" />Retour au tableau de bord</Link>
          </Button>
        </div>

        <DashboardSummary stats={stats} uniqueSubjects={uniqueSubjects} teachers={teachers} />

        <TeacherFilters
          searchQuery={filters.searchQuery}
          subjectFilter={filters.subjectFilter}
          statusFilter={filters.statusFilter}
          uniqueSubjects={uniqueSubjects}
          onSearchChange={setSearchQuery}
          onSubjectChange={setSubjectFilter}
          onStatusChange={setStatusFilter}
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
            onViewEvaluations: () => info("Fonctionnalité à implémenter", { description: "Les évaluations seront bientôt disponibles." })
          }}
        />

        <FloatingToolbar
          onCreateTeacher={handleCreateTeacher}
          onAddTeacherById={handleAddTeacherById}
          onExport={handleExport}
          onBulkActions={handleBulkActions}
          canCreate={permissions.canCreate}
          canExport={permissions.canView}
          canBulkActions={permissions.canEdit}
        />

        {permissions.canCreate && (
          <CreerEnseignantModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { success("Enseignant créé avec succès", { description: "Le nouvel enseignant a été ajouté à la liste." }); void refreshTeachers() }}
          />
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
    </div>
  )
}
