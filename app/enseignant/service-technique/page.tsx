"use client"

import { useEffect, useState } from "react"
import { LifeBuoy, Loader2, Send } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"
import { supabaseBrowser } from "@/lib/supabase/client"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function ServiceTechniquePage() {
  const { contexte, utilisateur, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.[0]
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { setDone(false) }, [establishment?.id])

  const send = async () => {
    if (!establishment?.id || !subject.trim() || !message.trim()) return
    setSending(true)
    setError("")
    const { error: requestError } = await supabaseBrowser.rpc("create_support_request", {
      p_establishment_id: establishment.id,
      p_subject: subject.trim(),
      p_message: message.trim(),
      p_priority: "normal",
    })
    if (requestError) setError(requestError.message)
    else { setSubject(""); setMessage(""); setDone(true) }
    setSending(false)
  }

  if (estEnCoursDeChargement || !utilisateur) return <main className="min-h-screen bg-[#f8f8fc] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>

  const content = (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-[#e4e6ef] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Assistance</p>
        <h1 className="mt-1 text-2xl font-bold">Service technique</h1>
        <p className="mt-1 text-sm text-[#6d7280]">Signalez un problème ou demandez de l'aide sur l'application.</p>
      </header>

      <section className="mt-5 rounded-md border border-[#e1e3eb] bg-white p-5">
        <div className="flex items-center gap-3"><span className="rounded-md bg-[#eef1ff] p-2.5 text-[#2944a8]"><LifeBuoy className="h-5 w-5" /></span><div><h2 className="font-semibold">Nouvelle demande</h2><p className="text-sm text-[#6d7280]">Décrivez clairement le problème rencontré.</p></div></div>

        {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {done && <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">Votre demande a bien été transmise au service technique.</div>}

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Sujet<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. Impossible d'enregistrer une note" className="mt-1.5 h-10 w-full rounded-md border border-[#dfe2ec] px-3 outline-none focus:border-[#7890ef]" /></label>
          <label className="block text-sm font-medium">Description<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Expliquez ce qui se passe, l'écran concerné et le message affiché…" className="mt-1.5 w-full resize-y rounded-md border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]" /></label>
          <div className="flex justify-end"><button type="button" onClick={() => void send()} disabled={sending || !establishment?.id || !subject.trim() || !message.trim()} className="inline-flex items-center gap-2 rounded-md bg-[#0b2b83] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Envoyer la demande</button></div>
        </div>
      </section>
    </div>
  )

  return establishment ? <TeacherShell establishmentId={establishment.id} establishmentName={establishment.name} active="today">{content}</TeacherShell> : <main className="min-h-screen bg-[#f8f8fc] p-4 sm:p-6">{content}</main>
}
