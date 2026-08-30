import { supabaseBrowser } from "@/lib/supabase/client"

export interface MessageParticipant {
  id: string
  conversation_id: string
  user_id: string
  last_read_at?: string | null
  joined_at?: string | null
  is_creator?: boolean | null
}

export interface MessageConversation {
  id: string
  establishment_id?: string | null
  title: string
  created_at?: string | null
  last_message_at?: string | null
  last_message_preview?: string | null
  participant_count?: number
  participants?: MessageParticipant[]
}

export interface MessageRecord {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  sender_name?: string | null
  sender_role?: string | null
}

export interface CreateConversationPayload {
  establishment_id: string
  title: string
  participant_ids: string[]
  created_by?: string | null
}

export interface SendMessagePayload {
  conversation_id: string
  sender_id: string
  content: string
}

export function normalizeConversationRecord(value: unknown): MessageConversation {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const participants = Array.isArray(record.participants) ? record.participants.map((participant) => {
    const item = (participant && typeof participant === "object" ? participant : {}) as Record<string, unknown>
    return {
      id: String(item.id ?? ""),
      conversation_id: String(item.conversation_id ?? record.id ?? ""),
      user_id: String(item.user_id ?? ""),
      last_read_at: typeof item.last_read_at === "string" ? item.last_read_at : null,
      joined_at: typeof item.joined_at === "string" ? item.joined_at : null,
      is_creator: typeof item.is_creator === "boolean" ? item.is_creator : null,
    }
  }) : []

  const lastMessagePreview = typeof record.last_message_content === "string"
    ? record.last_message_content
    : typeof record.last_message_preview === "string"
      ? record.last_message_preview
      : typeof record.last_message === "string"
        ? record.last_message
        : null

  return {
    id: String(record.id ?? ""),
    establishment_id: typeof record.establishment_id === "string" ? record.establishment_id : null,
    title: typeof record.title === "string" && record.title.trim() ? record.title : "Conversation",
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    last_message_at: typeof record.last_message_at === "string" ? record.last_message_at : null,
    last_message_preview: lastMessagePreview,
    participant_count: typeof record.participant_count === "number" ? record.participant_count : participants.length,
    participants,
  }
}

export function normalizeMessageRecord(value: unknown): MessageRecord {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>

  return {
    id: String(record.id ?? ""),
    conversation_id: String(record.conversation_id ?? ""),
    sender_id: String(record.sender_id ?? ""),
    content: typeof record.content === "string" ? record.content : "",
    created_at: typeof record.created_at === "string" ? record.created_at : new Date().toISOString(),
    sender_name: typeof record.sender_name === "string" ? record.sender_name : null,
    sender_role: typeof record.sender_role === "string" ? record.sender_role : null,
  }
}

async function tryRpc<T>(procedureName: string, payload: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await supabaseBrowser.rpc(procedureName, payload)
  if (error) {
    return null
  }
  return (data as T) ?? null
}

export async function getAccessibleConversations(
  establishmentId: string | null,
  userId: string | null,
): Promise<MessageConversation[]> {
  if (!establishmentId || !userId) {
    return []
  }

  const { data, error } = await supabaseBrowser
    .from("conversations")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("last_message_at", { ascending: false, nullsLast: true })

  if (error) {
    throw new Error("Impossible de charger les conversations.")
  }

  const conversations = (data ?? []).map((item) => normalizeConversationRecord(item))
  if (!conversations.length) {
    return []
  }

  const conversationIds = conversations.map((conversation) => conversation.id)

  const { data: participants, error: participantsError } = await supabaseBrowser
    .from("conversation_participants")
    .select("*")
    .eq("user_id", userId)
    .in("conversation_id", conversationIds)

  if (participantsError) {
    throw new Error("Impossible de vérifier les conversations accessibles.")
  }

  const visibleIds = new Set((participants ?? []).map((participant) => String(participant.conversation_id)))

  return conversations.filter((conversation) => visibleIds.has(conversation.id))
}

export async function getConversationMessages(conversationId: string | null): Promise<MessageRecord[]> {
  if (!conversationId) {
    return []
  }

  const { data, error } = await supabaseBrowser
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger les messages de la conversation.")
  }

  return (data ?? []).map((item) => normalizeMessageRecord(item))
}

export async function createConversation(payload: CreateConversationPayload): Promise<MessageConversation> {
  const candidatePayloads = [
    {
      p_establishment_id: payload.establishment_id,
      p_title: payload.title,
      p_participant_ids: payload.participant_ids,
      p_created_by: payload.created_by ?? payload.participant_ids[0] ?? null,
    },
    {
      establishment_id: payload.establishment_id,
      title: payload.title,
      participant_ids: payload.participant_ids,
      created_by: payload.created_by ?? payload.participant_ids[0] ?? null,
    },
  ]

  for (const rpcPayload of candidatePayloads) {
    const data = await tryRpc<{ id?: string; conversation?: Record<string, unknown>; conversation_id?: string }>("create_conversation", rpcPayload)
    if (data) {
      const conversationData = data.conversation ?? data
      const normalizedConversation = normalizeConversationRecord(conversationData)
      if (normalizedConversation.id) {
        return normalizedConversation
      }
      const chosenId = data.id ?? data.conversation_id ?? null
      if (chosenId) {
        return normalizeConversationRecord({ id: chosenId, title: payload.title, establishment_id: payload.establishment_id })
      }
    }
  }

  const fallback = await supabaseBrowser
    .from("conversations")
    .insert({
      establishment_id: payload.establishment_id,
      title: payload.title,
      created_by: payload.created_by ?? payload.participant_ids[0] ?? null,
    })
    .select()
    .single()

  if (fallback.error) {
    throw new Error("Impossible de créer la conversation.")
  }

  const participantValues = Array.from(new Set([...(payload.participant_ids ?? []), payload.created_by ?? payload.participant_ids[0] ?? ""]))
    .filter(Boolean)
    .map((participantId) => ({
      conversation_id: fallback.data.id,
      user_id: participantId,
      joined_at: new Date().toISOString(),
    }))

  if (participantValues.length) {
    const { error: participantError } = await supabaseBrowser.from("conversation_participants").insert(participantValues)
    if (participantError) {
      throw new Error("La conversation a été créée mais ses participants n’ont pas pu être enregistrés.")
    }
  }

  return normalizeConversationRecord(fallback.data)
}

export async function sendMessage(payload: SendMessagePayload): Promise<MessageRecord> {
  const candidatePayloads = [
    {
      p_conversation_id: payload.conversation_id,
      p_sender_id: payload.sender_id,
      p_content: payload.content,
    },
    {
      conversation_id: payload.conversation_id,
      sender_id: payload.sender_id,
      content: payload.content,
    },
  ]

  for (const rpcPayload of candidatePayloads) {
    const data = await tryRpc<{ id?: string; message?: Record<string, unknown>; message_id?: string }>("send_message", rpcPayload)
    if (data) {
      const messageData = data.message ?? data
      const normalizedMessage = normalizeMessageRecord(messageData)
      if (normalizedMessage.id) {
        return normalizedMessage
      }
      const chosenId = data.id ?? data.message_id ?? null
      if (chosenId) {
        return normalizeMessageRecord({ id: chosenId, conversation_id: payload.conversation_id, sender_id: payload.sender_id, content: payload.content, created_at: new Date().toISOString() })
      }
    }
  }

  const { data, error } = await supabaseBrowser
    .from("messages")
    .insert({
      conversation_id: payload.conversation_id,
      sender_id: payload.sender_id,
      content: payload.content,
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible d’envoyer le message.")
  }

  return normalizeMessageRecord(data)
}

export async function markConversationRead(
  conversationId: string | null,
  userId: string | null,
): Promise<boolean> {
  if (!conversationId || !userId) {
    return false
  }

  const { error } = await supabaseBrowser
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)

  if (error) {
    throw new Error("Impossible de mettre à jour la lecture de la conversation.")
  }

  return true
}
