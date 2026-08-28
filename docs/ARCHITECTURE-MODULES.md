# Architecture des modules

## Règle générale
Chaque module doit respecter la séparation : UI → hooks → services → données.
Les composants ne doivent pas appeler directement les services lorsqu'un hook métier existe.

## Périmètre d'accès
- `admin` : toutes les données de son établissement.
- `directeur` : données nécessaires à la direction.
- `secretariat` : administration/secrétariat.
- `comptabilite` : données financières.
- `surveillant` : absences, présence et surveillance.
- `enseignant` : principalement ses propres données et les données pédagogiques nécessaires à ses classes.

## Multi-établissement
Toute donnée métier doit être rattachable à un `etablissementId`. Le scope `all` est réservé à une future administration municipale/super-administration.

## UX
Chaque module doit privilégier :
1. une action principale visible ;
2. les filtres seulement lorsqu'ils sont utiles ;
3. les actions secondaires dans un menu ;
4. des états loading/empty/error explicites ;
5. une interface mobile sans perte de fonctionnalité ;
6. les permissions appliquées aussi bien à l'affichage qu'aux opérations.

## Modules à auditer
- Classes
- Absences / Présences
- Comptabilité
- Communication
- Documents
- Dossiers papier / Archivage
- Emploi du temps
- Élèves / inscriptions / paiements
- Paramètres / utilisateurs

Ce document sert de référence pour les prochains refactors et évite de recréer une architecture différente par module.
