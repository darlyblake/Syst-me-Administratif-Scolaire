"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, MessageSquare, Search, AlertCircle, Send, Plus } from "lucide-react"
import Link from "next/link"
import { useMessages } from "@/hooks/useMessages"
import { useUserContext } from "@/hooks/useUserContext"
import { useNotifications } from "@/hooks/useNotifications"

export default function MessagerieParents() {
  const { utilisateur, primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const userId = utilisateur?.id ?? null
  const { error: showError, success: showSuccess } = useNotifications()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newParticipants, setNewParticipants] = useState("")
  const [isSending, setIsSending] = useState(false)

  const { conversations, messages, createConversation, sendMessage, markConversationRead } = useMessages(establishmentId, userId, selectedConversationId)

  useEffect(() => {
    if (!conversations.data.length) {
      setSelectedConversationId(null)
      return
    }

    if (!selectedConversationId || !conversations.data.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(conversations.data[0].id)
    }
  }, [conversations.data, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId || !userId) return
    void markConversationRead(selectedConversationId, userId)
  }, [selectedConversationId, userId, markConversationRead])

  const filteredConversations = useMemo(() => {
    return conversations.data.filter((conversation) => {
      const haystack = `${conversation.title ?? ""} ${conversation.last_message_preview ?? ""}`.toLowerCase()
      return haystack.includes(searchTerm.toLowerCase())
    })
  }, [conversations.data, searchTerm])

  const selectedConversation = conversations.data.find((conversation) => conversation.id === selectedConversationId) ?? null

  const handleSendMessage = async () => {
    if (!establishmentId || !userId || !selectedConversationId) {
      showError("Aucun établissement ou utilisateur actif pour l’envoi du message.")
      return
    }

    const trimmed = draft.trim()
    if (!trimmed) {
      return
    }

    try {
      setIsSending(true)
      await sendMessage({
        conversation_id: selectedConversationId,
        sender_id: userId,
        content: trimmed,
      })
      setDraft("")
      showSuccess("Message envoyé.")
    } catch (error) {
      showError(error instanceof Error ? error.message : "Impossible d’envoyer le message.")
    } finally {
      setIsSending(false)
    }
  }

  const handleCreateConversation = async () => {
    if (!establishmentId || !userId) {
      showError("Aucun établissement actif sélectionné pour la création d’une conversation.")
      return
    }

    const title = newTitle.trim()
    const participantIds = newParticipants
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    if (!title) {
      showError("Le titre de la conversation est requis.")
      return
    }

    try {
      setIsCreating(true)
      const created = await createConversation({
        establishment_id: establishmentId,
        title,
        participant_ids: [...new Set([...participantIds, userId])],
        created_by: userId,
      })

      if (created) {
        setNewTitle("")
        setNewParticipants("")
        setSelectedConversationId(created.id)
        showSuccess("Conversation créée.")
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Impossible de créer la conversation.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Messagerie avec les Parents
            </h1>
            <p className="text-gray-600">Communication avec les responsables légaux</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>{filteredConversations.length} conversation(s) active(s)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" type="button" aria-label="Rechercher dans les conversations">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {conversations.isLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Chargement des conversations...
                    </div>
                  ) : filteredConversations.length ? (
                    filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${selectedConversationId === conversation.id ? "border-slate-300 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">{conversation.title}</p>
                          {conversation.participant_count ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {conversation.participant_count}
                            </span>
                          ) : null}
                        </div>
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
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Plus className="h-4 w-4" />
                    Nouvelle conversation
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Titre de la conversation"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <Input
                      placeholder="IDs participants (séparés par des virgules)"
                      value={newParticipants}
                      onChange={(e) => setNewParticipants(e.target.value)}
                    />
                    <Button type="button" className="w-full" onClick={handleCreateConversation} disabled={isCreating || !establishmentId || !userId}>
                      {isCreating ? "Création..." : "Créer"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col">
            {conversations.error ? (
              <CardContent className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-red-100 p-3 text-red-700">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Erreur de chargement</h2>
                  <p className="text-sm text-slate-600 mb-4">{conversations.error}</p>
                  <Button variant="outline" onClick={() => void conversations.refetch()}>Réessayer</Button>
                </div>
              </CardContent>
            ) : selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle>{selectedConversation.title}</CardTitle>
                  <CardDescription>
                    {selectedConversation.participant_count ? `${selectedConversation.participant_count} participant(s)` : "Conversation"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 p-4">
                  <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
                    {messages.isLoading ? (
                      <div className="text-sm text-slate-600">Chargement des messages...</div>
                    ) : messages.data.length ? (
                      messages.data.map((message) => {
                        const isMine = message.sender_id === userId
                        return (
                          <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-slate-900 text-white" : "bg-white text-slate-800 border border-slate-200"}`}>
                              {!isMine && (
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  {message.sender_name || "Participant"}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
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

                  <div className="space-y-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Écrivez votre message..."
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDraft("")}>Effacer</Button>
                      <Button onClick={() => void handleSendMessage()} disabled={isSending || !selectedConversationId || !userId || !draft.trim()}>
                        <Send className="mr-2 h-4 w-4" />
                        {isSending ? "Envoi..." : "Envoyer"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-amber-100 p-3 text-amber-700">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Aucune conversation sélectionnée</h2>
                  <p className="text-sm text-slate-600">Créez une conversation ou sélectionnez une discussion existante pour commencer.</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
