import { supabaseBrowser } from "@/lib/supabase/client"

export interface CreneauEmploiDuTemps {
  id: string
  classeId: string
  classeNom: string
  enseignantId: string
  enseignantNom: string
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi"
  heureDebut: string
  heureFin: string
  matiere: string
  salle: string
  dateCreation: string
  dateModification: string
  matiereId?: string
  classSubjectId?: string
}

export interface EmploiDuTempsClasse {
  classeId: string
  classeNom: string
  creneaux: CreneauEmploiDuTemps[]
}

class ServiceEmploiDuTempsClasses {
  private readonly CLE_STOCKAGE = "emploi_du_temps_classes"

  /**
   * Récupère tous les créneaux d'emploi du temps
   */
  async obtenirTousLesCreneaux(academicYearId?: string): Promise<CreneauEmploiDuTemps[]> {
    let query = supabaseBrowser.from("timetable_slots").select(`
      id,class_subject_id,day_of_week,starts_at,ends_at,room,created_at,updated_at,
      class_subject:class_subjects(class_id,subject_id,teacher_id,school_class:school_classes(name),subject:subjects(name),teacher:teachers(first_name,last_name))
    `).order("day_of_week").order("starts_at")
    if (academicYearId) query = query.eq("academic_year_id", academicYearId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    const jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi"] as const
    return (data ?? []).map((r: any) => ({
      id:r.id, classSubjectId:r.class_subject_id ?? "", classeId:r.class_subject?.class_id ?? "", classeNom:r.class_subject?.school_class?.name ?? "",
      enseignantId:r.class_subject?.teacher_id ?? "",
      enseignantNom:r.class_subject?.teacher ? r.class_subject.teacher.first_name + " " + r.class_subject.teacher.last_name : "",
      jour:jours[Math.max(0,Math.min(5,Number(r.day_of_week)-1))],
      heureDebut:String(r.starts_at).slice(0,5), heureFin:String(r.ends_at).slice(0,5),
      matiere:r.class_subject?.subject?.name ?? "", matiereId:r.class_subject?.subject_id ?? "",
      salle:r.room ?? "", dateCreation:r.created_at, dateModification:r.updated_at
    }))
  }

  /**
   * Récupère les créneaux pour une classe spécifique
   */
  async obtenirCreneauxParClasse(classeId: string, academicYearId?: string): Promise<CreneauEmploiDuTemps[]> {
    const creneaux = await this.obtenirTousLesCreneaux(academicYearId)
    return creneaux.filter(c => c.classeId === classeId)
  }

  async obtenirCreneauxParEnseignant(enseignantId: string, academicYearId?: string): Promise<CreneauEmploiDuTemps[]> {
    const creneaux = await this.obtenirTousLesCreneaux(academicYearId)
    return creneaux.filter(c => c.enseignantId === enseignantId)
  }

  async obtenirCreneauxPourEnseignantEtDate(enseignantId: string, date: string, academicYearId?: string): Promise<CreneauEmploiDuTemps[]> {
    const creneaux = await this.obtenirTousLesCreneaux(academicYearId)
    const dateObj = new Date(date)
    const jourSemaine = this.obtenirJourSemaine(dateObj)
    return creneaux.filter(c => c.enseignantId === enseignantId && c.jour === jourSemaine)
  }

  async verifierCreneauEnseignant(enseignantId: string, date: string, heure: string, academicYearId?: string): Promise<CreneauEmploiDuTemps | null> {
    const creneaux = await this.obtenirCreneauxPourEnseignantEtDate(enseignantId, date, academicYearId)
    const heureMinutes = this.convertirHeureEnMinutes(heure)
    return creneaux.find(c => {
      const debut = this.convertirHeureEnMinutes(c.heureDebut)
      const fin = this.convertirHeureEnMinutes(c.heureFin)
      return heureMinutes >= debut && heureMinutes < fin
    }) ?? null
  }

  async obtenirAffectationsClasse(establishmentId: string, classId: string) {
    const { data, error } = await supabaseBrowser
      .from("class_subjects")
      .select("id,class_id,subject_id,teacher_id,subject:subjects(id,name),teacher:teachers(id,establishment_id,first_name,last_name,profile_id,active)")
      .eq("class_id", classId)
      .order("created_at")
    if (error) throw new Error(error.message)
    return (data ?? []).filter((item: any) => item.teacher?.establishment_id === establishmentId && item.teacher?.active !== false)
  }

  async obtenirClasses(establishmentId: string) {
    const { data, error } = await supabaseBrowser
      .from("school_classes")
      .select("id,name,code,grade_level_id,active")
      .eq("establishment_id", establishmentId)
      .eq("active", true)
      .order("name")
    if (error) throw new Error(error.message)
    return data ?? []
  }

  /**
   * Calcule le nombre total d'heures prévues pour un enseignant dans une période
   */
  async calculerHeuresPrevuesEnseignant(enseignantId: string, debut: string, fin: string, academicYearId?: string): Promise<number> {
    const creneaux = await this.obtenirCreneauxParEnseignant(enseignantId, academicYearId)
    const debutDate = new Date(debut)
    const finDate = new Date(fin)
    
    let totalHeures = 0
    
    // Parcourir chaque jour de la période
    for (let date = new Date(debutDate); date <= finDate; date.setDate(date.getDate() + 1)) {
      const jourSemaine = this.obtenirJourSemaine(date)
      
      // Trouver les créneaux pour ce jour
      const creneauxJour = creneaux.filter(c => c.jour === jourSemaine)
      
      // Calculer les heures pour ce jour
      creneauxJour.forEach(creneau => {
        const debutMinutes = this.convertirHeureEnMinutes(creneau.heureDebut)
        const finMinutes = this.convertirHeureEnMinutes(creneau.heureFin)
        totalHeures += (finMinutes - debutMinutes) / 60
      })
    }
    
    return Math.round(totalHeures * 10) / 10 // Arrondir à 1 décimale
  }

  /**
   * Ajoute un nouveau créneau d'emploi du temps
   */
  async ajouterCreneau(creneau: any): Promise<CreneauEmploiDuTemps> {
    const { data, error } = await supabaseBrowser.from("timetable_slots").insert({
      establishment_id: creneau.establishmentId, academic_year_id: creneau.academicYearId, class_subject_id: creneau.classSubjectId,
      day_of_week: ["lundi","mardi","mercredi","jeudi","vendredi","samedi"].indexOf(creneau.jour)+1,
      starts_at: creneau.heureDebut, ends_at: creneau.heureFin, room: creneau.salle || null
    }).select("id").single()
    if (error) throw new Error(error.message)
    const all=await this.obtenirTousLesCreneaux(creneau.academicYearId)
    return all.find(x=>x.id===data.id) as CreneauEmploiDuTemps
  }

  async mettreAJourCreneau(id:string, donnees:any): Promise<boolean> {
    const p:any={}
    if(donnees.classSubjectId)p.class_subject_id=donnees.classSubjectId
    if(donnees.jour)p.day_of_week=["lundi","mardi","mercredi","jeudi","vendredi","samedi"].indexOf(donnees.jour)+1
    if(donnees.heureDebut)p.starts_at=donnees.heureDebut
    if(donnees.heureFin)p.ends_at=donnees.heureFin
    if(donnees.salle!==undefined)p.room=donnees.salle||null
    const {error}=await supabaseBrowser.from("timetable_slots").update(p).eq("id",id)
    if(error)throw new Error(error.message); return true
  }

  async supprimerCreneau(id:string): Promise<boolean> {
    const {error}=await supabaseBrowser.from("timetable_slots").delete().eq("id",id)
    if(error)throw new Error(error.message); return true
  }

  /**
   * Convertit une date en jour de la semaine
   */
  private obtenirJourSemaine(date: Date): CreneauEmploiDuTemps["jour"] {
    const jours: CreneauEmploiDuTemps["jour"][] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
    const dayIndex = date.getDay()
    // Dimanche (0) est traité comme lundi pour les emplois du temps scolaires
    return jours[dayIndex === 0 ? 0 : dayIndex - 1] || "lundi"
  }

  /**
   * Convertit une heure HH:MM en minutes depuis minuit
   */
  private convertirHeureEnMinutes(heure: string): number {
    const [heures, minutes] = heure.split(':').map(Number)
    return heures * 60 + minutes
  }

  /**
   * Génère les statistiques des emplois du temps
   */
  async genererStatistiques(academicYearId?: string): Promise<{
    totalCreneaux: number
    totalClasses: number
    totalEnseignants: number
    heuresTotales: number
  } {
    const creneaux = await this.obtenirTousLesCreneaux(academicYearId)
    const classesUniques = new Set(creneaux.map(c => c.classeId))
    const enseignantsUniques = new Set(creneaux.map(c => c.enseignantId))
    
    let heuresTotales = 0
    creneaux.forEach(creneau => {
      const debutMinutes = this.convertirHeureEnMinutes(creneau.heureDebut)
      const finMinutes = this.convertirHeureEnMinutes(creneau.heureFin)
      heuresTotales += (finMinutes - debutMinutes) / 60
    })
    
    return {
      totalCreneaux: creneaux.length,
      totalClasses: classesUniques.size,
      totalEnseignants: enseignantsUniques.size,
      heuresTotales: Math.round(heuresTotales * 10) / 10
    }
  }
}

// Instance singleton du service
export const serviceEmploiDuTempsClasses = new ServiceEmploiDuTempsClasses()
