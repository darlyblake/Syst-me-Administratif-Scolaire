# Roadmap du projet

Cette roadmap distingue volontairement la stabilisation du frontend de la migration backend.

## Phase 1 — Frontend et logique locale

**Objectif :** terminer une expérience utilisateur cohérente avant d'introduire Supabase.

- [x] Définir les règles globales du projet.
- [x] Documenter l'architecture.
- [ ] Finaliser tous les modules frontend.
- [ ] Harmoniser les hooks et services.
- [ ] Nettoyer les composants obsolètes ou doublons.
- [ ] Vérifier les parcours de création, modification et suppression.
- [ ] Vérifier tous les états loading/empty/error.
- [ ] Vérifier le responsive.
- [ ] Vérifier l'accessibilité.
- [ ] Stabiliser les tests et le build.

## Phase 2 — Modèle de données

Avant de créer Supabase :

- définir les entités ;
- définir les relations ;
- définir les identifiants ;
- définir l'appartenance à l'établissement ;
- définir les rôles ;
- définir les permissions ;
- définir les contraintes d'intégrité ;
- définir les données sensibles ;
- définir les règles de suppression et d'archivage.

## Phase 3 — Supabase

Créer un projet Supabase dédié et migrer progressivement les services.

Ordre recommandé :

1. authentification ;
2. établissements ;
3. utilisateurs et profils ;
4. élèves ;
5. enseignants ;
6. classes ;
7. relations élèves/classes/enseignants ;
8. modules administratifs ;
9. autres données métier.

## Phase 4 — Sécurité

Mettre en place :

- RLS sur les tables concernées ;
- policies de lecture ;
- policies de création ;
- policies de modification ;
- policies de suppression ;
- isolation stricte par établissement ;
- contrôle des rôles ;
- validation serveur ;
- protection des opérations sensibles.

Tester explicitement qu'un utilisateur d'un établissement A ne peut jamais lire ou modifier les données de l'établissement B.

## Phase 5 — Migration

Pour chaque service :

```text
localStorage service
       ↓
contrat stable
       ↓
Supabase service
       ↓
tests
       ↓
activation progressive
```

Ne pas modifier simultanément toute l'application et la base. Migrer domaine par domaine afin de faciliter le diagnostic et le retour arrière.

## Phase 6 — Production

Avant mise en production :

- build propre ;
- tests ;
- audit des permissions ;
- audit RLS ;
- vérification responsive ;
- vérification des performances ;
- vérification des erreurs ;
- sauvegardes et stratégie de restauration ;
- documentation utilisateur ;
- documentation technique à jour.
