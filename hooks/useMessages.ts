"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  createConversation,
  getAccessibleConversations,
  getConversationMessages,
  markConversationRead,
  sendMessage,
  type CreateConversationPayload,
  type MessageConversation,
  type MessageRecord,
  type SendMessagePayload,
} from "@/lib/supabase/services/messages.service"

export interface UseMessagesHookResult {
  conversations: {
    data: MessageConversation[]
    isLoading: boolean
    error: string | null
    refetch: () => Promise<MessageConversation[]>
  }
  messages: {
    data: MessageRecord[]
    isLoading: boolean
    error: string | null
    refetch: (conversationId?: string | null) => Promise<MessageRecord[]>
  }
  createConversation: (payload: CreateConversationPayload) => Promise<MessageConversation | null>
  sendMessage: (payload: SendMessagePayload) => Promise<MessageRecord | null>
  markConversationRead: (conversationId: string | null, userId: string | null) => Promise<boolean>
}

export function useMessages(
  establishmentId: string | null,
  userId: string | null,
  selectedConversationId: string | null = null,
): UseMessagesHookResult {
  const [conversations, setConversations] = useState<MessageConversation[]>([])
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [conversationLoading, setConversationLoading] = useState<boolean>(false)

  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false)

  const refetchConversations = useCallback(async () => {
    if (!establishmentId || !userId) {
      setConversations([])
      setConversationError(null)
      return []
    }

    try {
      setConversationLoading(true)
      setConversationError(null)
      const nextConversations = await getAccessibleConversations(establishmentId, userId)
      setConversations(nextConversations)
      return nextConversations
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les conversations."
      setConversationError(message)
      setConversations([])
      return []
    } finally {
      setConversationLoading(false)
    }
  }, [establishmentId, userId])

  const refetchMessages = useCallback(async (conversationId = selectedConversationId) => {
    if (!conversationId) {
      setMessages([])
      setMessagesError(null)
      return []
    }

    try {
      setMessagesLoading(true)
      setMessagesError(null)
      const nextMessages = await getConversationMessages(conversationId)
      setMessages(nextMessages)
      return nextMessages
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les messages."
      setMessagesError(message)
      setMessages([])
      return []
    } finally {
      setMessagesLoading(false)
    }
  }, [selectedConversationId])

  useEffect(() => {
    void refetchConversations()
  }, [refetchConversations])

  useEffect(() => {
    if (selectedConversationId) {
      void refetchMessages(selectedConversationId)
    }
  }, [refetchMessages, selectedConversationId])

  const create = useCallback(async (payload: CreateConversationPayload) => {
    try {
      const result = await createConversation(payload)
      await refetchConversations()
      return result
    } catch (error) {
      throw error
    }
  }, [refetchConversations])

  const send = useCallback(async (payload: SendMessagePayload) => {
    try {
      const result = await sendMessage(payload)
      await refetchMessages(payload.conversation_id)
      await refetchConversations()
      return result
    } catch (error) {
      throw error
    }
  }, [refetchConversations, refetchMessages])

  const markRead = useCallback(async (conversationId: string | null, currentUserId: string | null) => {
    const result = await markConversationRead(conversationId, currentUserId)
    if (result) {
      await refetchConversations()
    }
    return result
  }, [refetchConversations])

  return useMemo(() => ({
    conversations: {
      data: conversations,
      isLoading: conversationLoading,
      error: conversationError,
      refetch: refetchConversations,
    },
    messages: {
      data: messages,
      isLoading: messagesLoading,
      error: messagesError,
      refetch: refetchMessages,
    },
    createConversation: create,
    sendMessage: send,
    markConversationRead: markRead,
  }), [conversations, conversationError, conversationLoading, create, markRead, messages, messagesError, messagesLoading, refetchConversations, refetchMessages, send])
}
