"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Archive, BarChart3, Banknote, BookOpen, Calendar, CalendarDays, CheckSquare, ClipboardList, CreditCard, FileText, FolderOpen, GraduationCap, LayoutDashboard, LogOut, MessageSquare, Settings, Timer, Users, UserRound, Wrench, LifeBuoy, Loader2 } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"
import { hasEffectiveSchoolPermission } from "@/lib/organization/runtime-permissions"

interface SidebarProps { isOpen: boolean; setIsOpen: (open: boolean) => void }

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
 const pathname=usePathname(); const router=useRouter(); const { utilisateur }=useAuthentification(); const [isLoggingOut,setIsLoggingOut]=useState(false)
 const isActive=(path:string)=>pathname===path||pathname.startsWith(path+"/")
 const can=(permission:string)=>hasEffectiveSchoolPermission(utilisateur,permission)

 const handleLogout=async()=>{
   if(isLoggingOut) return
   setIsLoggingOut(true)
   try {
     const { error } = await supabaseBrowser.auth.signOut({ scope: "local" })
     if(error) throw error
     Object.keys(localStorage).filter(k=>/^(students|payments|school_|ecole_)/.test(k)).forEach(k=>localStorage.removeItem(k))
     router.replace("/connexion"); router.refresh()
   } catch (error) {
     console.error("Erreur lors de la déconnexion", error)
     router.replace("/connexion"); router.refresh()
   } finally { setIsLoggingOut(false) }
 }

 const navItems=[
  {section:"Principal",items:[{href:"/ecole/tableau-bord",label:"Tableau de bord",icon:LayoutDashboard,permission:"dashboard.view"},{href:"/ecole/inscriptions",label:"Inscriptions",icon:ClipboardList,permission:"enrollment.view"},{href:"/ecole/students",label:"Élèves",icon:Users,permission:"students.view"},{href:"/ecole/dossiers-papier",label:"Dossiers papier",icon:FolderOpen,permission:"documents.view"}]},
  {section:"Pédagogie",items:[{href:"/ecole/classes",label:"Classes",icon:GraduationCap,permission:"classes.view"},{href:"/ecole/notes",label:"Notes & bulletins",icon:BarChart3,permission:"grades.view"},{href:"/ecole/emploi-du-temps",label:"Emploi du temps",icon:CalendarDays,permission:"timetable.view"},{href:"/ecole/registre-appel",label:"Présences",icon:CheckSquare,permission:"attendance.view"},{href:"/ecole/absences",label:"Absences",icon:Calendar,permission:"attendance.view"},{href:"/ecole/matieres",label:"Matières",icon:BookOpen,permission:"subjects.view"},{href:"/ecole/evaluation",label:"Évaluation",icon:ClipboardList,permission:"grades.view"},{href:"/ecole/options",label:"Options",icon:Wrench,permission:"settings.view"}]},
  {section:"Personnel",items:[{href:"/ecole/enseignants",label:"Enseignants",icon:UserRound,permission:"staff.view"},{href:"/ecole/personnel",label:"Personnel & paie",icon:Users,permission:"staff.view"},{href:"/ecole/etat-salaire",label:"État salaire",icon:Banknote,permission:"staff.view"},{href:"/ecole/heures-vacataires",label:"Heures vacataires",icon:Timer,permission:"staff.view"}]},
  {section:"Finances",items:[{href:"/ecole/payments",label:"Paiements",icon:CreditCard,permission:"payments.view"},{href:"/ecole/comptabilite",label:"Comptabilité",icon:ClipboardList,permission:"finance.view"}]},
  {section:"Administration",items:[{href:"/ecole/archivage",label:"Archivage",icon:Archive,permission:"documents.view"},{href:"/ecole/documents",label:"Documents",icon:FileText,permission:"documents.view"}]},
  {section:"Autres",items:[{href:"/ecole/communication",label:"Communication",icon:MessageSquare,permission:"communication.view"},{href:"/ecole/evenements",label:"Événements",icon:CalendarDays,permission:"events.view"},{href:"/ecole/service-technique",label:"Service technique",icon:LifeBuoy,permission:"support.view"},{href:"/ecole/settings",label:"Paramètres",icon:Settings,permission:"settings.view"}],
  }
 ]
 const visibleGroups=navItems.map(group=>({...group,items:group.items.filter(item=>can(item.permission))})).filter(group=>group.items.length>0)
 return <>{isOpen&&<div className="fixed inset-0 bg-encre/30 z-30" onClick={()=>setIsOpen(false)}/>}<aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-papier border-r border-terre/10 flex flex-col transition-transform duration-200 ${isOpen?"translate-x-0":"-translate-x-full"}`}><div className="px-5 py-5 border-b border-terre/8 flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-terre text-white flex items-center justify-center font-bold text-sm shrink-0">EV</div><div className="min-w-0"><p className="font-semibold text-terre text-sm leading-tight truncate">Collège Les Palmiers</p><p className="text-xs text-pierre">2025 – 2026</p></div></div><nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">{visibleGroups.map(group=><div key={group.section}><p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-pierre mb-2">{group.section}</p><ul className="space-y-0.5">{group.items.map(item=><li key={item.href}><Link href={item.href} onClick={()=>setIsOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive(item.href)?"bg-terre text-white font-medium":"text-encre hover:bg-terre-soft"}`}><item.icon className="h-4 w-4 shrink-0" aria-hidden="true"/>{item.label}</Link></li>)}</ul></div>)}</nav><div className="p-3 border-t border-terre/8"><div className="flex items-center gap-3 px-2 py-2 rounded-xl"><div className="w-9 h-9 rounded-full bg-terre-soft text-terre text-xs font-semibold flex items-center justify-center">AD</div><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">Admin</p><p className="text-xs text-pierre">École</p></div><button onClick={handleLogout} disabled={isLoggingOut} aria-label="Déconnexion" className="p-2 rounded-md hover:bg-red-50 hover:text-red-600 disabled:opacity-50 text-pierre transition" title="Déconnexion">{isLoggingOut?<Loader2 className="w-4 h-4 animate-spin"/>:<LogOut className="w-4 h-4"/>}</button></div></div></aside></>
}
