import { normalizeConversationRecord, normalizeMessageRecord } from "@/lib/supabase/services/messages.service"

describe("messages service normalization", () => {
  it("normalizes a real conversation record without inventing values", () => {
    const result = normalizeConversationRecord({
      id: "conv-1",
      establishment_id: "est-1",
      title: "Suivi pédagogique",
      created_at: "2026-08-20T09:00:00.000Z",
      last_message_at: "2026-08-22T14:30:00.000Z",
      last_message_content: "Bonjour, voici le bilan.",
      participant_count: 2,
    })

    expect(result.id).toBe("conv-1")
    expect(result.title).toBe("Suivi pédagogique")
    expect(result.last_message_preview).toBe("Bonjour, voici le bilan.")
    expect(result.participant_count).toBe(2)
  })

  it("normalizes a message with sender and timestamp metadata", () => {
    const result = normalizeMessageRecord({
      id: "msg-1",
      conversation_id: "conv-1",
      sender_id: "user-123",
      content: "Message reçu",
      created_at: "2026-08-22T14:30:00.000Z",
      sender_name: "Direction",
    })

    expect(result.content).toBe("Message reçu")
    expect(result.sender_id).toBe("user-123")
    expect(result.sender_name).toBe("Direction")
    expect(result.created_at).toBe("2026-08-22T14:30:00.000Z")
  })
})
