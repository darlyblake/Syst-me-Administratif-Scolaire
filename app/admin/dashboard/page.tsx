"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Building2, CheckCircle2, Clock3, Plus, ArrowRight, Users, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/client"

type School={id:string;name:string;code:string|null;status:string;created_at:string}

export default function AdminDashboard(){
 const [schools,setSchools]=useState<School[]>([]); const [loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const {data}=await supabaseBrowser.from("establishments").select("id,name,code,status,created_at").order("created_at",{ascending:false});setSchools(data||[]);setLoading(false)})()},[])
 const active=schools.filter(s=>s.status==="active").length
 const stats=[{label:"Établissements",value:schools.length,icon:Building2},{label:"Établissements actifs",value:active,icon:CheckCircle2},{label:"À surveiller",value:schools.length-active,icon:AlertTriangle},{label:"Utilisateurs",value:"—",icon:Users}]
 return <div className="mx-auto max-w-7xl space-y-8">
  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary">Vue d'ensemble</p><h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1><p className="mt-1 text-muted-foreground">Pilotez vos établissements et l'activité globale de NOVA.</p></div><Button asChild><Link href="/admin/etablissements/nouveau"><Plus className="mr-2 h-4 w-4"/>Nouvel établissement</Link></Button></div>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({label,value,icon:Icon})=><Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{loading?"…":value}</p></div><div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5"/></div></CardContent></Card>)}</div>
  <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
   <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Établissements récents</CardTitle><p className="mt-1 text-sm text-muted-foreground">Derniers établissements enregistrés.</p></div><Button variant="ghost" size="sm" asChild><Link href="/admin/etablissements">Tout voir<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></CardHeader><CardContent>{loading?<p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>:schools.length===0?<div className="py-10 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p className="font-medium">Aucun établissement</p><Button className="mt-4" asChild><Link href="/admin/etablissements/nouveau">Créer le premier</Link></Button></div>:<div className="divide-y">{schools.slice(0,5).map(s=><Link href={"/admin/etablissements/"+s.id} key={s.id} className="flex items-center justify-between py-4 hover:bg-muted/40"><div><p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground">{s.code||"Code en attente"}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{s.status==="active"?"Actif":"Inactif"}</span></Link>)}</div>}</CardContent></Card>
   <Card><CardHeader><CardTitle>Actions rapides</CardTitle></CardHeader><CardContent className="space-y-3"><Button variant="outline" className="w-full justify-between" asChild><Link href="/admin/etablissements/nouveau">Créer un établissement <Plus className="h-4 w-4"/></Link></Button><Button variant="outline" className="w-full justify-between" asChild><Link href="/admin/administrateurs">Gérer les administrateurs <ArrowRight className="h-4 w-4"/></Link></Button><Button variant="outline" className="w-full justify-between" asChild><Link href="/admin/abonnements">Gérer les abonnements <ArrowRight className="h-4 w-4"/></Link></Button><div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground"><Clock3 className="mb-2 h-4 w-4"/>Les alertes d'expiration apparaîtront ici lorsque la gestion des abonnements sera connectée.</div></CardContent></Card>
  </div></div>
}