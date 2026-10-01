"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRoles } from "@/hooks/useRoles"
import { createTeacherAccount, attachExistingTeacher } from "@/services/teacher-account.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { KeyRound, Link2, UserPlus } from "lucide-react"

interface CreerEnseignantModalProps { isOpen: boolean; onClose: () => void; onSuccess?: () => void }

const initialForm = {
  nom: "", prenom: "", email: "", telephone: "", roleId: "",
  matiere: "", dateEmbauche: "", password: "",
}

export function CreerEnseignantModal({ isOpen, onClose, onSuccess }: CreerEnseignantModalProps) {
  const { etablissementActif } = useAuthentification()
  const { roles, isLoading: rolesLoading } = useRoles(etablissementActif?.id ?? null)
  const [mode, setMode] = useState<"create" | "attach">("create")
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  const teacherRole = useMemo(() => {
    const active = roles.filter(item => item.role.active)
    return active.find(item => /enseign|prof/i.test(item.role.name)) ?? active[0]
  }, [roles])

  useEffect(() => {
    if (teacherRole && !form.roleId) setForm(current => ({ ...current, roleId: teacherRole.role.id }))
  }, [teacherRole, form.roleId])

  const update = (field: keyof typeof initialForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setError(null)
  }

  const reset = () => {
    setForm(initialForm)
    setMode("create")
    setError(null)
    setTemporaryPassword(null)
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!etablissementActif?.id) return setError("Aucun établissement actif sélectionné.")
    if (!form.email.trim() || !form.roleId) return setError("L'e-mail et le rôle sont obligatoires.")
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Veuillez saisir une adresse e-mail valide.")

    if (mode === "create" && (!form.nom.trim() || !form.prenom.trim())) {
      return setError("Le nom et le prénom sont obligatoires pour créer un nouveau compte.")
    }

    setLoading(true)
    setError(null)
    setTemporaryPassword(null)

    try {
      const result = mode === "create"
        ? await createTeacherAccount({
            establishmentId: etablissementActif.id,
            firstName: form.prenom.trim(),
            lastName: form.nom.trim(),
            email: form.email.trim(),
            phone: form.telephone.trim(),
            specialty: form.matiere.trim(),
            roleId: form.roleId,
            password: form.password.trim() || undefined,
          })
        : await attachExistingTeacher({
            establishmentId: etablissementActif.id,
            email: form.email.trim(),
            roleId: form.roleId,
          })

      if (mode === "create" && result.temporary_password) {
        setTemporaryPassword(result.temporary_password)
        return
      }

      onSuccess?.()
      reset()
      onClose()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Impossible de terminer l'opération."
      const messages: Record<string, string> = {
        teacher_account_already_exists: "Un compte enseignant existe déjà avec cet e-mail. Utilisez « Rattacher un compte existant ».",
        teacher_account_not_found: "Aucun compte enseignant trouvé avec cet e-mail.",
        teacher_already_attached: "Cet enseignant est déjà rattaché à cet établissement.",
        role_not_found: "Le rôle sélectionné n'est plus disponible dans cet établissement.",
        email_already_used: "Cet e-mail est déjà utilisé par un autre compte.",
      }
      setError(messages[message] ?? message)
    } finally {
      setLoading(false)
    }
  }

  if (temporaryPassword) {
    return (
      <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compte enseignant créé</DialogTitle>
            <DialogDescription>Le compte est maintenant rattaché à cet établissement.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Mot de passe temporaire</p>
            <p className="mt-1 select-all font-mono text-lg font-semibold">{temporaryPassword}</p>
            <p className="mt-3 text-xs text-muted-foreground">Copiez-le et transmettez-le à l'enseignant. Il pourra ensuite utiliser la procédure de changement de mot de passe.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => { onSuccess?.(); reset(); onClose() }}>Terminer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajouter un enseignant</DialogTitle>
          <DialogDescription>Créez un nouveau compte ou rattachez un enseignant qui possède déjà un compte.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-md border bg-muted/30 p-1">
          <button type="button" onClick={() => { setMode("create"); setError(null) }} className={`rounded px-3 py-2 text-sm font-medium ${mode === "create" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            <UserPlus className="mr-2 inline h-4 w-4" />Nouveau compte
          </button>
          <button type="button" onClick={() => { setMode("attach"); setError(null) }} className={`rounded px-3 py-2 text-sm font-medium ${mode === "attach" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            <Link2 className="mr-2 inline h-4 w-4" />Rattacher un compte
          </button>
        </div>

        <div className="space-y-4 py-3">
          {mode === "create" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" id="enseignant-nom" required value={form.nom} onChange={value => update("nom", value)} />
              <Field label="Prénom" id="enseignant-prenom" required value={form.prenom} onChange={value => update("prenom", value)} />
              <Field label="Téléphone" id="enseignant-telephone" value={form.telephone} onChange={value => update("telephone", value)} />
              <Field label="Date d'embauche" id="enseignant-date-embauche" type="date" value={form.dateEmbauche} onChange={value => update("dateEmbauche", value)} />
              <Field label="Matière principale" id="enseignant-matiere" placeholder="Mathématiques" value={form.matiere} onChange={value => update("matiere", value)} />
              <Field label="Mot de passe (facultatif)" id="enseignant-password" type="password" value={form.password} onChange={value => update("password", value)} />
            </div>
          )}

          <Field label="E-mail du compte" id="enseignant-email" required type="email" value={form.email} onChange={value => update("email", value)} placeholder="enseignant@exemple.com" />

          <div className="space-y-2">
            <Label>Rôle dans cet établissement</Label>
            <Select value={form.roleId} onValueChange={value => update("roleId", value)} disabled={rolesLoading || !roles.length}>
              <SelectTrigger><SelectValue placeholder={rolesLoading ? "Chargement des rôles…" : "Choisir un rôle"} /></SelectTrigger>
              <SelectContent>
                {roles.filter(item => item.role.active).map(item => (
                  <SelectItem key={item.role.id} value={item.role.id}>{item.role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "attach" && (
            <p className="text-sm text-muted-foreground">
              Le compte reste le même. Seul son rattachement à <strong>{etablissementActif?.name}</strong> est ajouté.
            </p>
          )}

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Annuler</Button>
          <Button onClick={() => void handleSubmit()} disabled={loading || rolesLoading || !form.roleId}>
            {loading ? "Enregistrement…" : mode === "create" ? <><KeyRound className="mr-2 h-4 w-4" />Créer le compte</> : <><Link2 className="mr-2 h-4 w-4" />Rattacher</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, id, value, onChange, required, type = "text", placeholder }: { label: string; id: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label><Input id={id} type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></div>
}
