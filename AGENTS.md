# AGENTS.md — Règles de développement du Système Administratif Scolaire

Ce fichier est la référence obligatoire pour Codex et tout agent travaillant sur ce dépôt.

## 1. Objectif du projet

Construire une application de gestion scolaire professionnelle, simple à utiliser au quotidien, moderne sans être artificielle, fiable et maintenable.

Priorité : clarté opérationnelle, efficacité, cohérence, sécurité et non-régression.

## 2. Architecture obligatoire

Respecter la séparation :

`Page/UI → Hook → Service/Domaine → Source de données`

- Les pages et composants présentent les données et déclenchent les actions.
- Les hooks constituent la couche de gestion/orchestration côté interface.
- Les services portent l'accès aux données et les opérations métier de leur domaine.
- Éviter la logique métier complexe dans les composants.
- Lorsqu'un hook de domaine existe, une page doit l'utiliser plutôt que multiplier les appels directs aux services.
- Ne pas créer de hook géant mélangeant plusieurs domaines.
- Une fonctionnalité doit avoir une source de données clairement identifiée.
- Ne pas introduire plusieurs sources concurrentes pour une même donnée sans raison documentée.

## 3. Phase actuelle : frontend + localStorage

Pour la phase actuelle, **localStorage reste volontairement la source de persistance**.

Ne pas introduire Supabase pendant la refonte frontend.

Ne pas mélanger refonte UI, migration de données et création du backend.

L'objectif est de terminer et stabiliser l'interface et la logique métier locale. Supabase sera traité dans une phase ultérieure avec son propre modèle de données, son authentification, ses RLS et ses tests.

Le code doit néanmoins être organisé pour permettre plus tard de remplacer la source de données sans réécrire toute l'interface.

## 4. Multi-établissement et gestion municipale future

L'application doit être conçue pour évoluer vers une gestion de plusieurs établissements.

Règles métier futures à préserver dès maintenant dans la structure :

- L'administrateur de l'établissement possède la vision la plus large des données de son établissement.
- Le service comptabilité ne doit accéder qu'aux données nécessaires à la comptabilité.
- Le secrétariat ne doit accéder qu'aux données nécessaires au secrétariat.
- La direction ne doit accéder qu'aux données nécessaires à ses responsabilités.
- La surveillance ne doit accéder qu'aux données nécessaires à la surveillance.
- Les autres rôles futurs doivent avoir des permissions explicites.
- Une donnée d'établissement devra être isolée par `etablissementId` ou mécanisme équivalent.
- Un utilisateur connecté ne doit jamais être considéré automatiquement comme autorisé à toutes les données.

Pendant la phase localStorage, refléter cette séparation dans les hooks, services et composants lorsque cela est pertinent, sans prétendre que l'UI constitue une sécurité backend.

## 5. Sécurité

La sécurité prime sur la commodité.

- Ne jamais mettre de secret, clé privée ou credential sensible dans le frontend.
- Ne jamais exposer une clé de service Supabase côté client.
- Ne jamais considérer un rôle, `userId` ou `etablissementId` fourni uniquement par le navigateur comme une autorisation suffisante pour une opération sensible.
- Lors de l'introduction de Supabase, appliquer RLS et vérifier réellement les policies.
- Une table avec RLS activé mais sans policies correctes n'est pas considérée comme sécurisée.
- Les tokens d'appareil et abonnements push doivent être isolés par utilisateur et protégés par des policies adaptées.
- Les notifications d'une boutique doivent être liées à la boutique concernée et non simplement au vendeur lorsqu'un vendeur peut posséder plusieurs boutiques.
- Les commandes clients doivent rester liées au client concerné.
- Ne jamais mélanger les données de deux boutiques ou deux établissements.
- Les contrôles frontend améliorent l'expérience utilisateur mais ne remplacent jamais les contrôles serveur/base de données.

## 6. Direction UI/UX obligatoire

L'application doit être **moderne, professionnelle, sobre, administrative et claire**.

Elle ne doit pas ressembler à une interface générée par IA ou à un dashboard SaaS à la mode.

### Interdit ou à éviter fortement

- mur de cards ;
- une card pour chaque information ;
- grandes grilles de cartes statistiques ;
- gradients décoratifs ;
- glassmorphism ;
- ombres lourdes ;
- coins excessivement arrondis ;
- badges colorés partout ;
- gros chiffres uniquement décoratifs ;
- icônes devant chaque ligne sans nécessité ;
- animations permanentes ;
- illustrations décoratives sans fonction ;
- interface « AI startup » ;
- boutons partout ;
- modales imbriquées ;
- informations importantes cachées derrière plusieurs clics.

### À privilégier

- hiérarchie typographique nette ;
- espaces blancs maîtrisés ;
- alignements précis ;
- bordures discrètes ;
- surfaces simples ;
- tableaux pour les données administratives ;
- listes lorsque plus adaptées ;
- formulaires courts et structurés ;
- recherche et filtres explicites ;
- actions contextuelles ;
- modales seulement pour les tâches courtes ;
- états vides utiles ;
- messages d'erreur compréhensibles ;
- confirmations pour les actions destructives ;
- responsive réellement pensé, pas seulement compressé.

Une card n'est autorisée que lorsqu'elle représente un bloc autonome de contenu ou d'action.

Le design doit être moderne par sa typographie, ses espacements, ses alignements et ses interactions, pas par des effets décoratifs.

## 7. Layout global

Toutes les pages doivent conserver une structure cohérente :

```text
[Titre]                              [Action principale]
[Description courte si nécessaire]

[Recherche] [Filtres] [Tri] [Actions secondaires]

Contenu principal
```

Le titre décrit la ressource : `Classes`, `Élèves`, `Enseignants`, etc. Éviter les titres marketing.

## 8. Pages de liste

Pour une collection :

1. titre + contexte ;
2. résumé compact si utile ;
3. recherche ;
4. filtres/tri ;
5. tableau ou liste ;
6. pagination ou résumé du nombre de résultats.

Le tableau est prioritaire lorsque l'utilisateur doit comparer plusieurs enregistrements.

Exemple :

`Classe | Niveau | Élèves | Responsable | Actions`

Ne pas transformer chaque ligne en card.

## 9. Pages de détail

Structure recommandée :

```text
← Retour

Nom de la ressource                       [Modifier]
Informations d'identification

Informations principales

Données associées

Historique/activité si pertinent
```

Ne pas cacher inutilement les informations derrière des accordéons.

## 10. Formulaires

Organiser les champs par groupes logiques.

- Labels explicites.
- Placeholder ne remplace jamais un label.
- Champs obligatoires clairement identifiés.
- Validation proche du champ.
- Erreurs compréhensibles.
- Bouton d'enregistrement avec état de chargement.
- Empêcher les doubles soumissions.
- Confirmer la fermeture si des données saisies risquent d'être perdues.

## 11. Modales

Une modale doit correspondre à une tâche courte et focalisée.

Utiliser une modale pour : création rapide, modification courte, confirmation destructive ou détail secondaire simple.

Utiliser une page pour un workflow long, un formulaire complexe, une configuration importante ou beaucoup de données associées.

Éviter les modales imbriquées.

## 12. Suppression

Toute suppression potentiellement irréversible doit être confirmée.

La confirmation doit préciser ce qui sera supprimé et ses conséquences éventuelles.

Ne jamais utiliser uniquement `Êtes-vous sûr ?`.

## 13. Recherche, filtres et tri

La recherche doit être simple et visible.

Les filtres doivent répondre à des besoins réels. Ne pas afficher une dizaine de filtres si deux suffisent.

Les filtres actifs doivent pouvoir être retirés rapidement.

## 14. États d'interface obligatoires

Prévoir lorsque pertinent :

- chargement ;
- liste vide ;
- recherche sans résultat ;
- erreur ;
- action en cours ;
- succès ;
- confirmation.

Un état vide doit expliquer la situation et proposer l'action suivante.

## 15. Feedback utilisateur

Utiliser les toasts pour les retours courts : `Classe créée`, `Modifications enregistrées`, etc.

Ne pas utiliser un toast pour remplacer une information importante qui doit rester visible dans la page.

## 16. Statistiques

Les statistiques sont secondaires.

Préférer une ligne compacte comme :

`24 classes · 812 élèves · 34 enseignants`

plutôt que plusieurs grandes cards.

Un graphique doit répondre à une question métier précise.

## 17. Module Classes

La page principale doit privilégier :

- titre `Classes` ;
- description courte ;
- action `Nouvelle classe` ;
- résumé compact ;
- recherche ;
- filtre niveau/statut lorsque nécessaire ;
- tableau principal ;
- actions contextuelles.

Le tableau doit permettre de voir rapidement :

`Classe | Niveau | Effectif | Responsable | Actions`

La fiche d'une classe doit pouvoir organiser :

- informations générales ;
- élèves ;
- enseignants/responsables ;
- horaires ;
- actions de répartition ;
- autres informations réellement nécessaires.

Ne pas présenter ces domaines comme trois grosses cards décoratives.

## 18. Module Enseignants

Privilégier :

`Nom | Matières | Classes | Statut | Actions`

La fiche enseignant doit organiser les informations professionnelles, classes associées et matières.

Les composants réellement génériques entre Enseignants et Classes doivent être mutualisés.

## 19. Module Élèves

Priorité à la recherche rapide :

`Nom | Classe | Responsable | Statut | Actions`

La fiche élève peut organiser identité, scolarité, responsables, présence, finances et documents selon les permissions.

## 20. Modules financiers

Privilégier précision et lisibilité : tableaux, montants alignés, dates, statuts, filtres par période et exports si nécessaires.

Éviter les graphiques décoratifs.

## 21. Tableau de bord

Le dashboard doit répondre à : `Que dois-je savoir ou faire maintenant ?`

Éviter une collection de cards.

Afficher prioritairement :

- éléments à traiter ;
- validations en attente ;
- absences ou problèmes à vérifier ;
- paiements à contrôler pour les rôles concernés ;
- résumé utile de l'établissement ;
- activité récente.

Le contenu doit varier selon les permissions de l'utilisateur.

## 22. Permissions dans l'interface

L'interface doit refléter les permissions : masquer les actions auxquelles l'utilisateur n'a pas accès lorsque cela améliore la clarté.

Mais l'UI ne constitue jamais le contrôle de sécurité final.

Rôles principaux : administrateur d'établissement, direction, secrétariat, comptabilité, surveillance, et futurs rôles.

## 23. Composants communs à privilégier

Créer ou centraliser si le projet ne possède pas déjà un équivalent correct :

- `PageHeader` ;
- `DataTable` ;
- `SearchInput` ;
- `FilterBar` ;
- `EmptyState` ;
- `ErrorState` ;
- `LoadingState` ;
- `ConfirmDialog` ;
- `FormField` ;
- `ActionMenu` ;
- `StatusBadge` uniquement lorsqu'un statut nécessite réellement un repère visuel.

Avant de créer un composant, rechercher les composants existants.

## 24. Composants à réutiliser

Réutiliser un composant s'il :

- possède la bonne responsabilité ;
- est suffisamment générique ;
- respecte le nouveau système visuel ;
- n'embarque pas de logique métier spécifique inutile.

Ne pas dupliquer un composant uniquement pour changer quelques styles.

## 25. Composants à nettoyer

Les composants nommés `Fixed`, `New`, `V2`, `Final`, `Improved` ou équivalents doivent être considérés comme candidats au nettoyage.

Comparer leur contenu avant suppression. Conserver une seule implémentation propre lorsque deux composants ont la même responsabilité.

Supprimer les wrappers inutiles et composants qui ne font que transmettre des props sans responsabilité claire.

## 26. Responsive

### Desktop
Tableaux complets et navigation confortable.

### Tablette
Réduire les colonnes secondaires sans perdre les actions principales.

### Mobile
Ne pas réduire un tableau desktop jusqu'à le rendre illisible. Adapter en liste structurée, masquer les colonnes secondaires ou utiliser un menu d'actions.

Les formulaires passent en une colonne lorsque nécessaire.

## 27. Accessibilité

- HTML sémantique.
- Labels explicites.
- Focus visible.
- Navigation clavier.
- Boutons réellement accessibles.
- Modales avec focus correct.
- `aria-label` uniquement lorsque le nom accessible n'est pas déjà fourni.
- Ne jamais transmettre une information uniquement par la couleur.

## 28. TypeScript

- Éviter `any` lorsque le type réel est connu.
- Réutiliser les types existants.
- Définir des types précis pour formulaires et réponses.
- Ne pas masquer les erreurs avec `as any`.
- Valider les données externes selon le besoin.

## 29. Performance

- Éviter les appels répétés à chaque rendu.
- Éviter les `useEffect` superflus.
- Ne charger que les données nécessaires à la page.
- Utiliser pagination, filtrage efficace ou virtualisation lorsque les volumes le justifient.
- Ne pas utiliser `useMemo` ou `useCallback` partout sans bénéfice réel.

## 30. Avant de modifier une page

Toujours :

1. lire la page ;
2. rechercher les composants utilisés ;
3. rechercher les hooks ;
4. rechercher les services ;
5. rechercher les types ;
6. rechercher les pages qui utilisent les mêmes composants ;
7. identifier les fonctionnalités existantes ;
8. identifier les permissions ;
9. définir la nouvelle structure ;
10. réutiliser ou créer les composants nécessaires ;
11. vérifier les états ;
12. vérifier responsive et accessibilité ;
13. lancer les vérifications disponibles.

Ne jamais réécrire un gros fichier à l'aveugle.

## 31. Non-régression

Ne jamais supprimer une fonctionnalité existante pour obtenir une interface plus jolie.

Si une refonte UI nécessite une modification de logique métier, identifier clairement ce changement et vérifier son impact.

## 32. Validation

Avant de considérer une modification terminée :

- TypeScript/typecheck ;
- ESLint ;
- tests concernés ;
- build si disponible ;
- console navigateur lorsque possible ;
- navigation ;
- scénarios principaux ;
- états loading/empty/error ;
- responsive ;
- permissions lorsque concernées.

Compiler ne suffit pas.

## 33. Git

Pour une refonte importante, préférer une branche dédiée plutôt que travailler directement sur `main`.

Exemples :

`refactor/classes-architecture`
`fix/ui-permissions`
`feat/emploi-du-temps`

Commits courts et descriptifs :

`refactor(classes): rebuild classes interface`
`fix(classes): prevent duplicate assignment`
`docs(ui): update interface guidelines`

Avant fusion : relire le diff complet.

## 34. Règle de décision

Si le choix est entre une solution spectaculaire et complexe et une solution simple, claire et maintenable, choisir la seconde.

Si le choix est entre nouveauté et cohérence, choisir la cohérence.

Si le choix est entre esthétique et efficacité, choisir l'efficacité.

L'application doit donner l'impression d'avoir été conçue par une équipe professionnelle de logiciels administratifs, pas par un générateur de dashboards IA.

## 35. Checklist finale

- [ ] Fonctionnalités existantes conservées
- [ ] Page → Hook → Service respecté
- [ ] Source de données clairement identifiée
- [ ] Aucun secret côté frontend
- [ ] Permissions vérifiées
- [ ] Isolation établissement prise en compte dans l'architecture
- [ ] Recherche/filtres cohérents
- [ ] Loading/empty/error gérés
- [ ] Interface sobre et professionnelle
- [ ] Pas de cards décoratives inutiles
- [ ] Tableau utilisé lorsque pertinent
- [ ] Responsive vérifié
- [ ] Accessibilité vérifiée
- [ ] Pas de composants doublons inutiles
- [ ] TypeScript correct
- [ ] Lint passé
- [ ] Tests/build passés lorsque disponibles
- [ ] Diff relu
