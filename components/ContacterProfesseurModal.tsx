"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, Contact } from "@/types/models"
import { Send, Mail, Phone, MessageSquare, Calendar, CheckCircle } from "lucide-react"

interface ContacterProfesseurModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
  onSuccess?: () => void
}

export function ContacterProfesseurModal({ isOpen, onClose, enseignant, onSuccess }: ContacterProfesseurModalProps) {
  const [typeContact, setTypeContact] = useState<Contact["type"]>("email")
  const [sujet, setSujet] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [historiqueContacts, setHistoriqueContacts] = useState<Contact[]>([])

  const handleSubmit = async () => {
    if (!enseignant || !message.trim()) return

    setLoading(true)
    try {
      const contact = await serviceEnseignants.contacterEnseignant({
        enseignantId: enseignant.id,
        type: typeContact,
        sujet: sujet || undefined,
        message: message.trim(),
        statut: "envoye"
      })

      setSuccess(true)
      onSuccess?.()

      // TODO: Implémenter la récupération de l'historique des contacts
      // const contacts = serviceEnseignants.obtenirHistoriqueContacts(enseignant.id)

      setTimeout(() => {
        setSuccess(false)
        onClose()
        // Réinitialiser le formulaire
        setTypeContact("email")
        setSujet("")
        setMessage("")
      }, 2000)
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTypeContact("email")
    setSujet("")
    setMessage("")
    setSuccess(false)
    onClose()
  }

  const getIconeTypeContact = (type: Contact["type"]) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />
      case "telephone": return <Phone className="h-4 w-4" />
      case "sms": return <MessageSquare className="h-4 w-4" />
      case "reunion": return <Calendar className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  const getLabelTypeContact = (type: Contact["type"]) => {
    switch (type) {
      case "email": return "Email"
      case "telephone": return "Téléphone"
      case "sms": return "SMS"
      case "reunion": return "Réunion"
      default: return "Email"
    }
  }

  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Contacter le professeur
            <Badge variant="secondary">{enseignant.prenom} {enseignant.nom}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informations de contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{enseignant.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{enseignant.telephone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire de contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Nouveau message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="typeContact">Type de contact</Label>
                <Select value={typeContact} onValueChange={(value: Contact["type"]) => setTypeContact(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="telephone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </div>
                    </SelectItem>
                    <SelectItem value="reunion">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Demande de réunion
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sujet">Sujet (optionnel)</Label>
                <Input
                  id="sujet"
                  placeholder="Objet du message"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Votre message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Historique des contacts récents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Historique des contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {historiqueContacts.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun contact récent</p>
                ) : (
                  historiqueContacts.slice(0, 3).map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {getIconeTypeContact(contact.type)}
                        <span className="text-sm">{contact.sujet || "Message"}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(contact.dateEnvoi).toLocaleDateString("fr-FR")}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
            {loading ? (
              "Envoi en cours..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Message de succès */}
        {success && (
          <div className="absolute inset-0 bg-green-50 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Message envoyé avec succès !
              </h3>
              <p className="text-green-600">
                Le message a été envoyé à {enseignant.prenom} {enseignant.nom}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
