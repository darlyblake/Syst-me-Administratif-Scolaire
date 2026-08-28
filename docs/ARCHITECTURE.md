# Architecture technique

## 1. Principe général

Le projet suit une séparation progressive des responsabilités :

```text
UI / Page
   ↓
Hook de domaine
   ↓
Service
   ↓
Source de données
```

Pendant la phase actuelle, la source de données reste `localStorage` lorsque le module l'utilise.

Le but est de pouvoir remplacer cette couche par Supabase plus tard sans refaire toute l'interface.

## 2. Pages et composants

Une page doit orchestrer l'affichage et les interactions principales. Elle ne doit pas devenir le lieu où sont stockées toutes les règles métier.

Les composants réutilisables doivent rester spécialisés : tableau, formulaire, modal, filtre, détail, etc.

Éviter les composants monolithiques qui connaissent tous les domaines de l'application.

## 3. Hooks

Les hooks constituent la façade de gestion pour les pages.

Ils peuvent centraliser :

- chargement ;
- erreurs ;
- mutations ;
- rafraîchissement ;
- données dérivées ;
- filtrage nécessaire à l'interface ;
- état des formulaires lorsque cela est pertinent.

Un hook ne doit pas mélanger des responsabilités sans rapport.

## 4. Services

Les services encapsulent les opérations sur les données.

Ils doivent fournir une API claire au hook et éviter que les composants connaissent les détails du stockage.

### Phase localStorage

Les services peuvent utiliser `localStorage`, mais cette dépendance doit rester confinée à la couche service lorsque cela est possible.

### Phase Supabase

La migration future remplacera la source locale par Supabase. Les contrats utilisés par les hooks devront être conservés autant que possible.

## 5. Classes

Le domaine Classes comprend plusieurs responsabilités liées :

```text
Classes
 ├── informations de classe
 ├── effectifs
 ├── élèves
 ├── enseignants
 ├── répartition
 └── horaires
```

Ces responsabilités peuvent collaborer, mais ne doivent pas être fusionnées dans un seul composant ou hook géant.

La page principale doit rester orientée gestion : recherche, filtres, tableau, création, modification, consultation et actions contextuelles.

## 6. Multi-établissement

Le futur modèle de données doit permettre :

```text
Établissement
   ├── utilisateurs
   ├── classes
   ├── élèves
   ├── enseignants
   ├── paiements
   └── autres données métier
```

Chaque ressource appartenant à un établissement devra être rattachée à celui-ci.

Le backend devra empêcher qu'un utilisateur puisse changer simplement un identifiant pour accéder aux données d'un autre établissement.

## 7. Permissions

Le frontend peut masquer ou désactiver les actions non autorisées pour améliorer l'expérience utilisateur.

Cependant, l'autorisation réelle devra être appliquée côté backend/base de données.

Le modèle cible distingue notamment administrateur d'établissement, comptabilité, secrétariat, direction et surveillance.

## 8. UI/UX

La direction visuelle est celle d'un logiciel administratif professionnel.

### Structure privilégiée

```text
Titre + contexte
        ↓
Recherche / filtres / action principale
        ↓
Tableau ou liste
        ↓
Actions contextuelles
        ↓
Modal / page de détail si nécessaire
```

Les cards sont autorisées lorsqu'elles représentent réellement une unité logique, mais elles ne doivent pas devenir le composant par défaut de toute l'application.

## 9. États d'interface

Chaque flux doit prévoir au minimum :

- chargement ;
- succès ;
- liste vide ;
- aucun résultat ;
- erreur ;
- mutation en cours ;
- confirmation si nécessaire.

## 10. Validation des données

Les formulaires doivent utiliser les mécanismes de validation déjà présents dans le projet lorsque ceux-ci sont adaptés, notamment React Hook Form et Zod.

Les données provenant d'une source externe doivent être validées avant d'être considérées comme fiables.

## 11. Performance

Éviter :

- appels de service répétés à chaque rendu ;
- effets React inutiles ;
- calculs coûteux sans nécessité ;
- chargement de données non utilisées.

Pour les grandes listes, utiliser pagination, filtrage ou virtualisation selon le besoin réel.

## 12. Sécurité future avec Supabase

La migration devra prévoir :

- authentification ;
- rôles et permissions ;
- isolation par établissement ;
- RLS ;
- policies de lecture et d'écriture ;
- validation des mutations ;
- protection des données personnelles ;
- séparation des secrets serveur et du frontend.

La conception du frontend ne doit jamais supposer qu'une donnée est sûre simplement parce qu'elle est masquée dans l'interface.

## 13. Évolution

Les changements doivent être progressifs :

1. stabiliser l'interface ;
2. stabiliser la logique métier locale ;
3. tester les parcours ;
4. définir le modèle Supabase ;
5. migrer les services ;
6. mettre en place RLS et permissions ;
7. tester les scénarios multi-utilisateurs et multi-établissements.
