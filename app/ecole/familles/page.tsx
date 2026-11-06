"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Search, Users, Pencil, UserPlus, UserMinus, RefreshCw, X, Check, CalendarDays, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useUserContext } from "@/hooks/useUserContext"

type Family = {
  id: string
  display_name: string | null
  family_code: string
  created_at: string
  member_count: number
}
type FamilyMember = {
  id: string
  student_id: string
  relationship: "frere" | "soeur" | "autre"
  first_name: string
  last_name: string
  student_number: string | null
}
type StudentResult = {
  id: string
  first_name: string
  last_name: string
  student_number: string | null
}

export default function FamillesPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [families, setFamilies] = useState<Family[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState("")
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [familySearch, setFamilySearch] = useState("")
  const [newFamilyName, setNewFamilyName] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [studentLoading, setStudentLoading] = useState(false)
  const [relationship, setRelationship] = useState<"frere" | "soeur" | "autre">("autre")

  const selectedFamily = families.find((family) => family.id === selectedFamilyId) ?? null

  const loadFamilies = useCallback(async () => {
    if (!establishmentId) { setFamilies([]); setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabaseBrowser.from("school_families")
        .select("id,display_name,family_code,created_at")
        .eq("establishment_id", establishmentId).order("display_name", { ascending: true })
      if (error) throw error
      const rows = data ?? []
      const ids = rows.map((row: any) => row.id)
      const { data: links, error: linksError } = ids.length
        ? await supabaseBrowser.from("student_family_members").select("family_id,student_id")
            .eq("establishment_id", establishmentId).eq("active", true).in("family_id", ids)
        : { data: [], error: null }
      if (linksError) throw linksError
      setFamilies(rows.map((row: any) => ({
        ...row, member_count: (links ?? []).filter((link: any) => link.family_id === row.id).length,
      })))
      if (selectedFamilyId && !ids.includes(selectedFamilyId)) setSelectedFamilyId("")
    } catch (error) {
      console.error("Chargement des familles impossible", error)
      toast.error("Impossible de charger les familles.")
    } finally { setLoading(false) }
  }, [establishmentId, selectedFamilyId])

  const loadMembers = useCallback(async () => {
    if (!establishmentId || !selectedFamilyId) { setMembers([]); return }
    try {
      const { data: links, error } = await supabaseBrowser.from("student_family_members")
        .select("id,student_id,relationship").eq("establishment_id", establishmentId)
        .eq("family_id", selectedFamilyId).eq("active", true)
      if (error) throw error
      const ids = (links ?? []).map((link: any) => link.student_id)
      const { data: students, error: studentsError } = ids.length
        ? await supabaseBrowser.from("students").select("id,first_name,last_name,student_number")
            .eq("establishment_id", establishmentId).in("id", ids)
        : { data: [], error: null }
      if (studentsError) throw studentsError
      setMembers((links ?? []).flatMap((link: any) => {
        const student = (students ?? []).find((row: any) => row.id === link.student_id)
        return student ? [{ ...link, ...student }] : []
      }))
    } catch (error) {
      console.error("Chargement des membres impossible", error)
      toast.error("Impossible de charger les membres de cette famille.")
    }
  }, [establishmentId, selectedFamilyId])

  useEffect(() => { void loadFamilies() }, [loadFamilies])
  useEffect(() => { void loadMembers() }, [loadMembers])

  const closeFamilyModal = () => {
    setSelectedFamilyId("")
    setMembers([])
    setStudentResults([])
    setStudentSearch("")
    setIsEditing(false)
  }

  const createFamily = async () => {
    const name = newFamilyName.trim()
    if (!establishmentId || !name) { toast.error("Saisissez le nom de la famille."); return }
    setSaving(true)
    try {
      const { data, error } = await supabaseBrowser.from("school_families")
        .insert({ establishment_id: establishmentId, display_name: name }).select("id").single()
      if (error) throw error
      setNewFamilyName("")
      setShowCreate(false)
      await loadFamilies()
      setSelectedFamilyId(data.id)
      toast.success("Famille créée. Vous pouvez maintenant y rattacher des élèves.")
    } catch (error: any) {
      console.error("Création de famille impossible", error)
      toast.error(error?.message || "La création de la famille a échoué.")
    } finally { setSaving(false) }
  }

  const renameFamily = async () => {
    const name = editingName.trim()
    if (!establishmentId || !selectedFamilyId || !name) return
    setSaving(true)
    try {
      const { error } = await supabaseBrowser.from("school_families")
        .update({ display_name: name, updated_at: new Date().toISOString() })
        .eq("id", selectedFamilyId).eq("establishment_id", establishmentId)
      if (error) throw error
      setIsEditing(false)
      await loadFamilies()
      toast.success("Nom de famille mis à jour.")
    } catch (error: any) {
      toast.error(error?.message || "Impossible de modifier le nom.")
    } finally { setSaving(false) }
  }

  const searchStudents = async () => {
    const term = studentSearch.trim()
    if (!establishmentId || term.length < 2) { toast.error("Saisissez au moins 2 caractères."); return }
    setStudentLoading(true)
    try {
      const { data, error } = await supabaseBrowser.from("students")
        .select("id,first_name,last_name,student_number").eq("establishment_id", establishmentId)
        .eq("active", true)
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_number.ilike.%${term}%`)
        .order("last_name").limit(15)
      if (error) throw error
      const alreadyLinked = new Set(members.map((member) => member.student_id))
      setStudentResults((data ?? []).filter((student: any) => !alreadyLinked.has(student.id)))
    } catch (error) {
      console.error("Recherche d'élèves impossible", error)
      toast.error("Impossible de rechercher les élèves.")
    } finally { setStudentLoading(false) }
  }

  const addStudent = async (student: StudentResult) => {
    if (!establishmentId || !selectedFamilyId) return
    setSaving(true)
    try {
      const { data: existing, error: existingError } = await supabaseBrowser.from("student_family_members")
        .select("id,family_id").eq("establishment_id", establishmentId)
        .eq("student_id", student.id).eq("active", true).maybeSingle()
      if (existingError) throw existingError
      if (existing && existing.family_id !== selectedFamilyId) {
        toast.error("Cet élève appartient déjà à une autre famille. Retirez d'abord son ancien rattachement.")
        return
      }
      const { error } = await supabaseBrowser.from("student_family_members").upsert({
        establishment_id: establishmentId, family_id: selectedFamilyId,
        student_id: student.id, relationship, active: true, verified_at: new Date().toISOString(),
      }, { onConflict: "family_id,student_id" })
      if (error) throw error
      toast.success("Élève rattaché à la famille.")
      setStudentResults((rows) => rows.filter((row) => row.id !== student.id))
      await loadMembers()
      await loadFamilies()
    } catch (error: any) {
      console.error("Rattachement impossible", error)
      toast.error(error?.message || "Impossible de rattacher cet élève.")
    } finally { setSaving(false) }
  }

  const removeStudent = async (member: FamilyMember) => {
    if (!establishmentId || !window.confirm(`Retirer ${member.first_name} ${member.last_name} de cette famille ?`)) return
    setSaving(true)
    try {
      const { error } = await supabaseBrowser.from("student_family_members")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", member.id).eq("establishment_id", establishmentId)
      if (error) throw error
      toast.success("Élève retiré de la famille.")
      await loadMembers()
      await loadFamilies()
    } catch (error: any) {
      toast.error(error?.message || "Impossible de retirer cet élève.")
    } finally { setSaving(false) }
  }

  const filteredFamilies = families.filter((family) =>
    (family.display_name ?? "").toLowerCase().includes(familySearch.trim().toLowerCase()) ||
    family.family_code.toLowerCase().includes(familySearch.trim().toLowerCase())
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 text-[#131b2e]">
      <header className="flex flex-col gap-3 border-b border-[#c5c5d3]/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Familles</h1>
          <p className="mt-1 text-sm text-[#515f74]">Retrouvez et gérez les familles des élèves de l’établissement.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-[#1e3a8a] hover:bg-[#00236f]">
          <Plus className="h-4 w-4" /> Créer une famille
        </Button>
      </header>

      <section className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7b8190]" />
          <Input value={familySearch} onChange={(event) => setFamilySearch(event.target.value)}
            placeholder="Rechercher par nom ou code de famille…" className="h-10 pl-9" />
        </div>
        <div className="flex items-center justify-between text-sm text-[#64748b]">
          <span>{filteredFamilies.length} famille(s)</span>
          <Button variant="ghost" size="sm" onClick={() => void loadFamilies()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </Button>
        </div>

        <div className="overflow-hidden border border-[#d7dce5] bg-white">
          {loading ? <p className="p-6 text-sm text-[#64748b]">Chargement des familles…</p> :
            filteredFamilies.length ? (
              <div className="divide-y divide-[#e5e7eb]">
                {filteredFamilies.map((family) => (
                  <button key={family.id} type="button"
                    onClick={() => { setSelectedFamilyId(family.id); setStudentResults([]); setStudentSearch("") }}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-[#f4f7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1e3a8a] sm:px-5">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf2ff] text-[#1e3a8a]"><Users className="h-5 w-5" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{family.display_name || "Famille sans nom"}</span>
                        <span className="mt-0.5 block text-xs text-[#64748b]">Code : {family.family_code}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-[#64748b]">
                      <span>{family.member_count} élève(s)</span><span aria-hidden="true" className="text-lg">›</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <Users className="mb-3 h-9 w-9 text-[#94a3b8]" />
                <p className="font-medium">{familySearch ? "Aucun résultat" : "Aucune famille enregistrée"}</p>
                <p className="mt-1 max-w-sm text-sm text-[#64748b]">{familySearch ? "Essayez avec un autre nom ou code." : "Créez une famille pour pouvoir y rattacher les élèves concernés."}</p>
                {!familySearch && <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2 bg-[#1e3a8a]"><Plus className="h-4 w-4" /> Créer une famille</Button>}
              </div>
            )}
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-family-title" className="w-full max-w-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
              <h2 id="create-family-title" className="font-semibold">Créer une famille</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Fermer" className="rounded p-1.5 text-[#64748b] hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="family-name">Nom de la famille</Label>
                <Input id="family-name" autoFocus value={newFamilyName} onChange={(event) => setNewFamilyName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void createFamily() }}
                  placeholder="Ex. Famille MOUEMBANZA" maxLength={120} />
              </div>
              <p className="text-xs text-[#64748b]">La famille peut être créée avant l’inscription des enfants. Vous pourrez rattacher les élèves ensuite.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
                <Button onClick={createFamily} disabled={saving || !newFamilyName.trim()} className="gap-2 bg-[#1e3a8a] hover:bg-[#00236f]"><Check className="h-4 w-4" /> Créer</Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedFamily && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-0 sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeFamilyModal() }}>
          <section role="dialog" aria-modal="true" aria-labelledby="family-detail-title"
            className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[92dvh]">
            <div className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input aria-label="Nom de la famille" value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={120} className="max-w-sm" />
                    <Button size="sm" onClick={renameFamily} disabled={saving || !editingName.trim()} className="bg-[#1e3a8a]">Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
                  </div>
                ) : (
                  <>
                    <h2 id="family-detail-title" className="truncate text-lg font-semibold">{selectedFamily.display_name || "Famille sans nom"}</h2>
                    <p className="mt-1 text-xs text-[#64748b]">Informations et membres de la famille</p>
                  </>
                )}
              </div>
              <button type="button" onClick={closeFamilyModal} aria-label="Fermer la fenêtre" className="ml-3 rounded p-1.5 text-[#64748b] hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 border-b border-[#e5e7eb] pb-5 sm:grid-cols-3">
                <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-[#64748b]" /><div><p className="text-[11px] uppercase tracking-wide text-[#64748b]">Code famille</p><p className="text-sm font-medium">{selectedFamily.family_code}</p></div></div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#64748b]" /><div><p className="text-[11px] uppercase tracking-wide text-[#64748b]">Membres</p><p className="text-sm font-medium">{members.length} élève(s)</p></div></div>
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#64748b]" /><div><p className="text-[11px] uppercase tracking-wide text-[#64748b]">Créée le</p><p className="text-sm font-medium">{selectedFamily.created_at ? new Date(selectedFamily.created_at).toLocaleDateString("fr-FR") : "—"}</p></div></div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Membres de la famille</h3>
                  <Button size="sm" variant="outline" onClick={() => { setEditingName(selectedFamily.display_name ?? ""); setIsEditing(true) }} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Modifier le nom</Button>
                </div>
                {members.length ? (
                  <div className="divide-y divide-[#e5e7eb] border-y border-[#e5e7eb]">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0"><p className="truncate text-sm font-medium">{member.first_name} {member.last_name}</p><p className="text-xs text-[#64748b]">Matricule : {member.student_number || "—"} · {member.relationship === "frere" ? "Frère" : member.relationship === "soeur" ? "Sœur" : "Autre"}</p></div>
                        <Button size="sm" variant="ghost" disabled={saving} onClick={() => void removeStudent(member)} className="shrink-0 gap-1 text-[#9f2929] hover:bg-[#fff0f0]"><UserMinus className="h-4 w-4" /><span className="hidden sm:inline">Retirer</span></Button>
                      </div>
                    ))}
                  </div>
                ) : <p className="border-y border-dashed border-[#d7dce5] py-5 text-sm text-[#64748b]">Aucun élève n’est encore rattaché à cette famille.</p>}
              </div>

              <div className="border-t border-[#e5e7eb] pt-4">
                <h3 className="mb-3 font-semibold">Ajouter un élève déjà inscrit</h3>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_145px_auto]">
                  <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void searchStudents() }} placeholder="Nom, prénom ou matricule…" />
                  <select value={relationship} onChange={(event) => setRelationship(event.target.value as typeof relationship)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="autre">Lien : autre</option><option value="frere">Frère</option><option value="soeur">Sœur</option>
                  </select>
                  <Button onClick={searchStudents} disabled={studentLoading || studentSearch.trim().length < 2} variant="outline" className="gap-2"><Search className="h-4 w-4" /> Rechercher</Button>
                </div>
                {studentLoading && <p className="mt-3 text-sm text-[#64748b]">Recherche…</p>}
                {studentResults.length > 0 && <div className="mt-3 divide-y border">
                  {studentResults.map((student) => (
                    <div key={student.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{student.first_name} {student.last_name}</p><p className="text-xs text-[#64748b]">Matricule : {student.student_number || "—"}</p></div>
                      <Button size="sm" disabled={saving} onClick={() => void addStudent(student)} className="gap-1 bg-[#1e3a8a]"><UserPlus className="h-3.5 w-3.5" /> Ajouter</Button>
                    </div>
                  ))}
                </div>}
                {!studentLoading && studentSearch.trim().length >= 2 && studentResults.length === 0 && <p className="mt-2 text-xs text-[#64748b]">Aucun nouvel élève dans les résultats. Lancez une recherche.</p>}
              </div>
            </div>
            <div className="flex justify-between border-t border-[#e5e7eb] px-5 py-3 sm:px-6">
              <Button variant="ghost" size="sm" onClick={() => { void loadFamilies(); void loadMembers() }} className="gap-2"><RefreshCw className="h-3.5 w-3.5" /> Actualiser</Button>
              <Button variant="outline" onClick={closeFamilyModal}>Fermer</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
