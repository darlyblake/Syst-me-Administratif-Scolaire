"use client"

import { useEffect, useMemo, useState } from "react"
import { MessageSquare, Send, AlertCircle, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMessages } from "@/hooks/useMessages"
import { useUserContext } from "@/hooks/useUserContext"
import { useNotifications } from "@/hooks/useNotifications"

export default function ParentsMessagesPage() {
  const { utilisateur } = useUserContext()
  const userId = utilisateur?.id ?? null
  const { success: showSuccess, error: showError } = useNotifications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)

  // A parent may have children in more than one establishment. Passing null makes
  // the service resolve only conversations where this authenticated user is a participant.
  const { conversations, messages, sendMessage, markConversationRead } = useMessages(null, userId, selectedId)

  useEffect(() => {
    if (!conversations.data.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !conversations.data.some((conversation) => conversation.id === selectedId)) {
      setSelectedId(conversations.data[0].id)
    }
  }, [conversations.data, selectedId])

  useEffect(() => {
    if (!selectedId || !userId) return
    void markConversationRead(selectedId, userId)
  }, [selectedId, userId, markConversationRead])

  const selectedConversation = useMemo(
    () => conversations.data.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations.data, selectedId],
  )

  const handleSend = async () => {
    const content = draft.trim()
    if (!selectedId || !userId || !content || content.length > 4000) return

    try {
      setIsSending(true)
      await sendMessage({ conversation_id: selectedId, sender_id: userId, content })
      setDraft("")
      showSuccess("Message envoyé.")
    } catch (error) {
      showError(error instanceof Error ? error.message : "Impossible d’envoyer le message.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-terre/10 pb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-terre sm:text-3xl">
          <MessageSquare className="h-6 w-6" />
          Messages
        </h1>
        <p className="mt-1 text-sm text-pierre">Échangez avec les établissements et les enseignants auxquels vous avez accès.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="border-terre/10 bg-papier">
          <CardHeader className="border-b border-terre/10 pb-3">
            <CardTitle className="text-sm font-semibold text-terre">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-2">
            {conversations.isLoading ? (
              <div className="rounded-lg bg-creme p-4 text-sm text-pierre">Chargement des conversations…</div>
            ) : conversations.data.length ? (
              conversations.data.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${selectedId === conversation.id ? "border-terre/20 bg-terre-soft/40" : "border-transparent hover:border-terre/10 hover:bg-creme"}`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-terre" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-terre">{conversation.title}</p>
                      {conversation.establishment_id && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-pierre">
                          <Building2 className="h-3 w-3" /> Établissement
                        </p>
                      )}
                      <p className="mt-1 line-clamp-2 text-xs text-pierre">
                        {conversation.last_message_preview || "Aucun message."}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-terre/15 bg-creme p-4 text-sm text-pierre">
                Aucune conversation n’est disponible pour le moment.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[520px] flex-col border-terre/10 bg-papier">
          {conversations.error ? (
            <CardContent className="flex flex-1 items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <AlertCircle className="mx-auto h-8 w-8 text-rouge-terre" />
                <p className="mt-4 text-sm text-pierre">{conversations.error}</p>
                <Button className="mt-4" variant="outline" onClick={() => void conversations.refetch()}>Réessayer</Button>
              </div>
            </CardContent>
          ) : selectedConversation ? (
            <>
              <CardHeader className="border-b border-terre/10 pb-3">
                <CardTitle className="text-base text-terre">{selectedConversation.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-4">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {messages.isLoading ? (
                    <div className="text-sm text-pierre">Chargement des messages…</div>
                  ) : messages.error ? (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{messages.error}</div>
                  ) : messages.data.length ? (
                    messages.data.map((message) => {
                      const isMine = message.sender_id === userId
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-terre text-white" : "bg-creme text-terre"}`}>
                            {!isMine && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-pierre">{message.sender_name || "Participant"}</p>}
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <p className={`mt-1 text-[10px] ${isMine ? "text-white/70" : "text-pierre"}`}>
                              {new Date(message.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-pierre">Aucun message dans cette conversation.</div>
                  )}
                </div>

                <div className="border-t border-terre/10 pt-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Textarea
                      placeholder="Écrire un message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
                      rows={3}
                      maxLength={4000}
                      className="min-h-[80px] resize-none"
                    />
                    <Button className="sm:self-end" onClick={() => void handleSend()} disabled={isSending || !draft.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      {isSending ? "Envoi…" : "Envoyer"}
                    </Button>
                  </div>
                  <p className="mt-1 text-right text-[11px] text-pierre">{draft.length}/4000</p>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <MessageSquare className="mx-auto h-9 w-9 text-terre/40" />
                <p className="mt-3 font-medium text-terre">Sélectionnez une conversation</p>
                <p className="mt-1 text-sm text-pierre">Les conversations sont limitées aux échanges auxquels votre compte participe.</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
