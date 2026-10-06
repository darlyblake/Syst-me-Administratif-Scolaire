"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Users, Plus, Edit, Search, Shield, UserCheck, UserX, UserPlus, MoreVertical, UserMinus } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useStaff } from "@/hooks/useStaff"
import { useRoles } from "@/hooks/useRoles"
import type { DonneesPersonnel } from "@/types/personnel"
import { AddPersonnelDialog } from "./_components/AddPersonnelDialog"
import { EditPersonnelDialog } from "./_components/EditPersonnelDialog"
import { AccountDialog } from "./_components/AccountDialog"
import { TemporaryPasswordDialog } from "./_components/TemporaryPasswordDialog"
import Link from "next/link"

export default function PersonnelPage() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null

  // Recherche avec debounce
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Filtre actif
  const [filterStatut, setFilterStatut] = useState("tous")
  const [page, setPage] = useState(1)

  // Données
  const {
    staff,
    total,
    totalPages,
    isLoading: isLoadingStaff,
    error: staffError,
    refresh,
    deactivate,
  } = useStaff(establishmentId, { page, pageSize: 25, search: debouncedSearch })

  const { roles } = useRoles(establishmentId)

  // Dialogs ouverts
  const [showAdd, setShowAdd] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<DonneesPersonnel | null>(null)
  const [accountPersonnel, setAccountPersonnel] = useState<DonneesPersonnel | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  // Confirmation désactivation personnel (pas du compte)
  const [deactivateTarget, setDeactivateTarget] = useState<DonneesPersonnel | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  // Mapping staff → DonneesPersonnel
  const personnel = useMemo<DonneesPersonnel[]>(() =>
    staff.map((member) => ({
      id: member.id,
      nom: member.last_name,
      prenom: member.first_name,
      poste: member.position || member.department || member.role,
      email: member.email || undefined,
      roleId: member.role_id || undefined,
      accountId: member.account_id || undefined,
      accountStatus: member.account_status || undefined,
      telephone: member.phone || "",
      statut: member.status === "active"
        ? "actif"
        : member.status === "on_leave"
          ? "conge"
          : member.status === "inactive"
            ? "inactif"
            : "suspendu",
      dateEmbauche: member.hire_date || member.created_at || new Date().toISOString(),
      dateCreation: member.created_at || new Date().toISOString(),
      dateModification: member.updated_at || member.created_at || new Date().toISOString(),
    })),
  [staff])

  // Filtrage local (en complément du filtre Supabase)
  const filtered = useMemo(() => {
    return personnel.filter((p) => {
      if (filterStatut === "actifs") return p.statut === "actif"
      if (filterStatut === "inactifs") return p.statut === "inactif"
      if (filterStatut === "avec_compte") return !!p.accountStatus
      if (filterStatut === "sans_compte") return !p.accountStatus
      return true
    })
  }, [personnel, filterStatut])

  // Statistiques
  const stats = useMemo(() => ({
    total: personnel.length,
    actifs: personnel.filter((p) => p.statut === "actif").length,
    comptesActifs: personnel.filter((p) => p.accountStatus === "active").length,
    sansCompte: personnel.filter((p) => !p.accountStatus).length,
  }), [personnel])

  const isLoaded = !estEnCoursDeChargement && !isLoadingStaff

  // Désactivation personnel (pas du compte)
  const handleDesactiver = useCallback(async () => {
    if (!deactivateTarget) return
    setIsDeactivating(true)
    setDeactivateError(null)
    const ok = await deactivate(deactivateTarget.id)
    setIsDeactivating(false)
    if (ok) {
      setDeactivateTarget(null)
    } else {
      setDeactivateError("Impossible de désactiver ce membre. Veuillez réessayer.")
    }
  }, [deactivateTarget, deactivate])

  const FILTRES = [
    { id: "tous", label: "Tous" },
    { id: "actifs", label: "Actifs" },
    { id: "inactifs", label: "Inactifs" },
    { id: "avec_compte", label: "Avec compte" },
    { id: "sans_compte", label: "Sans compte" },
  ]

  return (
    <div className="w-full min-w-0">
      <div className="w-full">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {staffError ? (
              <p className="text-red-600">{staffError}</p>
            ) : (
              <p>Chargement du personnel…</p>
            )}
          </div>
        ) : (
          <>
            {/* En-tête */}
            <header className="flex flex-col gap-3 border-b border-[#c5c5d3]/45 pb-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-[23px] font-semibold leading-7 text-[#131b2e]">Personnel</h1>
                <p className="mt-0.5 text-[12px] text-[#515f74]">
                  Gérez les membres du personnel et leurs accès à l'application.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button variant="outline" asChild className="w-full sm:w-auto"><Link href="/ecole/personnel/pointage">Pointage du personnel</Link></Button>
                <Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un membre
              </Button>
              </div>
            </div>

            {/* Statistiques inline */}
            <p className="border-b border-[#c5c5d3]/45 py-2 text-[12px] text-[#515f74]">
              Total{" "}
              <span className="font-semibold text-[#131b2e]">{stats.total}</span>
              {" · "}Actifs{" "}
              <span className="font-semibold text-[#131b2e]">{stats.actifs}</span>
              {" · "}Comptes actifs{" "}
              <span className="font-semibold text-[#1d6b45]">{stats.comptesActifs}</span>
              {" · "}Sans compte{" "}
              <span className="font-semibold text-[#9a6700]">{stats.sansCompte}</span>
            </p>

            {/* Filtres + recherche */}
            <section className="flex flex-col gap-2 border border-[#c5c5d3]/60 bg-white p-2 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7b8798]" />
                <Input
                  placeholder="Rechercher par nom, poste, téléphone…"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
                  className="h-9 pl-9 rounded border-[#c5c5d3]/70 bg-white text-[12px]"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto border-b border-[#c5c5d3]/45 pb-1">
                {FILTRES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatut(f.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded whitespace-nowrap transition-colors ${
                      filterStatut === f.id
                        ? "bg-[#1e3a8a] text-white shadow-sm"
                        : "text-[#515f74] hover:text-[#131b2e]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tableau */}
            <div className="overflow-hidden border border-[#c5c5d3]/60 bg-white mb-6">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users className="h-8 w-8 mx-auto text-gray-300 mb-3" />
                  <p>Aucun membre du personnel trouvé</p>
                </div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-[#c5c5d3]/60 bg-[#f2f3ff]">
                        <tr>
                          <th className="px-4 py-3 font-medium text-[#36445a]">Nom</th>
                          <th className="px-4 py-3 font-medium text-[#36445a]">Poste</th>
                          <th className="px-4 py-3 font-medium text-[#36445a]">Téléphone</th>
                          <th className="px-4 py-3 font-medium text-[#36445a]">Statut</th>
                          <th className="px-4 py-3 font-medium text-[#36445a]">Accès</th>
                          <th className="px-4 py-3 text-right font-medium text-[#36445a]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c5c5d3]/40">
                        {filtered.map((person) => {
                          const roleName = roles.find((r) => r.role.id === person.roleId)?.role.name
                          return (
                            <tr key={person.id} className="hover:bg-[#f2f3ff] transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-[#131b2e]">{person.prenom} {person.nom}</div>
                                {person.email && <div className="text-xs text-[#7b8798]">{person.email}</div>}
                              </td>
                              <td className="px-4 py-3 text-[#36445a]">{person.poste}</td>
                              <td className="px-4 py-3 text-[#515f74]">{person.telephone || "—"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  person.statut === "actif" ? "bg-[#e8f4ed] text-[#1d6b45]"
                                  : person.statut === "inactif" ? "bg-gray-100 text-[#515f74]"
                                  : "bg-[#fff4d6] text-[#8a6500]"
                                }`}>
                                  {person.statut === "actif" ? "Actif"
                                   : person.statut === "inactif" ? "Inactif"
                                   : "En congé"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                  person.accountStatus === "active" ? "text-[#1d6b45]"
                                  : person.accountStatus === "inactive" ? "text-red-600"
                                  : person.accountStatus === "invited" ? "text-[#9a6700]"
                                  : "text-[#7b8798]"
                                }`}>
                                  {person.accountStatus === "active" && <UserCheck className="h-3.5 w-3.5" />}
                                  {person.accountStatus === "inactive" && <UserX className="h-3.5 w-3.5" />}
                                  {person.accountStatus === "active"
                                    ? `🟢 ${roleName || "Compte actif"}`
                                    : person.accountStatus === "inactive"
                                      ? "🔴 Désactivé"
                                      : person.accountStatus === "invited"
                                        ? "🟡 Invité"
                                        : "🟡 Aucun compte"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Actions</span>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setEditingPersonnel(person)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Modifier les informations
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {person.accountStatus === "active" || person.accountStatus === "invited" ? (
                                      <DropdownMenuItem onClick={() => setAccountPersonnel(person)}>
                                        <Shield className="mr-2 h-4 w-4" />
                                        Gérer le compte
                                      </DropdownMenuItem>
                                    ) : person.accountStatus === "inactive" ? (
                                      <DropdownMenuItem onClick={() => setAccountPersonnel(person)} className="text-green-600">
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Réactiver le compte
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => setAccountPersonnel(person)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Créer un compte
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => setDeactivateTarget(person)}
                                    >
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Désactiver le personnel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {filtered.map((person) => {
                      const roleName = roles.find((r) => r.role.id === person.roleId)?.role.name
                      return (
                        <div key={person.id} className="p-4 space-y-3">
                          <div>
                            <div className="font-semibold text-[#131b2e]">{person.prenom} {person.nom}</div>
                            <div className="text-sm text-gray-500">{person.poste}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Statut : </span>
                              <span className={`font-medium ${person.statut === "actif" ? "text-[#1d6b45]" : person.statut === "inactif" ? "text-[#515f74]" : "text-[#9a6700]"}`}>
                                {person.statut === "actif" ? "Actif" : person.statut === "inactif" ? "Inactif" : "En congé"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Accès : </span>
                              <span className={`font-medium ${person.accountStatus === "active" ? "text-[#1d6b45]" : person.accountStatus === "inactive" ? "text-red-600" : "text-gray-500"}`}>
                                {person.accountStatus === "active" ? (roleName || "Actif")
                                  : person.accountStatus === "inactive" ? "Désactivé"
                                  : "Aucun compte"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {!person.accountStatus ? (
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAccountPersonnel(person)}>
                                Créer un compte
                              </Button>
                            ) : person.accountStatus === "inactive" ? (
                              <Button variant="outline" size="sm" className="flex-1 text-[#1d6b45] border-green-200" onClick={() => setAccountPersonnel(person)}>
                                Réactiver
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="flex-1 text-blue-600 border-blue-200" onClick={() => setAccountPersonnel(person)}>
                                Gérer le compte
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="px-3" onClick={() => setEditingPersonnel(person)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{total} membres au total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Précédent
                  </Button>
                  <span className="px-3 py-1.5">Page {page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog : Confirmation désactivation personnel */}
      {deactivateTarget && (
        <Dialog open onOpenChange={(open) => !open && setDeactivateTarget(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Désactiver ce membre ?</DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-4">
              <p className="text-sm text-[#36445a]">
                <strong>{deactivateTarget.prenom} {deactivateTarget.nom}</strong> ne sera plus considéré comme membre actif du personnel. Son historique sera conservé.
              </p>
              {deactivateError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{deactivateError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Annuler</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={isDeactivating}
                  onClick={handleDesactiver}
                >
                  {isDeactivating ? "Désactivation…" : "Désactiver"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog : Ajouter */}
      {showAdd && establishmentId && (
        <AddPersonnelDialog
          establishmentId={establishmentId}
          roles={roles}
          onClose={() => setShowAdd(false)}
          onSuccess={(pwd) => { refresh(); if (pwd) setTemporaryPassword(pwd) }}
        />
      )}

      {/* Dialog : Modifier */}
      {editingPersonnel && (
        <EditPersonnelDialog
          personnel={editingPersonnel}
          onClose={() => setEditingPersonnel(null)}
          onSuccess={() => { setEditingPersonnel(null); refresh() }}
        />
      )}

      {/* Dialog : Compte */}
      {accountPersonnel && establishmentId && (
        <AccountDialog
          personnel={accountPersonnel}
          roles={roles}
          establishmentId={establishmentId}
          onClose={() => setAccountPersonnel(null)}
          onPersonnelChange={(updated) => setAccountPersonnel(updated)}
          onSuccess={(pwd) => { setAccountPersonnel(null); refresh(); if (pwd) setTemporaryPassword(pwd) }}
        />
      )}


      {/* Dialog : Mot de passe temporaire */}
      {temporaryPassword && (
        <TemporaryPasswordDialog
          password={temporaryPassword}
          onClose={() => setTemporaryPassword(null)}
        />
      )}
    </div>
  )
}
