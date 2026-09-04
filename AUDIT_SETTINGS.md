# AUDIT PAGE SETTINGS - DOUBLONS LOCALSTORAGE VS SUPABASE

## DATE
4 septembre 2026

## OBJECTIF
Identifier les doublons entre LocalStorage et Supabase dans la page `/ecole/settings`

---

## 1. DONNÉES ACTUELLEMENT GÉRÉES PAR LOCALSTORAGE

### serviceParametres (LocalStorage)

| Fonction | Clé LocalStorage | Données | Utilisation dans Settings |
|----------|------------------|---------|--------------------------|
| obtenirParametres() | parametresEcole | nomEcole, adresseEcole, telephoneEcole, nomDirecteur, logoUrl, cachetUrl, modePaiement, anneeAcademique, dateDebut, dateFin | Onglet Général |
| obtenirTarification() | tarification | classe, fraisInscription, fraisScolariteAnnuelle | Onglet Tarification |
| obtenirFraisInscriptionEtablissement() | fraisInscriptionEtablissement | montant global | Onglet Tarification |
| obtenirFraisReinscriptionEtablissement() | fraisReinscriptionEtablissement | montant global | Onglet Tarification |
| obtenirTarificationParTypeEcole() | tarificationTypesEcole | typeEcole, niveaux (nom, fraisInscription, fraisScolariteAnnuelle, planPaiementId) | Onglet Tarification |
| obtenirOptionsSupplementaires() | optionsSupplementaires | tenueScolaire, carteScolaire, cooperative, tenueEPS, assurance | SUPPRIMÉ (déplacé vers /ecole/options) |
| obtenirOptionsSupplementairesPersonnalisees() | optionsSupplementairesPersonnalisees | options personnalisées | SUPPRIMÉ (déplacé vers /ecole/options) |
| obtenirParametresPaiement() | parametresPaiement | datePaiementMensuel, tranchesPaiement | Onglet Paiements (DOUBLON) |

### Calculs métier dans serviceParametres (À SUPPRIMER)

- calculerMontantMensuel() - divise scolarité par 10
- calculerMontantParTranche() - calcule montant à partir de pourcentage

---

## 2. DONNÉES ACTUELLEMENT GÉRÉES PAR SUPABASE

### Tables Supabase existantes

| Table | Colonnes (selon types) | Utilisation |
|-------|----------------------|-------------|
| establishments | id, name, created_at, updated_at | useEstablishment hook |
| academic_years | id, establishment_id, name, start_date, end_date, is_active, status | useAcademicYears hook |
| education_cycles | id, establishment_id, name, code, display_order, active | useAcademicStructure |
| grade_levels | id, cycle_id, name, code, display_order, active | useAcademicStructure |
| school_classes | id, establishment_id, grade_level_id, name, code, capacity, active | useAcocalStructure |
| tuition_plans | id, establishment_id, academic_year_id, grade_level_id, payment_mode, annual_amount, registration_fee, installment_count, is_active | useTuitionPlans hook |
| tuition_plan_installments | id, tuition_plan_id, installment_number, label, amount, due_date | tuition.service.ts |

### Services Supabase existants

| Service | Fonctions | Utilisation |
|---------|-----------|-------------|
| establishment.service.ts | getEstablishment, createEstablishment, updateEstablishment | useEstablishment hook |
| academic.service.ts | getAcademicStructure, getCycles, getLevels, getClasses | useAcademicStructure hook |
| academic-year.service.ts | getAcademicYears, getActiveAcademicYear | useAcademicYears hook |
| tuition.service.ts | getTuitionPlans, getTuitionPlan, createTuitionPlan, updateTuitionPlan | useTuitionPlans hook |

---

## 3. DOUBLONS IDENTIFIÉS

### DOUBLON CONFIRMÉ: Plans de paiement

**LocalStorage:** 
- `plansPaiement` dans Settings (type PlanPaiement)
- Géré par serviceParametres.obtenirParametresPaiement()
- Calculs locaux de mensualités et tranches

**Supabase:**
- Table `tuition_plans`
- Table `tuition_plan_installments`
- Géré par useTuitionPlans hook
- Service tuition.service.ts

**Action:** Supprimer la section "Paiements" locale de Settings et utiliser uniquement Supabase

---

### DOUBLON CONFIRMÉ: Options supplémentaires

**LocalStorage:**
- `optionsSupplementaires` dans Settings
- `optionsSupplementairesPersonnalisees` dans Settings
- Géré par serviceOptions

**Supabase:**
- Aucune table trouvée pour options

**Action:** Déjà supprimé de Settings, déplacé vers /ecole/options (reste LocalStorage pour l'instant)

---

### DOUBLON PARTIEL: Année académique

**LocalStorage:**
- `anneeAcademique`, `dateDebut`, `dateFin` dans settings

**Supabase:**
- Table `academic_years` avec `start_date`, `end_date`, `status`

**Action:** Utiliser Supabase (academic_years) comme source de vérité

---

### DOUBLON PARTIEL: Structure académique

**LocalStorage:**
- `tarificationTypesEcole` avec niveaux hardcodés (Primaire, Collège, Lycée, etc.)

**Supabase:**
- Tables `education_cycles`, `grade_levels`, `school_classes`

**Action:** Utiliser Supabase (useAcademicStructure) comme source de vérité

---

### DOUBLON PARTIEL: Tarification

**LocalStorage:**
- `tarification` par classe
- `tarificationTypesEcole` par type d'école
- Calculs locaux de mensualités

**Supabase:**
- Table `tuition_plans` avec `annual_amount`, `registration_fee`

**Action:** Utiliser Supabase (tuition_plans) comme source de vérité

---

## 4. DONNÉES UNIQUEMENT DANS LOCALSTORAGE (PAS DE DOUBLON)

### Identité de l'établissement

| Champ | LocalStorage | Supabase | Action |
|-------|--------------|----------|--------|
| nomEcole | ✅ | ✅ (name) | Conserver LocalStorage (plus complet) |
| adresseEcole | ✅ | ❌ | Conserver LocalStorage |
| telephoneEcole | ✅ | ❌ | Conserver LocalStorage |
| nomDirecteur | ✅ | ❌ | Conserver LocalStorage |
| logoUrl | ✅ | ❌ | Conserver LocalStorage |
| cachetUrl | ✅ | ❌ | Conserver LocalStorage |
| modePaiement | ✅ | ❌ | Conserver LocalStorage |

**Note:** Le type Establishment dans Supabase ne contient que `id, name, created_at, updated_at`. Les champs supplémentaires (email, phone, address, etc.) mentionnés dans la mission n'existent pas encore dans le type TypeScript.

---

## 5. RECOMMANDATIONS

### IMMÉDIAT (Sans modification backend)

1. **Supprimer les plans de paiement locaux** de Settings
   - Supprimer l'état `plansPaiement`
   - Supprimer le dialog de création/modification de plans
   - Utiliser uniquement `useTuitionPlans` hook
   - Rediriger vers `/ecole/settings/scolarite` pour la gestion

2. **Supprimer les calculs métier locaux**
   - Supprimer `calculerMontantMensuel()`
   - Supprimer `calculerMontantParTranche()`
   - Les montants doivent venir de Supabase

3. **Supprimer les niveaux hardcodés**
   - Supprimer `typesEcoleActifs` (Primaire, Collège, Lycée, etc.)
   - Utiliser `useAcademicStructure` pour charger les cycles/niveaux réels

### APRÈS MISE À JOUR BACKEND (Si nécessaire)

Si le backend ajoute des champs à la table `establishments`:
- Mettre à jour le type Establishment
- Mettre à jour establishment.service.ts
- Migrer les données LocalStorage vers Supabase
- Supprimer les usages LocalStorage correspondants

---

## 6. RISQUES IDENTIFIÉS

- Le type Establishment dans Supabase est très limité (id, name seulement)
- Les champs d'adresse, téléphone, devise n'existent pas encore dans le type
- Une migration backend pourrait être nécessaire avant de supprimer LocalStorage
- Ne pas supprimer serviceParametres entièrement (utilisé pour horaires généraux)

---

## 7. PROCHAINES ÉTAPES

1. ✅ Audit terminé
2. ⏳ Supprimer les plans de paiement locaux de Settings
3. ⏳ Supprimer les calculs métier locaux
4. ⏳ Supprimer les niveaux hardcodés
5. ⏳ Tester build après chaque modification
6. ⏳ Commit progressif
