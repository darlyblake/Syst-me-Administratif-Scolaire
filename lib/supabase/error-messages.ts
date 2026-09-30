export function messageErreurFinance(error: unknown, fallback = "Impossible d’enregistrer l’opération.") {
  const raw = error instanceof Error ? error.message : String(error ?? "")
  const text = raw.toLowerCase()

  if (
    text.includes("account_id") ||
    text.includes("accounting_transactions") ||
    text.includes("violates not-null constraint")
  ) {
    return "Impossible d’enregistrer l’opération comptable. La configuration financière de l’établissement est incomplète. Veuillez vérifier les comptes comptables ou contacter l’administrateur."
  }

  if (text.includes("echeance") && text.includes("precedente")) {
    return "Cette échéance ne peut pas encore être payée. Vous devez d’abord solder l’échéance précédente."
  }

  if (text.includes("deja soldee") || text.includes("déjà soldée")) {
    return "Cette échéance est déjà entièrement payée."
  }

  if (text.includes("montant") && text.includes("depasse")) {
    return "Le montant saisi dépasse le reste à payer de cette échéance."
  }

  if (text.includes("permission insuffisante")) {
    return "Vous n’avez pas l’autorisation d’enregistrer un paiement."
  }

  if (text.includes("authentification requise")) {
    return "Votre session a expiré. Veuillez vous reconnecter puis réessayer."
  }

  if (text.includes("pgrst") || text.includes("postgres") || text.includes("sql") || text.includes("constraint")) {
    return fallback
  }

  return raw && raw.length < 180 ? raw : fallback
}
