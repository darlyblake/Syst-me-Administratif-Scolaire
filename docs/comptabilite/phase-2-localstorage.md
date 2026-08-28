# Phase 2 — Comptabilité fonctionnelle et workflow comptable

## Objectif
Transformer le module en un véritable outil de gestion comptable exploitable en local, avec une logique de validation et de reporting.

## Contrainte
- Le stockage reste localStorage pour cette phase.
- L’interface reste accessible côté navigateur, sans backend.
- Les règles doivent être structurées pour pouvoir être portées ensuite vers une base de données.

## Résultat attendu à la fin de la phase
- Les transactions peuvent être validées, suivies et rapportées.
- Les dépenses, salaires et paiements sont rattachés à des comptes et catégories cohérents.
- Le comptable peut suivre le flux financier de manière professionnelle.

## Fonctionnalités à ajouter
### 1. Workflow de validation
Ajouter un statut de cycle pour chaque opération :
- `brouillon`
- `valide`
- `payee`
- `annule`

### 2. Journal comptable
Créer des écritures comptables standardisées avec :
- date
- compte
- sens (`debit` / `credit`)
- montant
- description
- pièce de référence

### 3. Rapports internes
Ajouter des rapports simples utiles pour le suivi :
- total entrées / sorties
- solde net
- dépenses par catégorie
- masse salariale
- recettes par mois
- dette scolaire restante

### 4. Paiement de dépenses et salaires
- le montant d’une dépense ne doit pas être “ouvert” à la main
- la paie doit avoir un statut de validation clair
- chaque paiement doit laisser une trace exploitable dans le journal

## Tâches techniques
1. Ajouter une table logique de journal dans le modèle local.
2. Lier les paiements élèves et les dépenses au journal comptable.
3. Ajouter les filtres par période, catégorie et statut.
4. Générer des rapports typés : journal, trésorerie, budget, salaire.
5. Ajouter l’export CSV/PDF local pour les rapports.

## Critères d’acceptation
- Une opération financière ne peut plus être librement incohérente.
- Les états financiers peuvent être calculés à partir des mêmes données.
- L’utilisateur peut vraiment piloter un budget et un solde à partir du système.

## Remarque
Cette phase permet de faire évoluer le projet d’un simple écran de comptabilité vers un vrai outil de gestion financière interne.
