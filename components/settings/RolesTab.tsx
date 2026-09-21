"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Shield, Check, Trash2 } from "lucide-react"
import { useRoles, type RoleWithPermissions } from "@/hooks/useRoles"
import { useEstablishment } from "@/hooks/useEstablishment"
import { useAuthentification } from "@/providers/authentification.provider"

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'students', label: 'Élèves' },
  { id: 'enrollments', label: 'Inscriptions' },
  { id: 'classes', label: 'Classes' },
  { id: 'teachers', label: 'Enseignants' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'schedule', label: 'Emploi du temps' },
  { id: 'notes', label: 'Notes' },
  { id: 'evaluation', label: 'Évaluations' },
  { id: 'attendance', label: 'Absences & Présences' },
  { id: 'finance', label: 'Comptabilité & Paiements' },
  { id: 'documents', label: 'Documents & Dossiers' },
  { id: 'communication', label: 'Communication' },
  { id: 'events', label: 'Événements' },
  { id: 'demandes', label: 'Demandes' },
  { id: 'technical', label: 'Service technique' },
  { id: 'structure', label: 'Structure académique' },
  { id: 'settings', label: 'Paramètres généraux' },
  { id: 'roles.manage', label: 'Gestion des rôles' },
  { id: 'users.manage', label: 'Gestion des comptes' }
]

export default function RolesTab() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null
  const { roles, isLoading, error, addRole, editRole, removeRole, getRoleUsageCount } = useRoles(establishmentId)
  
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    permissions: [] as string[]
  })

  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})

  // Load usage counts for displayed roles
  useState(() => {
    // We could load usage counts in a batch or when roles load. 
    // To keep it simple, we just assume 0 for now and fetch on demand when trying to delete, 
    // or we fetch them all if needed. For UI purposes, it's better to fetch them in the hook, 
    // but the backend might not return them by default. Let's do a quick count load.
  })

  const handleOpenForm = (role?: RoleWithPermissions) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        name: role.role.name,
        description: role.role.description || "",
        isActive: role.role.is_active,
        permissions: role.permissions.map(p => p.permission)
      })
    } else {
      setEditingRole(null)
      setFormData({
        name: "",
        description: "",
        isActive: true,
        permissions: []
      })
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRole(null)
  }

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      alert("Le nom du rôle est obligatoire.")
      return
    }

    try {
      if (editingRole) {
        if (editingRole.role.name === 'Administrateur' && !formData.isActive) {
          if (!confirm("Attention : vous êtes sur le point de désactiver un rôle Administrateur. Êtes-vous sûr ?")) return
        }
        await editRole(editingRole.role.id, formData.name, formData.description, formData.isActive, formData.permissions)
        alert("Rôle modifié.")
      } else {
        await addRole(formData.name, formData.description, formData.permissions)
        alert("Rôle créé.")
      }
      handleCloseForm()
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue")
    }
  }

  const handleDelete = async (role: RoleWithPermissions) => {
    if (role.role.name === 'Administrateur' || role.role.is_system) {
      alert("Ce rôle système ne peut pas être supprimé.")
      return
    }

    try {
      const count = await getRoleUsageCount(role.role.id)
      if (count > 0) {
        alert(`Ce rôle est utilisé par ${count} utilisateur(s). Vous devez d'abord réattribuer ces utilisateurs.`)
        return
      }

      if (confirm(`Voulez-vous vraiment supprimer le rôle "${role.role.name}" ?`)) {
        await removeRole(role.role.id)
        alert("Rôle supprimé avec succès.")
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression")
    }
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Chargement des rôles...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editingRole ? "Modifier le rôle" : "Nouveau rôle"}</CardTitle>
          <CardDescription>Configurez les accès pour ce profil d'utilisateur</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roleName">Nom du rôle <span className="text-red-500">*</span></Label>
                <Input 
                  id="roleName" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={editingRole?.role.is_system}
                  placeholder="Ex: Secrétaire" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDesc">Description</Label>
                <Input 
                  id="roleDesc" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Gestion administrative des élèves" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-medium border-b pb-2">Accès autorisés</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {AVAILABLE_MODULES.map(module => (
                  <label key={module.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={formData.permissions.includes(module.id)}
                      onChange={() => togglePermission(module.id)}
                    />
                    <span className="text-sm text-gray-700">{module.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="form-checkbox h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">Rôle actif</span>
              </label>
              {!formData.isActive && (
                <p className="text-xs text-amber-600 ml-6">Les utilisateurs existants conserveront ce rôle, mais il ne pourra plus être attribué.</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Annuler</Button>
              <Button type="submit">{editingRole ? "Enregistrer" : "Créer le rôle"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Rôles et accès</h2>
          <p className="text-sm text-gray-500">Gérez les profils d'accès pour les membres de votre personnel.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau rôle
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((item) => (
          <Card key={item.role.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  {item.role.name}
                </CardTitle>
                {item.role.is_active ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                ) : (
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Inactif</span>
                )}
              </div>
              <CardDescription className="line-clamp-2 min-h-10 mt-1">
                {item.role.description || "Aucune description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex justify-between border-b pb-1">
                  <span>Accès :</span>
                  <span className="font-medium">{item.permissions.length} modules</span>
                </p>
                {item.role.is_system && (
                  <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-2 inline-block">Rôle système</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2 justify-end border-t mt-auto p-4">
              <Button variant="outline" size="sm" onClick={() => handleOpenForm(item)}>
                <Edit className="h-4 w-4 mr-1" /> Modifier
              </Button>
              {!item.role.is_system && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
        {roles.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
            Aucun rôle n'a été créé pour le moment.
          </div>
        )}
      </div>
    </div>
  )
}
