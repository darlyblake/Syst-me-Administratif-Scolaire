# Feuille de route du projet

<p align="center">
  <strong>UNIVERSITÉ NUMÉRIQUE DU GABON (UNG)</strong><br>
  <em>Pôle STI · Licence 3 · Développement Web et Mobile</em><br>
  <strong>PLAN DE STABILISATION ET DE VALIDATION</strong>
</p>

> Mise à jour du 2 novembre 2026, après inspection en lecture seule du dépôt `main` et du projet Supabase actif. Cette feuille de route ne décrit plus une migration Supabase future : plusieurs modules utilisent déjà Supabase. Le système reste hybride.

## 1. État général

Le travail à venir porte surtout sur la cohérence des sources de données, la traçabilité du backend, l'harmonisation des permissions et les tests fonctionnels.

| Domaine | Situation constatée | Priorité |
|---|---|---|
| Architecture | Services Supabase et services locaux coexistent | Élevée |
| Migrations | Historique du dépôt très différent de l'historique Supabase | Critique |
| Fonctions Edge | 12 actives, 5 sources présentes dans le dépôt | Critique |
| Permissions | Noms de permissions à harmoniser et tester | Critique |
| Fonctions SECURITY DEFINER | Revue des droits et du code nécessaire | Critique |
| Portail parent | Plusieurs parcours restent listés dans la checklist | Élevée |
| Notes / bulletins | Module développé, tests de non-régression à reprendre après changements récents | Élevée |
| Documents | Page administrative encore locale, modèles à améliorer et impression à vérifier | Moyenne |
| Pointage du personnel / enseignants | Frontend et backend présents ; tests de scénarios encore à consigner | Élevée |
| Performance | Alertes Supabase à analyser avant optimisation | Moyenne |

## 2. Priorité 1 — Rétablir la traçabilité du backend

### 2.1 Réconcilier les migrations

Instantané du 2 novembre 2026 :
- 91 fichiers SQL dans `supabase/migrations` ;
- 87 préfixes de version distincts ;
- 228 versions distinctes enregistrées dans Supabase ;
- 21 numéros communs ;
- 207 versions actives sans fichier portant exactement le même numéro dans le dépôt ;
- 66 préfixes de fichiers absents de l'historique consulté ;
- quatre préfixes répétés dans le dépôt.

Actions :
- établir un inventaire version par version ;
- comparer le contenu SQL des migrations proches ou renumérotées ;
- identifier les migrations exécutées manuellement ;
- retrouver les sources historiques manquantes ;
- documenter les écarts et leur justification ;
- préparer une procédure reproductible de reconstruction dans un environnement de test.

**Ne pas réinitialiser ni modifier la base de production pour résoudre ces écarts sans sauvegarde, comparaison et plan de retour arrière.**

### 2.2 Versionner les fonctions Edge

Douze fonctions Edge sont actives dans Supabase, mais cinq dossiers sources seulement ont été trouvés dans le dépôt consulté. Retrouver les sources des sept fonctions manquantes, vérifier les secrets et les dépendances, puis les versionner sans inclure de valeurs secrètes dans Git.

## 3. Priorité 2 — Harmoniser les autorisations

Actions :
- comparer les permissions utilisées dans les politiques RLS, dans `private.has_permission` et dans les tables d'attribution des rôles ;
- définir une nomenclature unique ;
- vérifier notamment `settings.read`, `settings.manage`, `payments.read` et `finance.view` ;
- tester chaque opération avec un compte de chaque rôle ;
- vérifier les accès entre deux établissements ;
- examiner les quatre tables RLS sans politique ;
- revoir les droits EXECUTE des fonctions SECURITY DEFINER ;
- activer et tester la protection contre les mots de passe compromis si elle est compatible avec le parcours d'authentification.

Ne pas considérer une permission comme réparée tant qu'un test authentifié n'a pas démontré le résultat attendu et le refus attendu pour les rôles non autorisés.

## 4. Priorité 3 — Stabiliser l'architecture hybride

Pour chaque domaine, tenir à jour un tableau précisant :
- page d'entrée active ;
- hook utilisé ;
- service réellement appelé ;
- source de données ;
- fonctions RPC ou Edge sollicitées ;
- politiques RLS concernées ;
- tests exécutés.

Domaines à documenter en premier :
1. élèves et inscriptions ;
2. classes et enseignants ;
3. registre d'appel ;
4. notes et bulletins ;
5. paiements et finances ;
6. portail parent ;
7. pointage du personnel ;
8. documents administratifs.

Ne pas supprimer les anciens services locaux avant d'avoir recherché tous leurs usages et vérifié qu'un parcours Supabase les remplace réellement.

## 5. Priorité 4 — Terminer les vérifications fonctionnelles

| Module | Situation | Travail restant |
|---|---|---|
| Connexion, rôles, tableaux de bord, responsive, inscriptions et classes | Tests manuels déclarés réussis dans le périmètre essayé | Rejouer après changements sensibles |
| Registre d'appel des élèves | Tests déclarés réussis | Conserver les scénarios et résultats datés |
| Paiements | Scénarios G1 à G5 précédemment déclarés validés | Rejouer après changement du backend financier |
| Notes et résultats | Fonctionnalités développées | Tests de non-régression des notes, moyennes, classements et bulletins |
| Documents administratifs | Génération présente, service administratif encore local | Améliorer les modèles et vérifier l'impression réelle |
| QR / pointage | Code et parcours présents | Exécuter et documenter les scénarios QR, code, arrivée, départ et clôture |
| Portail parent | Plusieurs fonctions présentes, checklist avec tâches non cochées | Vérifier les parcours enfant, bulletins, reçus, communication et fichiers |
| Erreurs réseau | Validation non confirmée | Tester panne, reprise et messages d'erreur |

Un build réussi, une route HTTP 200 ou la présence d'un composant ne valident pas un scénario métier.

## 6. Priorité 5 — Portail parent

S'appuyer sur `PARENT-TODO.md` comme liste de travail, mais contrôler chaque case avec le code, le backend, la sécurité et un test. Les points explicitement à reprendre comprennent :
- vérification de l'identité de l'enfant ;
- bulletins et téléchargement ;
- reste à payer, reçus et téléchargements ;
- gestion multi-enfants / multi-établissements ;
- calendrier et rappels ;
- communication établissement-parent ;
- demandes de support ;
- profil et paramètres ;
- protection des fichiers et audit des accès ;
- tests RLS et tests croisés parent/enfant.

## 7. Priorité 6 — Performance et qualité

Les alertes Supabase du 2 novembre 2026 mentionnent 137 situations de politiques permissives multiples, 9 index dupliqués, 53 clés étrangères sans index couvrant, 26 politiques avec expression RLS à optimiser et 76 index signalés comme inutilisés.

Actions :
- examiner les requêtes lentes et leurs plans ;
- analyser les index sur une période représentative ;
- fusionner les politiques uniquement après vérification de leur logique d'autorisation ;
- mesurer avant/après les optimisations ;
- ne pas supprimer automatiquement les index signalés inutilisés.

## 8. CI et tests automatisés

Le dépôt contient quatre fichiers Jest :
- `tests/comptabilite-facade.test.ts`
- `tests/enseignants.service.test.ts`
- `tests/messages-service.test.ts`
- `tests/notifications-service.test.ts`

Le workflow GitHub Actions consulté lance l'installation et la compilation Next.js. Il ne lance pas automatiquement les suites Jest, ESLint ni une vérification TypeScript explicite.

Améliorations proposées :
1. ajouter l'exécution de Jest dans le workflow ;
2. ajouter les contrôles TypeScript et ESLint s'ils sont configurés ;
3. conserver les résultats de build et de tests comme artefacts ;
4. séparer tests unitaires, tests d'intégration Supabase et tests manuels authentifiés ;
5. ne pas faire dépendre la CI de secrets de production.

## 9. Critères de clôture

Une tâche est terminée seulement si :
- son code est versionné ;
- sa source de données réelle est identifiée ;
- les autorisations ont été contrôlées ;
- le scénario nominal et les erreurs importantes ont été testés ;
- les résultats sont consignés ;
- la documentation correspond à l'état réellement livré.

---

*Cette feuille de route est un document de suivi. Les statuts sont à actualiser après chaque vérification et ne remplacent pas un rapport de test daté.*
