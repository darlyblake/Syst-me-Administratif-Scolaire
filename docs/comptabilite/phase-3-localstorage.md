# Phase 3 — Migration vers une vraie base de données

## Objectif
Préparer la transition depuis localStorage vers une base de données fiable, sécurisée et exploitable en production.

## Contrainte
- La phase 1 et 2 restent compatibles avec le stockage local.
- La migration se fait sans casser la logique métier déjà conçue.

## Résultat attendu à la fin de la phase
- Le service comptable fonctionne avec une base de données persistante.
- Les règles métier sont conservées.
- Le système devient stable, traçable et scalable.

## Architecture cible
### 1. Base de données relationnelle
Recommandation suggérée : PostgreSQL.

Tables à prévoir :
- `comptes`
- `mouvements`
- `pieces_comptables`
- `ecritures`
- `paiements`
- `depenses`
- `fiches_paie`
- `utilisateurs`
- `audit_logs`

### 2. Couche API
Créer une API dédiée pour :
- créer une transaction
- valider une pièce
- enregistrer une dépense
- générer un rapport
- exporter un état

### 3. Mapping métier
Mettre en place un mapping entre les concepts actuels et la base de données :
- `localStorage` → `table de persistence`
- `service façade` → `API / repository`
- `journal local` → `journal SQL`

## Tâches techniques
1. Définir le schéma de données des comptes et écritures.
2. Migrer les données existantes depuis localStorage vers la base.
3. Séparer la logique métier des couches de stockage.
4. Ajouter les contrôles d’intégrité et de cohérence.
5. Créer les rôles d’accès pour le comptable, le directeur et le service financier.
6. Ajouter le journal d’audit pour toutes les opérations sensibles.

## Critères d’acceptation
- La persistance locale n’est plus la source de vérité.
- Les données sont sauvegardées en base avec traçabilité.
- Le service reste compatible avec les règles métier déjà établies.

## Recommandation finale
Une vraie base de données doit être introduite uniquement après la stabilisation de la logique métier actuelle. Cela évite de reconstruire en même temps la structure et le stockage.
