export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]+/g, ".").replace(/\.{2,}/g, ".").replace(/^\.|\.$/g, "")
}

export function buildUsername(firstName: string, lastName: string): string {
  const first = normalizeUsername(firstName).split(".")[0]
  const last = normalizeUsername(lastName).replace(/\./g, "")
  return normalizeUsername(`${first}.${last}`)
}

/** Le formulaire accepte un identifiant généré ou une adresse email. */
export function isUsernameOrEmail(value: string): boolean {
  const v = value.trim()
  return v.length >= 3 && (v.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^[a-z0-9._-]+$/i.test(v))
}

/** Génère un mot de passe initial lisible d'au moins 10 caractères. */
export function generateInitialPassword(firstName: string, year = new Date().getFullYear()): string {
  const name = normalizeUsername(firstName).replace(/[^a-z0-9]/g, "").slice(0, 5) || "NOVA"
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}-${year}!9`
}
