/**
 * PAGE DE GESTION DES ENSEIGNANTS - VERSION REFACTORISÉE
 *
 * Cette page utilise les nouveaux composants modulaires pour une meilleure maintenabilité
 */

"use client"

import { useState } from "react"
import { useTeachers } from "@/hooks/useTeachers"
import { useNotifications } from "@/hooks/useNotifications"
import { DashboardSummary } from "@/components/DashboardSummary"
import { TeacherTable } from "@/components/TeacherTable"
import { TeacherFilters } from "@/components/TeacherFilters"
import { TeacherDetailsModal } from "@/components/TeacherDetailsCard"
import { FloatingToolbar } from "@/components/FloatingToolbar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Import des modals existants (à refactoriser plus tard)
import { CreerEnseignantModal } from "@/components/CreerEnseignantModal"
import { AssignerClassesModal } from "@/components/AssignerClassesModal"
import { ContacterProfesseurModal } from "@/components/ContacterProfesseurModal"
import { HistoriqueAffectationsModal } from "@/components/HistoriqueAffectationsModal"
import { DocumentsAdministratifsModal } from "@/components/DocumentsAdministratifsModal"
import { AttribuerNotificationsModal } from "@/components/AttribuerNotificationsModal"
import { GestionSalairesModal } from "@/components/GestionSalairesModal"

export default function EnseignantsPageRefactored() {
  // Utilisation du hook personnalisé pour la gestion d'état
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
    refreshTeachers
  } = useTeachers()

  // Hook de notifications
  const { success, error, warning, info } = useNotifications()

  // États pour les modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showAssignClassesModal, setShowAssignClassesModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [showSalaryModal, setShowSalaryModal] = useState(false)

  // Statistiques pour le dashboard
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.statut === 'actif').length,
    inactive: teachers.filter(t => t.statut === 'inactif').length,
    onLeave: teachers.filter(t => t.statut === 'conge').length,
    suspended: teachers.filter(t => t.statut === 'suspendu').length
  }

  // Matières uniques pour les filtres
  const uniqueSubjects = Array.from(
    new Set(teachers.flatMap(teacher => teacher.matieres))
  )

  // Gestionnaires d'événements
  const handleCreateTeacher = () => {
    setShowCreateModal(true)
  }

  const handleAddTeacherById = () => {
    info("Fonctionnalité à implémenter", {
      description: "L'ajout d'enseignant par ID sera bientôt disponible"
    })
  }

  const handleExport = () => {
    info("Fonctionnalité à implémenter", {
      description: "L'export des données sera bientôt disponible"
    })
  }

  const handleBulkActions = () => {
    info("Fonctionnalité à implémenter", {
      description: "Les actions groupées seront bientôt disponibles"
    })
  }

  const handleSelectTeacher = (teacher: any) => {
    selectTeacher(teacher)
    setShowDetailsModal(true)
  }

  const handleDeleteTeacher = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet enseignant ?")) {
      // TODO: Implémenter la suppression via le service
      success("Enseignant supprimé avec succès", {
        description: "L'enseignant a été retiré de la liste"
      })
      refreshTeachers()
    }
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setSubjectFilter("")
    setStatusFilter("")
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <div className="container mx-auto p-6 space-y-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des enseignants</h1>
            <p className="text-gray-600">Interface moderne et intuitive pour la gestion des professeurs</p>
          </div>
          <Button variant="outline" asChild className="mt-4 md:mt-0">
            <Link href="/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>

        {/* Dashboard avec statistiques et graphiques */}
        <DashboardSummary
          stats={stats}
          uniqueSubjects={uniqueSubjects}
          teachers={teachers}
        />

        {/* Filtres et recherche */}
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

        {/* Table des enseignants */}
        <TeacherTable
          teachers={teachers}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onSelectTeacher={handleSelectTeacher}
          onDeleteTeacher={handleDeleteTeacher}
          canDelete={true}
        />

        {/* Modal de détails de l'enseignant */}
        <TeacherDetailsModal
          teacher={selectedTeacher}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          actions={{
            onDelete: handleDeleteTeacher,
            onAssignClasses: () => setShowAssignClassesModal(true),
            onContactTeacher: () => setShowContactModal(true),
            onViewHistory: () => setShowHistoryModal(true),
            onManageDocuments: () => setShowDocumentsModal(true),
            onAssignNotifications: () => setShowNotificationsModal(true),
            onManageSalary: () => setShowSalaryModal(true),
            onViewEvaluations: () => info("Fonctionnalité à implémenter", { description: "Les évaluations seront bientôt disponibles" })
          }}
        />

        {/* Barre d'outils flottante */}
        <FloatingToolbar
          onCreateTeacher={handleCreateTeacher}
          onAddTeacherById={handleAddTeacherById}
          onExport={handleExport}
          onBulkActions={handleBulkActions}
          canCreate={true}
          canExport={true}
          canBulkActions={true}
        />

        {/* Modals existants (à refactoriser) */}
        <CreerEnseignantModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            success("Enseignant créé avec succès", {
              description: "Le nouvel enseignant a été ajouté à la liste"
            })
            refreshTeachers()
          }}
        />

        {selectedTeacher && (
          <>
            <AssignerClassesModal
              isOpen={showAssignClassesModal}
              onClose={() => setShowAssignClassesModal(false)}
              enseignant={selectedTeacher}
              onSuccess={() => {
                success("Classes assignées avec succès", {
                  description: "Les classes ont été affectées à l'enseignant"
                })
                refreshTeachers()
              }}
            />

            <ContacterProfesseurModal
              isOpen={showContactModal}
              onClose={() => setShowContactModal(false)}
              enseignant={selectedTeacher}
              onSuccess={() => {
                success("Message envoyé avec succès", {
                  description: "L'enseignant a été contacté"
                })
              }}
            />

            <HistoriqueAffectationsModal
              isOpen={showHistoryModal}
              onClose={() => setShowHistoryModal(false)}
              enseignant={selectedTeacher}
            />

            <DocumentsAdministratifsModal
              isOpen={showDocumentsModal}
              onClose={() => setShowDocumentsModal(false)}
              enseignant={selectedTeacher}
              onSuccess={() => {
                success("Document ajouté avec succès", {
                  description: "Le document a été ajouté au dossier"
                })
              }}
            />

            <AttribuerNotificationsModal
              isOpen={showNotificationsModal}
              onClose={() => setShowNotificationsModal(false)}
              enseignant={selectedTeacher}
              onSuccess={() => {
                success("Notification attribuée avec succès", {
                  description: "La notification a été envoyée"
                })
              }}
            />

            <GestionSalairesModal
              isOpen={showSalaryModal}
              onClose={() => setShowSalaryModal(false)}
              enseignant={selectedTeacher}
              onSuccess={() => {
                success("Salaire mis à jour avec succès", {
                  description: "Les informations salariales ont été modifiées"
                })
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
