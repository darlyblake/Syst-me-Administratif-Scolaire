/**
 * Service de gestion des finances
 * Centralise toute la logique de calcul des dettes et des frais.
 */

import type { DonneesEleve } from "@/types/models";
import { serviceParametres } from "@/services/parametres.service.ts";

type StudentDataInput = Partial<Pick<DonneesEleve, 'classe' | 'optionsSupplementaires' | 'optionsPersonnalisees'>> & {
    typeInscription?: "inscription" | "reinscription";
};

class ServiceFinances {

    /**
     * Calcule la dette totale d'un élève en se basant sur sa classe, ses options et son type d'inscription.
     * C'est la source de vérité unique pour le calcul des dettes.
     * @param studentData - Les données de l'élève (ou du formulaire d'inscription).
     * @returns Un objet avec le détail des dettes.
     */
    public calculerDetteEleve(studentData: StudentDataInput) {
        const { classe, typeInscription = 'inscription', optionsSupplementaires, optionsPersonnalisees } = studentData;

        const tarifsClasses = serviceParametres.obtenirTarification();
        const fraisOptions = serviceParametres.obtenirOptionsSupplementaires();
        const optionsPersoConfig = serviceParametres.obtenirOptionsSupplementairesPersonnalisees();

        const tarif = tarifsClasses.find((t) => t.classe === classe);

        // 1. Dette de scolarité
        const detteScolarite = tarif ? tarif.fraisScolariteAnnuelle : 0;

        // 2. Frais d'inscription
        let fraisInscription = tarif ? tarif.fraisInscription : 0;
        if (typeInscription === 'reinscription') {
            fraisInscription *= 0.5; // Réduction de 50% pour la réinscription
        }

        // 3. Frais des options
        const fraisOptionsDetail = {
            tenueScolaire: 0,
            carteScolaire: 0,
            cooperative: 0,
            tenueEPS: 0,
            assurance: 0,
        };

        if (optionsSupplementaires && fraisOptions) {
            Object.entries(optionsSupplementaires).forEach(([key, selected]) => {
                if (selected) {
                    fraisOptionsDetail[key as keyof typeof fraisOptionsDetail] = fraisOptions[key as keyof typeof fraisOptions] || 0;
                }
            });
        }
        const standardOptionsTotal = Object.values(fraisOptionsDetail).reduce((sum, val) => sum + val, 0);

        const personalOptionsTotal = (optionsPersonnalisees || []).reduce((sum, optionId) => {
            const option = optionsPersoConfig.find(opt => opt.id === optionId);
            return sum + (option ? option.prix : 0);
        }, 0);

        const detteOptionsTotal = standardOptionsTotal + personalOptionsTotal;

        // 4. Dette totale globale
        const detteTotaleGlobale = fraisInscription + detteScolarite + detteOptionsTotal;

        return { fraisInscription, detteScolarite, detteOptions: fraisOptionsDetail, detteOptionsTotal, detteTotaleGlobale };
    }

    /**
     * Calcule la dette liée uniquement aux options pour un élève.
     * @param studentData - Les données sur les options de l'élève.
     * @returns Le montant total de la dette des options.
     */
    public calculerDetteOptions(studentData: Partial<Pick<DonneesEleve, 'optionsSupplementaires' | 'optionsPersonnalisees'>>) {
        const { optionsSupplementaires, optionsPersonnalisees } = studentData;
        const fraisOptions = serviceParametres.obtenirOptionsSupplementaires();
        const optionsPersoConfig = serviceParametres.obtenirOptionsSupplementairesPersonnalisees();

        let standardOptionsTotal = 0;
        if (optionsSupplementaires && fraisOptions) {
            Object.entries(optionsSupplementaires).forEach(([key, selected]) => {
                if (selected) {
                    standardOptionsTotal += fraisOptions[key as keyof typeof fraisOptions] || 0;
                }
            });
        }

        const personalOptionsTotal = (optionsPersonnalisees || []).reduce((sum, optionId) => {
            const option = optionsPersoConfig.find(opt => opt.id === optionId);
            return sum + (option ? option.prix : 0);
        }, 0);

        return standardOptionsTotal + personalOptionsTotal;
    }

    /**
     * Calcule le montant mensuel de scolarité pour un élève.
     * La scolarité annuelle est divisée par 10 mois.
     * @param studentData - Les données de l'élève.
     * @returns Le montant mensuel arrondi au supérieur.
     */
    public calculerMontantMensuel(studentData: StudentDataInput) {
        const { detteScolarite } = this.calculerDetteEleve(studentData);
        return Math.ceil(detteScolarite / 10);
    }

    /**
     * Calcule le montant d'une tranche de paiement pour un élève.
     * @param studentData - Les données de l'élève.
     * @param pourcentage - Le pourcentage de la tranche (ex: 25 pour 25%).
     * @returns Le montant de la tranche arrondi au supérieur.
     */
    public calculerMontantTranche(studentData: StudentDataInput, pourcentage: number) {
        const { detteScolarite } = this.calculerDetteEleve(studentData);
        return Math.ceil((detteScolarite * pourcentage) / 100);
    }

    /**
     * Calcule les frais détaillés pour l'inscription/réinscription d'un élève selon son mode de paiement.
     * @param studentData - Les données de l'élève.
     * @param modePaiement - Le mode de paiement choisi.
     * @param moisPaiement - Les mois sélectionnés (pour paiement mensuel).
     * @param tranchesPaiement - Les tranches configurées dans les paramètres.
     * @returns Un objet détaillant tous les frais calculés.
     */
    public calculerFraisDetaille(
        studentData: StudentDataInput,
        modePaiement: "mensuel" | "tranches",
        moisPaiement: string[] = [],
        tranchesPaiement: any[] = []
    ) {
        const { fraisInscription, detteScolarite, detteOptions, detteOptionsTotal } = this.calculerDetteEleve(studentData);

        let fraisScolarite = 0;
        let fraisParMois = 0;
        let tranches: { numero: number; montant: number; dateDebut: string; dateFin: string; pourcentage: number }[] = [];

        if (modePaiement === "mensuel") {
            const nombreMoisPayes = moisPaiement.length;
            if (nombreMoisPayes > 0) {
                fraisParMois = this.calculerMontantMensuel(studentData);
                fraisScolarite = fraisParMois * nombreMoisPayes;
            }
        } else if (modePaiement === "tranches") {
            const tranchesSelectionnees = moisPaiement.filter(m => m.startsWith("Tranche")).length;
            if (tranchesSelectionnees > 0 && tranchesPaiement.length > 0) {
                fraisScolarite = 0;
                tranches = [];

                tranchesPaiement.forEach((trancheConfig) => {
                    if (moisPaiement.includes(`Tranche ${trancheConfig.numero}`)) {
                        const montantTranche = this.calculerMontantTranche(studentData, trancheConfig.pourcentage);
                        fraisScolarite += montantTranche;

                        tranches.push({
                            numero: trancheConfig.numero,
                            montant: montantTranche,
                            dateDebut: trancheConfig.dateDebut,
                            dateFin: trancheConfig.dateFin,
                            pourcentage: trancheConfig.pourcentage
                        });
                    }
                });
            }
        }

        const totalAPayer = fraisInscription + fraisScolarite + detteOptionsTotal;

        return {
            fraisInscription,
            fraisScolarite,
            fraisOptions: detteOptions, // Retourne maintenant l'objet détaillé
            totalAPayer,
            fraisParMois,
            tranches
        };
    }

    /**
     * Calcule le montant total pour une liste d'items à payer (mois, tranches, options).
     * @param student - L'élève concerné.
     * @param itemsToPay - Un tableau de chaînes représentant les items.
     * @returns Le montant total.
     */
    public calculerMontantPourItems(student: DonneesEleve, itemsToPay: string[]): number {
        return itemsToPay.reduce((sum, item) => {
            if (item.startsWith("Option:")) {
                const optionName = item.replace('Option: ', '');
                const standardOptions = serviceParametres.obtenirOptionsSupplementaires();
                const customOptions = serviceParametres.obtenirOptionsSupplementairesPersonnalisees();
                
                // Chercher d'abord dans les options standards
                let optionPrice = standardOptions[optionName as keyof typeof standardOptions] || 0;

                // Si non trouvé, chercher dans les options personnalisées
                if (optionPrice === 0) {
                    optionPrice = customOptions.find(opt => opt.nom === optionName)?.prix || 0;
                }
                return sum + optionPrice;
            } else if (item.startsWith("Tranche")) {
                const trancheNum = parseInt(item.split(" ")[1]);
                const parametresPaiement = serviceParametres.obtenirParametresPaiement();
                const tranche = parametresPaiement.tranchesPaiement.find(t => t.numero === trancheNum);
                if (tranche) {
                    const montantTranche = this.calculerMontantTranche(student, tranche.pourcentage);
                    return sum + montantTranche;
                }
            } else { // C'est un mois
                const fraisParMois = this.calculerMontantMensuel(student);
                return sum + fraisParMois;
            }
            return sum;
        }, 0);
    }

    /**
     * Crée les détails d'un paiement pour un item spécifique.
     * @param student - L'élève concerné.
     * @param item - La chaîne représentant l'item à payer.
     * @returns Un objet avec le montant, le type et la description du paiement.
     */
    public creerDetailPaiementPourItem(student: DonneesEleve, item: string): { montantItem: number; typePaiement: "scolarite" | "autre" | "inscription"; description: string } {
        let typePaiement: "scolarite" | "autre" | "inscription" = "scolarite";
        let description = `Paiement pour ${item}`;
        let montantItem = 0;

        if (item.startsWith("Option:")) {
            typePaiement = "autre";
            const optionName = item.replace('Option: ', '').trim();
            const standardOptions = serviceParametres.obtenirOptionsSupplementaires();
            const customOptions = serviceParametres.obtenirOptionsSupplementairesPersonnalisees();

            // Chercher d'abord dans les options standards
            let optionPrice = standardOptions[optionName as keyof typeof standardOptions] || 0;

            // Si non trouvé, chercher dans les options personnalisées
            if (optionPrice === 0) {
                optionPrice = customOptions.find(opt => opt.nom === optionName)?.prix || 0;
            }
            montantItem = optionPrice;
            description = item;
        } else if (item.startsWith("Tranche")) {
            const trancheNum = parseInt(item.split(" ")[1]);
            const parametresPaiement = serviceParametres.obtenirParametresPaiement();
            const tranche = parametresPaiement.tranchesPaiement.find(t => t.numero === trancheNum);
            if (tranche) {
                montantItem = this.calculerMontantTranche(student, tranche.pourcentage);
            }
        } else { // C'est un mois
            montantItem = this.calculerMontantMensuel(student);
        }

        return { montantItem, typePaiement, description };
    }
}

export const serviceFinances = new ServiceFinances();