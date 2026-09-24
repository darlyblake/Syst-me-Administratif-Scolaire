"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, UserCheck, UserX, AlertTriangle } from "lucide-react"
import { manageStaffAccount, getEstablishmentMemberId } from "@/lib/supabase/services/staff.service"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { DonneesPersonnel } from "@/types/personnel"
import type { RoleWithPermissions } from "@/hooks/useRoles"

interface AccountDialogProps {
  personnel: DonneesPersonnel
  roles: RoleWithPermissions[]
  establishmentId: string
  onClose: () => void
  onSuccess: (temporaryPassword?: string) => void
  onPersonnelChange: (updated: DonneesPersonnel) => void
}

type DialogStep = "main" | "confirm_disable" | "confirm_reset"

const ACCOUNT_ERROR_MESSAGES: Record<string, string> = {
  member_account_link_failed: "Impossible de lier le compte utilisateur à ce membre du personnel.",
  member_not_found: "Ce membre du personnel est introuvable.",
  user_not_found: "L'utilisateur associé à ce compte est introuvable.",
  email_exists: "Cette adresse e-mail est déjà utilisée par un autre compte.",
  account_already_exists: "Ce membre possède déjà un compte utilisateur.",
  role_not_found: "Le rôle d'accès sélectionné est introuvable.",
  unauthorized: "Vous n'avez pas l'autorisation d'effectuer cette action.",
};

function formatAccountError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const normalized = raw.toLowerCase().trim();
  const code = Object.keys(ACCOUNT_ERROR_MESSAGES).find((key) => normalized.includes(key));
  if (code) return ACCOUNT_ERROR_MESSAGES[code];
  return "Une erreur est survenue lors de la gestion du compte utilisateur. Veuillez réessayer.";
}

export function AccountDialog({
  personnel,
  roles,
  establishmentId,
  onClose,
  onSuccess,
  onPersonnelChange,
}: AccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<DialogStep>("main")
  const [localEmail, setLocalEmail] = useState(personnel.email || "")
  const [localRoleId, setLocalRoleId] = useState(personnel.roleId || "")

  const hasAccount = !!personnel.accountStatus
  const isActive = personnel.accountStatus === "active" || personnel.accountStatus === "invited"

  const handleAction = async (action: "create_user" | "reset_password" | "disable_user" | "enable_user") => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (action === "create_user") {
        if (!localEmail) { setError("L'adresse email est obligatoire."); setIsSubmitting(false); return }
        if (!localRoleId) { setError("Veuillez sélectionner un rôle d'accès."); setIsSubmitting(false); return }

        const { data, error: fnError } = await supabaseBrowser.functions.invoke("manage-school-user-account", {
          body: {
            action: "create_user",
            staff_id: personnel.id,
            email: localEmail,
            first_name: personnel.prenom,
            last_name: personnel.nom,
            role_id: localRoleId,
            establishment_id: establishmentId,
          },
        })

        if (fnError) {
          let detail = fnError.message
          try {
            const parsed = typeof fnError === "object" && "context" in fnError
              ? await (fnError as any).context?.json?.()
              : null
            if (parsed?.message) detail = parsed.message
            else if (parsed?.error) detail = parsed.error
          } catch { /* silencieux */ }
          throw new Error(detail)
        }

        onClose()
        onSuccess(data?.temporary_password)
        return
      }

      // Pour reset/disable/enable → besoin du member_id
      if (!personnel.accountId) {
        setError("Aucun compte utilisateur associé à ce membre.")
        setIsSubmitting(false)
        return
      }

      const memberId = await getEstablishmentMemberId(personnel.accountId, establishmentId)
      if (!memberId) {
        setError("Impossible de trouver ce membre dans la base de données.")
        setIsSubmitting(false)
        return
      }

      const responseData = await manageStaffAccount(memberId, action, {
        email: personnel.email,
        firstName: personnel.prenom,
        lastName: personnel.nom,
        roleId: personnel.roleId,
        establishmentId,
      })

      onClose()
      if (action === "reset_password" && responseData?.temporary_password) {
        onSuccess(responseData.temporary_password)
      } else {
        onSuccess()
      }
    } catch (e: unknown) {
      setError(formatAccountError(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {!hasAccount ? "Créer un compte utilisateur" : "Gestion du compte"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-5">
          {/* Identité */}
          <div className="text-sm space-y-0.5">
            <p className="font-medium text-gray-900">{personnel.prenom} {personnel.nom}</p>
            <p className="text-gray-500">{personnel.poste}</p>
          </div>

          <hr className="border-gray-100" />

          {/* Erreur inline */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Création de compte */}
          {!hasAccount && step === "main" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-email">Email *</Label>
                <Input
                  id="acc-email"
                  type="email"
                  value={localEmail}
                  onChange={(e) => setLocalEmail(e.target.value)}
                  placeholder="prenom.nom@ecole.cd"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-role">Rôle d'accès *</Label>
                <select
                  id="acc-role"
                  className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                  value={localRoleId}
                  onChange={(e) => setLocalRoleId(e.target.value)}
                >
                  <option value="">Sélectionner un rôle</option>
                  {roles.filter((r) => r.role.active).map((r) => (
                    <option key={r.role.id} value={r.role.id}>{r.role.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  Définit les accès de cet utilisateur dans l'application — distinct du poste occupé.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Annuler</Button>
                <Button
                  onClick={() => handleAction("create_user")}
                  disabled={isSubmitting || !localEmail || !localRoleId}
                >
                  {isSubmitting ? "Création en cours…" : "Créer le compte"}
                </Button>
              </div>
            </div>
          )}

          {/* Gestion compte existant */}
          {hasAccount && step === "main" && (
            <div className="space-y-3">
              {isActive ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                    disabled={isSubmitting}
                    onClick={() => setStep("confirm_reset")}
                  >
                    <Key className="mr-2 h-4 w-4 text-blue-500" />
                    Réinitialiser le mot de passe
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    disabled={isSubmitting}
                    onClick={() => setStep("confirm_disable")}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Désactiver le compte
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start font-normal text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                  disabled={isSubmitting}
                  onClick={() => handleAction("enable_user")}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Réactiver le compte
                </Button>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={onClose}>Fermer</Button>
              </div>
            </div>
          )}

          {/* Confirmation désactivation */}
          {step === "confirm_disable" && (
            <div className="space-y-4">
              <div className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded px-3 py-3">
                <p className="font-medium text-amber-800 mb-1">Désactiver le compte ?</p>
                <p><strong>{personnel.prenom} {personnel.nom}</strong> ne pourra plus accéder à l'application jusqu'à la réactivation de son compte.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("main")}>Annuler</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={isSubmitting}
                  onClick={() => handleAction("disable_user")}
                >
                  {isSubmitting ? "Désactivation…" : "Désactiver le compte"}
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation reset mot de passe */}
          {step === "confirm_reset" && (
            <div className="space-y-4">
              <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded px-3 py-3">
                <p className="font-medium text-blue-800 mb-1">Réinitialiser le mot de passe ?</p>
                <p>Un nouveau mot de passe temporaire sera généré pour <strong>{personnel.prenom} {personnel.nom}</strong>. L'utilisateur devra le changer à sa prochaine connexion.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("main")}>Annuler</Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() => handleAction("reset_password")}
                >
                  {isSubmitting ? "Réinitialisation…" : "Générer un nouveau mot de passe"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
