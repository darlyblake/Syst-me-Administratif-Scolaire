"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Building2, MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMessages } from "@/hooks/useMessages"
import { useUserContext } from "@/hooks/useUserContext"
import { useNotifications } from "@/hooks/useNotifications"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentsMessagesPage() {
  const { utilisateur } = useUserContext()
  const userId = utilisateur?.id ?? null
  const { success: showSuccess, error: showError } = useNotifications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)

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
    <div className="space-y-7">
      <ParentPageHeader
        eyebrow="Communication"
        title="Messages"
        description="Échangez avec les établissements et les enseignants auxquels vous avez accès."
      />

      {conversations.error ? (
        <div className="flex flex-col gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{conversations.error}</span>
          <Button variant="outline" size="sm" onClick={() => void conversations.refetch()}>Réessayer</Button>
        </div>
      ) : conversations.isLoading ? (
        <div className="border-y border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">Chargement des conversations…</div>
      ) : !conversations.data.length ? (
        <ParentEmptyState
          title="Aucune conversation"
          description="Les conversations apparaîtront ici lorsque l’établissement vous aura ajouté à un échange."
        />
      ) : (
        <section className="grid min-h-[560px] border-y border-slate-200 bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
              <p className="mt-1 text-xs text-slate-500">{conversations.data.length} échange{conversations.data.length > 1 ? "s" : ""}</p>
            </div>
            <div className="divide-y divide-slate-200">
              {conversations.data.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full border-l-2 px-5 py-4 text-left transition-colors ${
                    selectedId === conversation.id
                      ? "border-terre bg-slate-50"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{conversation.title}</p>
                      {conversation.establishment_id && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <Building2 className="h-3 w-3" /> Établissement
                        </p>
                      )}
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {conversation.last_message_preview || "Aucun message."}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-h-[500px] min-w-0 flex-col">
            {selectedConversation ? (
              <>
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-base font-semibold text-slate-900">{selectedConversation.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">Conversation sécurisée de votre espace parent.</p>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  {messages.isLoading ? (
                    <p className="text-sm text-slate-500">Chargement des messages…</p>
                  ) : messages.error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{messages.error}</div>
                  ) : messages.data.length ? (
                    messages.data.map((message) => {
                      const isMine = message.sender_id === userId
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] border px-4 py-3 text-sm ${
                            isMine
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-900"
                          }`}>
                            {!isMine && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{message.sender_name || "Participant"}</p>}
                            <p className="whitespace-pre-wrap break-words leading-6">{message.content}</p>
                            <p className={`mt-2 text-[10px] ${isMine ? "text-white/70" : "text-slate-500"}`}>
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
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Aucun message dans cette conversation.</div>
                  )}
                </div>

                <div className="border-t border-slate-200 px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <Textarea
                        placeholder="Écrire un message…"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
                        rows={3}
                        maxLength={4000}
                        className="min-h-[80px] resize-none"
                      />
                      <p className="mt-1 text-right text-[11px] text-slate-500">{draft.length}/4000</p>
                    </div>
                    <Button onClick={() => void handleSend()} disabled={isSending || !draft.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      {isSending ? "Envoi…" : "Envoyer"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
                <div>
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-900/40" />
                  <p className="mt-3 font-medium text-slate-900">Sélectionnez une conversation</p>
                  <p className="mt-1 text-sm text-slate-500">Choisissez un échange dans la liste.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
