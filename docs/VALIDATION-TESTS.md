# Présentation des tests réalisés sur le système administratif scolaire

**Projet :** Système Administratif Scolaire  
**Étudiant :** MOUEMBANZA LOUNDOU Darly Freid  
**Formation :** Licence 3 — Développement Web et Mobile, pôle STI  
**Établissement :** Université Numérique du Gabon (UNG)  
**Date de mise à jour :** 28 octobre 2026

## 1. Objectif des tests

Dans le cadre du développement de mon application de gestion scolaire, j’ai effectué des vérifications pour m’assurer que les principaux modules fonctionnent comme prévu. Ces tests me permettent de repérer les problèmes et de distinguer les fonctionnalités déjà vérifiées de celles qui nécessitent encore des essais complémentaires.

## 2. Tests fonctionnels

### 2.1. Registre d’appel

J’ai réalisé les tests fonctionnels du registre d’appel. Les tests effectués sur ce module ont été déclarés réussis. Cette étape m’a permis de valider le fonctionnement du module dans le périmètre testé.

### 2.2. Notes et résultats

J’ai également travaillé sur le module de gestion des notes et des résultats. Les tests fonctionnels de ce module avaient été déclarés terminés. Cependant, après les modifications apportées à la génération des bulletins, je dois encore vérifier l’ensemble du parcours avec une session authentifiée et des données réelles : récupération des notes, calcul des moyennes, classement des élèves et production du bulletin PDF. Je ne considère donc pas ces nouvelles modifications comme entièrement validées tant que ces vérifications ne sont pas terminées.

## 3. Vérifications techniques de la mise en ligne

J’ai vérifié les résultats disponibles pour la compilation automatisée et la mise en ligne de l’application. La compilation Next.js exécutée par GitHub Actions s’est terminée avec succès, et le déploiement Vercel de la branche principale est indiqué comme prêt. Les pages Notes/Bulletins et Documents ont également répondu avec le code HTTP 200 lors du contrôle public.

Ces résultats montrent que la compilation et la mise en ligne se sont déroulées correctement. Ils ne suffisent toutefois pas à prouver que toutes les fonctionnalités fonctionnent avec un compte connecté et les données réelles de l’établissement. De plus, la configuration actuelle de compilation ne vérifie pas automatiquement les erreurs TypeScript ni ESLint.

## 4. Vérifications qu’il me reste à effectuer

Pour compléter les essais, je dois encore :

- ouvrir le module des bulletins avec une session autorisée et vérifier les données d’un élève ;
- contrôler les moyennes sur 20 et les classements à partir d’un calcul de comparaison ;
- générer un bulletin PDF, puis vérifier son contenu et son impression ;
- générer les différents documents administratifs et contrôler le nom de l’élève, sa classe, l’année scolaire, les dates et le nom de l’établissement ;
- lancer séparément les contrôles TypeScript et ESLint, puis examiner les éventuelles erreurs.

## 5. Bilan personnel

Ces vérifications m’ont permis de suivre l’état d’avancement de mon application et de confirmer plusieurs points : les tests du registre d’appel ont été déclarés réussis, les tests fonctionnels antérieurs du module Notes et résultats ont été déclarés terminés, et la compilation ainsi que le déploiement sont opérationnels.

Je dois maintenant terminer les essais liés aux dernières modifications des bulletins et des documents administratifs. Cette étape est importante pour m’assurer que les informations affichées et les fichiers produits correspondent bien aux données de l’application. Je présenterai ces fonctionnalités comme entièrement validées seulement après avoir réalisé et contrôlé ces derniers essais.

## 6. Références techniques

- Code source et modifications : [dépôt GitHub](https://github.com/darlyblake/Syst-me-Administratif-Scolaire)
- Commit de la dernière mise à jour des documents : [bceb5798](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/commit/bceb5798cf15bffdca98e10cd92538380074e88b)
- Exécution de compilation : [GitHub Actions](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/actions/runs/40703995888)
- Application en ligne : https://syst-me-administratif-scolaire.vercel.app/

*Remarque : ce bilan distingue les tests fonctionnels déclarés terminés, les résultats techniques consultables et les essais complémentaires qui restent à effectuer. Il ne remplace pas les comptes rendus détaillés de tests lorsqu’ils sont disponibles.*