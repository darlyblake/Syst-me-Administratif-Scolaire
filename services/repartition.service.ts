import type { DonneesEleve, Classe, ResultatRepartitionGenre, ModeRepartition } from "@/types/models"
import { serviceClasses } from "./classes.service"
import { serviceEleves } from "./eleves.service"

type SexeNorm = "M" | "F" | "autre"

function normaliserSexe(sexe?: string): SexeNorm {
  if (!sexe) return "autre"
  const s = sexe.trim().toUpperCase()
  if (s === "M" || s === "MASCULIN" || s === "GARCON" || s === "GARÇON" || s === "H") return "M"
  if (s === "F" || s === "FEMININ" || s === "FÉMININ" || s === "FILLE") return "F"
  return "autre"
}

interface SnapshotClasse {
  id: string
  nom: string
  capacite: number
  /** ids élèves déjà assignés dans ce snapshot */
  elevesIds: string[]
  countM: number
  countF: number
  countAutre: number
}

function placesLibres(snap: SnapshotClasse): number {
  return snap.capacite - snap.elevesIds.length
}

function countMemeSexe(snap: SnapshotClasse, sexe: SexeNorm): number {
  if (sexe === "M") return snap.countM
  if (sexe === "F") return snap.countF
  return snap.countAutre
}

/**
 * Construit un snapshot des classes d'un niveau à partir des élèves actuels.
 * On matche eleve.classe sur le NOM de la classe (comme souvent dans ton app).
 * Adapte si tu stockes un classeId.
 */
function buildSnapshots(
  classesNiveau: Classe[],
  eleves: DonneesEleve[]
): SnapshotClasse[] {
  return classesNiveau.map((c) => {
    const dansClasse = eleves.filter(
      (e) => e.statut === "actif" && (e.classe === c.nom || e.classe === c.id)
    )
    let countM = 0
    let countF = 0
    let countAutre = 0
    dansClasse.forEach((e) => {
      const sx = normaliserSexe(e.sexe)
      if (sx === "M") countM++
      else if (sx === "F") countF++
      else countAutre++
    })
    return {
      id: c.id,
      nom: c.nom,
      capacite: c.capacite,
      elevesIds: dansClasse.map((e) => e.id),
      countM,
      countF,
      countAutre,
    }
  })
}

/**
 * Choisit la meilleure classe pour UN élève (équilibrage genre).
 */
function choisirClasseEquilibreGenre(
  snaps: SnapshotClasse[],
  sexeEleve: SexeNorm
): SnapshotClasse | null {
  const candidates = snaps.filter((s) => placesLibres(s) > 0)
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  // 1) minimiser le nb d'élèves du même sexe
  let minMemeSexe = Math.min(...candidates.map((c) => countMemeSexe(c, sexeEleve)))
  let pool = candidates.filter((c) => countMemeSexe(c, sexeEleve) === minMemeSexe)

  // 2) maximiser les places libres
  if (pool.length > 1) {
    const maxPlaces = Math.max(...pool.map((c) => placesLibres(c)))
    pool = pool.filter((c) => placesLibres(c) === maxPlaces)
  }

  // 3) aléatoire si encore plusieurs
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Applique l'ajout d'un élève dans le snapshot (mémoire seule, pas encore DB).
 */
function ajouterAuSnapshot(snap: SnapshotClasse, eleveId: string, sexe: SexeNorm) {
  snap.elevesIds.push(eleveId)
  if (sexe === "M") snap.countM++
  else if (sexe === "F") snap.countF++
  else snap.countAutre++
}

/**
 * Choisit une classe au hasard parmi celles qui ont de la place.
 */
function choisirClasseAleatoire(snaps: SnapshotClasse[]): SnapshotClasse | null {
  const candidates = snaps.filter((s) => placesLibres(s) > 0)
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Choisit une classe en équilibrant par âge (round-robin sur les élèves triés par date de naissance).
 */
function choisirClasseParAge(
  snaps: SnapshotClasse[],
  dateNaissance?: string
): SnapshotClasse | null {
  const candidates = snaps.filter((s) => placesLibres(s) > 0)
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  // Choisir la classe avec le plus de places libres
  const maxPlaces = Math.max(...candidates.map((c) => placesLibres(c)))
  const pool = candidates.filter((c) => placesLibres(c) === maxPlaces)

  return pool[Math.floor(Math.random() * pool.length)]
}

class ServiceRepartition {
  /**
   * Prévisualise (ou calcule) une répartition équilibrée par genre
   * pour tous les élèves fournis sur un niveau donné.
   *
   * @param niveau - ex. "6ème"
   * @param elevesARepartir - élèves à placer (souvent tous les actifs du niveau, ou seulement non affectés)
   * @param repartirDepuisZero - si true, on ignore les classes actuelles et on repartit tout
   */
  previsualiserEquilibreGenre(
    niveau: string,
    elevesARepartir: DonneesEleve[],
    repartirDepuisZero = false
  ): ResultatRepartitionGenre {
    const classesNiveau = serviceClasses
      .obtenirToutesLesClasses()
      .filter((c) => c.niveau === niveau)

    if (classesNiveau.length === 0) {
      return {
        affectations: [],
        nonAffectes: elevesARepartir.map((e) => ({
          eleveId: e.id,
          raison: "Aucune classe pour ce niveau",
        })),
        resume: [],
      }
    }

    // Une seule classe → tout le monde dedans (si place)
    if (classesNiveau.length === 1) {
      const seule = classesNiveau[0]
      const elevesActuels = serviceEleves.obtenirTousLesEleves()
      const snaps = buildSnapshots([seule], repartirDepuisZero ? [] : elevesActuels)
      const affectations: ResultatRepartitionGenre["affectations"] = []
      const nonAffectes: ResultatRepartitionGenre["nonAffectes"] = []

      for (const eleve of elevesARepartir) {
        if (placesLibres(snaps[0]) <= 0) {
          nonAffectes.push({ eleveId: eleve.id, raison: "Classe complète" })
          continue
        }
        const sx = normaliserSexe(eleve.sexe)
        ajouterAuSnapshot(snaps[0], eleve.id, sx)
        affectations.push({
          eleveId: eleve.id,
          classeId: seule.id,
          classeNom: seule.nom,
        })
      }

      return {
        affectations,
        nonAffectes,
        resume: snaps.map((s) => ({
          classeId: s.id,
          classeNom: s.nom,
          total: s.elevesIds.length,
          capacite: s.capacite,
          M: s.countM,
          F: s.countF,
          autre: s.countAutre,
        })),
      }
    }

    // Plusieurs classes
    const elevesActuels = serviceEleves.obtenirTousLesEleves()
    const snaps = buildSnapshots(
      classesNiveau,
      repartirDepuisZero ? [] : elevesActuels.filter((e) => !elevesARepartir.some((r) => r.id === e.id))
    )

    // Ordre de traitement : alterner un peu F/M pour un meilleur équilibre global
    // (les élèves sans sexe à la fin)
    const tries = [...elevesARepartir].sort((a, b) => {
      const sa = normaliserSexe(a.sexe)
      const sb = normaliserSexe(b.sexe)
      const rank = (s: SexeNorm) => (s === "F" ? 0 : s === "M" ? 1 : 2)
      return rank(sa) - rank(sb)
    })

    // Alternance F/M : on sépare puis on zip
    const filles = tries.filter((e) => normaliserSexe(e.sexe) === "F")
    const garcons = tries.filter((e) => normaliserSexe(e.sexe) === "M")
    const autres = tries.filter((e) => normaliserSexe(e.sexe) === "autre")
    const ordreAlternee: DonneesEleve[] = []
    const maxLen = Math.max(filles.length, garcons.length)
    for (let i = 0; i < maxLen; i++) {
      if (i < filles.length) ordreAlternee.push(filles[i])
      if (i < garcons.length) ordreAlternee.push(garcons[i])
    }
    ordreAlternee.push(...autres)

    const affectations: ResultatRepartitionGenre["affectations"] = []
    const nonAffectes: ResultatRepartitionGenre["nonAffectes"] = []

    for (const eleve of ordreAlternee) {
      const sx = normaliserSexe(eleve.sexe)
      const choisie = choisirClasseEquilibreGenre(snaps, sx)
      if (!choisie) {
        nonAffectes.push({ eleveId: eleve.id, raison: "Plus de place sur le niveau" })
        continue
      }
      ajouterAuSnapshot(choisie, eleve.id, sx)
      affectations.push({
        eleveId: eleve.id,
        classeId: choisie.id,
        classeNom: choisie.nom,
      })
    }

    return {
      affectations,
      nonAffectes,
      resume: snaps.map((s) => ({
        classeId: s.id,
        classeNom: s.nom,
        total: s.elevesIds.length,
        capacite: s.capacite,
        M: s.countM,
        F: s.countF,
        autre: s.countAutre,
      })),
    }
  }

  /**
   * Prévisualise une répartition aléatoire.
   */
  previsualiserAleatoire(
    niveau: string,
    elevesARepartir: DonneesEleve[],
    repartirDepuisZero = false
  ): ResultatRepartitionGenre {
    const classesNiveau = serviceClasses
      .obtenirToutesLesClasses()
      .filter((c) => c.niveau === niveau)

    if (classesNiveau.length === 0) {
      return {
        affectations: [],
        nonAffectes: elevesARepartir.map((e) => ({
          eleveId: e.id,
          raison: "Aucune classe pour ce niveau",
        })),
        resume: [],
      }
    }

    const elevesActuels = serviceEleves.obtenirTousLesEleves()
    const snaps = buildSnapshots(
      classesNiveau,
      repartirDepuisZero ? [] : elevesActuels.filter((e) => !elevesARepartir.some((r) => r.id === e.id))
    )

    const affectations: ResultatRepartitionGenre["affectations"] = []
    const nonAffectes: ResultatRepartitionGenre["nonAffectes"] = []

    // Mélanger les élèves pour l'aléatoire
    const tries = [...elevesARepartir].sort(() => Math.random() - 0.5)

    for (const eleve of tries) {
      const choisie = choisirClasseAleatoire(snaps)
      if (!choisie) {
        nonAffectes.push({ eleveId: eleve.id, raison: "Plus de place sur le niveau" })
        continue
      }
      const sx = normaliserSexe(eleve.sexe)
      ajouterAuSnapshot(choisie, eleve.id, sx)
      affectations.push({
        eleveId: eleve.id,
        classeId: choisie.id,
        classeNom: choisie.nom,
      })
    }

    return {
      affectations,
      nonAffectes,
      resume: snaps.map((s) => ({
        classeId: s.id,
        classeNom: s.nom,
        total: s.elevesIds.length,
        capacite: s.capacite,
        M: s.countM,
        F: s.countF,
        autre: s.countAutre,
      })),
    }
  }

  /**
   * Prévisualise une répartition par âge (round-robin sur les élèves triés par date de naissance).
   */
  previsualiserParAge(
    niveau: string,
    elevesARepartir: DonneesEleve[],
    repartirDepuisZero = false
  ): ResultatRepartitionGenre {
    const classesNiveau = serviceClasses
      .obtenirToutesLesClasses()
      .filter((c) => c.niveau === niveau)

    if (classesNiveau.length === 0) {
      return {
        affectations: [],
        nonAffectes: elevesARepartir.map((e) => ({
          eleveId: e.id,
          raison: "Aucune classe pour ce niveau",
        })),
        resume: [],
      }
    }

    const elevesActuels = serviceEleves.obtenirTousLesEleves()
    const snaps = buildSnapshots(
      classesNiveau,
      repartirDepuisZero ? [] : elevesActuels.filter((e) => !elevesARepartir.some((r) => r.id === e.id))
    )

    const affectations: ResultatRepartitionGenre["affectations"] = []
    const nonAffectes: ResultatRepartitionGenre["nonAffectes"] = []

    // Trier par date de naissance (plus jeune en premier)
    const tries = [...elevesARepartir].sort((a, b) => {
      if (!a.dateNaissance) return 1
      if (!b.dateNaissance) return -1
      return new Date(a.dateNaissance).getTime() - new Date(b.dateNaissance).getTime()
    })

    // Round-robin sur les classes
    let classeIndex = 0
    for (const eleve of tries) {
      const choisie = choisirClasseParAge(snaps, eleve.dateNaissance)
      if (!choisie) {
        nonAffectes.push({ eleveId: eleve.id, raison: "Plus de place sur le niveau" })
        continue
      }
      const sx = normaliserSexe(eleve.sexe)
      ajouterAuSnapshot(choisie, eleve.id, sx)
      affectations.push({
        eleveId: eleve.id,
        classeId: choisie.id,
        classeNom: choisie.nom,
      })
    }

    return {
      affectations,
      nonAffectes,
      resume: snaps.map((s) => ({
        classeId: s.id,
        classeNom: s.nom,
        total: s.elevesIds.length,
        capacite: s.capacite,
        M: s.countM,
        F: s.countF,
        autre: s.countAutre,
      })),
    }
  }

  /**
   * Applique les affectations (met à jour eleve.classe = nom de la classe).
   */
  appliquerAffectations(
    affectations: { eleveId: string; classeNom: string }[]
  ): { ok: number; erreurs: number } {
    let ok = 0
    let erreurs = 0
    for (const a of affectations) {
      const eleve = serviceEleves.obtenirEleveParId(a.eleveId)
      if (!eleve) {
        erreurs++
        continue
      }
      const updated = { ...eleve, classe: a.classeNom }
      if (serviceEleves.modifierEleve(updated)) ok++
      else erreurs++
    }
    return { ok, erreurs }
  }

  /**
   * Choisit automatiquement une classe pour un élève selon le mode de répartition.
   */
  choisirClassePourEleve(
    eleve: DonneesEleve,
    niveau: string,
    mode: ModeRepartition = "aleatoire"
  ): { classeId: string; classeNom: string } | null {
    const classesNiveau = serviceClasses
      .obtenirToutesLesClasses()
      .filter((c) => c.niveau === niveau)

    if (classesNiveau.length === 0) return null

    // Une seule classe → assignation directe si place
    if (classesNiveau.length === 1) {
      const seule = classesNiveau[0]
      const elevesActuels = serviceEleves.obtenirTousLesEleves()
      const effectif = elevesActuels.filter(
        (e) => e.statut === "actif" && (e.classe === seule.nom || e.classe === seule.id)
      ).length
      if (effectif >= seule.capacite) return null
      return { classeId: seule.id, classeNom: seule.nom }
    }

    // Plusieurs classes → selon le mode
    const snaps = buildSnapshots(classesNiveau, serviceEleves.obtenirTousLesEleves())
    const sx = normaliserSexe(eleve.sexe)

    let choisie: SnapshotClasse | null = null

    switch (mode) {
      case "equilibre_genre":
        choisie = choisirClasseEquilibreGenre(snaps, sx)
        break
      case "par_age":
        choisie = choisirClasseParAge(snaps, eleve.dateNaissance)
        break
      case "aleatoire":
      default:
        choisie = choisirClasseAleatoire(snaps)
        break
    }

    if (!choisie) return null
    return { classeId: choisie.id, classeNom: choisie.nom }
  }

  /**
   * Raccourci : prévisualiser puis appliquer pour un niveau entier selon le mode.
   */
  repartirNiveau(
    niveau: string,
    mode: ModeRepartition = "aleatoire",
    options?: { depuisZero?: boolean; elevesIds?: string[] }
  ): ResultatRepartitionGenre {
    let eleves = serviceEleves
      .obtenirTousLesEleves()
      .filter((e) => e.statut === "actif")

    if (options?.elevesIds?.length) {
      eleves = eleves.filter((e) => options.elevesIds!.includes(e.id))
    } else {
      // Élèves déjà sur une classe de ce niveau OU sans classe
      const classesNiveau = serviceClasses
        .obtenirToutesLesClasses()
        .filter((c) => c.niveau === niveau)
      const noms = new Set(classesNiveau.map((c) => c.nom))
      const ids = new Set(classesNiveau.map((c) => c.id))
      eleves = eleves.filter(
        (e) => !e.classe || noms.has(e.classe) || ids.has(e.classe)
      )
    }

    switch (mode) {
      case "equilibre_genre":
        return this.previsualiserEquilibreGenre(niveau, eleves, options?.depuisZero ?? true)
      case "par_age":
        return this.previsualiserParAge(niveau, eleves, options?.depuisZero ?? true)
      case "aleatoire":
      default:
        return this.previsualiserAleatoire(niveau, eleves, options?.depuisZero ?? true)
    }
  }

  /**
   * Récupère les paramètres de répartition depuis le localStorage.
   */
  obtenirParametres() {
    if (typeof window === "undefined") {
      return {
        modeGlobal: "aleatoire" as ModeRepartition,
        modeParNiveau: {} as Record<string, ModeRepartition>,
        bloquerSiComplet: false,
      }
    }
    const stored = localStorage.getItem("parametresRepartition")
    if (!stored) {
      return {
        modeGlobal: "aleatoire" as ModeRepartition,
        modeParNiveau: {} as Record<string, ModeRepartition>,
        bloquerSiComplet: false,
      }
    }
    try {
      return JSON.parse(stored)
    } catch {
      return {
        modeGlobal: "aleatoire" as ModeRepartition,
        modeParNiveau: {} as Record<string, ModeRepartition>,
        bloquerSiComplet: false,
      }
    }
  }

  /**
   * Sauvegarde les paramètres de répartition dans le localStorage.
   */
  sauvegarderParametres(params: {
    modeGlobal: ModeRepartition
    modeParNiveau: Record<string, ModeRepartition>
    bloquerSiComplet: boolean
  }) {
    if (typeof window !== "undefined") {
      localStorage.setItem("parametresRepartition", JSON.stringify(params))
    }
  }
}

export const serviceRepartition = new ServiceRepartition()
