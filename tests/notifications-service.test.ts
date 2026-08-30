process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"

import { normalizeNotificationPage, normalizeUnreadCount } from "@/lib/supabase/services/notifications.service"

describe("notifications.service", () => {
  it("normalise la pagination retournée par la RPC du backend", () => {
    const page = normalizeNotificationPage({
      items: [
        { id: "n1", title: "Rappel", message: "Test", is_read: false, created_at: "2026-09-01T08:00:00Z" },
      ],
      page: 1,
      page_size: 25,
      total: 1,
      total_pages: 1,
    })

    expect(page.items).toHaveLength(1)
    expect(page.items[0].id).toBe("n1")
    expect(page.total).toBe(1)
    expect(page.page).toBe(1)
  })

  it("normalise le compteur de notifications non lues", () => {
    expect(normalizeUnreadCount({ unread_count: 4 })).toBe(4)
    expect(normalizeUnreadCount({ count: 3 })).toBe(3)
    expect(normalizeUnreadCount({ unread: 2 })).toBe(2)
    expect(normalizeUnreadCount(7)).toBe(7)
  })
})
