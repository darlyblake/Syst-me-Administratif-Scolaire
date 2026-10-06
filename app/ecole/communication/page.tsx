"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Megaphone, Plus, Search, X } from "lucide-react"

type Message = {
  id: number
  titre: string
  destinataires: string
  date: string
  statut: "Brouillon" | "Envoyé"
}

export default function CommunicationPage() {
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState("")
  const [titre, setTitre] = useState("")
  const [destinataires, setDestinataires] = useState("Parents")
  const [messages, setMessages] = useState<Message[]>([])

  const filtered = messages.filter((message) =>
    message.titre.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => {
    if (!titre.trim()) return
    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        titre: titre.trim(),
        destinataires,
        date: new Date().toLocaleDateString("fr-FR"),
        statut: "Brouillon",
      },
    ])
    setTitre("")
    setDestinataires("Parents")
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-white text-[#131b2e]">
      <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8">
        <header className="border-b border-[#c5c5d3]/60 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                Administration / Communication
              </p>
              <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Communication</h1>
              <p className="mt-1 text-sm text-[#64748b]">
                Préparation et suivi des communications adressées aux familles et à la communauté scolaire.
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              className="h-10 rounded-md bg-[#1e3a8a] px-4 text-sm font-medium text-white hover:bg-[#172f70]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle communication
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 border-b border-[#c5c5d3]/60 py-5 md:grid-cols-3">
          <div className="border-l-2 border-[#1e3a8a] bg-[#f2f3ff] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Communications</p>
            <p className="mt-1 text-2xl font-semibold">{messages.length}</p>
          </div>
          <div className="border-l-2 border-[#64748b] bg-[#f7f8fa] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Brouillons</p>
            <p className="mt-1 text-2xl font-semibold">{messages.filter((m) => m.statut === "Brouillon").length}</p>
          </div>
          <div className="border-l-2 border-[#16803c] bg-[#f0fdf4] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Envoyées</p>
            <p className="mt-1 text-2xl font-semibold">{messages.filter((m) => m.statut === "Envoyé").length}</p>
          </div>
        </section>

        <section className="border-b border-[#c5c5d3]/60 py-5">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une communication..."
              className="h-10 rounded-md border-[#c5c5d3] bg-white pl-9 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-[#1e3a8a]"
            />
          </div>
        </section>

        <section className="mt-6 border border-[#c5c5d3]/60">
          <div className="flex items-center justify-between border-b border-[#c5c5d3]/60 bg-[#f7f8fa] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Communications</h2>
              <p className="mt-0.5 text-xs text-[#64748b]">{filtered.length} communication(s)</p>
            </div>
            <Megaphone className="h-4 w-4 text-[#64748b]" />
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-[#94a3b8]" />
              <p className="mt-3 text-sm font-medium text-[#515f74]">Aucune communication</p>
              <p className="mt-1 text-xs text-[#94a3b8]">
                Créez une nouvelle communication pour commencer.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e2e4ea]">
              {filtered.map((message) => (
                <div key={message.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{message.titre}</p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Destinataires : {message.destinataires} · {message.date}
                    </p>
                  </div>
                  <span className="w-fit border border-[#c5c5d3]/60 bg-[#f7f8fa] px-2 py-1 text-xs text-[#515f74]">
                    {message.statut}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4">
          <div className="w-full max-w-lg border border-[#c5c5d3] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#c5c5d3]/60 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">Nouvelle communication</h3>
                <p className="mt-0.5 text-xs text-[#64748b]">Préparer une communication administrative.</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 text-[#64748b] hover:bg-[#f2f3f6]" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-[#515f74]">Objet</Label>
                <Input
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Objet de la communication"
                  className="h-10 rounded-md border-[#c5c5d3] shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-[#515f74]">Destinataires</Label>
                <select
                  value={destinataires}
                  onChange={(e) => setDestinataires(e.target.value)}
                  className="h-10 w-full rounded-md border border-[#c5c5d3] bg-white px-3 text-sm text-[#131b2e] outline-none focus:ring-1 focus:ring-[#1e3a8a]"
                >
                  <option>Parents</option>
                  <option>Élèves</option>
                  <option>Enseignants</option>
                  <option>Personnel</option>
                  <option>Communauté scolaire</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#c5c5d3]/60 bg-[#f7f8fa] px-5 py-4">
              <Button variant="outline" onClick={() => setShowModal(false)} className="h-9 rounded-md border-[#c5c5d3] bg-white px-4 text-sm shadow-none">
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={!titre.trim()} className="h-9 rounded-md bg-[#1e3a8a] px-4 text-sm text-white hover:bg-[#172f70]">
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
