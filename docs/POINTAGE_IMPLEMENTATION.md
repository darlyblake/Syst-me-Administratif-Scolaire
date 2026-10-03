# Module Pointage — Plan d'implementation backend et frontend

## Objectif

Mettre en place un module de pointage centralise pour l'etablissement, avec deux modes d'identification:
- code personnel unique;
- QR temporaire affiche sur le poste central et scanne depuis le telephone.

Le cours de l'enseignant est toujours determine automatiquement a partir de son etablissement, de son emploi du temps, de la date et de l'heure courante. L'enseignant ne selectionne jamais son cours.

## 1. Evenements de pointage

Le systeme gere quatre types d'evenements:
1. ARRIVEE_ETABLISSEMENT
2. DEPART_ETABLISSEMENT
3. DEBUT_COURS
4. FIN_COURS

### Arrivee / depart
Le membre du personnel choisit l'action, puis s'identifie par code ou QR.
Le backend verifie son rattachement a l'etablissement et l'etat courant de sa journee avant d'enregistrer l'evenement.

### Debut de cours
L'enseignant choisit « Debut de cours », puis s'identifie.
Le backend recherche automatiquement le creneau correspondant dans son emploi du temps.
Aucun choix manuel de classe, matiere ou cours ne doit etre demande.

Le systeme enregistre:
- heure prevue de debut;
- heure reelle de pointage;
- heure prevue de fin;
- enseignant;
- classe;
- matiere;
- creneau;
- retard eventuel;
- methode d'identification;
- heures retenues pour le calcul administratif.

### Fin de cours
Avec telephone: l'enseignant peut terminer son cours depuis son interface.
Sans telephone: le cours arrive a son heure de fin et devient une alerte de cloture pour le surveillant general / personnel autorise.
Une cloture administrative doit conserver la trace de l'auteur et du motif lorsqu'une modification est necessaire.

## 2. Calcul des heures

L'heure reelle de pointage ne doit jamais etre remplacee par l'heure calculee.

Exemple:
- cours: 08:00 -> 09:40;
- duree administrative: 2 h;
- pointage: 08:20;
- heures retenues: 2 h.

Selon la regle configuree:
- jusqu'au seuil configure apres le debut: le creneau peut rester comptabilise integralement;
- apres le seuil: le nombre d'heures retenues peut etre reduit (exemple 1 h);
- les seuils et modes de calcul doivent etre configurables par l'administration.

Le backend doit recalculer les heures retenues a partir des donnees sources et des parametres, sans faire confiance au frontend.

## 3. Parametres administratifs

Prevoir une configuration du pointage pour:
- fenetre de reconnaissance d'un cours autour de son heure de debut;
- seuil de conservation des heures completes;
- duree administrative d'un creneau;
- regle appliquee apres depassement du seuil;
- autorisation de cloture par l'enseignant;
- autorisation de cloture par le surveillant general;
- comportement des alertes;
- regles de correction et motifs.

Les valeurs par defaut ne doivent pas empecher l'administration de les modifier.

## 4. Alertes et supervision

Le systeme doit produire des situations exploitables:
- enseignant en retard;
- cours non pointe;
- cours en attente de cloture;
- absence de pointage d'arrivee;
- absence de pointage de depart;
- evenement incoherent ou doublon.

Le surveillant general / utilisateur autorise doit pouvoir voir les alertes du jour et agir sur celles qui necessitent une cloture ou une correction.

## 5. Historique et audit

Conserver l'historique des evenements de pointage:
- personne;
- etablissement;
- type d'evenement;
- date/heure reelle;
- cours/ceneau associe si applicable;
- methode d'identification;
- resultat;
- retard;
- heures retenues;
- auteur d'une correction;
- ancienne valeur;
- nouvelle valeur;
- motif de correction.

Les corrections administratives doivent etre auditables.

## 6. Interface centrale de pointage

La page publique/centrale de pointage doit rester simple.

Actions:
- Arrivee a l'etablissement
- Depart de l'etablissement
- Debut de cours
- Fin de cours

Pour chaque action:
1. l'utilisateur choisit l'action;
2. il entre son code ou scanne le QR;
3. le backend identifie la personne;
4. le backend valide l'action;
5. le systeme affiche le resultat;
6. retour automatique a l'ecran de pointage.

Pour « Debut de cours », le cours est determine automatiquement.

## 7. Interface enseignant

L'interface enseignant doit permettre:
- voir le cours actuel determine automatiquement;
- demarrer le cours via QR;
- terminer le cours depuis le telephone si cette action est autorisee;
- voir l'etat du cours;
- voir les horaires et evenements pertinents.

Le QR du poste central doit etre temporaire et ne doit pas etre un identifiant permanent.

## 8. Interface administration Pointage

La page d'administration doit fournir, sans surcharger l'ecran principal:
- tableau de bord du jour;
- pointage du jour;
- historique;
- fiches de pointage;
- absences;
- retards;
- cours non pointes;
- alertes;
- rapports;
- parametres.

## 9. Backend Supabase

Le backend doit etre la source de verite pour:
- identification du personnel;
- rattachement etablissement/personnel;
- recherche automatique du cours;
- validation des quatre types d'evenements;
- calcul des heures;
- detection des doublons/incoherences;
- cloture des cours;
- alertes;
- historique/audit;
- securite RLS.

Les operations sensibles doivent passer par des fonctions RPC securisees lorsque necessaire.

## 10. Multi-etablissement

Un enseignant pouvant etre rattache a plusieurs etablissements doit rester un compte unique.
Le pointage et le planning doivent toujours etre resolus dans le contexte de l'etablissement depuis lequel le pointage est effectue.
Un etablissement ne doit voir que ses donnees autorisees.

## 11. Ordre d'implementation

### Phase A — Documentation
Ce fichier documente le comportement attendu avant les modifications.

### Phase B — Backend
1. inspecter le schema existant et les tables de planning/enseignants/personnel;
2. completer la structure de donnees pointage;
3. ajouter les parametres;
4. ajouter les RPC de validation;
5. ajouter la logique de recherche automatique du cours;
6. ajouter le calcul des heures;
7. ajouter alertes et historique/audit;
8. appliquer les politiques RLS;
9. verifier avec des cas de test SQL.

### Phase C — Frontend
1. page centrale « Effectuer un pointage »;
2. choix des quatre actions;
3. saisie code;
4. scan QR;
5. resultats et retours d'erreur;
6. interface enseignant;
7. supervision surveillant general;
8. historique/fiches/absences/retards/alertes;
9. parametres;
10. verification responsive et PWA.

## 12. Cas de validation obligatoires

- enseignant avec cours 08:00 -> 09:40, pointage a 08:00: cours valide et 2 h retenues;
- meme cours, pointage a 08:20: cours valide et 2 h retenues;
- meme cours, pointage a 08:40 ou apres: application du seuil configure et reduction selon la regle;
- enseignant sans cours au moment du pointage: refus explicite pour « Debut de cours »;
- enseignant avec plusieurs etablissements: resolution dans le bon etablissement;
- personnel non enseignant: arrivee/depart sans logique de cours;
- enseignant avec telephone: debut puis fin depuis son interface;
- enseignant sans telephone: debut par code puis alerte de cloture pour le surveillant;
- doublon de debut/fin: refus sans creation d'un second evenement;
- correction administrative: audit complet;
- QR expire: refus;
- QR provenant d'un autre contexte d'etablissement: refus.

## Regle fondamentale

L'utilisateur choisit le type d'action, mais jamais le cours.

Le systeme determine automatiquement le cours a partir de l'identite, de l'etablissement, de la date et de l'heure, puis applique les regles configurees en backend.
