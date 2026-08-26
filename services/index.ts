const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Index des services
 * Réexporte tous les services de l'application
 */

export { serviceAuthentification } from "./authentification.service"
export { serviceEleves } from "./eleves.service"
export { servicePaiements } from "./paiements.service"
export { serviceStatistiques } from "./statistiques.service"
export { serviceEnseignants } from "./enseignants.service"
