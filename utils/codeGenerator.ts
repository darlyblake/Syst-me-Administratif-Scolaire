/**
 * Utilitaires pour la génération de codes uniques et QR codes
 */

/**
 * Génère un code unique aléatoire pour un élève
 * Format: ECO-XXXXX-YYYY (où XXXXX est un nombre aléatoire et YYYY l'année)
 */
export function genererCodeUnique(): string {
  const randomPart = Math.floor(10000 + Math.random() * 90000)
  const year = new Date().getFullYear()
  return `ECO-${randomPart}-${year}`
}

/**
 * Génère un code QR à partir d'une chaîne de caractères
 * Note: Pour une vraie implémentation, utiliser une librairie comme qrcode.react
 * Ici on retourne une URL placeholder
 */
export function genererQRCode(data: string): string {
  // Pour l'instant, on utilise un service de QR code en ligne
  // En production, utiliser une librairie côté client
  const encodedData = encodeURIComponent(data)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`
}

/**
 * Valide un code unique
 */
export function validerCodeUnique(code: string): boolean {
  const regex = /^ECO-\d{5}-\d{4}$/
  return regex.test(code)
}

/**
 * Extrait l'année d'un code unique
 */
export function extraireAnneeDuCode(code: string): number | null {
  const match = code.match(/^ECO-\d{5}-(\d{4})$/)
  return match ? parseInt(match[1]) : null
}
