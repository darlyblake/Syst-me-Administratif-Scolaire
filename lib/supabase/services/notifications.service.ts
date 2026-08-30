import { supabaseBrowser } from "@/lib/supabase/client"

export interface NotificationRecord {
  id: string
  title?: string | null
  subject?: string | null
  message?: string | null
  content?: string | null
  body?: string | null
  is_read?: boolean | null
  read_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  type?: string | null
  channel?: string | null
  recipient_type?: string | null
  recipient_id?: string | null
  establishment_id?: string | null
  status?: string | null
}

export interface NotificationPage {
  items: NotificationRecord[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export function normalizeNotificationPage(value: unknown, page = 1, pageSize = 25): NotificationPage {
  const result = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const rawItems = Array.isArray(result.items) ? result.items : Array.isArray(result.data) ? result.data : []

  return {
    items: rawItems as NotificationRecord[],
    page: typeof result.page === "number" ? result.page : page,
    page_size: typeof result.page_size === "number" ? result.page_size : pageSize,
    total: typeof result.total === "number" ? result.total : 0,
    total_pages: typeof result.total_pages === "number" ? result.total_pages : 0,
  }
}

export function normalizeUnreadCount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (!value || typeof value !== "object") {
    return 0
  }

  const record = value as Record<string, unknown>
  const candidates = [record.unread_count, record.count, record.unread, record.total_unread]

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate
    }
  }

  return 0
}

export async function listNotificationsPaginated(
  establishmentId: string,
  page = 1,
  pageSize = 25,
  unreadOnly = false,
): Promise<NotificationPage> {
  const { data, error } = await supabaseBrowser.rpc("list_notifications_paginated", {
    p_establishment_id: establishmentId,
    p_page: page,
    p_page_size: pageSize,
    p_unread_only: unreadOnly,
  })

  if (error) {
    throw new Error("Impossible de charger les notifications.")
  }

  return normalizeNotificationPage(data, page, pageSize)
}

export async function getUnreadNotificationCount(establishmentId: string): Promise<number> {
  const { data, error } = await supabaseBrowser.rpc("unread_notification_count", {
    p_establishment_id: establishmentId,
  })

  if (error) {
    throw new Error("Impossible de charger le nombre de notifications non lues.")
  }

  return normalizeUnreadCount(data)
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabaseBrowser.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  })

  if (error) {
    throw new Error("Impossible de marquer la notification comme lue.")
  }

  return true
}
