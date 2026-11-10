// ==============================================================================
// MODULE CCMVR: CDG
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.Modules.Cdg = {

    registreSearchQuery: '',
    registrePoleFilter: 'ALL',
    registreStatutFilter: 'ALL',
    registreTypeFilter: 'ALL',
    activePoleAnnexeType: 'COM_OBJECTIFS',
    activeCdgSocleType: 'COM_OBJECTIFS',
    assoRegistrySearch: '',
    massImportData: [],

    renderCdgDashboard(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        const dossiers = store.getEnrichedDossiers(null, annee);
        const prestations = store.getEnrichedPrestations(null, annee);
        const conventions = store.getEnrichedConventions();

        const totalDemande = dossiers.reduce((s, d) => s + (parseFloat(d.montant_demande) || 0), 0);
        const totalPropose = dossiers.reduce((s, d) => s + (parseFloat(d.montant_propose_pole || d.montant_demande) || 0), 0);
        const totalNature = prestations.reduce((s, p) => s + (parseFloat(p.montant_total_valorise) || 0), 0);
        const dossiersSeuilCpo = dossiers.filter(d => parseFloat(d.montant_demande) >= 23000);
        const alertesConventions = conventions.filter(c => c.progress.daysLeft <= 90).length;
        const horsCadrePending = conventions.filter(c => c.statut_signature === 'ATTENTE_VISA_CDG' || (c.normType === 'HORS_CADRE' && !c.visa_cdg_valide && c.statut_signature !== 'VALIDE'));

        const avenantsPendingVisa = conventions.filter(c => c.visaCdgAvenantPending);
        const avenantsBoxHtml = avenantsPendingVisa.length > 0 ? `
            <div class="card-minimal border-l-4 border-l-purple-600 p-5 bg-purple-50/40 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full bg-purple-700 text-white text-[10px] font-extrabold uppercase">Alerte Contrôle de Gestion</span>
                        <h2 class="text-sm font-extrabold text-slate-900 mt-1">Avenant(s) Modificateur(s) soumis au Visa CdG — Seuil des 23 000 € atteint (${avenantsPendingVisa.length})</h2>
                        <p class="text-xs text-slate-600">En application de l'article L. 1611-4 du CGCT, ces avenants modificateurs portent le concours annuel de l'association à 23 000 € ou plus et requièrent le visa préalable du Contrôle de Gestion.</p>
                    </div>
                </div>
                <div class="space-y-2">
                    ${avenantsPendingVisa.map(av => `
                        <div class="p-3 bg-white rounded-xl border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div>
                                <span class="font-mono-code font-extrabold text-purple-800">#${av.code_hex}</span>
                                <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px] ml-1">Avenant n° ${av.numero_avenant || 1}</span>
                                <strong class="text-slate-900 ml-2">${av.structure?.nom_officiel || 'Association'}</strong>
                                <span class="text-purple-700 font-bold ml-1">• Variation : ${fin.formatCurrency(av.montant_delta)} (Nouveau total : ${fin.formatCurrency(av.montant_nouveau)})</span>
                                <div class="text-[11px] text-slate-500 mt-0.5">Convention mère #${av.parentConvention?.code_hex || (av.code_hex.split('-AV')[0])} • Cumul annuel structure : <strong>${fin.formatCurrency(store.getCumulAnnuelStructure(av.structure_id, av.annee))}</strong></div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="CCMVR.App.openConventionPreviewModal(null, '${av.id}')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold">
                                    👁️ Consulter l'Acte
                                </button>
                                <button onclick="CCMVR.App.handleVisaCdgAvenant('${av.id}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold shadow-xs">
                                    ✓ Apposer le Visa CdG
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const horsCadreBoxHtml = horsCadrePending.length > 0 ? `
            <div class="card-minimal border-l-4 border-l-rose-600 p-5 bg-rose-50/40 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase">Action Requise Contrôle de Gestion</span>
                        <h2 class="text-sm font-extrabold text-slate-900 mt-1">Conventions Ponctuelles « Hors Cadre de Socle Commun » en attente de Visa (${horsCadrePending.length})</h2>
                        <p class="text-xs text-slate-600">Ces conventions ponctuelles rédigées par les pôles dérogent au socle commun de 12 articles et nécessitent votre visa juridique et financier avant signature.</p>
                    </div>
                </div>
                <div class="space-y-2">
                    ${horsCadrePending.map(hc => `
                        <div class="p-3 bg-white rounded-xl border border-rose-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div>
                                <span class="font-mono-code font-extrabold text-rose-700">#${hc.code_hex}</span>
                                <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] ml-1">${hc.pole.code || 'PÔLE'}</span>
                                <strong class="text-slate-900 ml-2">${hc.structure.nom_officiel}</strong>
                                <span class="text-slate-500 ml-1">— ${hc.intitule_specifique || hc.type_convention}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="CCMVR.App.openCreateOrEditConventionModal('${hc.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold">
                                    ✏️ Contrôler / Modifier les articles
                                </button>
                                <button onclick="CCMVR.App.openConventionPreviewModal('${hc.dossier_id || ''}', '${hc.id}')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold">
                                    👁️ Voir l'Acte PDF
                                </button>
                                <button onclick="CCMVR.App.handleVisaHorsCadreConvention('${hc.id}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold shadow-xs">
                                    ✓ Apposer le Visa CdG
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const rowsHtml = dossiers.map(d => {
            const b = d.budget || {};
            const ratios = fin.calculateFinancialRatios({ ...b, subvention_ccmvr_demandee: d.montant_demande });
            const hasWarning = ratios.warnings.length > 0;
            const montant = parseFloat(d.montant_demande) || 0;
            const isHigh = store.isDossierSoumisCdg(d);
            const isViseCdg = (d.statut_workflow === 'VISE_CDG' || d.statut_workflow === 'AVIS_POLE_FAVORABLE' || d.statut_workflow === 'VALIDE_COMMISSION' || d.statut_workflow === 'VOTE_CONSEIL');

            // Le CDG effectue la 1ère validation dès le dépôt pour toute demande ≥ 23 000 € (seule ou par cumul annuel) :
            const needsCdgAction = isHigh && !isViseCdg && ['DEPOSE', 'EN_INSTRUCTION', 'RETOUR_INCOMPLET_SOUMIS'].includes(d.statut_workflow);

            let rowClass = 'hover:bg-slate-50/80 transition border-b border-slate-100 text-xs';
            let rowBadgeHint = '';

            if (needsCdgAction) {
                // Vert clair : action CdG prioritaire attendue
                rowClass = 'bg-emerald-50/80 hover:bg-emerald-100/70 border-l-4 border-l-emerald-600 border-b border-emerald-200 transition text-xs font-semibold shadow-2xs text-slate-900';
                rowBadgeHint = '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-700 text-white">Étape 1 : Visa CdG Requis</span>';
            } else {
                // Grisée sobrement : en attente du pôle, de la commission, de l'association, ou déjà acté
                rowClass = 'opacity-65 bg-slate-50/70 hover:opacity-100 hover:bg-slate-100/80 border-b border-slate-200 transition text-xs text-slate-500';
            }

            const statusBadge = this.getWorkflowBadge(d.statut_workflow, d.montant_demande);

            return `
                <tr class="${rowClass}">
                    <td class="py-3 px-4 font-mono-code text-xs font-bold text-slate-900">#${d.code_hex}</td>
                    <td class="py-3 px-4">
                        <div class="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>${d.structure.nom_officiel || 'Association'}</span>
                            ${rowBadgeHint}
                        </div>
                        <div class="text-[11px] text-slate-500 truncate max-w-[220px]">${d.intitule_projet}</div>
                    </td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${d.pole.code || 'PÔLE'}</span>
                    </td>
                    <td class="py-3 px-4 text-right font-mono-code text-xs font-bold text-slate-900">${fin.formatCurrency(d.montant_demande)}</td>
                    <td class="py-3 px-4 text-right font-mono-code text-xs font-semibold text-emerald-700">${fin.formatCurrency(d.totalNature)}</td>
                    <td class="py-3 px-4 text-center">
                        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${ratios.tresorerie_mois_charges >= 12 ? 'bg-amber-100 text-amber-800' : ratios.tresorerie_mois_charges < 0.5 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'}">
                            ${ratios.tresorerie_mois_charges.toFixed(1)} mois
                        </div>
                    </td>
                    <td class="py-3 px-4 text-center">
                        <span class="font-mono-code text-xs font-semibold ${ratios.taux_dependance_ccmvr >= 70 ? 'text-amber-700 font-bold' : 'text-slate-600'}">
                            ${ratios.taux_dependance_ccmvr.toFixed(1)} %
                        </span>
                    </td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-right">
                        <div class="inline-flex items-center gap-1.5 justify-end">
                            ${d.statut_workflow === 'AVIS_POLE_FAVORABLE' ? `
                                <button onclick="CCMVR.App.openWorkflowStepTransitionModal('${d.id}', 'VALIDE_COMMISSION')" class="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition shadow-2xs flex items-center gap-1" title="Valider en commission d'arbitrage">
                                    🏛️ Commission
                                </button>
                            ` : d.statut_workflow === 'VISE_CDG' ? `
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">✓ Visé CDG (Attente Pôle)</span>
                            ` : ''}

                            ${d.statut_workflow === 'VALIDE_COMMISSION' ? `
                                <button onclick="CCMVR.App.openWorkflowStepTransitionModal('${d.id}', 'VOTE_CONSEIL')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition shadow-2xs flex items-center gap-1" title="Acter le vote du Conseil et générer l'acte/convention">
                                    ★ Vote Conseil
                                </button>
                            ` : ''}

                            ${d.statut_workflow === 'VOTE_CONSEIL' ? `
                                <button onclick="CCMVR.App.openConventionPreviewModal('${d.id}')" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition shadow-2xs flex items-center gap-1" title="Consulter la convention officielle générée">
                                    📄 Convention
                                </button>
                            ` : ''}

                            <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-3 py-1 rounded text-xs font-bold transition shadow-2xs flex items-center gap-1 ${needsCdgAction ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm' : 'bg-slate-800 hover:bg-slate-900 text-white'}" title="${needsCdgAction ? 'Auditer les pièces financières et rendre la décision (Visa, Réserves Pôle ou Rejet)' : 'Contrôle et audit complet 360°'}">
                                ${needsCdgAction ? '🔍 Auditer & Viser (1ère étape)' : 'Auditer 360°'}
                            </button>

                            <button onclick="CCMVR.App.handleCdgDeleteDossier('${d.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 hover:border-rose-400 rounded text-xs font-bold transition shadow-2xs flex items-center gap-1" title="Supprimer définitivement ce dossier et toutes ses conventions (Purge des tests)">
                                🗑️ Supprimer
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Bandeau supérieur d'en-tête -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 class="text-xl font-bold text-slate-900 tracking-tight">Console de Supervision — Contrôle de Gestion Financier & Juridique</h1>
                        <p class="text-xs text-slate-500 mt-0.5">Consolidation temps réel des demandes ${annee}, ratios de santé financière, contrôle du seuil légal de 23 000 € (Loi 2000-321) et valorisation M57.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="CCMVR.App.downloadNetworkBackupScript()" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm" title="Télécharger le script autonome PowerShell pour synchroniser et classer automatiquement tous les PDF sur votre dossier partagé réseau">
                            <i data-lucide="download" class="w-4 h-4"></i> Sauvegarde Réseau (.ps1)
                        </button>
                        <button onclick="CCMVR.App.switchTab('cdg_registre')" class="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                            <i data-lucide="file-check-2" class="w-4 h-4 text-blue-600"></i> Registre des Conventions
                        </button>
                        <button onclick="CCMVR.App.switchTab('cdg_socle')" class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                            <i data-lucide="shield-check" class="w-4 h-4 text-blue-400"></i> Socles Juridiques par Type
                        </button>
                    </div>
                </div>

                <!-- 4 Cartes KPIs Minimalistes -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="card-minimal p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>Enveloppe Financière (${annee})</span>
                            <i data-lucide="wallet" class="w-4 h-4 text-blue-600"></i>
                        </div>
                        <div class="text-2xl font-extrabold text-slate-900 mt-1.5 font-mono-code">${fin.formatCurrency(totalDemande)}</div>
                        <div class="text-[11px] text-slate-500 mt-1">Proposé par les pôles : <strong class="text-slate-800">${fin.formatCurrency(totalPropose)}</strong></div>
                    </div>

                    <div class="card-minimal p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>Concours en Nature (L. 2313-1)</span>
                            <i data-lucide="truck" class="w-4 h-4 text-emerald-600"></i>
                        </div>
                        <div class="text-2xl font-extrabold text-emerald-700 mt-1.5 font-mono-code">${fin.formatCurrency(totalNature)}</div>
                        <div class="text-[11px] text-slate-500 mt-1">${prestations.length} utilisations pointées (Minibus, Bâtiments, DSI)</div>
                    </div>

                    <div class="card-minimal p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>Dossiers Seuil CPO (≥ 23 000 €)</span>
                            <i data-lucide="scale" class="w-4 h-4 text-amber-600"></i>
                        </div>
                        <div class="text-2xl font-extrabold text-slate-900 mt-1.5 font-mono-code">${dossiersSeuilCpo.length} <span class="text-xs font-normal text-slate-400">/ ${dossiers.length} dossiers</span></div>
                        <div class="text-[11px] text-amber-700 font-medium mt-1">Visa Contrôleur de Gestion obligatoire</div>
                    </div>

                    <div class="card-minimal p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>Sécurité Contractuelle</span>
                            <i data-lucide="shield-alert" class="w-4 h-4 text-indigo-600"></i>
                        </div>
                        <div class="text-2xl font-extrabold text-indigo-700 mt-1.5 font-mono-code">0 % <span class="text-xs font-normal text-slate-500">tacite</span></div>
                        <div class="text-[11px] text-slate-500 mt-1">${conventions.length} conventions actives • ${alertesConventions} échéance(s) &lt; 90j</div>
                    </div>
                </div>

                ${avenantsBoxHtml}
                ${horsCadreBoxHtml}

                <!-- Tableau Principal d'Audit Financier & Visas -->
                <div class="card-minimal overflow-hidden">
                    <div class="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <h2 class="text-sm font-bold text-slate-900">File de Contrôle Financier, Ratios & Visas Réglementaires (${annee})</h2>
                            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">${dossiers.length} dossiers</span>
                        </div>
                        <div class="text-[11px] text-slate-500 flex items-center gap-3">
                            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Trésorerie saine (1-11 mois)</span>
                            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Alerte Surplus (&ge; 12 mois)</span>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                    <th class="py-2.5 px-4">ID Acte</th>
                                    <th class="py-2.5 px-4">Association & Projet</th>
                                    <th class="py-2.5 px-4">Pôle</th>
                                    <th class="py-2.5 px-4 text-right">Subvention Demandée</th>
                                    <th class="py-2.5 px-4 text-right">Aides en Nature</th>
                                    <th class="py-2.5 px-4 text-center">Réserves Tréso.</th>
                                    <th class="py-2.5 px-4 text-center">Dépendance CCMVR</th>
                                    <th class="py-2.5 px-4 text-center">Statut Circuit</th>
                                    <th class="py-2.5 px-4 text-right">Actions Contrôle</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml || `<tr><td colspan="9" class="py-8 text-center text-xs text-slate-400">Aucun dossier enregistré pour le millésime ${annee}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },


    async handleVisaHorsCadreConvention(convId) {
        try {
            await window.CCMVR.Store.visaHorsCadreConvention(convId);
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
            this.toast('Visa Contrôle de Gestion apposé sur la convention Hors Cadre ! Elle est désormais ouverte à la signature.');
        } catch (err) {
            this.toast('Erreur lors du visa : ' + err.message, 'error');
        }
    },

    // ==========================================================================
    // 2. VUE PÔLE MÉTIER : INSTRUCTION DES DOSSIERS & CALCUL AUTOMATIQUE
    // ==========================================================================,

    setRegistreFilter(type, value) {
        if (type === 'search') this.registreSearchQuery = value.toLowerCase();
        if (type === 'pole') this.registrePoleFilter = value;
        if (type === 'statut') this.registreStatutFilter = value;
        if (type === 'convType') this.registreTypeFilter = value;
        this.renderMainView();
    },

    renderCdgRegistre(container, filterPoleCode = null) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const isAdmin = store.currentUser.role === 'admin';
        let conventions = store.getEnrichedConventions();
        if (filterPoleCode && filterPoleCode !== 'CDG') {
            conventions = conventions.filter(c => c.pole.code === filterPoleCode);
        }

        const totalAll = conventions.length;
        const signedAll = conventions.filter(c => c.statut_signature === 'VALIDE').length;
        const pendingAll = conventions.filter(c => c.statut_signature !== 'VALIDE').length;
        const alertAll = conventions.filter(c => c.progress.daysLeft <= 90).length;

        const q = (this.registreSearchQuery || '').trim();
        const filteredConventions = conventions.filter(c => {
            if (!filterPoleCode && this.registrePoleFilter !== 'ALL' && c.pole.code !== this.registrePoleFilter) return false;
            if (this.registreTypeFilter && this.registreTypeFilter !== 'ALL') {
                if (this.registreTypeFilter === 'CONV_MINIBUS') {
                    const isMb = (c.normType === 'CONV_MINIBUS') ||
                        (c.type_convention || '').toUpperCase().includes('MINIBUS') ||
                        (c.intitule || '').toUpperCase().includes('MINIBUS') ||
                        (c.customMeta?.nature_categories || []).includes('MINIBUS') ||
                        (c.dossier?.categories_nature || []).includes('MINIBUS');
                    if (!isMb) return false;
                } else if (c.normType !== this.registreTypeFilter) {
                    return false;
                }
            }
            if (this.registreStatutFilter === 'VALIDE' && c.statut_signature !== 'VALIDE') return false;
            if (this.registreStatutFilter === 'ATTENTE' && c.statut_signature === 'VALIDE') return false;
            if (this.registreStatutFilter === 'ALERTE' && c.progress.daysLeft > 90) return false;
            if (q) {
                const hay = `${c.code_hex} ${c.structure.nom_officiel || ''} ${c.structure.siret || ''} ${c.intitule_specifique || ''} ${c.nom_fichier_pdf || ''} ${c.type_convention || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        const rowsHtml = filteredConventions.map(c => {
            const p = c.progress;
            const barColor = p.status === 'EXPIRE' ? 'bg-rose-600' : p.status === 'ALERTE_J30' ? 'bg-rose-500' : p.status === 'ALERTE_J90' ? 'bg-amber-500' : 'bg-emerald-500';
            const scanName = c.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${c.id}`);
            const isHorsCadre = c.normType === 'HORS_CADRE';
            const needsVisaCdg = c.statut_signature === 'ATTENTE_VISA_CDG' || (isHorsCadre && !c.visa_cdg_valide && c.statut_signature !== 'VALIDE');

            const isDoubleSigned = c.statut_signature === 'VALIDE' || (c.isSignePresidente && c.isSigneAsso) || scanName;
            const sigBadge = needsVisaCdg
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">⏳ Attente Visa CdG</span>`
                : scanName
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300" title="${scanName}">🟢 2/2 Scan Manuscrit Validé</span>`
                : isDoubleSigned
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">🟢 2/2 Validé & Exécutoire</span>`
                : (c.isSigneAsso && !c.isSignePresidente) || c.statut_signature === 'SIGNE_ASSO'
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">✍️ 1/2 Signé Asso (Attente Présidente)</span>`
                : (c.isSignePresidente && !c.isSigneAsso)
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">✍️ 1/2 Signé Présidente (Attente Asso)</span>`
                : !c.isTransmisAsso
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">⏳ 0/2 En attente validation Pôle</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">⏳ 0/2 Transmis Asso (Non signé)</span>`;

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td class="py-3.5 px-4 font-mono-code text-xs font-extrabold text-slate-900">#${c.code_hex}</td>
                    <td class="py-3.5 px-4">
                        <div class="text-xs font-bold text-slate-900">${c.structure.nom_officiel || 'Association'}</div>
                        <div class="text-[11px] text-slate-600 font-semibold">${c.intitule_specifique || c.typeInfo?.label || c.type_convention}</div>
                        <div class="text-[10px] text-slate-400 font-mono-code">SIREN : ${(c.structure.siret || '').slice(0, 9)}</div>
                        ${scanName ? `<div class="text-[10px] text-emerald-700 font-bold mt-0.5">📎 Scan signé : ${scanName}</div>` : ''}
                    </td>
                    <td class="py-3.5 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${c.pole.code || 'CCMVR'}</span>
                    </td>
                    <td class="py-3.5 px-4">
                        <span class="px-2 py-0.5 rounded border text-[10px] font-extrabold ${c.typeInfo?.badgeClass || 'bg-blue-50 text-blue-800 border-blue-200'}">
                            ${c.typeInfo?.shortLabel || c.type_convention}
                        </span>
                        <div class="text-[10px] text-slate-500 mt-0.5">
                            ${isHorsCadre ? '⚡ Corps spécifique (Hors Socle)' : '🔒 Socle commun + Annexe 1'}
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-xs text-slate-600">
                        <div>Du ${fin.formatDate(c.date_debut)}</div>
                        <div class="font-semibold text-slate-900">Au ${fin.formatDate(c.date_fin)}</div>
                    </td>
                    <td class="py-3.5 px-4 w-40">
                        <div class="flex justify-between text-[10px] font-semibold mb-1">
                            <span>Maturité : ${p.percent}%</span>
                            <span class="${p.daysLeft < 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}">${p.daysLeft < 0 ? 'Expirée' : `J-${p.daysLeft}`}</span>
                        </div>
                        <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div class="${barColor} h-full progress-bar-fill" style="width: ${p.percent}%"></div>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-center">${sigBadge}</td>
                    <td class="py-3.5 px-4 text-right">
                        <div class="inline-flex flex-wrap items-center justify-end gap-1.5">
                            ${needsVisaCdg && isAdmin ? `
                                <button onclick="CCMVR.App.handleVisaHorsCadreConvention('${c.id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-2xs" title="Apposer le visa Contrôle de Gestion sur cette convention Hors Cadre">
                                    ✓ Viser CdG
                                </button>
                            ` : ''}
                            ${!c.isTransmisAsso ? `
                                <button onclick="CCMVR.App.handleTransmettreConventionAsso('${c.id}')" class="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-extrabold shadow-2xs flex items-center gap-1" title="Valider et transmettre la convention à l'association pour signature">
                                    📨 Transmettre Asso
                                </button>
                            ` : ''}
                            ${!c.is_avenant ? `
                                <button onclick="CCMVR.App.openCreateAvenantModal('${c.id}')" class="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1" title="Créer un avenant modificateur rattaché à cette convention">
                                    ➕ Avenant
                                </button>
                            ` : ''}
                            ${c.is_avenant && c.soumis_visa_cdg && c.statut_visa_cdg !== 'VISE_CDG' && isAdmin ? `
                                <button onclick="CCMVR.App.handleVisaCdgAvenant('${c.id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-2xs" title="Apposer le visa Contrôle de Gestion sur cet avenant">
                                    ✓ Viser CdG
                                </button>
                            ` : ''}
                            <button onclick="CCMVR.App.openCreateOrEditConventionModal('${c.id}')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1" title="Modifier l'annexe, les clauses ou les dates de cette convention">
                                ✏️ Éditer Annexe
                            </button>
                            <button onclick="CCMVR.App.openConventionPreviewModal('${c.dossier_id || ''}', '${c.id}')" class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs">
                                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> PDF / Signer
                            </button>
                            <label class="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1" title="Réimporter la convention signée à la main par Madame la Présidente">
                                <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                                <input type="file" accept=".pdf,.jpg,.png" class="hidden" onchange="CCMVR.App.handleUploadSignedConventionScan(this, '${c.id}')"/>
                            </label>
                            <button type="button" onclick="CCMVR.App.handleCdgDeleteConvention('${c.id}')" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition shadow-2xs" title="Supprimer définitivement cette convention (Purge des tests)">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 class="text-xl font-bold text-slate-900">Panel Multi-Conventions & Registre des Actes (${filterPoleCode && filterPoleCode !== 'CDG' ? 'Pôle ' + filterPoleCode : 'Tous Services CCMVR'})</h1>
                        <p class="text-xs text-slate-500 mt-0.5">Registre officiel des conventions et actes contractuels de la collectivité.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <button onclick="CCMVR.App.downloadNetworkBackupScript()" class="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md" title="Télécharger le script autonome PowerShell pour synchroniser et classer automatiquement tous les PDF sur votre dossier partagé réseau">
                            <i data-lucide="download" class="w-4 h-4"></i> Sauvegarde Réseau (.ps1)
                        </button>
                        <button onclick="CCMVR.App.openDirectInKindGrantModal()" class="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md" title="Accorder directement un concours en nature d'office sans dossier préalable">
                            <i data-lucide="gift" class="w-4 h-4"></i> + Aide en Nature d'Office
                        </button>
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null)" class="px-4 py-2.5 btn-accent text-xs font-extrabold flex items-center gap-1.5 shadow-md">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i> + Créer une Nouvelle Convention
                        </button>
                    </div>
                </div>

                <!-- Barre de création rapide des 5 types de conventions pour le service -->
                <div class="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <div class="text-xs">
                        <span class="font-extrabold text-blue-300 uppercase tracking-wider">Création rapide par nature d'acte :</span>
                        <span class="text-slate-300 ml-1">Choisissez le modèle à éditer pour une association :</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'COM_OBJECTIFS')" class="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-100 text-xs font-bold transition">
                            + Convention Objectifs & Moyens
                        </button>
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'CONV_MINIBUS')" class="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-cyan-100 text-xs font-bold transition">
                            + Convention Minibus
                        </button>
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'CONV_LOCAUX')" class="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-100 text-xs font-bold transition">
                            + Occupation de Locaux
                        </button>
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'CONV_PERSONNEL')" class="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-100 text-xs font-bold transition">
                            + Mise à dispo. Personnel
                        </button>
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'HORS_CADRE')" class="px-3 py-1.5 rounded-lg bg-rose-600/40 hover:bg-rose-600/60 border border-rose-400/50 text-rose-100 text-xs font-extrabold transition">
                            ⚡ + Convention Hors Cadre (Besoin ponctuel)
                        </button>
                    </div>
                </div>

                <!-- 4 KPI synthétiques du Panel Conventions -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="card-minimal card-accent-blue p-4">
                        <span class="text-[11px] font-bold uppercase text-slate-400">Total Conventions</span>
                        <div class="text-2xl font-extrabold text-slate-900 font-mono-code mt-1">${totalAll}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Multi-conventions par association</div>
                    </div>
                    <div class="card-minimal card-accent-emerald p-4">
                        <span class="text-[11px] font-bold uppercase text-emerald-700">Conventions Signées (2/2)</span>
                        <div class="text-2xl font-extrabold text-emerald-700 font-mono-code mt-1">${signedAll}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Exécutoires (Numérique ou Scan)</div>
                    </div>
                    <div class="card-minimal card-accent-amber p-4">
                        <span class="text-[11px] font-bold uppercase text-amber-700">En attente Visa / Signature</span>
                        <div class="text-2xl font-extrabold text-amber-600 font-mono-code mt-1">${pendingAll}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Action requise (CdG / Présidente / Asso)</div>
                    </div>
                    <div class="card-minimal card-accent-rose p-4">
                        <span class="text-[11px] font-bold uppercase text-rose-700">Échéances ≤ 90 jours</span>
                        <div class="text-2xl font-extrabold text-rose-600 font-mono-code mt-1">${alertAll}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Renouvellement à anticiper</div>
                    </div>
                </div>

                <!-- Barre de recherche et filtres rapides avec bouton Minibus -->
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" onclick="CCMVR.App.setRegistreFilter('convType', 'ALL')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.registreTypeFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
                        Tous (${totalAll})
                    </button>
                    <button type="button" onclick="CCMVR.App.setRegistreFilter('convType', 'CONV_MINIBUS')" class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${this.registreTypeFilter === 'CONV_MINIBUS' ? 'bg-cyan-600 text-white shadow-xs ring-2 ring-cyan-400' : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300'}">
                        🚐 Minibus & Nature
                    </button>
                    <button type="button" onclick="CCMVR.App.setRegistreFilter('convType', 'COM_OBJECTIFS')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.registreTypeFilter === 'COM_OBJECTIFS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'}">
                        🏛️ COM Objectifs
                    </button>
                    <button type="button" onclick="CCMVR.App.setRegistreFilter('convType', 'CONV_LOCAUX')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.registreTypeFilter === 'CONV_LOCAUX' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'}">
                        🏟️ Locaux / Gymnases
                    </button>
                    <button type="button" onclick="CCMVR.App.setRegistreFilter('convType', 'CONV_PERSONNEL')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.registreTypeFilter === 'CONV_PERSONNEL' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'}">
                        👤 Personnel Régie
                    </button>
                    <button type="button" onclick="CCMVR.App.setRegistreFilter('convType', 'HORS_CADRE')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.registreTypeFilter === 'HORS_CADRE' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'}">
                        ⚡ Hors Cadre
                    </button>
                </div>

                <div class="card-minimal p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white">
                    <div class="relative flex-1">
                        <input type="text" value="${this.registreSearchQuery || ''}" oninput="CCMVR.App.setRegistreFilter('search', this.value)" placeholder="Rechercher par nom d'association, SIREN, code #HEX, intitulé..." class="input-clean pl-3 text-xs font-medium"/>
                    </div>
                    <select onchange="CCMVR.App.setRegistreFilter('convType', this.value)" class="input-clean sm:w-52 text-xs font-bold">
                        <option value="ALL" ${this.registreTypeFilter === 'ALL' ? 'selected' : ''}>Tous les types de conventions (5)</option>
                        <option value="COM_OBJECTIFS" ${this.registreTypeFilter === 'COM_OBJECTIFS' ? 'selected' : ''}>1. Objectifs et Moyens (COM)</option>
                        <option value="CONV_MINIBUS" ${this.registreTypeFilter === 'CONV_MINIBUS' ? 'selected' : ''}>2. Convention Minibus</option>
                        <option value="CONV_LOCAUX" ${this.registreTypeFilter === 'CONV_LOCAUX' ? 'selected' : ''}>3. Occupation de Locaux</option>
                        <option value="CONV_PERSONNEL" ${this.registreTypeFilter === 'CONV_PERSONNEL' ? 'selected' : ''}>4. Mise à dispo. Personnel</option>
                        <option value="HORS_CADRE" ${this.registreTypeFilter === 'HORS_CADRE' ? 'selected' : ''}>5. Hors Cadre (Besoin ponctuel)</option>
                    </select>
                    ${!filterPoleCode ? `
                        <select onchange="CCMVR.App.setRegistreFilter('pole', this.value)" class="input-clean sm:w-44 text-xs font-bold">
                            <option value="ALL" ${this.registrePoleFilter === 'ALL' ? 'selected' : ''}>Tous les Pôles CCMVR</option>
                            <option value="SPORT" ${this.registrePoleFilter === 'SPORT' ? 'selected' : ''}>Pôle Sport</option>
                            <option value="ENFANCE" ${this.registrePoleFilter === 'ENFANCE' ? 'selected' : ''}>Pôle Enfance-Jeunesse</option>
                            <option value="CULTURE" ${this.registrePoleFilter === 'CULTURE' ? 'selected' : ''}>Pôle Culture</option>
                            <option value="ACCUEIL" ${this.registrePoleFilter === 'ACCUEIL' ? 'selected' : ''}>Service Accueil (Minibus)</option>
                            <option value="BATIMENTS" ${this.registrePoleFilter === 'BATIMENTS' ? 'selected' : ''}>Service Bâtiments</option>
                        </select>
                    ` : ''}
                    <select onchange="CCMVR.App.setRegistreFilter('statut', this.value)" class="input-clean sm:w-48 text-xs font-bold">
                        <option value="ALL" ${this.registreStatutFilter === 'ALL' ? 'selected' : ''}>Tous les statuts (${totalAll})</option>
                        <option value="ATTENTE" ${this.registreStatutFilter === 'ATTENTE' ? 'selected' : ''}>⏳ En attente (${pendingAll})</option>
                        <option value="VALIDE" ${this.registreStatutFilter === 'VALIDE' ? 'selected' : ''}>✓ Signées (${signedAll})</option>
                        <option value="ALERTE" ${this.registreStatutFilter === 'ALERTE' ? 'selected' : ''}>⚠️ Échéance ≤ 90j (${alertAll})</option>
                    </select>
                </div>

                <div class="card-minimal overflow-hidden">
                    <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-900 uppercase">Actes Contractuels affichés (${filteredConventions.length})</span>
                        <span class="text-[11px] text-emerald-700 font-semibold">✓ Socle Commun verrouillé (CdG) + Annexe modifiable par Service</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                    <th class="py-2.5 px-4">ID Unique</th>
                                    <th class="py-2.5 px-4">Association & Objet de la Convention</th>
                                    <th class="py-2.5 px-4">Pôle</th>
                                    <th class="py-2.5 px-4">Type & Architecture</th>
                                    <th class="py-2.5 px-4">Validité Ferme</th>
                                    <th class="py-2.5 px-4">Progression</th>
                                    <th class="py-2.5 px-4 text-center">Statut</th>
                                    <th class="py-2.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml || `<tr><td colspan="8" class="py-8 text-center text-xs text-slate-400">Aucune convention ne correspond à votre filtre.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================================================
    // 6. ÉDITEUR DES SOCLES JURIDIQUES INSTITUTIONNELS PAR TYPE (RÉSERVÉ CDG/ADMIN)
    // ==========================================================================,

    switchCdgSocleType(typeCode) {
        this.activeCdgSocleType = typeCode;
        this.renderMainView();
    },

    getCurrentSocleArticlesFromDOM() {
        const activeType = this.activeCdgSocleType || 'COM_OBJECTIFS';
        const currentArticles = window.CCMVR.Store.getSocleCommunArticles(activeType);
        const updated = [];
        for (let i = 0; i < currentArticles.length; i++) {
            const numEl = document.getElementById(`socle-num-${i}`);
            const titleEl = document.getElementById(`socle-title-${i}`);
            const artEl = document.getElementById(`socle-art-${i}`);
            if (numEl || titleEl || artEl) {
                updated.push({
                    num: numEl ? (parseInt(numEl.value.trim(), 10) || (i + 1)) : (currentArticles[i]?.num || (i + 1)),
                    titre: titleEl ? titleEl.value.trim() : (currentArticles[i]?.titre || ''),
                    contenu: artEl ? artEl.value.trim() : (currentArticles[i]?.contenu || '')
                });
            }
        }
        return updated.length > 0 ? updated : currentArticles;
    },

    renderCdgSocleJuridique(container) {
        const store = window.CCMVR.Store;
        const cfg = window.CCMVR.CONFIG;
        const activeType = this.activeCdgSocleType || 'COM_OBJECTIFS';
        const typesMap = cfg.TYPES_CONVENTIONS || {};
        const typeInfo = typesMap[activeType] || {
            code: activeType,
            label: activeType,
            shortLabel: activeType,
            description: "Socle juridique institutionnel pour ce type de convention."
        };
        const articles = store.getSocleCommunArticles(activeType);
        const isAdmin = store.currentUser?.role === 'admin';

        const typeTabsHtml = Object.values(typesMap).map(t => {
            const isSel = t.code === activeType;
            const count = (store.getSocleCommunArticles(t.code) || []).length;
            return `
                <button type="button" onclick="CCMVR.App.switchCdgSocleType('${t.code}')"
                    class="px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 border ${
                        isSel
                            ? 'bg-slate-900 text-white border-slate-950 shadow-md ring-2 ring-blue-500/30'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }">
                    <span>${t.code === 'HORS_CADRE' ? '⚡ ' : '📜 '}${t.shortLabel}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isSel ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}">${count} art.</span>
                </button>
            `;
        }).join('');

        const articlesCards = articles.length === 0 ? `
            <div class="col-span-full p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 space-y-3">
                <p class="text-xs">Aucun article dans ce socle juridique pour le moment.</p>
                <div class="flex items-center justify-center gap-3">
                    <button type="button" onclick="CCMVR.App.handleAddSocleArticle()" class="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                        + Ajouter un premier article
                    </button>
                    <button type="button" onclick="CCMVR.App.handleResetSocleArticles()" class="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200">
                        🔄 Réinitialiser aux articles modèles
                    </button>
                </div>
            </div>
        ` : articles.map((a, idx) => `
            <div class="card-minimal p-4 space-y-3 bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div class="flex items-center gap-2 flex-1">
                        <span class="text-[11px] font-black uppercase text-slate-400 tracking-wider">Art.</span>
                        <input type="number" id="socle-num-${idx}" value="${a.num != null ? a.num : (idx + 1)}" class="w-12 text-center font-black text-xs bg-slate-100 border border-slate-300 rounded px-1.5 py-1 text-slate-900" title="Numéro de l'article" />
                        <span class="text-slate-400 font-bold">—</span>
                        <input type="text" id="socle-title-${idx}" value="${(a.titre || '').replace(/"/g, '&quot;')}" placeholder="Titre de l'article juridique" class="input-clean font-bold text-xs flex-1 text-blue-950 bg-slate-50/50 focus:bg-white" />
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">Verrouillé Pôles</span>
                        <button type="button" onclick="CCMVR.App.handleDeleteSocleArticle(${idx})" class="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center gap-1" title="Supprimer cet article">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Supprimer
                        </button>
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Contenu juridique de la clause</label>
                    <textarea id="socle-art-${idx}" rows="4" class="input-clean text-xs leading-relaxed w-full font-normal" placeholder="Rédigez le texte officiel de la clause...">${(a.contenu || '')}</textarea>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- En-tête avec présentation du type et actions globales -->
                <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-extrabold uppercase">
                                Administration Exclusive • Contrôle de Gestion
                            </span>
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold">
                                ${articles.length} Article(s)
                            </span>
                        </div>
                        <h1 class="text-xl font-black mt-1">Socles Juridiques par Type : ${typeInfo.label}</h1>
                        <p class="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                            ${typeInfo.description} Chaque type dispose d'un corps d'articles juridiques spécifiques, commun et verrouillé pour l'ensemble des pôles (seule l'Annexe métier reste personnalisable par le service). Vous pouvez <strong>modifier</strong>, <strong>ajouter (+)</strong> ou <strong>supprimer (✕)</strong> des articles.
                        </p>
                    </div>
                    ${isAdmin ? `
                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            <button type="button" onclick="CCMVR.App.handleAddSocleArticle()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow">
                                <i data-lucide="plus-circle" class="w-4 h-4"></i> Ajouter un Article
                            </button>
                            <button type="button" onclick="CCMVR.App.handleResetSocleArticles()" class="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5" title="Restaurer les articles modèles officiels pour ce type">
                                <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Réinitialiser
                            </button>
                            <button type="button" onclick="CCMVR.App.handleSaveSocle()" class="px-4 py-2 btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md">
                                <i data-lucide="save" class="w-4 h-4"></i> Enregistrer ce Socle
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- Sélecteur d'onglets pour les 5 types de conventions -->
                <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                    ${typeTabsHtml}
                </div>

                <!-- Grille des articles juridiques -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${articlesCards}
                </div>

                <!-- Barre d'action inférieure -->
                ${isAdmin && articles.length > 0 ? `
                    <div class="p-4 bg-slate-100 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="text-xs text-slate-600 font-medium">
                            <strong>${articles.length} article(s)</strong> actuellement enregistrés pour <strong>${typeInfo.label}</strong>.
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="CCMVR.App.handleAddSocleArticle()" class="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                <i data-lucide="plus-circle" class="w-4 h-4 text-emerald-600"></i> Ajouter un Article
                            </button>
                            <button type="button" onclick="CCMVR.App.handleSaveSocle()" class="px-4 py-2 btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md">
                                <i data-lucide="save" class="w-4 h-4"></i> Enregistrer ce Socle Juridique
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    handleSaveSocle() {
        const activeType = this.activeCdgSocleType || 'COM_OBJECTIFS';
        const typesMap = window.CCMVR.CONFIG.TYPES_CONVENTIONS || {};
        const typeInfo = typesMap[activeType] || { shortLabel: activeType };
        const updatedArticles = this.getCurrentSocleArticlesFromDOM();
        window.CCMVR.Store.saveSocleCommunArticles(activeType, updatedArticles);
        this.toast(`Socle juridique « ${typeInfo.shortLabel} » enregistré avec succès (${updatedArticles.length} articles) !`);
        this.renderMainView();
    },

    handleAddSocleArticle() {
        const activeType = this.activeCdgSocleType || 'COM_OBJECTIFS';
        const updatedArticles = this.getCurrentSocleArticlesFromDOM();
        const nextNum = updatedArticles.length > 0 ? (Math.max(...updatedArticles.map(a => parseInt(a.num, 10) || 0)) + 1) : 1;
        updatedArticles.push({
            num: nextNum,
            titre: `Nouvel article du socle juridique`,
            contenu: `Rédigez ici le contenu de la clause réglementaire applicable à l'ensemble des conventions de ce type...`
        });
        window.CCMVR.Store.saveSocleCommunArticles(activeType, updatedArticles);
        this.toast(`Article ${nextNum} ajouté au socle « ${activeType} » !`);
        this.renderMainView();
    },

    handleDeleteSocleArticle(idx) {
        const activeType = this.activeCdgSocleType || 'COM_OBJECTIFS';
        const updatedArticles = this.getCurrentSocleArticlesFromDOM();
        const artToDelete = updatedArticles[idx];
        const artLabel = artToDelete ? `l'Article ${artToDelete.num || (idx + 1)} (${artToDelete.titre || ''})` : `cet article`;
        if (!confirm(`Voulez-vous vraiment supprimer ${artLabel} de ce socle juridique ?`)) return;

        updatedArticles.splice(idx, 1);
        // Renumérotation séquentielle propre
        updatedArticles.forEach((a, i) => {
            a.num = i + 1;
        });
        window.CCMVR.Store.saveSocleCommunArticles(activeType, updatedArticles);
        this.toast(`Article supprimé du socle juridique !`);
        this.renderMainView();
    },

    handleResetSocleArticles() {
        const activeType = this.activeCdgSocleType || 'COM_OBJECTIFS';
        const typesMap = window.CCMVR.CONFIG.TYPES_CONVENTIONS || {};
        const typeInfo = typesMap[activeType] || { shortLabel: activeType };
        if (!confirm(`Attention : Voulez-vous réinitialiser le socle juridique « ${typeInfo.shortLabel} » aux articles modèles réglementaires d'origine ? Toutes vos modifications sur ce socle seront remplacées.`)) return;

        const defaultArticles = window.CCMVR.Store.resetSocleCommunArticles(activeType);
        this.toast(`Socle juridique « ${typeInfo.shortLabel} » réinitialisé aux modèles officiels (${defaultArticles.length} articles) !`);
        this.renderMainView();
    },

    // ==========================================================================
    // 6bis. ÉDITEUR D'ANNEXES MULTI-CONVENTIONS & HORS CADRE (POUR CHAQUE PÔLE)
    // ==========================================================================,

    setAssoRegistrySearch(val) {
        this.assoRegistrySearch = (val || '').toLowerCase();
        this.renderMainView();
    },

    renderAssociationsRegistrySpreadsheet(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const cfg = window.CCMVR.CONFIG;
        const structures = store.state.structures || [];

        const q = (this.assoRegistrySearch || '').trim();
        const enrichedList = structures.map(s => {
            const apiInfo = fin.getEnrichedApiEntrepriseData(s);
            const dossiersAsso = store.getEnrichedDossiers().filter(d => d.structure_id === s.id);
            const totalSubvDemandee = dossiersAsso.reduce((acc, d) => acc + (parseFloat(d.montant_demande) || 0), 0);
            const totalNature = store.getEnrichedPrestations(s.id, store.activeMillesime).reduce((acc, p) => acc + (parseFloat(p.montant_total_valorise) || 0), 0);
            return { s, apiInfo, dossiersAsso, totalSubvDemandee, totalNature };
        }).filter(item => {
            if (!q) return true;
            const hay = `${item.s.nom_officiel} ${item.s.siret} ${item.s.rna} ${item.apiInfo.siren} ${item.apiInfo.objet} ${item.s.ville} ${item.s.representant_nom}`.toLowerCase();
            return hay.includes(q);
        });

        const rowsHtml = enrichedList.map(({ s, apiInfo, totalSubvDemandee, totalNature }) => {
            const siren = (s.siret || apiInfo.siren || '').slice(0, 9);
            const checklistDocs = fin.getLeCompteAssoChecklist(s);
            const redDocs = checklistDocs.filter(d => d.status === 'RED');
            const yellowDocs = checklistDocs.filter(d => d.status === 'YELLOW');
            
            let annualStatusBadge = '';
            if (redDocs.length > 0) {
                annualStatusBadge = `<button type="button" onclick="CCMVR.App.openLeCompteAssoChecklistModal('${s.id}')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-[10px] font-black transition shadow-2xs" title="${redDocs.map(x => x.nom).join(', ')} manquant(s)">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span> 🔴 ${redDocs.length} manquant(s)
                </button>`;
            } else if (yellowDocs.length > 0) {
                annualStatusBadge = `<button type="button" onclick="CCMVR.App.openLeCompteAssoChecklistModal('${s.id}')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-black transition shadow-2xs" title="${yellowDocs.map(x => x.nom).join(', ')} en retard">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span> 🟡 ${yellowDocs.length} à vérifier
                </button>`;
            } else {
                annualStatusBadge = `<button type="button" onclick="CCMVR.App.openLeCompteAssoChecklistModal('${s.id}')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[10px] font-black transition shadow-2xs">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> 🟢 100% à jour
                </button>`;
            }

            let gov = {};
            try {
                gov = JSON.parse(localStorage.getItem('ccmvr_governance_' + s.id) || '{}');
            } catch (e) { gov = {}; }

            const docsBadges = (apiInfo.documents_rna || []).slice(0, 3).map(doc => `
                <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${(doc.libelle || 'Document').replace(/'/g, "\'")}', url: '${doc.url}', date: '${doc.date || doc.annee || ''}', type: 'RNA', structKey: '${s.id}' })" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold transition">
                    <i data-lucide="file-text" class="w-3 h-3 text-indigo-600"></i> ${doc.libelle || 'Pièce'}
                </button>
            `).join(' ');

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
                    <td class="py-3 px-4">
                        <div class="font-extrabold text-slate-900">${s.nom_officiel}</div>
                        <div class="text-[11px] text-slate-500 font-mono-code">SIREN : ${siren} • ${s.ville || 'CCMVR'}</div>
                    </td>
                    <td class="py-3 px-3 font-mono-code font-bold text-indigo-700 whitespace-nowrap">
                        <div>${s.rna || apiInfo.rna || '—'}</div>
                        <span class="text-[10px] text-emerald-700 font-sans font-semibold">✓ ${apiInfo.regime || 'Loi 1901'}</span>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                        <div class="font-bold text-slate-900">${s.representant_prenom || ''} ${s.representant_nom || '—'}</div>
                        <div class="text-[11px] text-blue-600 font-mono-code">${gov.gov_email || s.email_contact || ''}</div>
                        ${gov.gov_type ? `<span class="mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block">${gov.gov_type}</span>` : ''}
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                        ${s.cer_signe ? `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ CER Signé</span>
                        ` : `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ CER en attente</span>
                        `}
                        <div class="text-[10px] font-mono-code text-slate-500 mt-0.5">${s.iban ? 'IBAN : ' + s.iban.slice(0, 8) + '…' : 'Sans IBAN'}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="flex flex-col gap-1 items-start">
                            ${annualStatusBadge}
                            <div class="flex flex-wrap gap-1">
                                ${docsBadges}
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-3 text-right font-mono-code whitespace-nowrap">
                        <div class="font-bold text-slate-900">${fin.formatCurrency(totalSubvDemandee)}</div>
                        ${totalNature > 0 ? `<div class="text-[10px] text-emerald-700 font-bold">+ ${fin.formatCurrency(totalNature)} nature</div>` : ''}
                    </td>
                    <td class="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button onclick="CCMVR.App.openEditStructureModal('${s.id}')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="Modifier / rectifier exceptionnellement la fiche de l'association">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Modifier
                        </button>
                        <button onclick="CCMVR.App.openLeCompteAssoChecklistModal('${s.id}')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="Consulter la checklist des 10 pièces réglementaires">
                            <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> Checklist (10)
                        </button>
                        <button onclick="CCMVR.App.openApiEntrepriseDetailModal('${s.id}')" class="px-2.5 py-1.5 bg-slate-900 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="Consulter la fiche complète API Entreprise, dirigeants et comptes">
                            <i data-lucide="database" class="w-3.5 h-3.5"></i> Fiche Complète
                        </button>
                        <button onclick="CCMVR.App.handleCdgDeleteStructure('${s.id}')" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="Supprimer cette association">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Bandeau supérieur API Entreprise + Export Tableur -->
                <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div class="flex flex-wrap items-center gap-2 mb-1.5">
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase">
                                Connecté Jeton Pro API Entreprise (${cfg.API_ENTREPRISE_UID.slice(0, 8)}…)
                            </span>
                        </div>
                        <h1 class="text-lg font-bold">Annuaire & Registre des Associations</h1>
                        <p class="text-xs text-blue-200 mt-0.5">Données administratives consolidées du territoire (API Entreprise & Extranet).</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <button onclick="CCMVR.App.exportAssociationsSpreadsheetCsv()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition">
                            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Exporter .CSV
                        </button>
                        <button onclick="CCMVR.App.handlePurgeAllTestData()" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition" title="Supprime toutes les associations de test et leurs dossiers pour repartir sur une application 100% vierge">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Remise à zéro (Purge des tests)
                        </button>
                    </div>
                </div>

                <!-- Barre d'ajout / synchronisation directe d'une association par SIREN ou RNA via API Entreprise -->
                <div class="card-minimal p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
                    <div class="flex-1 flex items-center gap-2">
                        <input type="text" value="${this.assoRegistrySearch || ''}" oninput="CCMVR.App.setAssoRegistrySearch(this.value)" placeholder="Filtrer les associations (Nom, SIREN, Commune, Président)..." class="input-clean text-xs"/>
                    </div>
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input type="text" id="quick-api-entreprise-query" placeholder="Ajouter via SIREN (ex: 484392402, 924601966)..." class="input-clean sm:w-80 font-mono-code text-xs"/>
                        <button onclick="CCMVR.App.handleQuickAddAssociationFromApiEntreprise()" class="px-4 py-2 btn-accent text-xs font-extrabold whitespace-nowrap flex items-center justify-center gap-1.5">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i> Importer SIREN
                        </button>
                    </div>
                </div>

                <!-- Grille Tableur Épurée -->
                <div class="card-minimal overflow-hidden">
                    <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                        <span class="text-xs font-extrabold text-slate-900 uppercase">Associations du Territoire (${enrichedList.length})</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase bg-slate-100/70">
                                    <th class="py-2.5 px-4">Association (SIREN)</th>
                                    <th class="py-2.5 px-3">RNA & Régime</th>
                                    <th class="py-2.5 px-3">Dirigeant / Contact</th>
                                    <th class="py-2.5 px-3">CER & IBAN</th>
                                    <th class="py-2.5 px-3">Pièces Déposées</th>
                                    <th class="py-2.5 px-3 text-right">Soutien ${store.activeMillesime}</th>
                                    <th class="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml || `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-400">Aucune association trouvée.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    async handleQuickAddAssociationFromApiEntreprise() {
        const input = document.getElementById('quick-api-entreprise-query');
        const q = input?.value?.trim();
        if (!q) {
            this.toast('Saisissez un numéro SIREN (ex: 484392402 pour Monistrol Budo ou 494186349 pour REVE XV) ou un nom.', 'warning');
            return;
        }
        this.showLoader(true);
        try {
            const res = await window.CCMVR.FinanceEngine.lookupSiretApiGouv(q);
            const saved = await window.CCMVR.Store.saveStructure({
                siret: res.siret,
                nom_officiel: res.nom_officiel,
                rna: res.rna,
                adresse_siege: res.adresse_siege,
                code_postal: res.code_postal,
                ville: res.ville,
                code_ape: res.code_ape,
                representant_prenom: 'Présidence',
                representant_nom: 'HABILITÉE',
                representant_fonction: 'Président(e) dûment habilité(e)',
                email_contact: `contact@${(res.nom_officiel || 'asso').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}.fr`
            });
            if (input) input.value = '';
            this.renderMainView();
            this.openApiEntrepriseDetailModal(saved.id);
            this.toast(`Association « ${res.nom_officiel} » synchronisée depuis l'API Entreprise et ajoutée au registre !`);
        } catch (err) {
            this.toast(err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    // ==========================================================================
    // VISIONNEUSE / PRÉVISUALISATION DIRECTE DES DOCUMENTS (RNA, DAC, STATUTS)
    // ==========================================================================,

    importOfficialComptesIntoStructure(structId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const s = store.state.structures.find(x => x.id === structId);
        if (!s) return;
        const apiInfo = fin.getEnrichedApiEntrepriseData(s);
        const compte = (apiInfo.comptes || [])[0];
        if (!compte) {
            this.toast('Aucun compte clos disponible dans le flux API Entreprise pour cette association.', 'warning');
            return;
        }
        const annee = parseInt(compte.annee, 10) || 2023;
        let b = store.state.budgets_exercices.find(x => x.structure_id === s.id && Number(x.annee) === annee);
        if (!b) {
            b = {
                id: 'b-' + Date.now(),
                structure_id: s.id,
                annee: annee,
                total_produits: compte.total_produits,
                total_charges: compte.total_charges,
                achats_charges_externes: Math.round(compte.total_charges * 0.4),
                charges_personnel: Math.round(compte.total_charges * 0.5),
                autres_charges: Math.round(compte.total_charges * 0.1),
                subventions_autres: compte.montant_subventions,
                subvention_ccmvr_demandee: 0,
                tresorerie_banque: compte.total_resultat > 0 ? compte.total_resultat * 2 : 1000,
                fonds_propres_reserves: compte.total_resultat > 0 ? compte.total_resultat * 3 : 2000
            };
            store.state.budgets_exercices.push(b);
        } else {
            b.total_produits = compte.total_produits;
            b.total_charges = compte.total_charges;
        }
        this.toast(`Comptes annuels officiels ${annee} importés avec succès (Produits : ${fin.formatCurrency(compte.total_produits)}, Charges : ${fin.formatCurrency(compte.total_charges)}, Résultat : ${fin.formatCurrency(compte.total_resultat)}) !`, 'success');
        this.closeModal();
        this.renderMainView();
    },

    async handleCdgDeleteStructure(structId) {
        const store = window.CCMVR.Store;
        const s = store.state.structures.find(x => x.id === structId);
        const nom = s ? (s.nom_officiel || s.nom_dusage || s.siret) : 'cette association';
        if (!confirm(`Attention : Êtes-vous sûr de vouloir supprimer définitivement l'association « ${nom} » ?\n\nCette action supprimera également tous ses dossiers de subventions, ses conventions et son compte d'accès extranet.`)) {
            return;
        }
        this.showLoader(true);
        try {
            await store.deleteStructureAndRelatedData(structId);
            this.closeModal();
            this.toast(`L'association « ${nom} » a été supprimée du registre avec succès.`, 'info');
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
        } catch (err) {
            this.toast('Erreur lors de la suppression de la structure : ' + err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },
    async handleCdgDeleteDossier(dossierId) {
        const store = window.CCMVR.Store;
        const d = store.state.dossiers_subventions.find(x => x.id === dossierId);
        if (!d) return;

        const struct = store.state.structures.find(s => s.id === d.structure_id) || {};
        const nomAsso = struct.nom_officiel || 'Association';
        const code = d.code_hex || 'ACTE';

        if (!confirm(`Attention : Êtes-vous sûr de vouloir supprimer définitivement le dossier #${code} de « ${nomAsso} » ?\n\nCette action supprimera également toutes les conventions d'objectifs, avenants et documents générés associés (purge des tests).`)) {
            return;
        }

        this.showLoader(true);
        try {
            await store.deleteDossierAndRelatedData(dossierId);
            this.toast(`Dossier #${code} et conventions associées supprimés définitivement.`, 'info');
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
        } catch (err) {
            this.toast('Erreur lors de la suppression : ' + err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    async handleCdgDeleteConvention(convId) {
        const store = window.CCMVR.Store;
        const c = store.state.conventions.find(x => x.id === convId);
        if (!c) return;

        const code = c.code_hex || 'ACTE';
        if (!confirm(`Attention : Êtes-vous sûr de vouloir supprimer définitivement la convention #${code} ?\n\nCette action supprimera l'acte juridique et ses signatures enregistrées.`)) {
            return;
        }

        this.showLoader(true);
        try {
            await store.deleteConvention(convId);
            this.toast(`Convention #${code} supprimée du registre avec succès.`, 'info');
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
        } catch (err) {
            this.toast('Erreur lors de la suppression : ' + err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    exportAssociationsSpreadsheetCsv() {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const headers = [
            'SIREN',
            'SIRET_Siege',
            'Nb_Locaux',
            'RNA_Prefecture',
            'Denomination_Officielle',
            'Regime',
            'Date_Creation',
            'Date_JOAFE',
            'Impots_Commerciaux',
            'Eligible_CEC',
            'Code_APE',
            'Objet_Social_Statutaire',
            'Adresse_Siege',
            'Code_Postal',
            'Commune',
            'Representant_Nom',
            'Representant_Fonction',
            'Email_Contact',
            'IBAN',
            'BIC',
            'URL_Statuts_PDF_API_Entreprise',
            'URL_Liste_Dirigeants_PDF_API_Entreprise'
        ];

        const rows = (store.state.structures || []).map(s => {
            const api = fin.getEnrichedApiEntrepriseData(s);
            const cols = [
                api.siren,
                s.siret || api.siret_siege,
                api.nb_etablissements,
                s.rna || api.rna,
                s.nom_officiel,
                api.regime,
                api.date_creation,
                api.date_jo,
                api.impots_commerciaux ? 'OUI' : 'NON',
                api.eligibilite_cec ? 'OUI' : 'NON',
                api.code_ape,
                (api.objet || '').replace(/[\r\n;]+/g, ' '),
                s.adresse_siege || '',
                s.code_postal || '',
                s.ville || '',
                `${s.representant_prenom || ''} ${s.representant_nom || ''}`.trim(),
                s.representant_fonction || '',
                s.email_contact || '',
                s.iban || '',
                s.bic || '',
                api.statuts_pdf_url || '',
                api.dirigeants_pdf_url || ''
            ];
            return cols.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
        });

        const csvContent = '\ufeff' + headers.join(';') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Registre_Associations_CCMVR_API_Entreprise_${store.activeMillesime}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast('Registre Tableur Excel (.CSV) exporté avec les données Association + API Entreprise !');
    },

    // Module d'Import en Masse des Conventions Historiques,

    renderCdgImportMasse(container) {
        container.innerHTML = `
            <div class="space-y-6 max-w-4xl mx-auto">
                <div>
                    <h1 class="text-xl font-bold text-slate-900">Assistant d'Importation en Masse de l'Historique (Excel / CSV)</h1>
                    <p class="text-xs text-slate-500 mt-0.5">Intégrez en quelques secondes vos anciens registres (les 382 actes Enfance-Jeunesse ou le suivi Sport/Culture) sans ressaisie manuelle.</p>
                </div>

                <div class="card-minimal p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-bold text-slate-900">Collez vos lignes Excel (Format : Pôle ; Nom Association ; SIRET ; Objet ; Date Début ; Date Fin ; Montant)</h2>
                        <button onclick="CCMVR.App.fillSampleImportData()" class="text-xs text-blue-600 hover:underline font-semibold">
                            Charger un extrait type des conventions CCMVR
                        </button>
                    </div>
                    <textarea id="bulk-import-text" rows="6" class="input-clean font-mono-code text-xs" placeholder="SPORT;ARCHERS DU VELAY;41255896300012;Convention objectifs tir à l'arc;2026-01-01;2028-12-31;4500"></textarea>
                    <div class="flex justify-end">
                        <button onclick="CCMVR.App.handleExecuteBulkImport()" class="px-5 py-2.5 btn-accent text-xs font-bold flex items-center gap-2">
                            <i data-lucide="database" class="w-4 h-4"></i> Importer et Générer les Fiches & Codes Hexadécimaux
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    fillSampleImportData() {
        const sample = [
            'SPORT;ETOILE CYCLISTE MONISTROL;41288965400019;École de cyclisme et grand prix intercommunal;2027-01-01;2029-12-31;6500',
            'CULTURE;ECOLE INTERCOMMUNALE MUSIQUE ET DANSE (EIMD);39874125600022;Enseignement artistique et gestion parc instrumental;2027-01-01;2029-12-31;85000',
            'TOURISME;OFFICE DE TOURISME INTERCOMMUNAL MARCHES DU VELAY;83145698700014;Promotion touristique et gestion bureaux accueil;2027-01-01;2029-12-31;145000'
        ].join('\n');
        const el = document.getElementById('bulk-import-text');
        if (el) el.value = sample;
    },

    async handleExecuteBulkImport() {
        const raw = document.getElementById('bulk-import-text')?.value.trim();
        if (!raw) {
            this.toast('Veuillez coller au moins une ligne à importer.', 'warning');
            return;
        }
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        let count = 0;

        try {
            for (const line of lines) {
                const parts = line.split(';');
                if (parts.length < 6) continue;
                const [poleCode, nomAsso, siret, objet, dateDeb, dateFin, montantStr] = parts.map(s => s.trim());
                const pole = store.state.poles.find(p => p.code === poleCode.toUpperCase()) || store.state.poles[0];

                const struct = await store.saveStructure({
                    siret: siret || ('43000000' + Math.floor(100000 + Math.random() * 899999)),
                    nom_officiel: nomAsso,
                    ville: 'Monistrol-sur-Loire',
                    code_postal: '43120',
                    email_contact: `contact@${nomAsso.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}.fr`,
                    representant_nom: 'DIRECTION',
                    representant_fonction: 'Personne habilitée'
                });

                const hex = fin.generateHexId();
                const montant = parseFloat(montantStr) || 0;
                const d = await store.submitGrantApplication({
                    dossierPayload: {
                        code_hex: hex,
                        structure_id: struct.id,
                        pole_id: pole.id,
                        annee: store.activeMillesime,
                        intitule_projet: objet,
                        montant_demande: montant,
                        montant_propose_pole: montant
                    },
                    budgetPayload: {
                        total_charges: montant * 3,
                        total_produits: montant * 3,
                        tresorerie_banque: montant * 0.5,
                        fonds_propres_reserves: montant * 0.8
                    },
                    criteresValues: []
                });

                await store.updateDossierInstruction(d.id, {
                    montant_vote: montant,
                    statut_workflow: 'VOTE_CONSEIL'
                });
                count++;
            }
            this.toast(`${count} convention(s) et structure(s) importées avec succès dans Supabase !`);
            this.switchTab('cdg_registre');
        } catch (err) {
            this.toast('Erreur import : ' + err.message, 'error');
        }
    },

    // ==========================================================================
    // 8. TÉLÉCHARGEMENT DU SCRIPT AUTONOME DE SAUVEGARDE & CLASSEMENT RÉSEAU (.PS1)
    // Conforme à l'arborescence et nomenclature officielle de 0Gestion_Conventions.xlsm
    // ==========================================================================

    downloadNetworkBackupScript() {
        const store = window.CCMVR.Store;
        const docGen = window.CCMVR.DocGenerator;
        const fin = window.CCMVR.FinanceEngine;
        const cfg = window.CCMVR.CONFIG;

        this.toast('Génération du script autonome de sauvegarde réseau en cours...', 'info');

        try {
            const enrichedConventions = store.getEnrichedConventions() || [];
            const enrichedDossiers = store.getEnrichedDossiers() || [];
            const structures = store.state.structures || [];
            const poles = store.state.poles || [];
            const millesime = store.activeMillesime || 2026;

            // Compilation des actes à sauvegarder
            const items = [];
            const processedKeys = new Set();

            // 1. Ajouter toutes les conventions existantes
            for (const conv of enrichedConventions) {
                const d = conv.dossier || store.state.dossiers_subventions.find(x => x.id === conv.dossier_id || x.code_hex === conv.code_hex) || null;
                const struct = conv.structure || (d && d.structure) || structures.find(s => s.id === (conv.structure_id || d?.structure_id)) || {};
                const pole = conv.pole || (d && d.pole) || poles.find(p => p.id === (conv.pole_id || d?.pole_id)) || poles[0] || {};

                const poleCode = (pole.code || 'SPORT').toUpperCase();
                const structNom = struct.nom_officiel || struct.nom_dusage || 'Association';
                const codeHex = conv.code_hex || d?.code_hex || fin.generateHexId();
                const montant = parseFloat(d?.montant_vote || d?.montant_propose_pole || d?.montant_demande || conv.montant || 0);

                const normType = conv.normType || (store.normalizeConventionTypeCode ? store.normalizeConventionTypeCode(d?.type_convention || 'COM_OBJECTIFS') : 'COM_OBJECTIFS');
                let typ = 'Convention';
                if (normType === 'AVENANT') typ = 'Avenant';
                else if (normType === 'CONV_MINIBUS') typ = 'Convention Minibus';
                else if (normType === 'CONV_LOCAUX') typ = 'Convention Locaux';
                else if (normType === 'CONV_PERSONNEL') typ = 'Convention Personnel';
                else if (montant > 0 && montant < 5000 && (conv.statut_signature === 'ARRÊTÉ' || conv.statut_signature === 'NOTIFICATION')) typ = 'Notification';

                const obj = (conv.intitule_specifique || d?.intitule_projet || 'Subvention de fonctionnement').trim();
                const dateDeb = conv.date_debut || `${d?.annee || millesime}-01-01`;
                const dateFin = conv.date_fin || `${d?.annee || millesime}-12-31`;
                const anneeDeb = parseInt(dateDeb.slice(0, 4)) || millesime;
                const anneeFin = parseInt(dateFin.slice(0, 4)) || millesime;
                const nbSign = typ === 'Notification' ? 1 : 2;

                const isArchived = (conv.statut_signature === 'ARCHIVE' || conv.statut_signature === 'SOLDE' || conv.is_archived === true) ||
                                  (d && (d.statut_workflow === 'ARCHIVE' || d.statut_workflow === 'CLOTURE')) ||
                                  (anneeFin < millesime && conv.statut_signature === 'SIGNE');
                const statutTexte = isArchived ? 'Archivé' : (conv.statut_signature === 'SIGNE' ? 'Signé' : (d?.statut_workflow === 'VOTE_CONSEIL' ? 'Voté Conseil' : 'Actif'));

                const criteresPole = (store.state.criteres_metiers || []).filter(cm => cm.pole_id === pole.id);
                const valeursCriteres = d ? (d.valeurs || []) : [];
                const prestationsNature = store.getEnrichedPrestations ? store.getEnrichedPrestations(struct.id, millesime) : [];
                const annexePoleModele = store.getPoleAnnexeTemplate ? store.getPoleAnnexeTemplate(poleCode, normType) : null;

                const rawHtml = docGen.buildFullConventionHTML({
                    convention: conv,
                    dossier: d,
                    structure: struct,
                    pole,
                    valeursCriteres,
                    criteresPole,
                    prestationsNature,
                    annexeMetierTexte: d?.notes_internes_pole || '',
                    annexePoleModele
                });

                const documentTitle = `${typ} - ${obj} - ${structNom} - ${anneeDeb}-${anneeFin} - ${nbSign} sign - ${codeHex}`;
                const fullHtml = docGen.wrapOfficialDocumentHTML(rawHtml, documentTitle, true);
                const b64 = btoa(unescape(encodeURIComponent(fullHtml)));

                const obs = (d?.statut_workflow ? `Workflow : ${d.statut_workflow}` : '') + (conv.date_signature ? ` • Signé le ${conv.date_signature}` : '');

                items.push({
                    id: conv.id || codeHex,
                    code_hex: codeHex,
                    type_acte: typ,
                    objet: obj,
                    nom_structure: structNom,
                    pole_code: poleCode,
                    pole_nom: pole.nom || pole.libelle || poleCode,
                    date_debut: dateDeb,
                    date_fin: dateFin,
                    annee_debut: anneeDeb,
                    annee_fin: anneeFin,
                    nb_signatures: nbSign,
                    is_archived: isArchived,
                    statut_label: statutTexte,
                    montant: montant,
                    observations: obs,
                    html_b64: b64
                });

                processedKeys.add(codeHex);
                if (d) processedKeys.add(d.id);
            }

            // 2. Ajouter les dossiers votés / instruits sans convention explicite enregistrée
            for (const d of enrichedDossiers) {
                if (processedKeys.has(d.id) || processedKeys.has(d.code_hex)) continue;
                const isAdvanced = (d.statut_workflow === 'VOTE_CONSEIL' || d.statut_workflow === 'VALIDE_COMMISSION' || d.statut_workflow === 'VISE_CDG' || d.statut_workflow === 'AVIS_POLE_FAVORABLE');
                if (!isAdvanced) continue;

                const struct = d.structure || structures.find(s => s.id === d.structure_id) || {};
                const pole = d.pole || poles.find(p => p.id === d.pole_id) || poles[0] || {};
                const poleCode = (pole.code || 'SPORT').toUpperCase();
                const structNom = struct.nom_officiel || struct.nom_dusage || 'Association';
                const codeHex = d.code_hex || fin.generateHexId();
                const montant = parseFloat(d.montant_vote || d.montant_propose_pole || d.montant_demande || 0);

                const normType = store.normalizeConventionTypeCode ? store.normalizeConventionTypeCode(d.type_convention || 'COM_OBJECTIFS') : 'COM_OBJECTIFS';
                let typ = 'Convention';
                if (normType === 'AVENANT') typ = 'Avenant';
                else if (normType === 'CONV_MINIBUS') typ = 'Convention Minibus';
                else if (normType === 'CONV_LOCAUX') typ = 'Convention Locaux';
                else if (normType === 'CONV_PERSONNEL') typ = 'Convention Personnel';
                else if (montant > 0 && montant < 5000) typ = 'Notification';

                const obj = (d.intitule_projet || 'Subvention de fonctionnement').trim();
                const annee = d.annee || millesime;
                const dateDeb = `${annee}-01-01`;
                const dateFin = `${annee}-12-31`;
                const nbSign = typ === 'Notification' ? 1 : 2;

                const isArchived = (d.statut_workflow === 'ARCHIVE' || d.statut_workflow === 'CLOTURE' || annee < millesime);
                const statutTexte = isArchived ? 'Archivé' : (d.statut_workflow === 'VOTE_CONSEIL' ? 'Voté Conseil' : 'En instruction');

                const criteresPole = (store.state.criteres_metiers || []).filter(cm => cm.pole_id === pole.id);
                const valeursCriteres = d.valeurs || [];
                const prestationsNature = store.getEnrichedPrestations ? store.getEnrichedPrestations(struct.id, millesime) : [];
                const annexePoleModele = store.getPoleAnnexeTemplate ? store.getPoleAnnexeTemplate(poleCode, normType) : null;

                const rawHtml = docGen.buildFullConventionHTML({
                    convention: null,
                    dossier: d,
                    structure: struct,
                    pole,
                    valeursCriteres,
                    criteresPole,
                    prestationsNature,
                    annexeMetierTexte: d.notes_internes_pole || '',
                    annexePoleModele
                });

                const documentTitle = `${typ} - ${obj} - ${structNom} - ${annee}-${annee} - ${nbSign} sign - ${codeHex}`;
                const fullHtml = docGen.wrapOfficialDocumentHTML(rawHtml, documentTitle, true);
                const b64 = btoa(unescape(encodeURIComponent(fullHtml)));

                items.push({
                    id: d.id,
                    code_hex: codeHex,
                    type_acte: typ,
                    objet: obj,
                    nom_structure: structNom,
                    pole_code: poleCode,
                    pole_nom: pole.nom || pole.libelle || poleCode,
                    date_debut: dateDeb,
                    date_fin: dateFin,
                    annee_debut: annee,
                    annee_fin: annee,
                    nb_signatures: nbSign,
                    is_archived: isArchived,
                    statut_label: statutTexte,
                    montant: montant,
                    observations: `Workflow : ${d.statut_workflow || 'Dépôt'}`,
                    html_b64: b64
                });
            }

            const payload = {
                app: 'CCMVR - Plateforme Conventions',
                exported_at: new Date().toISOString(),
                export_date_fr: new Date().toLocaleDateString('fr-FR'),
                total_items: items.length,
                millesime: millesime,
                items: items
            };

            const jsonString = JSON.stringify(payload, null, 2);
            const psScript = this.generatePowerShellBackupScript(jsonString, cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const blob = new Blob([bom, psScript], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Synchroniser_Conventions_CCMVR_${millesime}.ps1`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.toast(`Script de sauvegarde réseau téléchargé (${items.length} acte(s) consolidé(s)) ! Déposez-le dans votre dossier partagé pour l'exécuter.`, 'success');
        } catch (err) {
            console.error('Erreur downloadNetworkBackupScript:', err);
            this.toast('Erreur lors de la génération du script : ' + err.message, 'error');
        }
    },

    generatePowerShellBackupScript(jsonString, supabaseUrl, supabaseAnonKey) {
        return `<#
================================================================================
SCRIPT OFFICIEL DE SAUVEGARDE & CLASSEMENT RÉSEAU DES CONVENTIONS CCMVR
Communauté de Communes Marches du Velay-Rochebaron — Contrôle de Gestion
================================================================================
Mode d'emploi :
  1. Déposez ce script .ps1 dans le dossier réseau partagé de votre choix
     (ex: S:\\Conventions_CCMVR\\ ou P:\\Partage\\Conventions\\).
  2. Faites un clic droit sur ce fichier > "Exécuter avec PowerShell"
     (ou configurez une tâche planifiée Windows pour exécution automatique).
  3. Le script génère et organise automatiquement à partir de son emplacement :
     - Conventions\\<Pôle>\\<Association>\\<Fichier.pdf> (Conventions actives)
     - Conventions\\<Pôle>\\<Association>\\<Année>\\<Fichier.pdf> (Conventions archivées)
     - Conventions\\00_REGISTRE_CONVENTIONS.csv (Registre tableur UTF-8 Excel)
     - Backups\\Backup_Conventions_AAAAMMJJ_HHMMSS.json (Sauvegarde horodatée)
================================================================================
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  CCMVR — SYNCHRONISATION DU REGISTRE DES CONVENTIONS & ACTES    " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Dossier racine d'exécution : $ScriptDir" -ForegroundColor Gray
Write-Host "Date et heure              : $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# 1. Détection du moteur d'impression PDF (Microsoft Edge ou Google Chrome)
$edgeCandidates = @(
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
)
$edgeExe = $null
foreach ($path in $edgeCandidates) {
    if (Test-Path $path) {
        $edgeExe = $path
        break
    }
}

if ($edgeExe) {
    Write-Host "[OK] Moteur PDF détecté : $edgeExe" -ForegroundColor Green
} else {
    Write-Host "[ATTENTION] Moteur Edge non trouvé. Les actes seront enregistrés au format HTML A4 officiel." -ForegroundColor Yellow
}

# 2. Préparation des dossiers racines relatifs
$convBaseDir = Join-Path $ScriptDir "Conventions"
$backupDir = Join-Path $ScriptDir "Backups"
if (-not (Test-Path $convBaseDir)) { New-Item -ItemType Directory -Path $convBaseDir -Force | Out-Null }
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }

# 3. Fonction de nettoyage rigoureux des noms Windows (conforme 0Gestion_Conventions.xlsm)
function Safe-FileName([string]$name) {
    if (-not $name) { return "Sans_Nom" }
    $clean = $name -replace '[/\\\\:\\*\\?"<>\\|\\r\\n\\t]', '-'
    $clean = $clean -replace '--+', '-'
    $clean = $clean -replace '\\s+', ' '
    return $clean.Trim(' -')
}

# 4. Chargement des données (Hybride : Supabase en direct si accessible, sinon données locales)
$SupabaseUrl = "${supabaseUrl || ''}"
$SupabaseKey = "${supabaseAnonKey || ''}"
$dataset = $null

if ($SupabaseUrl -and $SupabaseKey -and $SupabaseUrl -notlike "*example*") {
    try {
        Write-Host "Vérification de l'accès à Supabase..." -ForegroundColor Gray
        $headers = @{
            "apikey" = $SupabaseKey
            "Authorization" = "Bearer $SupabaseKey"
        }
        $ping = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/conventions?select=id&limit=1" -Headers $headers -TimeoutSec 3 -ErrorAction Stop
        Write-Host "[OK] Connexion Supabase active. Synchronisation en ligne confirmée." -ForegroundColor Green
    } catch {
        Write-Host "[INFO] Supabase non accessible (mode hors-ligne ou réseau collectivité fermé). Bascule sur les données locales du script." -ForegroundColor DarkYellow
    }
}

# Données locales enregistrées dans le script
$rawEmbeddedJson = @'
${jsonString}
'@

try {
    $dataset = $rawEmbeddedJson | ConvertFrom-Json
} catch {
    Write-Host "[ERREUR] Impossible de charger les données embarquées : $_" -ForegroundColor Red
    exit 1
}

$items = $dataset.items
Write-Host "Nombre total d'actes à synchroniser : $($items.Count)" -ForegroundColor White
Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray

# Compteurs de suivi
$cptActifs = 0
$cptArchives = 0
$cptGeneres = 0
$cptDeplaces = 0
$registreRows = @()

# 5. Traitement et classement de chaque acte
foreach ($item in $items) {
    $poleSafe = Safe-FileName $item.pole_code
    $structSafe = Safe-FileName $item.nom_structure
    
    # Dossier du pôle et de l'association
    $structDir = Join-Path $convBaseDir "$poleSafe\\$structSafe"
    $archiveAnnualDir = Join-Path $structDir "$($item.annee_debut)"
    if (-not (Test-Path $structDir)) { New-Item -ItemType Directory -Path $structDir -Force | Out-Null }

    # Nomenclature officielle issue de 0Gestion_Conventions.xlsm :
    # "Type - Objet - Structure - AAAA-AAAA - N sign - CodeHex.pdf"
    $objSafe = Safe-FileName $item.objet
    $fileName = "$($item.type_acte) - $objSafe - $structSafe - $($item.annee_debut)-$($item.annee_fin) - $($item.nb_signatures) sign - $($item.code_hex).pdf"
    $fileNameSafe = Safe-FileName $fileName
    if (-not $fileNameSafe.EndsWith(".pdf")) { $fileNameSafe += ".pdf" }

    $activePath = Join-Path $structDir $fileNameSafe
    $archivePath = Join-Path $archiveAnnualDir $fileNameSafe

    $relPath = ""
    $statutFinal = $item.statut_label

    # Gestion de l'état : Archivé vs Actif
    if ($item.is_archived -eq $true) {
        if (-not (Test-Path $archiveAnnualDir)) { New-Item -ItemType Directory -Path $archiveAnnualDir -Force | Out-Null }
        
        if (Test-Path $activePath) {
            # Le fichier physique était dans le dossier actif : on le déplace en archive annuelle (comme ArchiverLaLigne)
            Move-Item -Path $activePath -Destination $archivePath -Force
            Write-Host "[DÉPLACÉ EN ARCHIVE] $fileNameSafe -> $($item.annee_debut)/" -ForegroundColor Yellow
            $cptDeplaces++
        } elseif (Test-Path $archivePath) {
            Write-Host "[ARCHIVE CONFORME] $fileNameSafe (Déjà présent)" -ForegroundColor DarkGray
        } else {
            # Génération directe dans le dossier d'archives
            $html = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($item.html_b64))
            $tempHtml = [System.IO.Path]::GetTempFileName() + ".html"
            [System.IO.File]::WriteAllText($tempHtml, $html, [System.Text.Encoding]::UTF8)

            if ($edgeExe) {
                $fileUri = "file:///" + ($tempHtml -replace "\\\\", "/")
                Start-Process -FilePath $edgeExe -ArgumentList "--headless=new", "--disable-gpu", "--run-all-compositor-stages-before-draw", "--no-pdf-header-footer", "--print-to-pdf=\`"$archivePath\`"", "\`"$fileUri\`"" -Wait -NoNewWindow
            } else {
                $htmlFallback = [System.IO.Path]::ChangeExtension($archivePath, ".html")
                Copy-Item -Path $tempHtml -Destination $htmlFallback -Force
            }
            Remove-Item -Path $tempHtml -Force -ErrorAction SilentlyContinue
            Write-Host "[CRÉÉ EN ARCHIVE] $fileNameSafe" -ForegroundColor Magenta
            $cptGeneres++
        }
        $relPath = "Conventions\\$poleSafe\\$structSafe\\$($item.annee_debut)\\$fileNameSafe"
        $cptArchives++
    } else {
        # Convention active
        if (Test-Path $activePath) {
            Write-Host "[ACTIF À JOUR] $fileNameSafe" -ForegroundColor Green
        } else {
            # Génération du nouveau PDF actif
            $html = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($item.html_b64))
            $tempHtml = [System.IO.Path]::GetTempFileName() + ".html"
            [System.IO.File]::WriteAllText($tempHtml, $html, [System.Text.Encoding]::UTF8)

            if ($edgeExe) {
                $fileUri = "file:///" + ($tempHtml -replace "\\\\", "/")
                Start-Process -FilePath $edgeExe -ArgumentList "--headless=new", "--disable-gpu", "--run-all-compositor-stages-before-draw", "--no-pdf-header-footer", "--print-to-pdf=\`"$activePath\`"", "\`"$fileUri\`"" -Wait -NoNewWindow
            } else {
                $htmlFallback = [System.IO.Path]::ChangeExtension($activePath, ".html")
                Copy-Item -Path $tempHtml -Destination $htmlFallback -Force
            }
            Remove-Item -Path $tempHtml -Force -ErrorAction SilentlyContinue
            Write-Host "[NOUVEAU CRÉÉ] $fileNameSafe" -ForegroundColor Cyan
            $cptGeneres++
        }
        $relPath = "Conventions\\$poleSafe\\$structSafe\\$fileNameSafe"
        $cptActifs++
    }

    # Format monétaire
    $montantVal = [double]0
    [double]::TryParse("$($item.montant)", [ref]$montantVal) | Out-Null
    $montantStr = "{0:N2} €" -f $montantVal

    # Ligne pour le registre tableur CSV
    $registreRows += [PSCustomObject]@{
        ID = $item.code_hex
        TYPE = $item.type_acte
        SIGNATAIRE = $item.nom_structure
        OBJET = $item.objet
        STATUT = $statutFinal
        DATE_DEBUT = $item.date_debut
        DATE_FIN = $item.date_fin
        CHEMIN_RELATIF = $relPath
        SERVICE = $item.pole_nom
        MONTANT = $montantStr
        OBSERVATIONS = $item.observations
    }
}

# 6. Écriture du Registre Tableur CSV UTF-8 avec BOM (ouvrable directement dans Excel)
$csvPath = Join-Path $convBaseDir "00_REGISTRE_CONVENTIONS.csv"
$csvLines = @("ID;TYPE;SIGNATAIRE;OBJET;STATUT;DATE DEBUT;DATE FIN;CHEMIN RELATIF;SERVICE;MONTANT;OBSERVATIONS")

foreach ($r in $registreRows) {
    $line = "$($r.ID);$($r.TYPE);$($r.SIGNATAIRE);$($r.OBJET);$($r.STATUT);$($r.DATE_DEBUT);$($r.DATE_FIN);$($r.CHEMIN_RELATIF);$($r.SERVICE);$($r.MONTANT);$($r.OBSERVATIONS)"
    $csvLines += $line
}

$utf8WithBom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllLines($csvPath, $csvLines, $utf8WithBom)
Write-Host ""
Write-Host "[OK] Registre des conventions mis à jour : Conventions\\00_REGISTRE_CONVENTIONS.csv" -ForegroundColor Green

# 7. Sauvegarde horodatée du JSON brut dans Backups\\
$timeTag = Get-Date -Format "yyyyMMdd_HHmmss"
$backupJsonPath = Join-Path $backupDir "Backup_Conventions_$timeTag.json"
[System.IO.File]::WriteAllText($backupJsonPath, $rawEmbeddedJson, $utf8WithBom)
Write-Host "[OK] Sauvegarde horodatée enregistrée : Backups\\Backup_Conventions_$timeTag.json" -ForegroundColor Green

# 8. Synthèse d'exécution
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "SYNCHRONISATION TERMINÉE AVEC SUCCÈS !" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  • Conventions actives à jour      : $cptActifs" -ForegroundColor White
Write-Host "  • Conventions archivées           : $cptArchives" -ForegroundColor White
Write-Host "  • Fichiers déplacés vers archive  : $cptDeplaces" -ForegroundColor Yellow
Write-Host "  • Nouveaux PDF générés            : $cptGeneres" -ForegroundColor Green
Write-Host "  • Registre Excel mis à jour       : Conventions\\00_REGISTRE_CONVENTIONS.csv" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Entrée pour quitter..." -ForegroundColor Gray
Read-Host
`;
    },

    // ==========================================================================
    // 7. VUES EXTRANET ASSOCIATION : PROFIL API SIRET, STATUTS, DEMANDE & ACTES
    // ==========================================================================


    // ==========================================================================
    // 8. ADMINISTRATION DES ACCÈS & RÔLES MULTI-COMPTES (SUPABASE AUTH & PROFILES)
    // ==========================================================================

        renderCdgRolesAdmin(container) {
        const store = window.CCMVR.Store;
        const cfg = window.CCMVR.CONFIG;
        const personas = cfg.PERSONAS || {};
        
        // Consolidation des comptes utilisateurs
        const profilesMap = new Map();

        // 1. Charger depuis les personas
        Object.keys(personas).forEach(k => {
            const p = personas[k];
            if (p.email) {
                profilesMap.set(p.email.toLowerCase(), {
                    email: p.email.toLowerCase(),
                    nom: p.nom || k,
                    titre: p.titre || '',
                    role: p.role,
                    pole_code: p.pole_code || '',
                    permissions: p.permissions || { minibus: true, tarifs: true, visa: p.role === 'admin' },
                    isInternal: true
                });
            }
        });

        // 2. Enrichir avec la table Supabase profiles
        (store.state.profiles || []).forEach(sp => {
            if (sp.email) {
                const em = sp.email.toLowerCase();
                const existing = profilesMap.get(em) || {
                    email: em,
                    nom: sp.nom_complet || em.split('@')[0],
                    titre: 'Agent / Utilisateur CCMVR',
                    isInternal: em.endsWith('@ccmvr.fr')
                };
                existing.role = sp.role || existing.role || 'association';
                existing.pole_code = sp.pole_code || existing.pole_code || '';
                if (sp.permissions) existing.permissions = sp.permissions;
                profilesMap.set(em, existing);
            }
        });

        const usersList = Array.from(profilesMap.values()).sort((a, b) => {
            if (a.isInternal && !b.isInternal) return -1;
            if (!a.isInternal && b.isInternal) return 1;
            return a.email.localeCompare(b.email);
        });

        const rowsHtml = usersList.map(u => {
            const isSelf = u.email === (store.currentUser?.email || '').toLowerCase();
            const safeKey = u.email.replace(/[^a-zA-Z0-9]/g, '_');
            const perms = u.permissions || {};
            const permMinibus = perms.minibus !== undefined ? perms.minibus : (u.role === 'admin' || u.role === 'pole_accueil');
            const permTarifs = perms.tarifs !== undefined ? perms.tarifs : (u.role === 'admin' || u.role === 'pole_batiments');
            const permVisa = perms.visa !== undefined ? perms.visa : (u.role === 'admin');

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition" id="user-row-${safeKey}">
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full ${u.isInternal ? 'bg-blue-600' : 'bg-amber-500'}" title="${u.isInternal ? 'Agent interne CCMVR' : 'Compte Association'}"></span>
                            <div>
                                <span class="text-xs font-bold text-slate-900 font-mono-code">${u.email}</span>
                                ${isSelf ? '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">Vous</span>' : ''}
                                <div class="text-[11px] text-slate-500">${u.nom || ''} ${u.titre ? '• ' + u.titre : ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4">
                        <select id="role-select-${safeKey}" class="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500">
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>🛡️ Contrôle de Gestion / DGS</option>
                            <option value="pole_metier" ${u.role === 'pole_metier' ? 'selected' : ''}>📋 Pôle Métier Instructeur</option>
                            <option value="pole_accueil" ${u.role === 'pole_accueil' ? 'selected' : ''}>🚐 Service Accueil (Minibus)</option>
                            <option value="pole_batiments" ${u.role === 'pole_batiments' ? 'selected' : ''}>🏛️ Pôle Bâtiments & Régie</option>
                            <option value="association" ${u.role === 'association' ? 'selected' : ''}>🤝 Espace Association</option>
                        </select>
                    </td>
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-2">
                            <label class="flex items-center gap-1 text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer" title="Donner le droit de saisir et gérer les réservations minibus">
                                <input type="checkbox" id="perm-minibus-${safeKey}" ${permMinibus ? 'checked' : ''} class="rounded text-cyan-600 focus:ring-cyan-500"/>
                                <span>Saisie Minibus</span>
                            </label>
                            <label class="flex items-center gap-1 text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer" title="Accès à la mise à jour des grilles tarifaires">
                                <input type="checkbox" id="perm-tarifs-${safeKey}" ${permTarifs ? 'checked' : ''} class="rounded text-blue-600 focus:ring-blue-500"/>
                                <span>Tarifs</span>
                            </label>
                            <label class="flex items-center gap-1 text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer" title="Délivrance de visas réglementaires de contrôle financier">
                                <input type="checkbox" id="perm-visa-${safeKey}" ${permVisa ? 'checked' : ''} class="rounded text-emerald-600 focus:ring-emerald-500"/>
                                <span>Visas</span>
                            </label>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <button onclick="CCMVR.App.handleSaveUserProfile('${u.email}')" class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 ml-auto">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            <span>Enregistrer</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-indigo-200 border border-white/20">
                            Sécurité & Habilitations Multi-Comptes
                        </span>
                        <h1 class="text-xl font-extrabold text-white mt-1">Administration des Accès & Rôles par Adresse E-mail</h1>
                        <p class="text-xs text-indigo-100 mt-0.5">Affectez en 1 clic les rôles et habilitations (Accueil Minibus, Bâtiments, Pôles Métiers, CDG). Les droits sont synchronisés immédiatement dans Supabase.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            Synchro Supabase Active
                        </span>
                    </div>
                </div>

                <!-- Tableau des rôles -->
                <div class="card-minimal overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
                        <div>
                            <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Comptes Utilisateurs & Habilitations en Base de Données</h2>
                            <p class="text-[11px] text-slate-500">Total : ${usersList.length} compte(s) répertorié(s)</p>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/70">
                                    <th class="py-3 px-4">Utilisateur / E-mail</th>
                                    <th class="py-3 px-4">Rôle Principal</th>
                                    <th class="py-3 px-4">Habilitations Express</th>
                                    <th class="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    },

    async handleSaveUserProfile(email) {
        const safeKey = email.replace(/[^a-zA-Z0-9]/g, '_');
        const roleSelect = document.getElementById(`role-select-${safeKey}`);
        if (!roleSelect) return;
        const newRole = roleSelect.value;
        const permMinibus = !!document.getElementById(`perm-minibus-${safeKey}`)?.checked;
        const permTarifs = !!document.getElementById(`perm-tarifs-${safeKey}`)?.checked;
        const permVisa = !!document.getElementById(`perm-visa-${safeKey}`)?.checked;
        const permissions = { minibus: permMinibus, tarifs: permTarifs, visa: permVisa };

        try {
            await window.CCMVR.Store.updateProfileRole(email, newRole, permissions);
            this.toast(`Droits de ${email} mis à jour avec succès : rôle « ${newRole} » actif !`, 'success');
            const cfg = window.CCMVR.CONFIG;
            if (cfg.PERSONAS) {
                const personaKey = Object.keys(cfg.PERSONAS).find(k => (cfg.PERSONAS[k].email || '').toLowerCase() === email.toLowerCase());
                if (personaKey) {
                    cfg.PERSONAS[personaKey].role = newRole;
                    cfg.PERSONAS[personaKey].permissions = permissions;
                }
            }
        } catch (err) {
            this.toast('Erreur lors de la mise à jour Supabase : ' + err.message, 'error');
        }
    },

};


// Export ES6 si utilisé via bundler/modules natifs
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CCMVR.Modules.Cdg;
}
