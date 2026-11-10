// ==============================================================================
// CONFIGURATION GLOBALE & DOCTRINE JURIDIQUE CCMVR
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};

window.CCMVR.CONFIG = {
    // ==========================================================================
    // MODE PROVISOIRE PRÉ-VALIDATION (CONSULTATION DIRECTE DES PÔLES SANS CONNEXION)
    // Passer à false lors de la version finale pour masquer 100 % du bouton
    // « Checker une association » et retrouver l'application strictement à l'identique.
    // ==========================================================================
    ENABLE_TEMP_PUBLIC_CHECK_ASSO: true,

    SUPABASE_URL: 'https://fnudhgwtgqznstnmzdfp.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudWRoZ3d0Z3F6bnN0bm16ZGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODY4NjUsImV4cCI6MjA5MjI2Mjg2NX0.KfZ0U0sM62bEoCLZVgETorMuHrlODXVjIyXg_ro1nAY',
    COLLECTIVITE_NOM: 'Communauté de Communes Marches du Velay Rochebaron',
    COLLECTIVITE_SIGLE: 'CCMVR',
    COLLECTIVITE_SIRET: '20007342700011',
    COLLECTIVITE_ADRESSE: 'ZA La Borie 1, 9 rue de l\'Épée, BP 7060, 43120 Monistrol-sur-Loire',
    COLLECTIVITE_PRESIDENTE: 'Madame Jocelyne DUPLAIN',
    TRIBUNAL_COMPETENT: 'Tribunal Administratif de Clermont-Ferrand (6 cours Sablon, 63000 Clermont-Ferrand)',
    DELIBERATION_CADRE: 'CCMVR260505-21 du 5 mai 2026',
    ANNEE_PAR_DEFAUT: 2027,
    API_ENTREPRISE_UID: '3fbf31bf-0832-460a-8eeb-aac4f2a90c35',
    API_ENTREPRISE_TOKEN: '',
    API_ENTREPRISE_SCOPES: ['associations_djepva', 'unites_legales_etablissements_insee', 'open_data'],

    // Profils de démonstration & Rôles métiers
    PERSONAS: {
        admin: {
            id: 'admin',
            email: 'controle@ccmvr.fr',
            nom: 'Maxime JACQUIOT',
            titre: 'Contrôleur de Gestion (Financier & Juridique)',
            role: 'admin',
            pole_code: 'CDG',
            badgeColor: 'bg-slate-900 text-white'
        },
        sport: {
            id: 'sport',
            email: 'sport@ccmvr.fr',
            nom: 'Mickaël (Service Sport)',
            titre: 'Responsable Pôle Sport & Équipements',
            role: 'pole_metier',
            pole_code: 'SPORT',
            badgeColor: 'bg-orange-600 text-white'
        },
        enfance: {
            id: 'enfance',
            email: 'enfance@ccmvr.fr',
            nom: 'Référent Enfance Jeunesse Solidarité',
            titre: 'Coordinateur Pôle Enfance Jeunesse Solidarité',
            role: 'pole_metier',
            pole_code: 'ENFANCE',
            badgeColor: 'bg-blue-600 text-white'
        },
        culture: {
            id: 'culture',
            email: 'culture@ccmvr.fr',
            nom: 'Référent Culture & Événementiel',
            titre: 'Responsable Pôle Culture & Enseignement Artistique',
            role: 'pole_metier',
            pole_code: 'CULTURE',
            badgeColor: 'bg-pink-600 text-white'
        },
        tourisme: {
            id: 'tourisme',
            email: 'tourisme@ccmvr.fr',
            nom: 'Référent Tourisme & Patrimoine',
            titre: 'Responsable Pôle Tourisme & Patrimoine',
            role: 'pole_metier',
            pole_code: 'TOURISME',
            badgeColor: 'bg-emerald-600 text-white'
        },
        economie: {
            id: 'economie',
            email: 'economie@ccmvr.fr',
            nom: 'Référent Développement Économique',
            titre: 'Responsable Pôle Développement Économique',
            role: 'pole_metier',
            pole_code: 'ECONOMIE',
            badgeColor: 'bg-purple-600 text-white'
        },
        accueil: {
            id: 'accueil',
            email: 'accueil@ccmvr.fr',
            nom: 'Service Accueil CCMVR',
            titre: 'Gestionnaire Réservations & Flotte Minibus',
            role: 'pole_accueil',
            pole_code: 'ACCUEIL',
            badgeColor: 'bg-cyan-600 text-white'
        },
        batiments: {
            id: 'batiments',
            email: 'batiments@ccmvr.fr',
            nom: 'Service Bâtiments & Logistique',
            titre: 'Gestionnaire Locaux, Régie Technique & Matériel',
            role: 'pole_batiments',
            pole_code: 'BATIMENTS',
            badgeColor: 'bg-emerald-600 text-white'
        },
        association: {
            id: 'association',
            email: '',
            nom: 'Espace Association',
            titre: 'Espace Extranet Association',
            role: 'association',
            badgeColor: 'bg-indigo-600 text-white'
        }
    },

    // Paliers réglementaires de subvention
    PALIERS: [
        {
            id: 1,
            max: 5000,
            label: 'Palier 1 (< 5 000 €)',
            shortDesc: 'Circuit ultra-simplifié',
            budgetType: 'SIMPLIFIE',
            visaCdgRequis: false,
            typeActe: 'Arrêté / Notification d\'attribution simplifiée',
            color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        },
        {
            id: 2,
            min: 5000,
            max: 23000,
            label: 'Palier 2 (5 000 € à 23 000 €)',
            shortDesc: 'Instruction standard de pôle',
            budgetType: 'SIMPLIFIE',
            visaCdgRequis: false,
            typeActe: 'Convention annuelle d\'objectifs',
            color: 'bg-blue-50 text-blue-800 border-blue-200'
        },
        {
            id: 3,
            min: 23000,
            max: 50000,
            label: 'Palier 3 (23 000 € à 50 000 € — Seuil Loi 2000-321)',
            shortDesc: 'Visa Contrôle de Gestion + CPO Pluriannuelle obligatoire',
            budgetType: 'ANALYTIQUE',
            visaCdgRequis: true,
            typeActe: 'Convention Pluriannuelle d\'Objectifs (CPO 3-4 ans)',
            color: 'bg-amber-50 text-amber-900 border-amber-200'
        },
        {
            id: 4,
            min: 50000,
            max: Infinity,
            label: 'Palier 4 (> 50 000 € — Partenariat Stratégique)',
            shortDesc: 'Audit financier approfondi + Visa CdG + CPO renforcée',
            budgetType: 'ANALYTIQUE',
            visaCdgRequis: true,
            typeActe: 'CPOM Pluriannuelle Renforcée (3-4 ans) + Contrôle CAC',
            color: 'bg-purple-50 text-purple-900 border-purple-200'
        }
    ],

    // Guide réglementaire Le Compte Asso (lecompteasso.associations.gouv.fr) & Démarches DJEPVA
    LE_COMPTE_ASSO: {
        url_base: 'https://lecompteasso.associations.gouv.fr',
        url_documents_template: 'https://lecompteasso.associations.gouv.fr/v2/associations/4050148/informations-administratives/documents',
        seuil_conventionnement_obligatoire: 23000,
        textes_reference: 'Loi n° 2000-321 du 12 avril 2000, Décret n° 2001-495 & Art. L. 1611-4 du CGCT',
        DOCUMENTS_OFFICIELS: [
            { code: 'LDC', nom: 'Liste des dirigeants', origine: 'RNA', format: 'PDF', televerse_par: 'Préfecture (RNA)', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Composition nominative du bureau et du conseil d\'administration déclarée en Préfecture' },
            { code: 'REC', nom: 'Récépissé de création ou de dernière modification', origine: 'RNA', format: 'PDF', televerse_par: 'Préfecture (RNA)', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Récépissé préfectoral officiel attestant du dépôt légal' },
            { code: 'STC', nom: 'Statuts', origine: 'RNA', format: 'PDF', televerse_par: 'Préfecture (RNA)', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Statuts constitutifs ou modifiés en vigueur signés' },
            { code: 'INSEE', nom: 'Avis de situation Sirene', origine: 'INSEE', format: 'PDF', televerse_par: 'INSEE', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Attestation d\'inscription au répertoire Sirene avec code APE et numéro SIRET' },
            { code: 'BP', nom: 'Budget prévisionnel annuel', origine: 'association', format: 'PDF / XLSX', televerse_par: 'Association', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Budget équilibré prévisionnel de l\'exercice pour lequel la subvention est demandée' },
            { code: 'CR_N2', nom: "Compte de résultat annuel de l'avant-dernier exercice clos", origine: 'association', format: 'PDF', televerse_par: 'Association', obligatoireDès23k: false, obligatoireSous23k: false, desc: 'Comptes annuels de l\'avant-dernier exercice (optionnel)' },
            { code: 'CR_N1', nom: 'Compte de résultat annuel du dernier exercice clos', origine: 'association', format: 'PDF', televerse_par: 'Association', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Compte de résultat et bilan du dernier exercice clos approuvés en AG' },
            { code: 'PV_AG', nom: 'Compte-rendu de la dernière assemblée générale', origine: 'association', format: 'PDF', televerse_par: 'Association', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Procès-verbal de l\'AG ordinaire approuvant l\'activité et les comptes' },
            { code: 'RIB', nom: 'Coordonnées bancaires (RIB)', origine: 'association', format: 'PDF', televerse_par: 'Association', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'RIB officiel au nom exact de l\'association (IBAN/BIC)' },
            { code: 'RA', nom: 'Dernier rapport d\'activité', origine: 'association', format: 'PDF / PPTX', televerse_par: 'Association', obligatoireDès23k: true, obligatoireSous23k: false, desc: 'Rapport moral et technique d\'activité de la saison écoulée' }
        ]
    },

    // Types de sollicitation auprès de la CCMVR (Monétaire, Nature, Mixte)
    NATURES_DEMANDE: {
        MONETAIRE: {
            code: 'MONETAIRE',
            label: 'Subvention financière (Monétaire)',
            badge: 'Subvention Monétaire',
            icon: 'coins',
            color: 'blue',
            desc: 'Aide financière en numéraire versée par mandat administratif sur le compte bancaire de l\'association.'
        },
        NATURE: {
            code: 'NATURE',
            label: 'Concours en nature exclusivement',
            badge: 'Aide en Nature',
            icon: 'truck',
            color: 'indigo',
            desc: 'Prêt de matériel intercommunal, mise à disposition de locaux / gymnases, minibus ou personnel régie (0 € monétaire sollicité).'
        },
        MIXTE: {
            code: 'MIXTE',
            label: 'Demande Mixte (Financière + Nature)',
            badge: 'Aide Mixte (Monétaire + Nature)',
            icon: 'sparkles',
            color: 'purple',
            desc: 'Subvention financière en numéraire complétée par un accompagnement en nature (locaux, matériel, minibus ou personnel).'
        }
    },

        // Formules de calcul indicatif par défaut pour chaque pôle (avec barème visuel sans code)
    FORMULES_POLES: {
        SPORT: {
            mode_calcul: 'POINTS',
            valeur_point: 5.25,
            forfait_socle: 0,
            weights: {
                lic_adultes: 7,
                lic_jeunes: 6,
                lic_enfants: 2,
                lic_handisport: 12,
                lic_benevoles: 3,
                part_forum_assos: 20,
                part_animation_ccmvr: 20
            },
            expression: 'points_total * 5.25',
            description: 'Total des points de la grille officielle × 5,25 € + Prises en charge directes (matériel handicap, stages, BE salariés)'
        },
        ENFANCE: {
            mode_calcul: 'EUROS',
            valeur_point: 1,
            forfait_socle: 500,
            weights: { heures_alsh: 2.5, places_creche: 400, action_ctg: 2000 },
            expression: '500 + (heures_alsh * 2.5) + (places_creche * 400) + (action_ctg ? 2000 : 0)',
            description: 'Socle 500 € + 2,50 € par heure/enfant ALSH + 400 € par place agréée + 2 000 € forfait coopération CTG'
        },
        CULTURE: {
            mode_calcul: 'EUROS',
            valeur_point: 1,
            forfait_socle: 300,
            weights: { nb_eleves_ccmvr: 60, nb_concerts_territoire: 500 },
            expression: '300 + (nb_eleves_ccmvr * 60) + (nb_concerts_territoire * 500)',
            description: 'Socle 300 € + 60 € par élève du territoire + 500 € par diffusion culturelle intercommunale'
        },
        TOURISME: {
            mode_calcul: 'EUROS',
            valeur_point: 1,
            forfait_socle: 1000,
            weights: { forfait_accueil_annuel: 1 },
            expression: '1000 + (forfait_accueil_annuel * 1)',
            description: 'Dotation d\'objectifs touristiques selon fréquentation et actions patrimoniales'
        },
        ECONOMIE: {
            mode_calcul: 'EUROS',
            valeur_point: 1,
            forfait_socle: 500,
            weights: { nb_entreprises_accompagnees: 150 },
            expression: '500 + (nb_entreprises_accompagnees * 150)',
            description: 'Soutien aux réseaux d\'entreprises, commerçants et initiatives de développement local'
        },
        CDG: {
            mode_calcul: 'EUROS',
            valeur_point: 1,
            forfait_socle: 0,
            weights: {},
            expression: '0',
            description: 'Instruction directe par le Contrôle de Gestion & Finances'
        }
    },

        // Grilles officielles détaillées d'évaluation par Pôle (avec support multi-catégories / dispositifs, volets, seuils et justificatifs)
    GRILLES_POLES: {
        SPORT: {
            pole_code: 'SPORT',
            titre: 'DISPOSITIFS & BARÈMES — PÔLE SPORT',
            categories: [
                {
                    id: 'sport_fonct_global',
                    nom: 'Fonctionnement global club',
                    description: 'Dispositif standard de soutien au fonctionnement général des clubs et associations sportives.',
                    mode_calcul: 'POINTS',
                    valeur_point: 5.25,
                    forfait_socle: 0,
                    volets: [
                {
                    id: 'volet_1',
                    numero: 1,
                    titre: '1. AIDE À LA GESTION DU CLUB (LICENCES)',
                    description: 'Fournir un récapitulatif et un justificatif fédéral (ou de la ligue) des licenciés.',
                    justificatif_requis: true,
                    justificatif_label: 'Attestation & Récapitulatif Fédéral des Licences',
                    criteres: [
                        { code: 'lic_seniors', libelle: 'Séniors (26 ans et +) nés en 1999 et avant', type: 'number', points: 0, unite: 'licencié(s)', aide: 'Licenciés compétition (0 point)' },
                        { code: 'lic_adultes', libelle: 'Adultes (18 à 25 ans) nés de 2000 à 2007', type: 'number', points: 7, unite: 'licencié(s)', aide: '7 points / licencié compétition' },
                        { code: 'lic_jeunes', libelle: 'Jeunes (7 à 17 ans) nés de 2008 à 2018', type: 'number', points: 6, unite: 'licencié(s)', aide: '6 points / licencié compétition' },
                        { code: 'lic_enfants', libelle: 'Enfants (6 ans et moins) nés en 2019 et après', type: 'number', points: 2, unite: 'licencié(s)', aide: '2 points / licencié compétition' },
                        { code: 'lic_handisport', libelle: 'Sport adapté (handicap mental ou psychique, tous âges)', type: 'number', points: 12, unite: 'licencié(s)', aide: '12 points / licencié compétition' },
                        { code: 'lic_benevoles', libelle: 'Licences « Hors-Compétition » (bénévoles, juges/arbitres, membres du bureau)', type: 'number', points: 3, unite: 'licencié(s)', aide: '3 points / licencié bénévole ou officiel' }
                    ]
                },
                {
                    id: 'volet_2',
                    numero: 2,
                    titre: '2. FORMATION, PROFESSIONNALISATION & STRUCTURATION',
                    description: 'Encadrement, stages officiels, éducateurs brevetés et formations vie associative.',
                    justificatif_requis: true,
                    justificatif_label: 'Diplômes, Plannings d\'entraînement et Justificatifs de stages',
                    criteres: [
                        { code: 'stage_initiateurs_montant', libelle: 'Stages officiels Initiateurs & Arbitres (diplômes non-professionnalisants)', type: 'currency', mode_val: 'POURCENTAGE_DIRECT', taux: 0.25, aide: 'Prise en charge à hauteur de 25 % (hors hébergement/transport/restauration)' },
                        { code: 'entraineurs_federaux_seances', libelle: 'Entraîneurs fédéraux & Service civique (séances hebdo hors coaching)', type: 'select', options: [
                            { label: '0 séance / semaine (0 pt)', value: '0', points: 0 },
                            { label: '1 séance d\'entraînement / semaine (10 pts)', value: '1', points: 10 },
                            { label: '2 séances d\'entraînement / semaine (20 pts)', value: '2', points: 20 }
                        ], aide: 'Limité à 2 séances / semaine / entraîneur' },
                        { code: 'entraineurs_be_benevoles_seances', libelle: 'Entraîneurs Brevet d\'État non salariés ou Enseignant EPS', type: 'select', options: [
                            { label: '0 séance / semaine (0 pt)', value: '0', points: 0 },
                            { label: '1 séance d\'entraînement / semaine (15 pts)', value: '1', points: 15 },
                            { label: '2 séances d\'entraînement / semaine (25 pts)', value: '2', points: 25 }
                        ], aide: 'Limité à 2 séances / semaine / entraîneur' },
                        { code: 'be_alternance_heures_hebdo', libelle: 'En cours de formation Brevet d\'État en alternance (heures hebdo)', type: 'number', points: 10, plafond: 25, unite: 'h / sem', aide: 'Nombre d\'heures d\'entraînement hebdo × 10 points (plafonné à 25 h)' },
                        { code: 'be_salaries_heures_mensuelles', libelle: 'Entraîneurs Brevet d\'État Salariés (heures mensuelles déclarées)', type: 'number', mode_val: 'EUROS_DIRECT', formule_custom: 'heures * 12 * 2', plafond: 80, unite: 'h / mois', aide: 'Heures mensuelles × 12 mois × 2 € (plafonné à 80 h / mois / entraîneur)' },
                        { code: 'formation_benevoles_nb', libelle: 'Formations des bénévoles & salariés sur la vie associative (finances, com, sécurité...)', type: 'number', points: 10, plafond: 2, unite: 'formation(s)', aide: '10 points / formation réalisée (Plafond : max 2 formations / club / an = 20 pts)' }
                    ]
                },
                {
                    id: 'volet_3',
                    numero: 3,
                    titre: '3. INITIATIVES & ACTIONS LOCALES : DÉVELOPPEMENT & INNOVATION',
                    description: 'Création de nouvelles activités et acquisition de matériel adapté au handicap.',
                    justificatif_requis: true,
                    justificatif_label: 'Factures d\'achat de matériels spécifiques au handicap',
                    criteres: [
                        { code: 'nouvelle_activite_standard', libelle: 'Nouvelle activité / nouvelle pratique créée dans l\'association', type: 'number', points: 20, plafond: 2, unite: 'activité(s)', aide: '20 points / nouvelle activité (limité à deux)' },
                        { code: 'nouvelle_activite_handicap', libelle: 'Nouvelle activité créée en lien spécifique avec le handicap', type: 'number', points: 40, plafond: 2, unite: 'activité(s)', aide: '40 points pour une activité liée au handicap (limité à deux)' },
                        { code: 'materiel_handicap_montant_ttc', libelle: 'Moyens matériels spécifiques au handicap (factures TTC)', type: 'currency', mode_val: 'POURCENTAGE_DIRECT', taux: 0.20, plafond_montant: 1000, aide: 'Prise en charge à 20 % du montant TTC — Plafond 1 000 € (hors vêtements/informatique)' }
                    ]
                },
                {
                    id: 'volet_4',
                    numero: 4,
                    titre: '4. VALORISER LE TRAVAIL DE FORMATION DES CLUBS',
                    description: 'Labels officiels décernés aux écoles de formation et sélection de sportifs.',
                    justificatif_requis: true,
                    justificatif_label: 'Justificatifs fédéraux de labels et convocations aux stages de sélection',
                    criteres: [
                        { code: 'label_ecole_federale', libelle: 'Label École de formation / arbitrage décerné par la Fédération', type: 'select', options: [
                            { label: 'Aucun label fédéral (0 pt)', value: 'aucun', points: 0 },
                            { label: 'Label Bronze ou 1* ou équivalent (20 pts)', value: 'bronze', points: 20 },
                            { label: 'Label Argent ou 2** ou équivalent (30 pts)', value: 'argent', points: 30 },
                            { label: 'Label Or ou 3*** ou équivalent (40 pts)', value: 'or', points: 40 }
                        ], aide: 'Limite d\'un seul label par club' },
                        { code: 'selections_comite_dept', libelle: 'Sportifs sélectionnés en stages par le Comité Départemental', type: 'number', points: 5, unite: 'stagiaire(s)', aide: '5 points / stagiaire sélectionné' },
                        { code: 'selections_ligue_aura', libelle: 'Sportifs sélectionnés en stages par la Ligue AURA', type: 'number', points: 10, unite: 'stagiaire(s)', aide: '10 points / stagiaire sélectionné' },
                        { code: 'selections_nationale', libelle: 'Sélection Nationale (stages nationaux ou collectifs France)', type: 'number', points: 20, unite: 'stagiaire(s)', aide: '20 points / stagiaire sélectionné' }
                    ]
                },
                {
                    id: 'volet_5',
                    numero: 5,
                    titre: '5. PARTICIPATION CITOYENNE DU CLUB À LA VIE DU TERRITOIRE',
                    description: 'Présence aux animations intercommunales et interventions auprès des jeunes.',
                    justificatif_requis: true,
                    justificatif_label: 'Attestations d\'intervention signées et tamponnées par les établissements receveurs',
                    criteres: [
                        { code: 'part_forum_assos', libelle: 'Participation à l\'ensemble des forums du territoire (stand tenu la journée)', type: 'boolean', points: 20, aide: '20 points forfaitaires' },
                        { code: 'part_animation_ccmvr', libelle: 'Participation à une animation portée par la CCMVR ou une commune', type: 'boolean', points: 20, aide: 'Proposer au moins une activité = 20 points' },
                        { code: 'interv_centre_loisirs', libelle: 'Interventions en centre de loisirs (min. 2 interventions)', type: 'number', plancher: 2, points: 20, unite: 'intervention(s)', aide: '20 points / intervention (condition : avoir fait au moins 2 interventions)' },
                        { code: 'interv_ecoles_primaires', libelle: 'Interventions en école 1er degré / élémentaire (min. 2 interventions)', type: 'number', plancher: 2, points: 20, unite: 'intervention(s)', aide: '20 points / intervention (condition : avoir fait au moins 2 interventions)' }
                    ]
                },
                {
                    id: 'volet_6',
                    numero: 6,
                    titre: '6. ANIMER LE TERRITOIRE PAR DES MANIFESTATIONS SPORTIVES',
                    description: 'Organisation de stages et de compétitions officielles sur les 14 communes de la CCMVR.',
                    justificatif_requis: true,
                    justificatif_label: 'Courrier, invitation ou demande officielle d\'utilisation d\'infrastructure',
                    criteres: [
                        { code: 'manifest_stages_organises', libelle: 'Organisation de stages sportifs sur le territoire de la CCMVR', type: 'number', points: 15, unite: 'stage(s)', aide: '15 points / stage organisé sur l\'une des 14 communes' },
                        { code: 'manifest_competition_dept', libelle: 'Organisation d\'une compétition départementale sur la CCMVR', type: 'boolean', points: 25, aide: '25 points (limite d\'une compétition par niveau)' },
                        { code: 'manifest_competition_reg', libelle: 'Organisation d\'une compétition régionale sur la CCMVR', type: 'boolean', points: 50, aide: '50 points (limite d\'une compétition par niveau)' },
                        { code: 'manifest_competition_nat', libelle: 'Organisation d\'une compétition nationale sur la CCMVR', type: 'boolean', points: 80, aide: '80 points (limite d\'une compétition par niveau)' }
                    ]
                },
                {
                    id: 'volet_7',
                    numero: 7,
                    titre: '7. ENCOURAGER LA MIXITÉ SOCIALE (LOI DU 4 AOÛT 2014)',
                    description: 'Égalité femmes-hommes dans l\'équipe dirigeante et l\'encadrement technique (ratio 40 % à 60 % = +10 pts).',
                    justificatif_requis: false,
                    criteres: [
                        { code: 'mixite_bureau_femmes', libelle: 'Bureau directeur : Nombre de FEMMES', type: 'number', unite: 'femme(s)', aide: 'Membres déclarés du bureau' },
                        { code: 'mixite_bureau_hommes', libelle: 'Bureau directeur : Nombre d\'HOMMES', type: 'number', unite: 'homme(s)', aide: 'Membres déclarés du bureau' },
                        { code: 'mixite_cadres_femmes', libelle: 'Encadrement / Entraîneurs : Nombre de FEMMES', type: 'number', unite: 'femme(s)', aide: 'Entraîneuses et éducatrices' },
                        { code: 'mixite_cadres_hommes', libelle: 'Encadrement / Entraîneurs : Nombre d\'HOMMES', type: 'number', unite: 'homme(s)', aide: 'Entraîneurs et éducateurs' }
                    ]
                }
            ]
                }
            ]
        },
        CULTURE: {
            pole_code: 'CULTURE',
            titre: 'DISPOSITIFS & BARÈMES — PÔLE CULTURE',
            categories: []
        },
        ENFANCE: {
            pole_code: 'ENFANCE',
            titre: 'DISPOSITIFS & BARÈMES — PÔLE ENFANCE',
            categories: []
        },
        TOURISME: {
            pole_code: 'TOURISME',
            titre: 'DISPOSITIFS & BARÈMES — PÔLE TOURISME',
            categories: []
        },
        ECONOMIE: {
            pole_code: 'ECONOMIE',
            titre: 'DISPOSITIFS & BARÈMES — PÔLE ÉCONOMIE',
            categories: []
        }
    },

    // Les 7 Engagements officiels du Contrat d'Engagement Républicain (Décret n° 2021-1947 du 31 décembre 2021)
    CER_ENGAGEMENTS: [
        {
            numero: 1,
            titre: 'Respect des lois de la République',
            texte: 'Le respect des lois de la République s\'impose aux associations et aux fondations. L\'association s\'engage à ne se prévaloir d\'aucune conviction pour s\'affranchir des règles communes.'
        },
        {
            numero: 2,
            titre: 'Liberté de conscience',
            texte: 'L\'association s\'engage à respecter et protéger la liberté de conscience de ses membres et des tiers, et s\'interdit tout prosélytisme abusif ou pression morale.'
        },
        {
            numero: 3,
            titre: 'Liberté des membres de l\'association',
            texte: 'L\'association respecte la liberté de chacun de ses membres d\'adhérer ou de se retirer, conformément à l\'article 4 de la loi du 1er juillet 1901.'
        },
        {
            numero: 4,
            titre: 'Égalité et non-discrimination',
            texte: 'L\'association s\'engage à garantir l\'égalité entre les femmes et les hommes et à proscrire toute forme de discrimination fondée sur l\'origine, le sexe, l\'orientation sexuelle ou les opinions.'
        },
        {
            numero: 5,
            titre: 'Fraternité et prévention de la violence',
            texte: 'L\'association agit dans un esprit de fraternité et de cohésion sociale, et s\'interdit toute incitation à la haine ou à la violence.'
        },
        {
            numero: 6,
            titre: 'Respect de la dignité de la personne humaine',
            texte: 'L\'association s\'engage à respecter la dignité de la personne humaine et les règles de sécurité et de protection de l\'intégrité physique et morale, notamment des mineurs.'
        },
        {
            numero: 7,
            titre: 'Respect des symboles de la République',
            texte: 'L\'association s\'engage à respecter le drapeau tricolore, l\'hymne national et la devise de la République.'
        }
    ],

    // Tronc Commun Institutionnel Verrouillé (12 Articles - Modifiable uniquement par l'Admin / Contrôleur de Gestion)
    TRONC_COMMUN_ARTICLES: [
        {
            num: 1,
            titre: 'Objet du partenariat et nature du soutien',
            contenu: 'La présente convention-cadre définit le cadre du partenariat entre la CCMVR et l’Association, ainsi que les conditions dans lesquelles la CCMVR peut lui attribuer, chaque année, une subvention de fonctionnement au regard de son activité, de son projet associatif et des critères définis dans l’Annexe 1 Métier. La convention-cadre ne vaut pas attribution automatique d’une subvention annuelle et ne crée aucun droit acquis au renouvellement d’un montant identique d’un exercice à l’autre.'
        },
        {
            num: 2,
            titre: 'Durée ferme et interdiction de tacite reconduction',
            contenu: 'Conformément au décret n° 2001-495 du 6 juin 2001 et à la circulaire du Premier ministre n° 5811/SG du 29 septembre 2015, la présente convention est conclue pour une durée ferme déterminée (maximum 3 à 4 exercices budgétaires). En aucun cas elle ne peut faire l’objet d’une prorogation par tacite reconduction.'
        },
        {
            num: 3,
            titre: 'Procédure annuelle et Fiche Financière Attributive',
            contenu: 'Chaque année, l’Association renseigne sur la plateforme numérique de la CCMVR son budget prévisionnel, ses comptes clos et les indicateurs métiers du pôle. Le montant annuel arrêté par délibération du Conseil Communautaire est notifié par une « Décision d’Attribution et Fiche Financière Annuelle » annexée à la présente convention, sans qu’un avenant formel ne soit requis tant que l’économie générale du contrat demeure inchangée.'
        },
        {
            num: 4,
            titre: 'Modalités de versement et condition suspensive',
            contenu: 'Le versement intervient après le caractère exécutoire de la délibération d’attribution. Le paiement de tout acompte N+1 ou du solde de l’exercice en cours est strictement subordonné à la transmission préalable des justificatifs de l’exercice antérieur.'
        },
        {
            num: 5,
            titre: 'Obligation du Compte-Rendu Financier Cerfa n° 15059',
            contenu: 'En application de l’article 10 de la loi n° 2000-321 du 12 avril 2000 et de l’arrêté du 11 octobre 2006, l’Association s’engage à produire, dans les six mois suivant la clôture de l’exercice, le compte-rendu financier conforme au modèle réglementaire Cerfa n° 15059*02 attestant de la conformité des dépenses effectuées à l’objet de la subvention.'
        },
        {
            num: 6,
            titre: 'Contrôle financier et opérationnel de la CCMVR (Art. L. 1611-4 CGCT)',
            contenu: 'Conformément aux dispositions impératives de l’article L. 1611-4 du Code Général des Collectivités Territoriales, l’Association est soumise au contrôle des délégués de la CCMVR et de son Contrôleur de gestion. Tous les livres, factures, relevés bancaires et documents comptables doivent être communiqués sur simple demande.'
        },
        {
            num: 7,
            titre: 'Respect du Contrat d’Engagement Républicain (CER)',
            contenu: 'L’Association atteste avoir souscrit le Contrat d’Engagement Républicain figurant en Annexe 2 conformément à la loi n° 2021-1109 du 24 août 2021 et au décret n° 2021-1947 du 31 décembre 2021. En cas de manquement avéré, la CCMVR procède au retrait de la subvention et exige la restitution des sommes versées dans un délai de six mois.'
        },
        {
            num: 8,
            titre: 'Soutiens en nature et Attestation Annuelle (Art. L. 2313-1 CGCT)',
            contenu: 'Les mises à disposition gracieuses de locaux, d’équipements sportifs ou culturels, de minibus communautaires, de prestations techniques ou de licences informatiques constituent des subventions indirectes en nature. Elles sont comptabilisées au fil de l’eau et font l’objet d’une « Attestation Annuelle de Concours en Nature » valorisée en coût complet et annexée au budget de la collectivité.'
        },
        {
            num: 9,
            titre: 'Assurances, responsabilités et gestion désintéressée',
            contenu: 'L’Association exerce ses activités sous sa responsabilité exclusive, maintient une gestion désintéressée et justifie d’une police d’assurance responsabilité civile couvrant ses dirigeants, salariés, bénévoles, adhérents et les biens mis à sa disposition.'
        },
        {
            num: 10,
            titre: 'Communication et visibilité intercommunale',
            contenu: 'L’Association s’engage à faire figurer le logo officiel de la CCMVR et à mentionner son soutien sur l’ensemble de ses supports de communication (affiches, site web, réseaux sociaux, événements).'
        },
        {
            num: 11,
            titre: 'Modification, avenants et résiliation',
            contenu: 'Toute modification substantielle fait l’objet d’un avenant écrit, dans la limite stricte de trois avenants sur la durée de la convention. La convention peut être résiliée par l’une ou l’autre des parties moyennant un préavis de trois mois notifié par écrit, ou de plein droit en cas de dissolution ou de manquement grave après mise en demeure.'
        },
        {
            num: 12,
            titre: 'Règlement des litiges et juridiction compétente',
            contenu: 'Les parties s’efforcent de résoudre à l’amiable tout différend relatif à l’interprétation ou à l’exécution de la présente convention. À défaut d’accord amiable, le litige relève de la compétence exclusive du Tribunal Administratif de Clermont-Ferrand (6 cours Sablon, 63000 Clermont-Ferrand).'
        }
    ],

    // Socles Communs Juridiques par Type de Convention (Corps d'articles administrés exclusivement par le Contrôleur de Gestion)
    SOCLES_COMMUNS_PAR_TYPE: {
        COM_OBJECTIFS: [
            {
                num: 1,
                titre: 'Objet du partenariat et nature du soutien',
                contenu: 'La présente convention-cadre définit le cadre du partenariat entre la CCMVR et l’Association, ainsi que les conditions dans lesquelles la CCMVR peut lui attribuer, chaque année, une subvention de fonctionnement au regard de son activité, de son projet associatif et des critères définis dans l’Annexe 1 Métier. La convention-cadre ne vaut pas attribution automatique d’une subvention annuelle et ne crée aucun droit acquis au renouvellement d’un montant identique d’un exercice à l’autre.'
            },
            {
                num: 2,
                titre: 'Durée ferme et interdiction de tacite reconduction',
                contenu: 'Conformément au décret n° 2001-495 du 6 juin 2001 et à la circulaire du Premier ministre n° 5811/SG du 29 septembre 2015, la présente convention est conclue pour une durée ferme déterminée (maximum 3 à 4 exercices budgétaires). En aucun cas elle ne peut faire l’objet d’une prorogation par tacite reconduction.'
            },
            {
                num: 3,
                titre: 'Procédure annuelle et Fiche Financière Attributive',
                contenu: 'Chaque année, l’Association renseigne sur la plateforme numérique de la CCMVR son budget prévisionnel, ses comptes clos et les indicateurs métiers du pôle. Le montant annuel arrêté par délibération du Conseil Communautaire est notifié par une « Décision d’Attribution et Fiche Financière Annuelle » annexée à la présente convention, sans qu’un avenant formel ne soit requis tant que l’économie générale du contrat demeure inchangée.'
            },
            {
                num: 4,
                titre: 'Modalités de versement et condition suspensive',
                contenu: 'Le versement intervient après le caractère exécutoire de la délibération d’attribution. Le paiement de tout acompte N+1 ou du solde de l’exercice en cours est strictement subordonné à la transmission préalable des justificatifs de l’exercice antérieur.'
            },
            {
                num: 5,
                titre: 'Obligation du Compte-Rendu Financier Cerfa n° 15059',
                contenu: 'En application de l’article 10 de la loi n° 2000-321 du 12 avril 2000 et de l’arrêté du 11 octobre 2006, l’Association s’engage à produire, dans les six mois suivant la clôture de l’exercice, le compte-rendu financier conforme au modèle réglementaire Cerfa n° 15059*02 attestant de la conformité des dépenses effectuées à l’objet de la subvention.'
            },
            {
                num: 6,
                titre: 'Contrôle financier et opérationnel de la CCMVR (Art. L. 1611-4 CGCT)',
                contenu: 'Conformément aux dispositions impératives de l’article L. 1611-4 du Code Général des Collectivités Territoriales, l’Association est soumise au contrôle des délégués de la CCMVR et de son Contrôleur de gestion. Tous les livres, factures, relevés bancaires et documents comptables doivent être communiqués sur simple demande.'
            },
            {
                num: 7,
                titre: 'Respect du Contrat d’Engagement Républicain (CER)',
                contenu: 'L’Association atteste avoir souscrit le Contrat d’Engagement Républicain figurant en Annexe 2 conformément à la loi n° 2021-1109 du 24 août 2021 et au décret n° 2021-1947 du 31 décembre 2021. En cas de manquement avéré, la CCMVR procède au retrait de la subvention et exige la restitution des sommes versées dans un délai de six mois.'
            },
            {
                num: 8,
                titre: 'Soutiens en nature et Attestation Annuelle (Art. L. 2313-1 CGCT)',
                contenu: 'Les mises à disposition gracieuses de locaux, d’équipements sportifs ou culturels, de minibus communautaires, de prestations techniques ou de licences informatiques constituent des subventions indirectes en nature. Elles sont comptabilisées au fil de l’eau et font l’objet d’une « Attestation Annuelle de Concours en Nature » valorisée en coût complet et annexée au budget de la collectivité.'
            },
            {
                num: 9,
                titre: 'Assurances, responsabilités et gestion désintéressée',
                contenu: 'L’Association exerce ses activités sous sa responsabilité exclusive, maintient une gestion désintéressée et justifie d’une police d’assurance responsabilité civile couvrant ses dirigeants, salariés, bénévoles, adhérents et les biens mis à sa disposition.'
            },
            {
                num: 10,
                titre: 'Communication et visibilité intercommunale',
                contenu: 'L’Association s’engage à faire figurer le logo officiel de la CCMVR et à mentionner son soutien sur l’ensemble de ses supports de communication (affiches, site web, réseaux sociaux, événements).'
            },
            {
                num: 11,
                titre: 'Modification, avenants et résiliation',
                contenu: 'Toute modification substantielle fait l’objet d’un avenant écrit, dans la limite stricte de trois avenants sur la durée de la convention. La convention peut être résiliée par l’une ou l’autre des parties moyennant un préavis de trois mois notifié par écrit, ou de plein droit en cas de dissolution ou de manquement grave après mise en demeure.'
            },
            {
                num: 12,
                titre: 'Règlement des litiges et juridiction compétente',
                contenu: 'Les parties s’efforcent de résoudre à l’amiable tout différend relatif à l’interprétation ou à l’exécution de la présente convention. À défaut d’accord amiable, le litige relève de la compétence exclusive du Tribunal Administratif de Clermont-Ferrand (6 cours Sablon, 63000 Clermont-Ferrand).'
            }
        ],
        CONV_MINIBUS: [
            {
                num: 1,
                titre: 'Objet de la convention et mise à disposition de véhicules',
                contenu: 'La présente convention régit la mise à disposition temporaire par la CCMVR au bénéfice de l’Association de véhicules de sa flotte communautaire (minibus 9 places), affectés prioritairement aux déplacements sportifs, associatifs et d’intérêt intercommunal.'
            },
            {
                num: 2,
                titre: 'Habilitation des conducteurs et sécurité routière',
                contenu: 'L’Association s’engage à ne confier la conduite des véhicules qu’à des conducteurs majeurs, nommément désignés et titulaires du permis B en cours de validité depuis plus de trois ans. Toute infraction au Code de la route commise durant la mise à disposition demeure sous la responsabilité pécuniaire et pénale exclusive du conducteur.'
            },
            {
                num: 3,
                titre: 'Modalités de réservation et priorité de service public',
                contenu: 'Toute utilisation fait l’objet d’une réservation préalable enregistrée sur la plateforme numérique CCMVR. La collectivité conserve la priorité d’utilisation pour ses besoins propres de service public et manifestations d’intérêt communautaire.'
            },
            {
                num: 4,
                titre: 'État des lieux contradictoire, carburant et propreté',
                contenu: 'Un état des lieux contradictoire du véhicule avec relevé kilométrique est formalisé au départ et au retour. Le véhicule doit impérativement être restitué dans un parfait état de propreté intérieure et extérieure, avec le plein de carburant effectué par l’Association.'
            },
            {
                num: 5,
                titre: 'Assurances, sinistres et prise en charge de la franchise',
                contenu: 'Les véhicules sont couverts par une police d’assurance tous risques souscrite par la CCMVR. En cas d’accident responsable, de dégradation ou de sinistre sans tiers identifié, le montant de la franchise contractuelle demeure à la charge intégrale de l’Association.'
            },
            {
                num: 6,
                titre: 'Valorisation des concours en nature (Art. L. 2313-1 CGCT)',
                contenu: 'Le kilométrage parcouru est valorisé selon le barème kilométrique officiel en vigueur fixé par délibération du Conseil Communautaire. Le montant correspondant est intégré à l’Attestation Annuelle de Concours en Nature de l’Association.'
            },
            {
                num: 7,
                titre: 'Respect du Contrat d’Engagement Républicain',
                contenu: 'L’Association souscrit sans réserve aux principes du Contrat d’Engagement Républicain (Décret n° 2021-1947). Tout manquement constaté entraîne le retrait immédiat du droit d’utilisation des véhicules communautaires.'
            },
            {
                num: 8,
                titre: 'Sanctions, suspension et résiliation',
                contenu: 'En cas de dégradations répétées, de retards injustifiés, de manquement aux consignes de sécurité ou d’infractions graves, la CCMVR peut suspendre ou résilier sans préavis la présente convention de mise à disposition.'
            },
            {
                num: 9,
                titre: 'Juridiction compétente',
                contenu: 'Tout litige relatif à l’exécution de la présente convention relève de la compétence exclusive du Tribunal Administratif de Clermont-Ferrand.'
            }
        ],
        CONV_LOCAUX: [
            {
                num: 1,
                titre: 'Objet et nature juridique précaire de l’occupation',
                contenu: 'La présente convention a pour objet d’autoriser l’Association à occuper, à titre précaire et révocable, les locaux, salles ou équipements sportifs et culturels du domaine public de la CCMVR définis dans l’Annexe opérationnelle, conformément aux articles L. 2122-1 et suivants du Code Général de la Propriété des Personnes Publiques (CGPPP).'
            },
            {
                num: 2,
                titre: 'Désignation des locaux et créneaux horaires d’utilisation',
                contenu: 'L’occupation s’exerce strictement dans les espaces autorisés et pendant les créneaux horaires accordés par le Service gestionnaire. Les locaux sont exclusivement affectés aux activités statutaires déclarées par l’Association.'
            },
            {
                num: 3,
                titre: 'Sécurité ERP, capacité d’accueil et consignes d’évacuation',
                contenu: 'L’Association s’engage à respecter la réglementation applicable aux Établissements Recevant du Public (ERP), à veiller à ce que l’effectif maximal autorisé ne soit jamais dépassé et à maintenir les issues de secours libres d’accès en toute circonstance.'
            },
            {
                num: 4,
                titre: 'Garde des clés, entretien courant et restitution des lieux',
                contenu: 'L’Association veille à la fermeture des portes, fenêtres et à l’extinction des éclairages après chaque séance. Les locaux doivent être restitués dans un état de propreté rigoureux. Le matériel dégradé fera l’objet d’une facturation de remise en état.'
            },
            {
                num: 5,
                titre: 'Assurances et responsabilité risques locatifs',
                contenu: 'L’Association justifie d’une police d’assurance responsabilité civile en cours de validité garantissant les risques locatifs, le recours des voisins et des tiers ainsi que les dommages causés aux installations et mobiliers mis à disposition.'
            },
            {
                num: 6,
                titre: 'Gratuité, redevance domaniale et valorisation en nature (Art. L. 2313-1 CGCT)',
                contenu: 'L’avantage résultant de la mise à disposition gracieuse ou à tarif préférentiel des locaux et des fluides associés (chauffage, électricité, eau) est valorisé au coût complet et consigné dans l’Attestation Annuelle de Concours en Nature de la collectivité.'
            },
            {
                num: 7,
                titre: 'Respect du Contrat d’Engagement Républicain',
                contenu: 'L’Association s’engage au respect absolu des principes républicains de laïcité, de fraternité et de non-discrimination. Toute utilisation des locaux à des fins contraires aux lois de la République entraîne l’expulsion immédiate.'
            },
            {
                num: 8,
                titre: 'Suspension pour intérêt général et résiliation',
                contenu: 'La CCMVR se réserve le droit de suspendre temporairement la mise à disposition pour des impératifs d’intérêt public, de sécurité ou de travaux d’entretien, moyennant un préavis raisonnable sauf urgence.'
            },
            {
                num: 9,
                titre: 'Règlement des litiges',
                contenu: 'À défaut d’accord amiable, tout différend relatif à l’occupation du domaine public intercommunal sera porté devant le Tribunal Administratif de Clermont-Ferrand.'
            }
        ],
        CONV_PERSONNEL: [
            {
                num: 1,
                titre: 'Objet et cadre de la mise à disposition de personnel',
                contenu: 'La présente convention définit les conditions dans lesquelles la CCMVR met ponctuellement ou régulièrement à disposition de l’Association des agents publics territoriaux qualifiés (services techniques, éducateurs sportifs, régisseurs culturels) pour l’exécution de missions précises d’intérêt général.'
            },
            {
                num: 2,
                titre: 'Maintien de l’autorité hiérarchique et statutaire',
                contenu: 'Les agents territoriaux mis à disposition demeurent placés sous l’autorité hiérarchique exclusive de la Présidente de la CCMVR et de leur responsable de service. L’Association ne peut leur confier des tâches non prévues par la convention ni modifier leurs horaires de travail sans accord préalable.'
            },
            {
                num: 3,
                titre: 'Périmètre des missions et planning d’intervention',
                contenu: 'Les missions confiées aux agents territoriaux sont strictement délimitées dans l’Annexe technique. Le planning prévisionnel d’intervention est arrêté conjointement entre le responsable de pôle CCMVR et le dirigeant de l’Association.'
            },
            {
                num: 4,
                titre: 'Santé, hygiène et sécurité au travail (Port des EPI)',
                contenu: 'L’Association s’engage à garantir des conditions matérielles d’intervention conformes aux règles de santé et de sécurité au travail. Les agents doivent impérativement être en mesure de porter leurs Équipements de Protection Individuelle (EPI).'
            },
            {
                num: 5,
                titre: 'Responsabilité, accidents de service et assurances',
                contenu: 'Tout accident survenu en cours de mission est pris en charge selon les règles de la Fonction Publique Territoriale au titre des accidents de service. L’Association garantit sa responsabilité civile pour tous les dommages causés par ses membres ou ses participants.'
            },
            {
                num: 6,
                titre: 'Pointage contradictoire et valorisation horaire (Art. L. 2313-1 CGCT)',
                contenu: 'Un relevé d’heures d’intervention est émargé contradictoirement après chaque prestation. Le volume horaire est valorisé au coût horaire chargé arrêté dans la grille tarifaire de la CCMVR et intégré à l’Attestation Annuelle de Concours en Nature.'
            },
            {
                num: 7,
                titre: 'Respect du Contrat d’Engagement Républicain',
                contenu: 'L’Association atteste du respect scrupuleux des engagements républicains prévus par la loi du 24 août 2021 confortant le respect des principes de la République.'
            },
            {
                num: 8,
                titre: 'Modification, dénonciation et résiliation',
                contenu: 'La présente convention peut être résiliée par l’une ou l’autre des parties sous réserve d’un préavis d’un mois, ou sans délai en cas d’inexécution grave constatée par l’une des parties.'
            },
            {
                num: 9,
                titre: 'Juridiction compétente',
                contenu: 'Les contestations relatives à la mise à disposition de personnel communal ou intercommunal relèvent de la compétence du Tribunal Administratif de Clermont-Ferrand.'
            }
        ],
        HORS_CADRE: [
            {
                num: 1,
                titre: 'Objet du besoin ponctuel et cadre conventionnel dérogatoire',
                contenu: 'La présente convention spécifique a pour objet de formaliser les conditions exceptionnelles d’accompagnement entre la CCMVR et l’Association pour une opération ponctuelle précise, en dehors des conventions pluriannuelles types.'
            },
            {
                num: 2,
                titre: 'Engagements réciproques du Service et de l’Association',
                contenu: 'L’Association s’engage à réaliser l’opération dans le respect du calendrier et des prescriptions techniques convenues. La CCMVR apporte les concours définis en annexe sous réserve du strict respect des engagements associatifs.'
            },
            {
                num: 3,
                titre: 'Durée ponctuelle ferme et absence de reconduction',
                contenu: 'La convention est conclue exclusivement pour la durée nécessaire à l’accomplissement de l’action ponctuelle. Elle prend fin de plein droit dès son achèvement sans possibilité de reconduction tacite.'
            },
            {
                num: 4,
                titre: 'Visa obligatoire du Contrôle de Gestion, assurances et CER',
                contenu: 'S’agissant d’une convention dérogeant aux socles communs types, son entrée en vigueur est expressément subordonnée au visa de régularité du Contrôle de Gestion de la CCMVR, à la souscription du Contrat d’Engagement Républicain et à la production des assurances requises.'
            },
            {
                num: 5,
                titre: 'Règlement des litiges et tribunal compétent',
                contenu: 'Tout litige relatif à la validité ou à l’exécution de la présente convention ponctuelle relève de la compétence du Tribunal Administratif de Clermont-Ferrand.'
            }
        ]
    },

    // Modèles d'Annexe 1 Métier entièrement pilotés par chaque Pôle (ex: Service Sport)
    ANNEXES_POLES_MODELES: {
        SPORT: {
            intitule: 'Engagements Opérationnels & Sportifs du Club Partenaire (Pôle Sport)',
            clauses: [
                {
                    id: 'sp_1',
                    titre: 'Encadrement sportif qualifié et formation des jeunes',
                    texte: 'Le Club s’engage à assurer un encadrement sportif diplômé (éducateurs titulaires d’un brevet fédéral ou d’une carte professionnelle d’éducateur sportif) auprès des licenciés mineurs (-18 ans) résidant sur le territoire de la CCMVR.'
                },
                {
                    id: 'sp_2',
                    titre: 'Utilisation et respect des équipements sportifs intercommunaux',
                    texte: 'Le Club s’engage à respecter le règlement intérieur des équipements sportifs mis à disposition par la CCMVR, à optimiser les créneaux horaires attribués et à signaler immédiatement toute anomalie technique au Service Sport ou au Service Bâtiments.'
                },
                {
                    id: 'sp_3',
                    titre: 'Accessibilité tarifaire, Sport-Santé et mixité',
                    texte: 'Le Club pratique une politique tarifaire accessible à l’ensemble des familles du territoire (acceptation Pass’Sport, chèques vacances) et développe des actions favorisant la pratique féminine, le sport-santé ou l’accueil du public en situation de handicap.'
                },
                {
                    id: 'sp_4',
                    titre: 'Participation aux événements sportifs intercommunaux',
                    texte: 'Le Club s’engage à participer activement aux temps forts organisés par le Service Sport de la CCMVR (forum ou fête du sport intercommunal, interventions découvertes auprès des accueils de loisirs).'
                }
            ]
        },
        ENFANCE: {
            intitule: 'Engagements Éducatifs, Accueil des Familles & Coopération CTG (Pôle Enfance-Jeunesse)',
            clauses: [
                {
                    id: 'ej_1',
                    titre: 'Inscription dans la Convention Territoriale Globale (CTG)',
                    texte: 'La structure inscrit son projet pédagogique en cohérence avec les orientations de la Convention Territoriale Globale (CTG) signée entre la CCMVR et la Caisse d’Allocations Familiales de la Haute-Loire.'
                },
                {
                    id: 'ej_2',
                    titre: 'Qualité d’accueil, agréments PMI/SDJES et tarification modulée',
                    texte: 'La structure garantit le respect strict des taux d’encadrement réglementaires et applique une grille tarifaire modulée selon le quotient familial des familles résidant sur la CCMVR.'
                },
                {
                    id: 'ej_3',
                    titre: 'Suivi trimestriel des heures-enfants et fréquentation',
                    texte: 'La structure transmet au Pôle Enfance-Jeunesse les états de présence déclarés à la CAF (heures réalisées, fréquentation par commune de résidence) permettant le calcul du solde annuel.'
                }
            ]
        },
        CULTURE: {
            intitule: 'Engagements de Diffusion Culturelle & Enseignement Artistique (Pôle Culture)',
            clauses: [
                {
                    id: 'cu_1',
                    titre: 'Rayonnement intercommunal et actions hors-les-murs',
                    texte: 'L’Association s’engage à déployer ses actions artistiques et culturelles sur plusieurs communes de la CCMVR afin de garantir un accès équilibré des habitants à l’offre culturelle.'
                },
                {
                    id: 'cu_2',
                    titre: 'Éducation artistique et culturelle (EAC) auprès des jeunes',
                    texte: 'L’Association développe des projets de sensibilisation artistique à destination du jeune public et des écoles du territoire.'
                }
            ]
        },
        TOURISME: {
            intitule: 'Engagements d’Attractivité & Promotion du Territoire (Pôle Tourisme)',
            clauses: [
                {
                    id: 'to_1',
                    titre: 'Promotion touristique et accueil des visiteurs',
                    texte: 'La structure concourt à la valorisation patrimoniale et touristique du territoire des Marches du Velay Rochebaron en lien avec l’Office de Tourisme Intercommunal.'
                }
            ]
        },
        ECONOMIE: {
            intitule: 'Engagements de Développement Économique & Animation Commerciale (Pôle Économie)',
            clauses: [
                {
                    id: 'ec_1',
                    titre: 'Dynamisation des acteurs économiques et commerce local',
                    texte: 'L’Association s’engage à fédérer et valoriser les acteurs économiques locaux, artisans et commerçants, et à relayer les actions d\'attractivité de la CCMVR.'
                }
            ]
        },
        CDG: {
            intitule: 'Prescriptions Financières & Contrôle de Gestion (Direct CdG)',
            clauses: [
                {
                    id: 'cdg_1',
                    titre: 'Conformité financière, restitution des comptes et contrôle',
                    texte: 'La structure s’engage à respecter les obligations de reddition de comptes et à transmettre son bilan d’activité financier dans les six mois suivant la clôture de l’exercice.'
                }
            ]
        }
    },

    // Catalogue officiel des 5 Types de Conventions éditables par chaque Pôle / Service
    TYPES_CONVENTIONS: {
        COM_OBJECTIFS: {
            code: 'COM_OBJECTIFS',
            label: 'Convention d\'Objectifs et de Moyens (COM / CPOM)',
            shortLabel: 'Objectifs & Moyens',
            icon: 'target',
            badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
            socleCommunVerrouille: true,
            visaCdgHorsCadre: false,
            description: 'Socle commun (12 articles verrouillés par le Contrôle de Gestion) + Annexe d\'objectifs et de moyens modifiable par le service.'
        },
        CONV_MINIBUS: {
            code: 'CONV_MINIBUS',
            label: 'Convention de Mise à Disposition de Minibus',
            shortLabel: 'Convention Minibus',
            icon: 'truck',
            badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
            socleCommunVerrouille: true,
            visaCdgHorsCadre: false,
            description: 'Socle commun institutionnel (articles juridiques fixés par le Contrôle de Gestion : prêt, permis, assurance, barème km, restitution) + Annexe spécifique service.'
        },
        CONV_LOCAUX: {
            code: 'CONV_LOCAUX',
            label: 'Convention d\'Occupation de Locaux / Équipements',
            shortLabel: 'Occupation de Locaux',
            icon: 'building',
            badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            socleCommunVerrouille: true,
            visaCdgHorsCadre: false,
            description: 'Socle commun institutionnel (articles juridiques fixés par le Contrôle de Gestion : CGPPP, sécurité ERP, clés, propreté, assurance) + Annexe d\'occupation service.'
        },
        CONV_PERSONNEL: {
            code: 'CONV_PERSONNEL',
            label: 'Convention de Mise à Disposition de Personnel',
            shortLabel: 'Mise à dispo. Personnel',
            icon: 'users',
            badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
            socleCommunVerrouille: true,
            visaCdgHorsCadre: false,
            description: 'Socle commun institutionnel (articles juridiques fixés par le Contrôle de Gestion : autorité hiérarchique, sécurité, valorisation horaire) + Annexe missions service.'
        },
        HORS_CADRE: {
            code: 'HORS_CADRE',
            label: 'Convention Hors Cadre de Socle Commun (Besoin ponctuel)',
            shortLabel: 'Hors Cadre (Ponctuel)',
            icon: 'file-warning',
            badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
            socleCommunVerrouille: false,
            visaCdgHorsCadre: true,
            description: 'Dérogation au socle commun pour un besoin ponctuel : corps et articles 100 % modifiables par le service (soumise au Visa du Contrôle de Gestion).'
        },
        AVENANT: {
            code: 'AVENANT',
            label: 'Avenant Modificateur à la Convention',
            shortLabel: 'Avenant Modificateur',
            icon: 'file-edit',
            badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
            socleCommunVerrouille: false,
            visaCdgHorsCadre: false,
            description: 'Acte bilatéral modifiant le montant, la durée ou les clauses de la convention initiale (soumis au visa préalable du Contrôle de Gestion si le cumul annuel atteint ou dépasse 23 000 €).'
        }
    },

    // Modèle type par défaut pour les Avenants (articles 100 % personnalisables par le Pôle Métier)
    AVENANT_MODELE_DEFAUT: {
        intitule: 'Avenant Modificateur à la Convention',
        articles: [
            {
                num: 1,
                titre: 'Article 1 — Objet du présent avenant',
                contenu: 'Le présent avenant a pour objet d\'adapter les stipulations contractuelles et/ou les dispositions financières de la Convention initiale référencée en préambule, conclue entre la Communauté de Communes Marches du Velay Rochebaron et l\'Association, afin de tenir compte de l\'évolution des activités et des concours apportés.'
            },
            {
                num: 2,
                titre: 'Article 2 — Révision du montant financier et modalités de versement',
                contenu: 'Au titre du présent avenant, le montant de la subvention allouée à l\'Association pour l\'exercice est réévalué. Le versement du solde ou du complément interviendra conformément aux règles de la comptabilité publique et aux délibérations budgétaires du Conseil Communautaire.'
            },
            {
                num: 3,
                titre: 'Article 3 — Maintien et exécution des autres stipulations contractuelles',
                contenu: 'Toutes les autres clauses, engagements, obligations réciproques et indicateurs figurant dans la Convention initiale, ses annexes techniques et le Contrat d\'Engagement Républicain non expressément modifiés par le présent avenant demeurent pleinement applicables et inchangés.'
            }
        ]
    },

    // Modèles d'Annexes par Type de Convention (personnalisables par chaque Pôle / Service)
    ANNEXES_PAR_TYPE_DEFAUT: {
        CONV_MINIBUS: {
            intitule: 'Annexe Spécifique — Mise à Disposition des Minibus Communautaires',
            introduction: 'Conditions opérationnelles de prêt de véhicules, habilitation des conducteurs, assurance et valorisation kilométrique.',
            clauses: [
                {
                    id: 'mb_1',
                    titre: 'Désignation des véhicules et modalités de réservation',
                    texte: 'La CCMVR met ponctuellement à disposition de l’Association les véhicules de sa flotte communautaire (minibus 9 places) sous réserve de disponibilité au planning géré par le Service Accueil / Pôle référent.'
                },
                {
                    id: 'mb_2',
                    titre: 'Habilitation des conducteurs et sécurité routière',
                    texte: 'L’Association s’engage à ne confier la conduite du minibus qu’à des conducteurs majeurs titulaires du permis B en cours de validité depuis plus de 3 ans, désignés préalablement. Toute infraction au Code de la route demeure à la charge exclusive du conducteur.'
                },
                {
                    id: 'mb_3',
                    titre: 'État des lieux, carburant, propreté et assurance',
                    texte: 'Un relevé kilométrique et un état contradictoire sont effectués au départ et au retour. Le véhicule est restitué propre avec le plein de carburant. En cas de sinistre responsable, la franchise d’assurance reste à la charge de l’Association.'
                },
                {
                    id: 'mb_4',
                    titre: 'Valorisation de l’avantage en nature (Art. L. 2313-1 CGCT)',
                    texte: 'Chaque déplacement fait l’objet d’une valorisation au barème kilométrique annuel arrêté par la CCMVR, intégrée à l’Attestation Annuelle de Concours en Nature.'
                }
            ]
        },
        CONV_LOCAUX: {
            intitule: 'Annexe Spécifique — Occupation Temporaire de Locaux & Équipements Communautaires',
            introduction: 'Désignation des bâtiments, créneaux d’utilisation, règles de sécurité ERP et valorisation domaniale.',
            clauses: [
                {
                    id: 'loc_1',
                    titre: 'Désignation des locaux et équipements mis à disposition',
                    texte: 'La CCMVR autorise l’Association à occuper à titre précaire et révocable les locaux ou équipements sportifs, culturels ou associatifs désignés dans les prescriptions particulières ci-dessous, exclusivement pour l’exercice de son objet statutaire.'
                },
                {
                    id: 'loc_2',
                    titre: 'Créneaux horaires, calendrier et priorité communautaire',
                    texte: 'L’occupation s’exerce strictement selon le planning de créneaux arrêté par le service gestionnaire. La CCMVR conserve la faculté de suspendre ponctuellement la mise à disposition pour des travaux de maintenance ou des manifestations d’intérêt intercommunal.'
                },
                {
                    id: 'loc_3',
                    titre: 'Sécurité ERP, entretien courant et assurances risques locatifs',
                    texte: 'L’Association veille au respect des effectifs maximaux autorisés (réglementation ERP), assure le rangement et la fermeture des accès après chaque séance et justifie d’une attestation d’assurance couvrant les risques locatifs.'
                },
                {
                    id: 'loc_4',
                    titre: 'Redevance / Gratuité et valorisation en coût complet',
                    texte: 'Conformément au Code Général de la Propriété des Personnes Publiques (CGPPP) et à l’article L. 2313-1 du CGCT, la valeur locative et les fluides horaires sont comptabilisés en concours en nature au tarif millésimé de la collectivité.'
                }
            ]
        },
        CONV_PERSONNEL: {
            intitule: 'Annexe Spécifique — Mise à Disposition de Personnel & Intervention Régie Technique',
            introduction: 'Cadre d’intervention des agents communautaires, maintien de l’autorité hiérarchique et valorisation horaire.',
            clauses: [
                {
                    id: 'pers_1',
                    titre: 'Nature des missions et périmètre d’intervention des agents',
                    texte: 'La CCMVR mobilise ses agents qualifiés (services techniques, logistique, éducateurs ou intervenants spécialisés) en appui aux actions ou manifestations organisées par l’Association selon le programme défini conjointement.'
                },
                {
                    id: 'pers_2',
                    titre: 'Autorité hiérarchique, hygiène et sécurité au travail',
                    texte: 'Les agents communautaires demeurent placés sous l’autorité hiérarchique exclusive de la CCMVR. Ils respectent les règles d’hygiène, de sécurité et de port des équipements de protection individuelle (EPI) en vigueur.'
                },
                {
                    id: 'pers_3',
                    titre: 'Pointage contradictoire du temps passé et valorisation financière',
                    texte: 'Les heures d’intervention réalisées sont pointées par le service gestionnaire et valorisées au coût horaire chargé arrêté dans la grille tarifaire millésimée de la CCMVR au titre des concours en nature.'
                }
            ]
        },
        HORS_CADRE: {
            intitule: 'Convention Spécifique Ponctuelle (Hors Socle Commun Standard)',
            introduction: 'Convention ad hoc établie pour un besoin ponctuel spécifique, soumise au visa préalable du Contrôle de Gestion.',
            articles_corps: [
                {
                    num: 1,
                    titre: 'Objet du besoin ponctuel et cadre de la convention dérogatoire',
                    contenu: 'La présente convention spécifique a pour objet de définir les modalités d’accompagnement ponctuel entre la CCMVR et l’Association pour l’opération exceptionnelle décrite ci-après, qui ne relève pas des conventions-cadres pluriannuelles standards.'
                },
                {
                    num: 2,
                    titre: 'Engagements opérationnels du Service et de l’Association',
                    contenu: 'L’Association s’engage à réaliser l’opération ponctuelle conformément au descriptif validé par le Pôle instructeur. La CCMVR apporte son concours selon les modalités techniques et/ou financières précisées en annexe.'
                },
                {
                    num: 3,
                    titre: 'Durée ponctuelle stricte et absence de reconduction',
                    contenu: 'La présente convention est conclue exclusivement pour la durée de l’opération ponctuelle visée. Elle prend fin de plein droit à l’issue de celle-ci sans aucune reconduction possible.'
                },
                {
                    num: 4,
                    titre: 'Contrôle du service fait, assurances et Contrat d’Engagement Républicain',
                    contenu: 'L’Association justifie d’une assurance responsabilité civile couvrant l’événement, atteste du respect du Contrat d’Engagement Républicain (Décret n° 2021-1947) et transmet un bilan d’exécution au service référent ainsi qu’au Contrôle de Gestion.'
                },
                {
                    num: 5,
                    titre: 'Juridiction compétente',
                    contenu: 'Tout litige relatif à l’exécution de la présente convention ponctuelle relève de la compétence du Tribunal Administratif de Clermont-Ferrand.'
                }
            ],
            clauses: [
                {
                    id: 'hc_1',
                    titre: 'Modalités pratiques et techniques du besoin ponctuel',
                    texte: 'Détaillez ici le calendrier précis, les moyens mobilisés et les conditions particulières convenues entre le service et l’association pour cette opération ponctuelle.'
                }
            ]
        }
    },

    // Mémo & FAQ d'instruction pour guider pas à pas les services métiers
    FAQ_MEMO_POLES: [
        {
            etape: 'Étape 1 — Réception et vérification du dossier associatif',
            question: 'Que dois-je vérifier quand une pastille rouge indique un nouveau dossier déposé ?',
            reponse: 'Ouvrez le dossier dans « Instruction Dossiers ». Vérifiez que les indicateurs métiers de votre pôle (ex: nombre de licenciés, heures réalisées) sont cohérents et consultez les alertes financières automatiques calculées (trésorerie, dépendance). Si une information manque, passez le statut sur « Dossier incomplet » avec un commentaire.'
        },
        {
            etape: 'Étape 2 — Ajustement de vos critères et du calcul automatique',
            question: 'Comment modifier les critères demandés aux associations ou le barème en Euros ?',
            reponse: 'Rendez-vous dans « Critères & Barème ». Vous pouvez ajouter librement une nouvelle question (nombre, oui/non, montant) et définir directement le montant en Euros associé (ex: 25 € par licencié ou 1 500 € de bonus si labellisé) sans aucune formule complexe à saisir.'
        },
        {
            etape: 'Étape 3 — Rédaction et personnalisation de l’Annexe 1 Métier',
            question: 'Comment le Pôle (ex: Service Sport) garde-t-il la main complète sur l’Annexe 1 de la convention ?',
            reponse: 'Les 12 articles du Tronc Commun juridique sont verrouillés par le Contrôle de Gestion pour sécuriser la collectivité. En revanche, dans « Éditeur de l’Annexe 1 Métier », vous avez la main totale pour rédiger, ajouter ou modifier les articles opérationnels de votre pôle ainsi que les prescriptions spécifiques à chaque association.'
        },
        {
            etape: 'Étape 4 — Seuil de 23 000 € et Passage en Commission / Conseil',
            question: 'Quand le Visa du Contrôle de Gestion et la Convention deviennent-ils obligatoires ?',
            reponse: 'Dès 23 000 € de subvention (Loi n° 2000-321), le dossier affiche un badge demandant le Visa du Contrôle de Gestion avant le passage en Commission. Utilisez ensuite le « Mode Présentation Commission » pour projeter les dossiers aux élus et acter le montant voté.'
        },
        {
            etape: 'Étape 5 — Impression PDF, Signature de la Présidente et Archivage',
            question: 'Comment gérer la signature manuscrite par Madame la Présidente ?',
            reponse: 'Dans « Conventions & Annexes Métier », cliquez sur la convention puis sur « PDF / Imprimer » : le document complet (Articles + Annexes) s’ouvre en format A4 multi-pages prêt à être imprimé. Une fois signé de la main de la Présidente et de l’association, cliquez sur « Déposer le Scan Signé (PDF) » sur la ligne de la convention pour l’archiver définitivement.'
        }
    ]
};

// Alias de compatibilité entre CCMVR.CONFIG et CCMVR.Config
window.CCMVR.Config = window.CCMVR.CONFIG;
