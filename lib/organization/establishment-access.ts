export interface EstablishmentMembership {
  user_id: string
  establishment_id: string
  role: string
  active: boolean
}

/**
 * Toute donnée d'établissement doit rester dans le périmètre de l'établissement
 * de l'utilisateur. Cette fonction est une garde frontend; RLS doit rester
 * l'autorité de sécurité côté Supabase.
 */
export function belongsToEstablishment(membership: EstablishmentMembership, establishmentId: string): boolean {
  return membership.active && membership.establishment_id === establishmentId
}
