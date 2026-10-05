# Système Administratif Scolaire

Application de gestion administrative scolaire destinée à centraliser les opérations d'un établissement dans une interface simple, moderne et professionnelle.

> **Phase actuelle : frontend et logique métier locale.** Le projet conserve actuellement `localStorage` comme source de données afin de stabiliser les interfaces et les flux avant la création et l'intégration du projet Supabase définitif.

## Objectifs

- Simplifier le travail quotidien du personnel scolaire.
- Donner à chaque rôle uniquement les outils et informations nécessaires.
- Centraliser les élèves, enseignants, classes et opérations administratives.
- Préparer une architecture multi-établissement.
- Garder une interface professionnelle, sobre et rapide à comprendre.
- Permettre une future migration vers Supabase sans réécrire toute l'interface.

## Stack

Le frontend repose principalement sur :

- **Next.js 15**
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Radix UI**
- **React Hook Form + Zod** pour les formulaires et validations
- **Lucide React** pour les icônes
- **Jest** pour les tests
- **Capacitor** pour la synchronisation mobile
- **Electron** pour la version desktop

Les scripts principaux sont `npm run dev`, `npm run build`, `npm run lint`, `npm test`, `npm run sync:mobile`, `npm run electron:dev` et `npm run electron:build:win`.

## Architecture

La règle d'architecture est :

```text
Page / composant UI
        ↓
Hook de domaine
        ↓
Service
        ↓
Source de données
        ↓
localStorage (phase actuelle)
```

Les pages ne doivent pas contenir toute la logique métier. Les hooks servent de couche de gestion et les services encapsulent l'accès aux données.

Cette séparation permet de remplacer ensuite `localStorage` par Supabase avec un impact limité sur l'interface.

## Gestion des rôles

Le modèle cible est multi-établissement :

| Rôle | Principe d'accès |
|---|---|
| Administrateur établissement | Gestion globale de son établissement selon ses permissions |
| Comptabilité | Données et opérations financières nécessaires |
| Secrétariat | Données administratives nécessaires |
| Direction | Données nécessaires au pilotage |
| Surveillance | Données nécessaires au suivi et à la surveillance |

Les contrôles visibles dans le frontend ne constituent pas une sécurité suffisante. Lors de l'intégration Supabase, les permissions devront être appliquées côté base/API avec isolation par établissement et RLS.

## Direction UI/UX

L'application doit être **moderne, sobre et professionnelle**, avec une identité de logiciel administratif.

### À éviter

- cards partout ;
- dashboards surchargés ;
- dégradés décoratifs ;
- grosses statistiques décoratives ;
- ombres et arrondis excessifs ;
- animations gratuites ;
- esthétique « interface générée par IA ».

### À privilégier

- tableaux pour les données comparables ;
- listes pour les ensembles simples ;
- recherche et filtres ;
- actions contextuelles ;
- formulaires courts et clairs ;
- modales uniquement lorsqu'elles simplifient l'action ;
- états loading, vide et erreur ;
- responsive réel ;
- accessibilité ;
- hiérarchie visuelle et espacements propres.

## Module Classes

Le module Classes doit gérer de manière cohérente :

- création, modification et suppression contrôlée ;
- niveau et informations principales ;
- effectifs et capacité ;
- élèves associés ;
- enseignants associés ;
- répartition ;
- horaires ;
- recherche et filtres ;
- consultation des détails.

Les fonctions liées aux élèves, enseignants, répartition et horaires doivent rester séparées par responsabilité tout en partageant des contrats de données clairs.

## Sécurité

Principes à respecter dès maintenant et lors de la future migration :

- aucun secret dans le frontend ;
- aucune clé privée ou clé de service Supabase côté client ;
- ne jamais considérer l'UI comme un mécanisme d'autorisation ;
- isoler toutes les données par établissement ;
- vérifier l'appartenance des ressources côté backend ;
- utiliser RLS et des policies adaptées avec Supabase ;
- protéger les tokens et abonnements de notifications ;
- rattacher les notifications au bon périmètre métier ;
- conserver les commandes et données personnelles dans le bon contexte utilisateur.

## Développement

Avant une modification importante :

1. Lire la page concernée.
2. Lire ses hooks.
3. Lire les services.
4. Lire les types.
5. Rechercher les composants dépendants.
6. Identifier les fonctionnalités à préserver.
7. Vérifier les permissions et relations avec les autres modules.

Ne pas réécrire un module à l'aveugle.

## Validation

Avant de considérer une modification terminée :

```bash
npm run lint
npm test
npm run build
```

Puis vérifier manuellement les parcours concernés, les états d'erreur, les formulaires, le responsive et la console navigateur.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — règles de travail pour Codex et les agents de développement.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — architecture et principes techniques.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phases de développement et migration future.

## Git

Pour les refactorings importants, privilégier une branche dédiée et une Pull Request. Les commits doivent être courts et explicites. Ne pas faire de force-push sur `main` sans raison exceptionnelle et vérifiée.

<!-- deployment-refresh: 2026-10-05 -->
