"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

interface TemporaryPasswordDialogProps {
  password: string
  onClose: () => void
}

export function TemporaryPasswordDialog({ password, onClose }: TemporaryPasswordDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Mot de passe temporaire</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Le mot de passe temporaire permet à l'utilisateur de retrouver l'accès à son compte. Transmettez-le par un canal sûr et invitez-le à le remplacer après sa connexion.
          </p>

          <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <code className="font-mono text-lg font-bold text-gray-900 tracking-wider">
              {password}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={copied ? "text-green-600 border-green-300" : ""}
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 mr-1.5" />Copié</>
              ) : (
                <><Copy className="h-3.5 w-3.5 mr-1.5" />Copier</>
              )}
            </Button>
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
            Ce mot de passe ne sera affiché qu'une seule fois. Copiez-le et transmettez-le directement à l'utilisateur.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
