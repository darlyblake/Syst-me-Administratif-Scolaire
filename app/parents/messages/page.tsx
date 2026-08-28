"use client"

import { useMemo, useState } from "react"
import { MessageSquare, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { serviceParents } from "@/services/parents.service"
import { cn } from "@/lib/utils"

export default function ParentsMessagesPage() {
  const conversations = useMemo(() => serviceParents.obtenirConversations(), [])
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "")
  const [draft, setDraft] = useState("")
  const [localMessages, setLocalMessages] = useState<Record<string, { id: string; contenu: string; date: string }[]>>(
    {},
  )

  const selected = conversations.find((c) => c.id === selectedId)
  const extra = localMessages[selectedId] || []

  const handleSend = () => {
    if (!draft.trim() || !selectedId) return
    setLocalMessages((prev) => ({
      ...prev,
      [selectedId]: [
        ...(prev[selectedId] || []),
        {
          id: `local-${Date.now()}`,
          contenu: draft.trim(),
          date: new Date().toISOString(),
        },
      ],
    }))
    setDraft("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-terre">
          <MessageSquare className="h-6 w-6 text-terre" />
          Messages
        </h1>
        <p className="text-pierre">Échangez avec l&apos;école et les enseignants</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-terre/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pierre">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full rounded-xl px-3 py-3 text-left transition",
                  selectedId === c.id ? "bg-terre-soft" : "hover:bg-creme",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-terre line-clamp-1">{c.sujet}</p>
                  {c.nonLus > 0 && (
                    <Badge className="shrink-0 bg-violet-600 text-white hover:bg-violet-600">
                      {c.nonLus}
                    </Badge>
                  )}
                </div>
                {c.eleveNom && <p className="text-xs text-terre">{c.eleveNom}</p>}
                <p className="mt-0.5 line-clamp-1 text-xs text-pierre">{c.dernierMessage}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex min-h-[420px] flex-col border-terre/10">
          {selected ? (
            <>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">{selected.sujet}</CardTitle>
                {selected.eleveNom && (
                  <p className="text-sm text-pierre">Concernant : {selected.eleveNom}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex-1 space-y-3">
                  {selected.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                        m.expediteur === "parent"
                          ? "ml-auto bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-800",
                      )}
                    >
                      {m.expediteur !== "parent" && (
                        <p className="mb-0.5 text-xs font-semibold opacity-70">{m.auteur}</p>
                      )}
                      <p>{m.contenu}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          m.expediteur === "parent" ? "text-white/70" : "text-slate-400",
                        )}
                      >
                        {new Date(m.date).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                  {extra.map((m) => (
                    <div
                      key={m.id}
                      className="ml-auto max-w-[85%] rounded-2xl bg-violet-600 px-4 py-2.5 text-sm text-white"
                    >
                      <p>{m.contenu}</p>
                      <p className="mt-1 text-[10px] text-white/70">
                        {new Date(m.date).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <Textarea
                    placeholder="Écrire un message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[44px] resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <Button
                    className="shrink-0 bg-violet-600 hover:bg-violet-700"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-1 items-center justify-center text-pierre">
              Sélectionnez une conversation
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
