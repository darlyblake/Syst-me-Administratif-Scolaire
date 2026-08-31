# Interface Parent — feuille de route

Cette checklist suit l'avancement réel du module Parent. Une tâche n'est cochée que lorsque le frontend, le backend nécessaire, la sécurité et la vérification associée sont terminés.

## 1. Tableau de bord
- [ ] Résumé des enfants
- [ ] Moyennes / notes disponibles
- [ ] Absences / retards
- [ ] Paiements
- [ ] Notifications importantes
- [ ] Événements à venir
- [ ] Alertes importantes
- [ ] Actualisation des données
- [ ] États chargement / erreur / vide

## 2. Gestion des enfants
- [ ] Liste des enfants associés
- [ ] Ajouter un enfant
- [ ] Scanner QR / code
- [ ] Saisir l'identifiant manuellement
- [ ] Vérification de l'identité de l'enfant
- [ ] Demande d'association
- [ ] Gestion d'une association existante
- [x] Retirer une association
- [ ] Historique des associations
- [ ] Protection contre l'accès à un enfant non autorisé

## 3. Scolarité
- [ ] Notes
- [ ] Bulletins
- [ ] Moyennes
- [ ] Classement si autorisé
- [ ] Matières
- [ ] Résultats par période
- [ ] Historique scolaire
- [ ] Téléchargement des bulletins

## 4. Présence
- [ ] Absences
- [ ] Retards
- [ ] Justifications
- [ ] Historique
- [ ] Notifications d'absence
- [ ] Dépôt d'une justification

## 5. Paiements / scolarité
- [ ] Situation financière
- [ ] Montant payé
- [ ] Reste à payer
- [ ] Historique
- [ ] Reçus
- [ ] Téléchargement des reçus
- [ ] Échéances
- [ ] Notifications d'échéance
- [ ] Gestion multi-enfants / multi-établissements

## 6. Notifications
- [ ] Notifications générales
- [ ] Notifications liées à un enfant
- [ ] Notifications financières
- [ ] Notifications d'absence
- [ ] Notifications scolaires
- [ ] Marquer comme lu
- [ ] Tout marquer comme lu
- [ ] Historique
- [ ] Compteur non lu

## 7. Calendrier / événements
- [ ] Calendrier scolaire
- [ ] Examens
- [ ] Réunions
- [ ] Vacances
- [ ] Événements
- [ ] Filtrage par enfant / établissement
- [ ] Rappels

## 8. Communication
- [ ] Établissement → parent
- [ ] Parent → établissement
- [ ] Conversations
- [ ] Messages liés à un enfant
- [ ] Pièces jointes si nécessaires
- [ ] Notifications de nouveaux messages
- [ ] Protection des conversations

## 9. Service technique
- [ ] Créer une demande
- [ ] Catégoriser la demande
- [ ] Description du problème
- [ ] Suivi du statut
- [ ] Réponse du support
- [ ] Historique
- [ ] Fermeture
- [ ] Notifications

## 10. Profil parent
- [ ] Informations personnelles
- [ ] Modification des informations
- [ ] Photo / avatar si prévu
- [ ] Coordonnées
- [ ] Vérification des données

## 11. Paramètres
- [ ] Préférences de notifications
- [ ] Sécurité du compte
- [ ] Changement de mot de passe
- [ ] Sessions actives
- [ ] Déconnexion
- [ ] Préférences générales

## 12. Sécurité
- [ ] RLS Supabase
- [ ] Isolation parent / enfant
- [ ] Isolation entre établissements
- [ ] Permissions backend
- [ ] Protection des identifiants enfants
- [ ] Protection des bulletins / documents
- [ ] Protection des paiements
- [ ] Protection des messages
- [ ] Protection des fichiers uploadés
- [ ] Gestion des sessions
- [ ] Audit des accès sensibles

## 13. Performance
- [ ] Requêtes Supabase optimisées
- [ ] Index PostgreSQL nécessaires
- [ ] Pagination
- [ ] Chargement différé
- [ ] Réduction des requêtes répétitives
- [ ] Cache lorsque pertinent
- [ ] Optimisation mobile
- [ ] Optimisation images / documents

## 14. Scalabilité
- [ ] Plusieurs établissements
- [ ] Plusieurs enfants par parent
- [ ] Plusieurs parents pour un enfant selon les règles métier
- [ ] Pagination côté serveur
- [ ] Requêtes adaptées aux gros volumes
- [ ] Architecture multi-tenant
- [ ] Pas de récupération massive de données
- [ ] Préparation aux notifications à grande échelle

## 15. Tests finaux
- [ ] Parent avec un enfant
- [ ] Parent avec plusieurs enfants
- [ ] Parent lié à plusieurs établissements
- [ ] Parent sans enfant
- [ ] Tentative d'accès à un enfant non autorisé
- [ ] Compte désactivé
- [ ] Établissement désactivé
- [ ] Tests mobile
- [ ] Erreurs réseau
- [ ] Tests RLS
- [ ] Test d'accès croisé parent/enfant
- [ ] Test de charge des requêtes importantes
