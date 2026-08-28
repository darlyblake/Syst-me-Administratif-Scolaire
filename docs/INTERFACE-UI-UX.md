# Cahier des charges UI/UX — Système Administratif Scolaire

> Document de référence pour toute évolution de l'interface. Codex et les développeurs doivent respecter ce document avant de créer, modifier, remplacer ou supprimer un composant.

## 1. Vision

L'application doit donner l'impression d'un logiciel administratif scolaire sérieux : moderne, clair, rapide à comprendre et agréable à utiliser.

**Objectif principal : efficacité, pas décoration.**

L'utilisateur doit pouvoir :
- comprendre immédiatement où il se trouve ;
- voir les informations importantes sans ouvrir plusieurs fenêtres ;
- réaliser l'action principale sans chercher ;
- comprendre les erreurs et savoir comment les corriger ;
- retrouver la même logique d'un module à l'autre.

L'interface doit être moderne sans reproduire les tendances de dashboards générés par IA.

## 2. Ce qu'il ne faut PAS faire

Interdiction de transformer chaque section en card.

Éviter :
- mur de cards statistiques ;
- gros chiffres décoratifs ;
- gradients décoratifs ;
- glassmorphism ;
- ombres lourdes ;
- énormes arrondis ;
- badges colorés pour des informations ordinaires ;
- icônes devant chaque ligne ;
- animations permanentes ;
- illustrations décoratives sans fonction ;
- interfaces qui ressemblent à une landing page SaaS ;
- boutons d'action partout ;
- modales imbriquées ;
- informations importantes cachées dans des cartes secondaires.

Une card n'est autorisée que lorsqu'elle représente réellement un bloc autonome de contenu ou d'action.

## 3. Style visuel

Le langage visuel doit être :
- sobre ;
- professionnel ;
- contemporain ;
- administratif ;
- cohérent ;
- lisible ;
- dense lorsque les données le nécessitent, mais jamais confus.

Privilégier les bordures fines, les surfaces simples, les espaces réguliers et une hiérarchie typographique nette.

Ne pas introduire une nouvelle palette ou un nouveau système de composants pour chaque module.

## 4. Layout global

Le layout général doit fournir :

1. navigation principale ;
2. zone de contenu ;
3. en-tête de page ;
4. zone d'actions ;
5. contenu principal ;
6. retour visuel après action.

### En-tête de page standard

```text
[Titre]
[Description courte si nécessaire]

                         [Action principale]

[Recherche] [Filtres] [Tri] [Actions secondaires]
```

Le titre décrit la ressource, pas l'action. Exemple : `Classes`, pas `Gérer vos classes maintenant`.

## 5. Navigation

La navigation doit être stable dans toute l'application.

Les modules doivent être regroupés par métier plutôt que par technologie.

Exemple de logique :

- Tableau de bord
- Scolarité
  - Élèves
  - Classes
  - Enseignants
  - Matières
  - Emploi du temps
- Vie scolaire
  - Présences
  - Absences
  - Discipline
- Finances
  - Paiements
  - Comptabilité
- Communication
- Administration
  - Personnel
  - Paramètres

L'ordre exact dépend de la navigation existante, mais la logique doit rester stable.

## 6. Page de liste standard

Une page qui gère une collection doit utiliser cette structure :

```text
Titre + contexte

Résumé compact si utile

Recherche / filtres / tri

Tableau ou liste

Pagination / informations de résultat
```

### Tableau

À utiliser lorsque l'utilisateur doit comparer plusieurs enregistrements.

Les colonnes doivent correspondre aux décisions que l'utilisateur doit prendre.

Les actions secondaires doivent être dans une colonne d'actions ou un menu contextuel.

Ne pas transformer chaque ligne en card.

## 7. Page de détail

Une page de détail doit montrer les informations selon leur importance.

Structure recommandée :

```text
← Retour

Titre de la ressource                     [Action principale]
Informations d'identification

Informations principales

Données associées

Historique / activité si pertinent
```

Les informations doivent rester visibles. Éviter de cacher chaque section derrière un accordéon.

## 8. Formulaires

Les formulaires doivent être organisés par groupes logiques.

```text
Informations générales
----------------------
Champ       Champ
Champ       Champ

Informations complémentaires
-----------------------------
Champ       Champ

                         [Annuler] [Enregistrer]
```

Règles :
- labels toujours explicites ;
- placeholders ne remplacent pas les labels ;
- champs obligatoires clairement identifiés ;
- erreurs sous ou près du champ ;
- bouton de sauvegarde avec état de chargement ;
- fermeture d'une modale avec formulaire modifié = confirmation si risque de perte de données.

## 9. Modales

Une modale doit servir à une tâche courte et focalisée.

Utiliser une modale pour :
- création rapide ;
- modification courte ;
- confirmation destructive ;
- détail secondaire simple.

Utiliser une vraie page pour :
- formulaire long ;
- workflow complexe ;
- nombreuses données liées ;
- configuration importante.

Ne jamais ouvrir une modale depuis une modale sauf nécessité exceptionnelle.

## 10. Suppression

Toute suppression potentiellement irréversible doit être confirmée.

La confirmation doit dire clairement :
- ce qui sera supprimé ;
- les conséquences éventuelles ;
- l'action permettant d'annuler.

Exemple :

`Supprimer la classe 6e A ? Les élèves associés ne seront pas supprimés.`

Ne jamais utiliser seulement `Êtes-vous sûr ?`.

## 11. Recherche, filtres et tri

La recherche doit être visible et simple.

Les filtres doivent répondre à des besoins réels : niveau, statut, année, classe, etc.

Ne pas afficher dix filtres dès le départ si deux suffisent.

Afficher un résumé des filtres actifs et permettre leur suppression rapidement.

## 12. États obligatoires

Chaque écran de données doit prévoir :

### Chargement
Message ou indicateur discret. Ne pas faire clignoter toute la page.

### Vide
Expliquer pourquoi la liste est vide et proposer l'action suivante.

Exemple :
`Aucune classe n'a encore été créée.`
`Créer une classe`

### Recherche sans résultat
Ne pas afficher le même écran que l'état vide global.

Exemple :
`Aucune classe ne correspond à « 6e B ».`

### Erreur
Expliquer le problème et proposer `Réessayer` lorsque possible.

### Mutation
Le bouton concerné doit indiquer que l'action est en cours et éviter les doubles soumissions.

## 13. Notifications et feedback

Utiliser les toasts/notifications uniquement pour les retours courts.

Exemples :
- `Classe créée.`
- `Enseignant affecté.`
- `Modifications enregistrées.`

Ne pas afficher un toast pour remplacer une information importante qui doit rester dans la page.

## 14. Statistiques

Les statistiques sont secondaires.

Préférer :

`24 classes · 812 élèves · 34 enseignants`

plutôt que trois ou quatre grandes cards.

Si une statistique nécessite réellement une visualisation, le graphique doit répondre à une question métier précise.

## 15. Module Classes — interface cible

### Liste

```text
Classes                                      [Nouvelle classe]
Gérez les classes et leurs effectifs.

24 classes · 812 élèves

[Rechercher une classe...] [Niveau ▼] [Plus de filtres]

┌──────────┬─────────┬────────┬──────────────┬─────────────┐
│ Classe   │ Niveau  │ Élèves │ Responsable  │ Actions     │
├──────────┼─────────┼────────┼──────────────┼─────────────┤
│ 6e A     │ Collège │ 32     │ M. ...       │ ...         │
│ 6e B     │ Collège │ 29     │ Mme ...      │ ...         │
└──────────┴─────────┴────────┴──────────────┴─────────────┘
```

### Détail

```text
← Classes

6e A                                      [Modifier]
Collège · 32 élèves · Responsable : ...

Élèves
[Recherche] [Filtres]
Tableau/liste des élèves

Enseignants
Responsables et matières

Horaires
Emploi du temps de la classe

Actions
Répartition / export / autres actions pertinentes
```

Les élèves, enseignants et horaires ne doivent pas être artificiellement présentés comme trois grosses cards décoratives.

## 16. Module Enseignants

La liste doit privilégier un tableau :

```text
Enseignants                              [Nouvel enseignant]

[Recherche] [Statut] [Matière]

Nom | Matières | Classes | Statut | Actions
```

La page détail doit montrer les informations professionnelles, les classes associées et les matières.

Les composants réutilisables entre Enseignants et Classes doivent être mutualisés lorsqu'ils ont réellement la même responsabilité.

## 17. Module Élèves

Priorité à la recherche rapide et aux informations utiles.

```text
Élèves                                  [Nouvel élève]

[Rechercher un élève...] [Classe ▼] [Statut ▼]

Nom | Classe | Responsable | Statut | Actions
```

La fiche élève doit organiser les données par domaine : identité, scolarité, responsables, présence, finances et documents selon les permissions.

## 18. Modules financiers

Les écrans financiers doivent privilégier la précision.

Éviter les couleurs décoratives et les graphiques inutiles.

Utiliser :
- tableaux ;
- montants alignés ;
- dates ;
- statuts explicites ;
- filtres par période ;
- export lorsque nécessaire.

Les informations financières sensibles doivent être masquées selon les permissions.

## 19. Tableau de bord

Le dashboard ne doit pas être une collection de 10 cards.

Il doit répondre à : `Que dois-je savoir ou faire maintenant ?`

Structure :

```text
Bonjour / contexte

À traiter maintenant
- validations en attente
- absences à vérifier
- paiements à contrôler

Résumé de l'établissement
Données essentielles

Activité récente
```

Adapter le contenu au rôle de l'utilisateur.

## 20. Permissions et interface

L'interface doit refléter les permissions sans considérer cela comme une sécurité suffisante.

Un utilisateur ne doit pas voir une action qu'il n'a pas le droit d'utiliser lorsque cela peut être évité.

Mais le backend doit également contrôler l'autorisation.

Rôles prévus :
- administrateur de l'établissement ;
- direction ;
- secrétariat ;
- comptabilité ;
- surveillance ;
- autres rôles futurs selon le modèle métier.

L'administrateur a la vision la plus large de son établissement. Les autres rôles voient uniquement les informations nécessaires à leur fonction.

## 21. Réutilisation des composants

### À créer / centraliser

- `PageHeader` : titre, description, action principale ;
- `DataTable` : tableau administratif commun ;
- `SearchInput` : recherche cohérente ;
- `FilterBar` : filtres ;
- `EmptyState` : état vide ;
- `ErrorState` : erreur + retry ;
- `LoadingState` : chargement ;
- `ConfirmDialog` : confirmation destructive ;
- `FormField` : cohérence des champs ;
- `ActionMenu` : actions secondaires ;
- `StatusBadge` uniquement lorsque le statut nécessite réellement un repère visuel.

Avant de créer un composant, rechercher s'il existe déjà un composant équivalent.

### À réutiliser

Réutiliser les composants existants lorsqu'ils :
- ont la bonne responsabilité ;
- sont suffisamment génériques ;
- respectent le nouveau design ;
- ne contiennent pas de logique métier spécifique inutile.

### À supprimer ou fusionner

Les composants suffixés `Fixed`, `New`, `V2`, `Final`, `Improved` ou similaires ne doivent pas être conservés simplement parce qu'ils existent.

Comparer leur contenu avec la version principale. Garder une seule implémentation propre lorsque les responsabilités sont identiques.

Supprimer les wrappers inutiles et les composants qui ne font que transmettre des props sans apporter de responsabilité.

## 22. Composants spécifiques

Un composant spécifique est justifié lorsqu'il encapsule une vraie responsabilité métier ou UI.

Exemple acceptable : `TeacherAssignmentModal`.

Exemple à éviter : `BlueRoundedCardForTeacher`.

Le nom doit décrire la responsabilité, pas le style visuel.

## 23. Responsive

### Desktop
Tableaux complets, navigation persistante, actions visibles.

### Tablette
Réduire les colonnes secondaires et conserver les actions essentielles.

### Mobile
Ne pas afficher un tableau desktop minuscule.

Selon le module :
- transformer certaines lignes en liste structurée ;
- masquer les colonnes secondaires ;
- déplacer les actions dans un menu ;
- conserver recherche et filtres accessibles.

Les formulaires doivent passer en une colonne si nécessaire.

## 24. Accessibilité

- HTML sémantique ;
- labels explicites ;
- navigation clavier ;
- focus visible ;
- boutons réellement accessibles ;
- modales avec focus correct ;
- `aria-label` uniquement lorsqu'un nom accessible n'est pas déjà fourni ;
- ne jamais transmettre une information uniquement par la couleur.

## 25. Architecture UI

Le composant UI ne doit pas devenir la couche métier.

Préférer :

```text
page.tsx
   ↓
useClasses()
   ↓
classes.service.ts
   ↓
localStorage
```

Même logique pour les autres domaines.

Quand Supabase sera introduit plus tard, le frontend ne devra pas être entièrement réécrit : la couche service pourra évoluer vers Supabase.

## 26. Règle localStorage actuelle

Pour la phase actuelle, `localStorage` reste la source de persistance.

Ne pas introduire Supabase pendant la refonte UI/UX.

Ne pas mélanger migration de données et refonte visuelle.

La migration vers Supabase fera l'objet d'une phase dédiée après stabilisation du frontend.

## 27. Workflow obligatoire avant modification d'une page

1. Identifier le module.
2. Lire la page actuelle.
3. Chercher les composants utilisés.
4. Chercher les hooks.
5. Chercher les services.
6. Chercher les types.
7. Chercher les pages qui réutilisent les composants concernés.
8. Identifier les fonctionnalités existantes.
9. Identifier les permissions.
10. Définir la nouvelle structure UI.
11. Réutiliser ou créer les composants nécessaires.
12. Supprimer les doublons uniquement après vérification.
13. Tester les états loading/empty/error.
14. Tester desktop et mobile.
15. Vérifier lint/typecheck/build.

## 28. Critères d'acceptation d'une nouvelle page

Une page n'est considérée terminée que si :

- [ ] elle est immédiatement compréhensible ;
- [ ] son action principale est évidente ;
- [ ] les données principales sont accessibles sans navigation inutile ;
- [ ] elle n'utilise pas des cards uniquement pour décorer ;
- [ ] elle respecte le système visuel commun ;
- [ ] elle gère chargement, vide et erreur ;
- [ ] elle est responsive ;
- [ ] elle est accessible ;
- [ ] elle respecte les permissions d'interface ;
- [ ] elle utilise les hooks/services prévus ;
- [ ] elle ne duplique pas un composant existant ;
- [ ] elle ne casse pas une fonctionnalité existante ;
- [ ] TypeScript/lint/build passent.

## 29. Règle finale

**Quand un choix oppose esthétique et efficacité, choisir l'efficacité.**

**Quand un choix oppose nouveauté et cohérence, choisir la cohérence.**

**Quand un choix oppose complexité et simplicité, choisir la simplicité.**

L'application doit être moderne parce qu'elle est bien conçue, pas parce qu'elle contient beaucoup d'effets visuels.
