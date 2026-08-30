"use client"

import { useEffect, useMemo, useState } from "react"
import { MessageSquare, Send, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMessages } from "@/hooks/useMessages"
import { useUserContext } from "@/hooks/useUserContext"
import { useNotifications } from "@/hooks/useNotifications"

export default function ParentsMessagesPage() {
  const { utilisateur, primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const userId = utilisateur?.id ?? null
  const { success: showSuccess, error: showError } = useNotifications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)

  const { conversations, messages, sendMessage, markConversationRead } = useMessages(establishmentId, userId, selectedId)

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
    if (!selectedId || !userId || !draft.trim()) return

    try {
      setIsSending(true)
      await sendMessage({ conversation_id: selectedId, sender_id: userId, content: draft.trim() })
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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <MessageSquare className="h-6 w-6" />
          Messages
        </h1>
        <p className="text-slate-600">Échangez avec l&apos;école et les enseignants</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-2">
            {conversations.isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Chargement des conversations...
              </div>
            ) : conversations.data.length ? (
              conversations.data.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition ${selectedId === conversation.id ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <p className="text-sm font-semibold text-slate-800">{conversation.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {conversation.last_message_preview || "Aucun message."}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Aucune conversation n’est disponible pour le moment.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[420px] flex-col">
          {conversations.error ? (
            <CardContent className="flex flex-1 items-center justify-center text-center p-6">
              <div className="max-w-md">
                <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
                <p className="mt-4 text-sm text-slate-600">{conversations.error}</p>
                <Button className="mt-4" variant="outline" onClick={() => void conversations.refetch()}>
                  Réessayer
                </Button>
              </div>
            </CardContent>
          ) : selectedConversation ? (
            <>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">{selectedConversation.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex-1 space-y-3">
                  {messages.isLoading ? (
                    <div className="text-sm text-slate-600">Chargement des messages...</div>
                  ) : messages.data.length ? (
                    messages.data.map((message) => {
                      const isMine = message.sender_id === userId
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}>
                            {!isMine && (
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {message.sender_name || "Participant"}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p className={`mt-1 text-[10px] ${isMine ? "text-slate-300" : "text-slate-400"}`}>
                              {new Date(message.created_at).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-slate-600">Aucun message dans cette conversation.</div>
                  )}
                </div>

                <div className="flex gap-2 border-t pt-3">
                  <Textarea
                    placeholder="Écrire un message..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={() => void handleSend()} disabled={isSending || !draft.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? "Envoi..." : "Envoyer"}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-1 items-center justify-center text-slate-600">
              Sélectionnez une conversation
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
