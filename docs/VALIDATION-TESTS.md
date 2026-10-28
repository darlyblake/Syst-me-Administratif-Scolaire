# Bilan des tests de mon système administratif scolaire

**Projet :** Système Administratif Scolaire  
**Étudiant :** MOUEMBANZA LOUNDOU Darly Freid  
**Formation :** Licence 3 — Développement Web et Mobile, pôle STI  
**Établissement :** Université Numérique du Gabon (UNG)  
**Date de mise à jour :** 28 octobre 2026

## 1. Pourquoi j’ai réalisé ce projet

J’ai développé ce système administratif scolaire pour proposer un outil qui aide à mieux organiser les informations et les opérations d’un établissement. En réfléchissant aux besoins à prendre en compte, je me suis notamment intéressé à la gestion des frais scolaires et des différentes prises en charge.

J’ai constaté que les situations ne se résument pas à une prise en charge totale par l’État ou à un paiement intégral par les parents. Certains organismes peuvent financer une partie des frais, tandis que certaines familles peuvent avoir droit à des réductions, par exemple en fonction du nombre d’enfants scolarisés. Je voulais donc que l’application puisse distinguer les différentes parts à payer et éviter de mélanger les montants dus par les familles avec ceux pris en charge par un organisme.

Cette réflexion fait partie des besoins qui ont orienté les fonctionnalités du projet. Elle m’a aussi rappelé qu’une application de gestion doit tenir compte des situations réelles de l’établissement, et pas seulement enregistrer des informations.

## 2. Objectif des tests

Au fur et à mesure du développement, j’ai effectué des vérifications pour voir si les principales fonctionnalités se comportaient comme prévu. Pour moi, les tests sont importants : une page qui s’affiche correctement ne garantit pas, à elle seule, que les calculs, les données enregistrées ou les documents produits sont justes.

Dans ce bilan, je distingue donc les tests fonctionnels déjà déclarés terminés, les vérifications techniques que j’ai pu consulter et les essais qu’il me reste à réaliser. Je préfère signaler clairement les points qui restent à vérifier plutôt que de présenter toute l’application comme entièrement validée.

## 3. Tests fonctionnels réalisés

### 3.1. Registre d’appel

J’ai réalisé les tests fonctionnels du registre d’appel. Les tests effectués sur ce module ont été déclarés réussis. Cela valide le fonctionnement du module dans le périmètre qui a été testé, sans prétendre couvrir toutes les situations possibles.

### 3.2. Notes et résultats

J’ai également travaillé sur le module de gestion des notes et des résultats. Les tests fonctionnels antérieurs de ce module avaient été déclarés terminés. Toutefois, j’ai ensuite apporté des modifications à la récupération des notes et à la génération des bulletins. Je dois donc reprendre les vérifications de ce parcours avec une session authentifiée et des données réelles : récupération des notes, calcul des moyennes, classement des élèves et production du bulletin PDF.

Tant que ces derniers contrôles ne sont pas terminés, je ne considère pas les nouvelles modifications des bulletins comme entièrement validées.

## 4. Vérifications techniques de la mise en ligne

J’ai consulté les résultats disponibles pour la compilation automatisée et la mise en ligne de l’application. La compilation Next.js exécutée par GitHub Actions s’est terminée avec succès, et le déploiement Vercel de la branche principale est indiqué comme prêt. Les pages Notes/Bulletins et Documents ont également répondu avec le code HTTP 200 lors du contrôle public.

Ces résultats sont encourageants : ils montrent que la compilation et la mise en ligne se sont déroulées correctement. Ils ne prouvent cependant pas que toutes les fonctionnalités fonctionnent avec un compte connecté et les données réelles de l’établissement. La configuration actuelle de compilation ne vérifie pas non plus automatiquement les erreurs TypeScript ni ESLint.

## 5. Vérifications qu’il me reste à effectuer

Pour compléter les essais, je dois encore :

- ouvrir le module des bulletins avec une session autorisée et vérifier les données d’un élève ;
- contrôler les moyennes sur 20 et les classements en comparant les résultats de l’application avec des calculs de référence ;
- générer un bulletin PDF, puis vérifier son contenu et son impression ;
- générer les documents administratifs concernés et contrôler les informations affichées : nom de l’élève, classe, année scolaire, dates et nom de l’établissement ;
- lancer séparément les contrôles TypeScript et ESLint, puis examiner les éventuelles erreurs.

## 6. Mon bilan

Ces vérifications m’ont permis de mieux suivre l’état d’avancement de mon application. À ce stade, les tests du registre d’appel ont été déclarés réussis, les tests fonctionnels antérieurs du module Notes et résultats ont été déclarés terminés, et les résultats techniques disponibles confirment que la compilation et le déploiement ont abouti.

Il me reste à terminer les essais liés aux dernières modifications des bulletins et des documents administratifs. Je veux notamment m’assurer que les données affichées, les calculs et les fichiers produits correspondent bien aux informations de l’application. Je ne présenterai ces points comme validés qu’après avoir réalisé et contrôlé les essais nécessaires.

Ce projet m’a aussi amené à réfléchir à la façon dont un outil informatique peut répondre à des besoins concrets d’un établissement scolaire. Au-delà de l’interface, je dois veiller à la cohérence des données, à la fiabilité des calculs et à la qualité des documents générés.

## 7. Références techniques

- Code source et modifications : [dépôt GitHub](https://github.com/darlyblake/Syst-me-Administratif-Scolaire)
- Commit de la dernière mise à jour des fonctionnalités : [bceb5798](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/commit/bceb5798cf15bffdca98e10cd92538380074e88b)
- Exécution de compilation : [GitHub Actions](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/actions/runs/40703995888)
- Application en ligne : https://syst-me-administratif-scolaire.vercel.app/

*Remarque : ce bilan distingue les tests fonctionnels déclarés terminés, les résultats techniques consultables et les essais complémentaires qui restent à effectuer. Il ne remplace pas les comptes rendus détaillés de tests lorsqu’ils sont disponibles.*