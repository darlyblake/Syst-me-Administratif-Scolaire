# Bilan des tests de mon système administratif scolaire

**Projet :** Système Administratif Scolaire  
**Étudiant :** MOUEMBANZA LOUNDOU Darly Freid  
**Formation :** Licence 3 — Développement Web et Mobile, pôle STI  
**Établissement :** Université Numérique du Gabon (UNG)  
**Date de mise à jour :** 28 octobre 2026

## 1. Pourquoi j’ai réalisé ce projet

L’idée de ce projet m’est venue pendant mon passage au secrétariat du Complexe Scolaire La Réussite d’Owendo. J’y ai observé des situations concrètes qui m’ont fait réfléchir à la manière dont les informations scolaires sont suivies et communiquées aux familles. Cette expérience m’a donné envie de concevoir un outil informatique qui pourrait aider à mieux organiser certaines opérations de l’établissement.

Je me souviens notamment des échanges au sujet des frais scolaires. Il arrivait qu’un parent affirme avoir déjà payé un mois, alors que les informations disponibles à l’école indiquaient autre chose. On lui demandait alors de présenter son reçu comme preuve du paiement, mais il pouvait l’avoir perdu ou ne plus le retrouver. Ce type de situation pouvait provoquer des incompréhensions entre les parents et l’établissement. Cela m’a fait comprendre qu’il est important de pouvoir retrouver facilement l’historique des paiements et de disposer d’informations claires lorsqu’une question se pose.

J’ai également remarqué que certains parents ne savaient pas toujours précisément si leur enfant était encore en cours, si les cours étaient déjà terminés ou si l’élève n’avait pas eu cours à un moment donné. Ils appelaient alors l’école pour se renseigner et pouvaient être surpris d’apprendre que leur enfant n’avait pas eu cours ou avait terminé depuis plusieurs heures. Ces situations m’ont fait réfléchir à l’importance d’un meilleur suivi de la présence des élèves et d’une communication plus claire avec les familles.

Ces observations sont le point de départ de ma réflexion. Mon objectif n’est pas de présenter ces difficultés comme la faute d’une personne ou d’un établissement, mais d’expliquer les besoins que j’ai pu constater et auxquels je voulais essayer d’apporter une réponse grâce au développement informatique.

Au fil de la conception, j’ai aussi réfléchi à la gestion des différentes prises en charge des frais scolaires. Les situations ne se résument pas toujours à un paiement intégral par les parents : certains organismes peuvent financer une partie des frais et certaines familles peuvent bénéficier de réductions, par exemple en fonction du nombre d’enfants scolarisés. Il me paraît donc important de pouvoir distinguer les montants payés par les familles, les sommes prises en charge par les organismes et les éventuelles réductions accordées.

C’est à partir de ces observations et de cette réflexion que j’ai orienté mon projet vers un système administratif scolaire. Je souhaite qu’il contribue à mieux organiser les informations, à faciliter le suivi des paiements et des absences, et à rendre les informations utiles plus faciles à retrouver. Je sais qu’une application ne règle pas à elle seule tous les problèmes d’organisation ou de communication, mais elle peut apporter une aide si elle est conçue en fonction des besoins réels et si les données qu’elle contient sont correctement tenues à jour.

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

Cette expérience m’a appris à partir d’un problème observé pour réfléchir à une solution, puis à vérifier si les fonctionnalités développées répondent réellement au besoin. Au-delà de l’interface, je dois veiller à la cohérence des données, à la fiabilité des calculs et à la qualité des documents générés. C’est aussi ce que je retiens de ce projet : le développement informatique prend tout son sens lorsqu’il s’appuie sur des besoins concrets.

## 7. Références techniques

- Code source et modifications : [dépôt GitHub](https://github.com/darlyblake/Syst-me-Administratif-Scolaire)
- Commit de la dernière mise à jour des fonctionnalités : [bceb5798](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/commit/bceb5798cf15bffdca98e10cd92538380074e88b)
- Exécution de compilation : [GitHub Actions](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/actions/runs/40703995888)
- Application en ligne : https://syst-me-administratif-scolaire.vercel.app/

*Remarque : ce bilan distingue les tests fonctionnels déclarés terminés, les résultats techniques consultables et les essais complémentaires qui restent à effectuer. Il ne remplace pas les comptes rendus détaillés de tests lorsqu’ils sont disponibles.*