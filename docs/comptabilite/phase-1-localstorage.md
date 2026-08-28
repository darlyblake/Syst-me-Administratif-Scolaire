# Phase 1 — Base locale et unification des flux

## Objectif
Stabiliser le service comptable en gardant la persistance sur localStorage, tout en préparant une architecture propre pour la migration vers une vraie base de données.

## Contrainte de démarrage
- Utiliser localStorage comme source de vérité temporaire.
- Ne pas dépendre d’un backend pour cette phase.
- Garder le code compatible avec une future migration vers une base SQL/NoSQL.

## Résultat attendu à la fin de la phase
- Un seul flux d’écriture financière opérationnel.
- Une structure de données cohérente dans le navigateur.
- La comptabilité, la paie, les dépenses et les mouvements lisibles et centralisés.

## Architecture proposée pour cette phase
### 1. Service façade unique
Créer un service central de comptabilité qui joue le rôle de point d’entrée unique :
- `serviceComptabiliteFacade`
- reçoit les paiements, dépenses, salaires et mouvements
- normalise les données avant enregistrement

### 2. Standardiser les clés de stockage
Garder les clés localStorage existantes, mais les documenter clairement :
- `paiements`
- `mouvements_financiers`
- `depenses`
- `fiches_paie`
- `employes`
- `comptabilite`

### 3. Réduire les doublons
- le journal comptable doit devenir la source de vérité
- les services secondaires ne doivent plus écrire directement sans passer par la façade

## Tâches techniques
1. Créer une structure de type journal comptable dans localStorage.
2. Uniformiser la création des mouvements entrants/sortants.
3. Valider le schéma des transactions pour éviter les incohérences.
4. Ajouter une couche de normalisation des montants et des références.
5. Garantir que chaque transaction garde :
   - date
   - type
   - catégorie
   - montant
   - description
   - référence
   - statut

## Comment réaliser la phase 1

### 1. Introduire une façade comptable locale
Créer un service `serviceComptabiliteFacade` qui centralise toutes les opérations financières entrant dans le système.

Ce service doit être responsable de :
- normaliser les transactions
- déterminer le type de mouvement (`entree` ou `sortie`)
- générer une référence unique
- enregistrer les écritures dans le journal local
- conserver une structure homogène des données

### 2. Définir le modèle de données local
Les données doivent être stockées avec une structure standardisée dans `localStorage`, par exemple :
- `journal_comptable`
- `mouvements_financiers`
- `paiements`
- `depenses`
- `fiches_paie`

Chaque élément doit contenir au minimum :
- `id`
- `type`
- `categorie`
- `montant`
- `date`
- `description`
- `reference`
- `statut`

### 3. Faire passer toutes les écritures par la façade
Pendant cette phase, les services existants doivent éviter d’écrire directement dans plusieurs emplacements.

La règle est simple :
- le paiement d’un élève passe par la façade
- une dépense passe par la façade
- un salaire passe par la façade
- un mouvement manuel passe par la façade

### 4. Garder un journal de référence local
Le service de journal devient la source de vérité locale. Il permet d’avoir un historique qui peut être relu facilement et exporté ensuite.

### 5. Préparer la future migration DB
Le code doit être pensé comme une couche métier indépendante du stockage.

Cela signifie que le code de la logique métier doit rester séparé du stockage `localStorage`.

## Ce que la phase 1 doit livrer
- un point d’entrée unique pour toutes les écritures comptables
- un journal local homogène
- des transactions normalisées
- un historique exploitable localement
- une structure prête pour une migration vers une base de données

## État de mise en œuvre
La phase 1 est maintenant partiellement implementée et validée localement avec la nouvelle façade `serviceComptabiliteFacade`.

Implémentation réalisée :
- création du journal local unifié dans `localStorage`
- normalisation des transactions financières dans une seule façade
- branchement des flux paiements, salaires et dépenses sur cette façade
- raccordement de la page de comptabilité sur le journal local pour afficher un historique cohérent

## Quand la phase 1 est terminée
La phase 1 est considérée comme terminée si toutes ces conditions sont vraies :

1. Toutes les écritures financières passent par le même service façade.
2. Le journal local contient les transactions sous une structure cohérente.
3. Les paiements, dépenses, salaires et mouvements sont bien liés à un même flux de traitement.
4. Le système reste entièrement fonctionnel avec `localStorage`.
5. Les données peuvent être exportées ou migrées vers une base sans devoir reconstruire le cœur métier.

## Critères d’acceptation
- Les écritures financières passent toutes par une seule logique.
- Les données restent visibles localement sans dépendre d’un serveur.
- Le service peut être migré sans réécrire l’intégralité du métier.
- Le module est stable pour la suite de la refonte.

## Remarque
Cette phase doit rester simple, fiable et facilement exploitable par un comptable ou un directeur d’école sans exigence backend.
