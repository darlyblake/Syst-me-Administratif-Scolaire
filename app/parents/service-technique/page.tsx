"use client"

import { useEffect, useState } from "react"
import { LifeBuoy, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { useAuthentification } from "@/providers/authentification.provider"
import { supabaseBrowser } from "@/lib/supabase/client"

type Ticket = { id:string; subject:string; priority:string; status:string; created_at:string; updated_at:string; created_by:string }
type Msg = { id:string; sender_id:string; body:string; created_at:string; first_name:string|null; last_name:string|null; account_type:string }
const statusLabels:Record<string,string>={open:"Ouvert",in_progress:"En cours",resolved:"Résolu",closed:"Fermé"}

export default function Page(){
  const { contexte } = useAuthentification()
  const establishmentId = contexte?.establishments?.[0]?.id
  const [tickets,setTickets]=useState<Ticket[]>([])
  const [selected,setSelected]=useState<Ticket|null>(null)
  const [messages,setMessages]=useState<Msg[]>([])
  const [subject,setSubject]=useState("")
  const [body,setBody]=useState("")
  const [sending,setSending]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState("")

  const load=async()=>{
    if(!establishmentId)return
    setLoading(true);setError("")
    const {data,error}=await supabaseBrowser.rpc("get_establishment_support_requests",{p_establishment_id:establishmentId})
    if(error)setError(error.message)
    setTickets((data??[]) as Ticket[])
    setLoading(false)
  }
  const loadMessages=async(id:string)=>{
    const {data,error}=await supabaseBrowser.rpc("get_support_messages",{p_request_id:id})
    if(error)setError(error.message)
    setMessages((data??[]) as Msg[])
  }
  useEffect(()=>{void load()},[establishmentId])
  useEffect(()=>{if(selected)void loadMessages(selected.id)},[selected])

  const create=async()=>{
    if(!establishmentId||!subject.trim()||!body.trim())return
    setSending(true);setError("")
    const {error}=await supabaseBrowser.rpc("create_support_request",{p_establishment_id:establishmentId,p_subject:subject.trim(),p_message:body.trim(),p_priority:"normal"})
    if(error)setError(error.message);else{setSubject("");setBody("");await load()}
    setSending(false)
  }
  const reply=async()=>{
    if(!selected||!body.trim())return
    setSending(true);setError("")
    const {error}=await supabaseBrowser.rpc("reply_support_request",{p_request_id:selected.id,p_message:body.trim()})
    if(error)setError(error.message);else{setBody("");await loadMessages(selected.id);await load()}
    setSending(false)
  }

  return <div className="space-y-6">
    <ParentPageHeader eyebrow="Assistance" title="Service technique" description="Signalez un problème ou échangez avec l’équipe d’assistance."/>
    {error&&<div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    <section className="grid min-h-[560px] border-y border-terre/10 bg-papier lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="border-b border-terre/10 lg:border-b-0 lg:border-r">
        <div className="border-b border-terre/10 px-5 py-4">
          <div className="flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-terre"/><h2 className="font-semibold text-terre">Nouvelle demande</h2></div>
          <p className="mt-1 text-xs text-pierre">Décrivez précisément le problème rencontré.</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <Input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Sujet"/>
          <textarea value={body} onChange={e=>setBody(e.target.value)} className="min-h-32 w-full rounded-md border border-terre/10 bg-background p-3 text-sm outline-none focus:border-terre" placeholder="Décrivez votre problème…"/>
          <Button className="w-full" onClick={()=>void create()} disabled={sending||!subject.trim()||!body.trim()}><Send className="mr-2 h-4 w-4"/>{sending?"Envoi…":"Envoyer"}</Button>
        </div>
        <div className="border-t border-terre/10">
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pierre">Mes demandes</div>
          {loading?<div className="px-5 py-6"><Loader2 className="h-5 w-5 animate-spin text-terre"/></div>:tickets.length===0?<p className="px-5 py-6 text-sm text-pierre">Aucune demande pour le moment.</p>:<div className="divide-y divide-terre/10">{tickets.map(t=><button key={t.id} type="button" onClick={()=>setSelected(t)} className={`w-full border-l-2 px-5 py-3 text-left hover:bg-creme ${selected?.id===t.id?"border-terre bg-terre-soft/30":"border-transparent"}`}><p className="truncate text-sm font-medium text-terre">{t.subject}</p><p className="mt-1 text-xs text-pierre">{statusLabels[t.status]??t.status} · {new Date(t.created_at).toLocaleDateString("fr-FR")}</p></button>)}</div>}
        </div>
      </aside>

      <div className="flex min-h-[560px] min-w-0 flex-col">
        <div className="border-b border-terre/10 px-5 py-4"><h2 className="font-semibold text-terre">{selected?.subject||"Mes échanges"}</h2><p className="mt-1 text-xs text-pierre">{selected?"Suivi de votre demande d’assistance.":"Sélectionnez une demande dans la liste."}</p></div>
        {selected?<><div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">{messages.length?messages.map(m=><div key={m.id} className="border-b border-terre/10 pb-3"><p className="text-xs text-pierre">{[m.first_name,m.last_name].filter(Boolean).join(" ")||"Utilisateur"} · {new Date(m.created_at).toLocaleString("fr-FR")}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-terre">{m.body}</p></div>):<p className="text-sm text-pierre">Aucun message.</p>}</div><div className="border-t border-terre/10 px-5 py-4"><div className="flex gap-2"><Input value={body} onChange={e=>setBody(e.target.value)} placeholder="Répondre…"/><Button onClick={()=>void reply()} disabled={sending||!body.trim()}><Send className="h-4 w-4"/></Button></div></div></>:<div className="flex flex-1 items-center justify-center px-5 py-10 text-center"><div><LifeBuoy className="mx-auto h-8 w-8 text-terre/40"/><p className="mt-3 font-medium text-terre">Aucune demande sélectionnée</p><p className="mt-1 text-sm text-pierre">Choisissez une demande pour consulter les échanges.</p></div></div>}
      </div>
    </section>
  </div>
}
