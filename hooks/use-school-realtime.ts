"use client"

import { useEffect, useState } from "react"

type SchoolRealtimeDetail = {
  table: string
  eventType: string
  establishmentId?: string
  record?: Record<string, unknown>
}

const EVENT_NAME = "nova:school-realtime"

export function useSchoolRealtime(tables: string[] = []) {
  const [revision, setRevision] = useState(0)
  const tableKey = tables.slice().sort().join("|")

  useEffect(() => {
    const allowed = new Set(tableKey ? tableKey.split("|") : [])
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<SchoolRealtimeDetail>).detail
      if (!detail || (allowed.size > 0 && !allowed.has(detail.table))) return
      setRevision((value) => value + 1)
    }
    window.addEventListener(EVENT_NAME, handle)
    return () => window.removeEventListener(EVENT_NAME, handle)
  }, [tableKey])

  return revision
}

export function emitSchoolRealtime(detail: SchoolRealtimeDetail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }))
}
