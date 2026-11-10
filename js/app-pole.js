// ==============================================================================
// MODULE CCMVR: POLE
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.Modules.Pole = {

    presentationIndex: 0,
    commissionIndex: 0,

    async quickValidatePoleAvis(dossierId, montantPropose) {
        this.showLoader(true);
        try {
            const patch = {
                statut_workflow: 'AVIS_POLE_FAVORABLE',
                montant_propose_pole: montantPropose,
                date_avis_pole: new Date().toISOString()
            };
            await window.CCMVR.Store.updateDossierInstruction(dossierId, patch);
            const isHigh = parseFloat(montantPropose) >= 23000;
            this.toast(isHigh
                ? `✓ Avis Pôle validé (${window.CCMVR.FinanceEngine.formatCurrency(montantPropose)}). Dossier transmis au Contrôleur de Gestion pour Visa obligatoire (≥ 23 000 €).`
                : `✓ Avis Pôle validé (${window.CCMVR.FinanceEngine.formatCurrency(montantPropose)}). Circuit allégé prêt pour la Commission.`,
                'success');
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
        } catch (err) {
            this.toast('Erreur validation pôle : ' + err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    renderPoleInstruction(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const poleCode = store.currentUser.pole_code || 'SPORT';
        const poleObj = store.state.poles.find(p => p.code === poleCode) || { code: poleCode, libelle: `Pôle ${poleCode}` };
        const annee = store.activeMillesime;
        const dossiers = store.getEnrichedDossiers(poleCode, annee);
        const formulaObj = store.getPoleFormula(poleCode);
        const criteresPole = store.state.criteres_metiers.filter(c => c.pole_id === poleObj.id);

        const rowsHtml = dossiers.map(d => {
            // Calcul de l'aide indicative selon la formule du pôle
            const varsDict = {};
            criteresPole.forEach(c => {
                const v = d.valeurs.find(x => x.critere_id === c.id);
                if (v) {
                    varsDict[c.code_variable] = c.type_donnee === 'boolean' ? Boolean(v.valeur_booleenne) : (parseFloat(v.valeur_numerique) || 0);
                } else {
                    varsDict[c.code_variable] = c.type_donnee === 'boolean' ? false : 0;
                }
            });
            const montantFormule = fin.evaluatePoleFormula(formulaObj.expression, varsDict);
            const isHigh = store.isDossierSoumisCdg(d);
            const isRetourCdg = d.statut_workflow === 'RETOUR_CDG_POLE';
            const needsPoleAction = (
                (!isHigh && ['DEPOSE', 'EN_INSTRUCTION', 'RETOUR_INCOMPLET_SOUMIS'].includes(d.statut_workflow)) ||
                (isHigh && d.statut_workflow === 'VISE_CDG') ||
                isRetourCdg ||
                d.statut_workflow === 'VALIDE_COMMISSION'
            );

            let rowClass = 'hover:bg-slate-50 transition border-b border-slate-100';
            if (isRetourCdg) {
                // Ambre prononcé : alerte de réserves du Contrôle de Gestion à traiter d'urgence
                rowClass = 'bg-amber-50/90 hover:bg-amber-100/80 border-l-4 border-l-amber-600 transition border-b border-amber-300 text-slate-900 font-semibold shadow-2xs';
            } else if (needsPoleAction) {
                // Vert clair : action requise de la part du pôle
                rowClass = 'bg-emerald-50/80 hover:bg-emerald-100/70 border-l-4 border-l-emerald-600 transition border-b border-emerald-200 text-slate-900';
            } else {
                // Grisé : attente de l'association, attente du Visa CDG, ou dossier acté/rejeté
                rowClass = 'opacity-65 bg-slate-50/70 hover:opacity-100 hover:bg-slate-100/80 transition border-b border-slate-200 text-slate-500';
            }

            return `
                <tr class="${rowClass}">
                    <td class="py-3.5 px-4 font-mono-code text-xs font-bold text-slate-900">#${d.code_hex}</td>
                    <td class="py-3.5 px-4">
                        <div class="font-bold text-slate-900 text-xs">${d.structure.nom_officiel || 'Association'}</div>
                        <div class="text-[11px] text-slate-500">SIRET : ${d.structure.siret || '—'} • ${d.intitule_projet}</div>
                    </td>
                    <td class="py-3.5 px-4">
                        <span class="px-2 py-0.5 rounded border text-[10px] font-semibold ${d.palier.color}">${d.palier.label}</span>
                    </td>
                    <td class="py-3.5 px-4 text-right font-mono-code text-xs font-bold text-slate-900">${fin.formatCurrency(d.montant_demande)}</td>
                    <td class="py-3.5 px-4 text-right font-mono-code text-xs font-semibold text-blue-600 bg-blue-50/40">${fin.formatCurrency(montantFormule)}</td>
                    <td class="py-3.5 px-4 text-right font-mono-code text-xs font-bold text-emerald-700">${fin.formatCurrency(d.montant_propose_pole || montantFormule)}</td>
                    <td class="py-3.5 px-4 text-center">${this.getWorkflowBadge(d.statut_workflow, d.montant_demande)}</td>
                    <td class="py-3.5 px-4 text-right">
                        <div class="inline-flex items-center gap-1.5 justify-end">
                            ${(d.statut_workflow === 'DEPOSE' || d.statut_workflow === 'EN_INSTRUCTION' || d.statut_workflow === 'RETOUR_INCOMPLET_SOUMIS') ? `
                                ${isHigh ? `
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200" title="Demande ≥ 23 000 € (individuelle ou cumul annuel). En cours de 1ère validation préalable par le Contrôle de Gestion.">
                                        ⏳ Étape 1 : Visa CDG requis
                                    </span>
                                    <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition">
                                        Consulter
                                    </button>
                                ` : `
                                    <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1" title="Contrôler la gouvernance, les pièces et émettre l'avis">
                                        <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> Contrôler & Instruire
                                    </button>
                                `}
                            ` : ''}

                            ${d.statut_workflow === 'VISE_CDG' ? `
                                <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1" title="Dossier visé par le CDG (1ère étape). Émettre la 2ème validation technique avant passage en commission.">
                                    <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> Étape 2 : Instruire & Avis Pôle
                                </button>
                            ` : ''}

                            ${d.statut_workflow === 'RETOUR_CDG_POLE' ? `
                                <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-extrabold transition shadow-xs flex items-center gap-1 animate-pulse" title="Le Contrôle de Gestion a retourné ce dossier avec des réserves. Cliquez pour traiter.">
                                    <i data-lucide="alert-octagon" class="w-3.5 h-3.5"></i> ⚠️ Traiter Réserves CdG
                                </button>
                            ` : ''}

                            ${d.statut_workflow === 'INCOMPLET' ? `
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Attente retour asso</span>
                                <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition">
                                    Consulter
                                </button>
                            ` : ''}

                            ${d.statut_workflow === 'AVIS_POLE_FAVORABLE' ? `
                                <button onclick="CCMVR.App.openWorkflowStepTransitionModal('${d.id}', 'VALIDE_COMMISSION')" class="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1" title="Valider en commission thématique">
                                    🏛️ Commission
                                </button>
                                <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition">
                                    Consulter
                                </button>
                            ` : ''}

                            ${d.statut_workflow === 'VALIDE_COMMISSION' ? `
                                <button onclick="CCMVR.App.openWorkflowStepTransitionModal('${d.id}', 'VOTE_CONSEIL')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1" title="Acter le vote du Conseil Communautaire">
                                    ★ Acter Vote Conseil
                                </button>
                                <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition">
                                    Consulter
                                </button>
                            ` : ''}

                            ${d.statut_workflow === 'VOTE_CONSEIL' ? `
                                <button onclick="CCMVR.App.openConventionPreviewModal('${d.id}')" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1" title="Consulter la convention officielle générée">
                                    📄 Convention
                                </button>
                                <button onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition">
                                    Dossier
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">${poleObj.code}</span>
                            <h1 class="text-xl font-bold text-slate-900">${poleObj.libelle} — Instruction des Demandes ${annee}</h1>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">Instruction et arbitrage des demandes ${annee}.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="CCMVR.App.openDirectInKindGrantModal(null, '${poleObj.code}')" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm" title="Attribuer un concours en nature d'office (minibus, locaux, etc.)">
                            <i data-lucide="gift" class="w-4 h-4"></i> + Aide en Nature d'Office
                        </button>
                        <button onclick="CCMVR.App.switchTab('pole_criteres')" class="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <i data-lucide="sliders" class="w-4 h-4 text-blue-600"></i> Configurer Critères & Calcul
                        </button>
                        <button onclick="CCMVR.App.switchTab('pole_commission')" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                            <i data-lucide="projector" class="w-4 h-4"></i> Mode Présentation Commission
                        </button>
                    </div>
                </div>

                <!-- Tableau d'instruction du pôle -->
                <div class="card-minimal overflow-hidden">
                    <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Dossiers déposés auprès du ${poleObj.libelle}</span>
                        <span class="text-xs text-slate-500">${dossiers.length} dossier(s)</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                    <th class="py-2.5 px-4">ID</th>
                                    <th class="py-2.5 px-4">Association & Objet</th>
                                    <th class="py-2.5 px-4">Palier Procédure</th>
                                    <th class="py-2.5 px-4 text-right">Demandé</th>
                                    <th class="py-2.5 px-4 text-right text-blue-700">Calcul Barème Pôle</th>
                                    <th class="py-2.5 px-4 text-right">Proposé par le Pôle</th>
                                    <th class="py-2.5 px-4 text-center">Statut</th>
                                    <th class="py-2.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml || `<tr><td colspan="8" class="py-8 text-center text-xs text-slate-400">Aucun dossier pour ce pôle sur l'exercice ${annee}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================================================
    // 3. CONFIGURATEUR VISUEL DE CRITÈRES & BARÈME SANS CODE DU PÔLE MÉTIER
    // ==========================================================================,

    renderPoleCriteresConfig(container) {
        container = container || document.getElementById('app-main');
        if (!container) return;
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const poleObj = store.state.poles.find(p => p.code === poleCode) || store.state.poles[0] || { code: poleCode, libelle: 'Pôle ' + poleCode };
        const criteres = store.state.criteres_metiers.filter(c => c.pole_id === poleObj.id);
        const formulaObj = store.getPoleFormula(poleCode);
        const weights = formulaObj.weights || {};
        const forfaitSocle = Number(formulaObj.forfait_socle) || 0;

        const categories = store.getPoleCategories(poleCode);

        // Si le pôle dispose de catégories configurées (Multi-Dispositifs)
        if (categories && categories.length > 0) {
            if (!this.currentPoleCategory || !categories.some(c => c.id === this.currentPoleCategory)) {
                this.currentPoleCategory = categories[0].id;
            }
            const activeCategory = categories.find(c => c.id === this.currentPoleCategory) || categories[0];
            const valeurPoint = activeCategory.valeur_point || 5.25;
            const modeCalcul = activeCategory.mode_calcul || 'POINTS';

            const categoryTabsHtml = `
                <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                    <span class="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                        <i data-lucide="layers" class="w-3.5 h-3.5 text-orange-600"></i> Dispositifs du Pôle (${categories.length}) :
                    </span>
                    ${categories.map(c => `
                        <button type="button" onclick="CCMVR.App.selectPoleCategory('${c.id}')"
                            class="px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 shrink-0 ${c.id === activeCategory.id ? 'bg-orange-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}">
                            <i data-lucide="folder" class="w-3.5 h-3.5"></i>
                            <span>${c.nom}</span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] ${c.id === activeCategory.id ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-600'}">${(c.volets || []).length} volet${(c.volets || []).length > 1 ? 's' : ''}</span>
                        </button>
                    `).join('')}
                    <button type="button" onclick="CCMVR.App.openEditCategoryModal()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 shrink-0" title="Ajouter une nouvelle catégorie / dispositif pour ce pôle">
                        <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-orange-600"></i> + Nouveau Dispositif
                    </button>
                </div>
            `;

            const voletsListHtml = (activeCategory.volets || []).map(v => {
                const critsHtml = (v.criteres || []).map(c => {
                    let modeBadge = '';
                    if (c.mode_val === 'POURCENTAGE_DIRECT') {
                        modeBadge = `<span class="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono-code font-bold text-xs">${Math.round((c.taux || 0.25) * 100)} % ${c.plafond_montant ? '(max ' + c.plafond_montant + ' €)' : ''}</span>`;
                    } else if (c.mode_val === 'EUROS_DIRECT') {
                        modeBadge = `<span class="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono-code font-bold text-xs">Forfait direct €</span>`;
                    } else {
                        modeBadge = `<span class="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 font-mono-code font-black text-xs">${c.points !== undefined ? c.points : 10} pt${(c.points || 10) > 1 ? 's' : ''}</span>`;
                    }

                    let limitsBadge = '';
                    if (c.plafond) {
                        limitsBadge += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Max : ${c.plafond} ${c.unite || ''}</span>`;
                    }
                    if (c.plancher) {
                        limitsBadge += `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Min requis : ${c.plancher}</span>`;
                    }

                    return `
                        <div class="p-3 bg-white border border-slate-200 rounded-xl hover:border-orange-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div class="space-y-1 flex-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-xs font-bold text-slate-900">${c.libelle}</span>
                                    ${modeBadge}
                                    ${limitsBadge}
                                </div>
                                <div class="text-[11px] text-slate-500">${c.aide || ''}</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button type="button" onclick="CCMVR.App.openEditCritereModal('${v.id}', '${c.code}')" class="px-2.5 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition border border-orange-200 flex items-center gap-1">
                                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Modifier
                                </button>
                                <button type="button" onclick="CCMVR.App.handleDeleteCritere('${v.id}', '${c.code}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Supprimer ce critère">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                        <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="space-y-0.5">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded">Volet ${v.numero}</span>
                                    <h3 class="text-xs font-black text-slate-900">${v.titre}</h3>
                                    ${v.justificatif_requis ? `
                                        <span class="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                            <i data-lucide="paperclip" class="w-3 h-3 text-amber-600"></i> ${v.justificatif_label || 'Justificatif requis'}
                                        </span>
                                    ` : ''}
                                </div>
                                ${v.description ? `<p class="text-[11px] text-slate-500">${v.description}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button type="button" onclick="CCMVR.App.openEditCritereModal('${v.id}')" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs">
                                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> + Ajouter Critère
                                </button>
                                <button type="button" onclick="CCMVR.App.openEditVoletModal('${v.id}')" class="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition" title="Paramètres du volet">
                                    <i data-lucide="settings" class="w-4 h-4"></i>
                                </button>
                                ${(activeCategory.volets || []).length > 1 ? `
                                    <button type="button" onclick="CCMVR.App.handleDeleteVolet('${v.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Supprimer ce volet">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="p-4 space-y-2.5 bg-slate-50/30">
                            ${critsHtml || '<div class="text-xs text-slate-400 italic py-2 text-center">Aucun critère dans ce volet. Cliquez sur "+ Ajouter Critère".</div>'}
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Barre de navigation des Catégories / Dispositifs -->
                    ${categoryTabsHtml}

                    <!-- Bannière Catégorie Active -->
                    <div class="p-6 rounded-2xl bg-gradient-to-r from-orange-950 via-slate-900 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/30 text-orange-200 border border-orange-400/30">
                                    ${poleObj.libelle} • Dispositif actif
                                </span>
                                <span class="text-xs font-bold text-orange-300">#${activeCategory.id}</span>
                            </div>
                            <h1 class="text-xl font-extrabold text-white mt-1">${activeCategory.nom}</h1>
                            <p class="text-xs text-orange-200 mt-0.5">${activeCategory.description || 'Dispositif d’aide et de subvention du pôle'}</p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button type="button" onclick="CCMVR.App.openEditCategoryModal('${activeCategory.id}')" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition border border-white/20 flex items-center gap-1.5">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Renommer / Paramètres
                            </button>
                            <button type="button" onclick="CCMVR.App.openEditVoletModal()" class="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5">
                                <i data-lucide="folder-plus" class="w-4 h-4"></i> + Nouveau Volet
                            </button>
                            ${categories.length > 1 ? `
                                <button type="button" onclick="CCMVR.App.handleDeleteCategory('${activeCategory.id}')" class="p-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 rounded-xl transition border border-rose-500/30" title="Supprimer ce dispositif">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${(!categories || categories.length === 0) ? emptyDispositifCard : ''}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Colonne Gauche : Mode, Valeur du point & Simulateur -->
                        <div class="space-y-6">
                            <!-- Carte Mode de calcul & Valeur du Point -->
                            <div class="card-minimal card-accent-orange p-5 space-y-4">
                                <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                    <i data-lucide="calculator" class="w-4 h-4 text-orange-600"></i>
                                    1. Mode de Valorisation du Dispositif
                                </h2>
                                
                                <div class="space-y-2">
                                    <label class="block text-xs font-bold text-slate-700">Méthode de calcul retenue :</label>
                                    <div class="grid grid-cols-1 gap-2">
                                        <button type="button" onclick="CCMVR.App.handleToggleSportMode('POINTS')" class="p-3 rounded-xl border text-left transition flex items-center justify-between ${modeCalcul === 'POINTS' ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}">
                                            <div>
                                                <div class="text-xs font-bold">Système à Points (Grille barémée)</div>
                                                <div class="text-[10px] text-slate-500">Pondération selon critères et valeur du point</div>
                                            </div>
                                            ${modeCalcul === 'POINTS' ? '<i data-lucide="check-circle" class="w-4 h-4 text-orange-600"></i>' : ''}
                                        </button>
                                        <button type="button" onclick="CCMVR.App.handleToggleSportMode('EUROS')" class="p-3 rounded-xl border text-left transition flex items-center justify-between ${modeCalcul === 'EUROS' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}">
                                            <div>
                                                <div class="text-xs font-bold">Forfait Direct en Euros (€)</div>
                                                <div class="text-[10px] text-slate-500">Somme des aides directes et pourcentages</div>
                                            </div>
                                            ${modeCalcul === 'EUROS' ? '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>' : ''}
                                        </button>
                                        <button type="button" onclick="CCMVR.App.handleToggleSportMode('SANS_CALCUL')" class="p-3 rounded-xl border text-left transition flex items-center justify-between ${modeCalcul === 'SANS_CALCUL' ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}">
                                            <div>
                                                <div class="text-xs font-bold">Sans Barème Automatique</div>
                                                <div class="text-[10px] text-slate-500">Montant libre fixé par arbitrage de commission</div>
                                            </div>
                                            ${modeCalcul === 'SANS_CALCUL' ? '<i data-lucide="check-circle" class="w-4 h-4 text-blue-600"></i>' : ''}
                                        </button>
                                    </div>
                                </div>

                                ${modeCalcul === 'POINTS' ? `
                                    <div class="p-4 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2">
                                        <label class="block text-xs font-extrabold text-orange-950">
                                            Valeur Officielle du Point (€ / pt) :
                                        </label>
                                        <div class="flex items-center gap-2">
                                            <input type="number" id="pole-sport-point-valeur" step="0.05" min="0.1" value="${valeurPoint}" class="input-clean font-mono-code text-base font-extrabold text-orange-700 w-32 text-right bg-white"/>
                                            <span class="text-xs font-bold text-orange-900">€ / pt</span>
                                            <button type="button" onclick="CCMVR.App.handleSaveSportPointValue()" class="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs">
                                                <i data-lucide="save" class="w-3.5 h-3.5"></i> Appliquer
                                            </button>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Colonne Droite : Liste des Volets et Critères -->
                        <div class="lg:col-span-2 space-y-4">
                            <div class="flex items-center justify-between">
                                <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                    <i data-lucide="list-checks" class="w-4 h-4 text-orange-600"></i>
                                    Volets & Critères du Dispositif (${(activeCategory.volets || []).length} Volets)
                                </h2>
                                <span class="text-xs text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 font-bold">100% Modifiable</span>
                            </div>
                            <div class="space-y-4">
                                ${voletsListHtml || '<div class="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 italic text-xs">Aucun volet pour ce dispositif. Cliquez sur "+ Nouveau Volet" pour commencer.</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            lucide?.createIcons?.();
            return;
        }

        // Si AUCUNE catégorie n'est configurée pour ce pôle
        const emptyDispositifCard = `
            <div class="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-sm mb-6">
                <div class="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center font-bold">
                    <i data-lucide="folder-plus" class="w-7 h-7"></i>
                </div>
                <div class="max-w-md mx-auto space-y-1">
                    <h3 class="text-base font-extrabold text-slate-900">Aucun dispositif spécifique configuré pour le ${poleObj.libelle}</h3>
                    <p class="text-xs text-slate-500">Par défaut, les associations peuvent déposer des demandes générales sans formulaire d'indicateurs obligatoire. Vous pouvez créer un premier dispositif (ex: « Fonctionnement global », « Appel à projet ») pour lui associer des volets et des critères personnalisés.</p>
                </div>
                <button type="button" onclick="CCMVR.App.openEditCategoryModal()" class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-2">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i> + Créer un 1er Dispositif / Catégorie
                </button>
            </div>
        `;

        // Construction des lignes du Barème Visuel Sans Code
        const baremeRowsHtml = criteres.map(c => {
            const isBool = c.type_donnee === 'boolean';
            const isText = c.type_donnee === 'text';
            const defaultWeight = weights[c.code_variable] !== undefined
                ? weights[c.code_variable]
                : (isBool ? 500 : (c.type_donnee === 'number' ? 15 : 0));

            return `
                <div class="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                    <div class="space-y-1 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                isBool ? 'bg-purple-100 text-purple-800' : (isText ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-800')
                            }">
                                ${isBool ? 'Case Oui / Non' : (isText ? 'Texte informatif' : 'Nombre / Quantité')}
                            </span>
                            <span class="text-xs font-extrabold text-slate-900">${c.libelle}</span>
                        </div>
                        <div class="text-[11px] text-slate-500">${c.aide_saisie || 'Renseigné par l\'association lors du dépôt de dossier'}</div>
                    </div>

                    <!-- Règle de calcul en français ultra-simple -->
                    <div class="flex items-center gap-3 shrink-0">
                        ${isText ? `
                            <span class="text-[11px] italic text-slate-400 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">Critère qualitatif (0 €)</span>
                        ` : `
                            <div class="flex items-center gap-2 bg-indigo-50/70 px-3 py-2 rounded-xl border border-indigo-200">
                                <span class="text-xs font-bold text-indigo-950">
                                    ${isBool ? 'Bonus si OUI :' : 'Multiplier par :'}
                                </span>
                                <input type="number" step="0.5" min="0"
                                    data-bareme-var="${c.code_variable}"
                                    data-bareme-type="${c.type_donnee}"
                                    data-bareme-label="${c.libelle.replace(/"/g, '&quot;')}"
                                    value="${defaultWeight}"
                                    oninput="CCMVR.App.recalcVisualBareme('${poleCode}')"
                                    class="w-24 px-2.5 py-1 text-right font-mono-code text-xs font-extrabold text-indigo-700 bg-white border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"/>
                                <span class="text-xs font-extrabold text-indigo-800">
                                    ${isBool ? '€ forfaitaire' : '€ / unité'}
                                </span>
                            </div>
                        `}
                        <button onclick="CCMVR.App.handleDeleteCritere('${c.id}')" class="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Supprimer ce critère">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Construction des champs du simulateur en direct
        const simFieldsHtml = criteres.filter(c => c.type_donnee !== 'text').map(c => {
            const isBool = c.type_donnee === 'boolean';
            return `
                <div class="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800/80">
                    <span class="text-xs text-slate-300 truncate">${c.libelle}</span>
                    ${isBool ? `
                        <select data-sim-var="${c.code_variable}" onchange="CCMVR.App.recalcVisualBareme('${poleCode}')" class="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700">
                            <option value="1" style="background:#0f172a;color:#fff;" selected>OUI</option>
                            <option value="0" style="background:#0f172a;color:#fff;">NON</option>
                        </select>
                    ` : `
                        <input type="number" data-sim-var="${c.code_variable}" value="50" min="0"
                            oninput="CCMVR.App.recalcVisualBareme('${poleCode}')"
                            class="w-20 px-2 py-1 text-right font-mono-code text-xs font-bold bg-slate-800 text-white border border-slate-700 rounded-lg"/>
                    `}
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Bannière colorée moderne -->
                <div class="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                            Constructeur Visuel Sans Code • ${poleObj.code}
                        </span>
                        <h1 class="text-xl font-extrabold text-white mt-1">Critères & Barème Automatique — ${poleObj.libelle}</h1>
                        <p class="text-xs text-blue-200 mt-0.5">Aucune formule mathématique à taper : indiquez simplement le montant en Euros (€) attribué pour chaque critère.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Colonne Gauche : Ajout ultra-simple d'une question + simulateur en direct -->
                    <div class="space-y-6">
                        <div class="card-minimal card-accent-indigo p-5 space-y-4">
                            <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                <div class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                                </div>
                                1. Créer une Nouvelle Question
                            </h2>
                            <form onsubmit="CCMVR.App.handleAddCritere(event, '${poleObj.id}', '${poleCode}')" class="space-y-3 text-xs">
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Question posée à l'association *</label>
                                    <input type="text" id="new-crit-libelle" required placeholder="Ex: Nombre d'éducateurs diplômés" class="input-clean"/>
                                </div>
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Type de réponse attendue *</label>
                                    <select id="new-crit-type" onchange="CCMVR.App.onNewCritTypeChange(this.value)" class="input-clean font-semibold">
                                        <option value="number">Nombre (licenciés, heures, élèves, séances...)</option>
                                        <option value="boolean">Question Oui / Non (Label, agrément, charte...)</option>
                                        <option value="currency">Montant en Euros (€)</option>
                                        <option value="text">Texte libre (informatif)</option>
                                    </select>
                                </div>
                                <div id="new-crit-weight-box" class="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-1">
                                    <label id="new-crit-weight-label" class="block font-bold text-indigo-950">Montant attribué par unité (€) :</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" step="0.5" min="0" id="new-crit-weight" value="20" class="input-clean font-mono-code font-extrabold text-indigo-700 bg-white"/>
                                        <span class="font-bold text-indigo-800 whitespace-nowrap">€</span>
                                    </div>
                                    <p class="text-[10px] text-indigo-600">S'ajoutera automatiquement au calcul de la subvention.</p>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-600 mb-1">Précision ou consigne (facultatif)</label>
                                    <input type="text" id="new-crit-aide" placeholder="Ex: Selon attestation fédérale de l'année" class="input-clean"/>
                                </div>
                                <button type="submit" class="w-full py-2.5 btn-accent text-xs font-bold flex items-center justify-center gap-1.5">
                                    <i data-lucide="plus" class="w-4 h-4"></i> Ajouter ce critère au barème
                                </button>
                            </form>
                        </div>

                        <!-- Simulateur de test en direct pour l'agent -->
                        <div class="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                    <i data-lucide="sparkles" class="w-4 h-4"></i> Simulateur de Test en Direct
                                </span>
                                <span class="text-[10px] text-slate-400">Vérifiez votre barème</span>
                            </div>
                            <p class="text-[11px] text-slate-400">Modifiez les valeurs d'exemple ci-dessous pour tester instantanément le montant que l'application proposera :</p>
                            <div class="space-y-1">
                                ${simFieldsHtml || '<div class="text-xs text-slate-500">Ajoutez un critère pour tester</div>'}
                            </div>
                            <div class="pt-3 flex items-center justify-between border-t border-slate-800">
                                <span class="text-xs font-bold text-slate-300">Subvention calculée :</span>
                                <span id="bareme-sim-total" class="text-xl font-black font-mono-code text-emerald-400">— €</span>
                            </div>
                        </div>
                    </div>

                    <!-- Colonne Droite (2/3) : Tableau Visuel du Barème en Euros (Zéro Code) -->
                    <div class="lg:col-span-2 space-y-6">
                        <div class="card-minimal card-accent-blue p-6 space-y-5">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div>
                                    <h2 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                        <i data-lucide="sliders" class="w-5 h-5 text-blue-600"></i>
                                        2. Réglage Visuel du Calcul Automatique (${criteres.length} critères)
                                    </h2>
                                    <p class="text-xs text-slate-500 mt-0.5">Changez simplement les montants en Euros dans les cases ci-dessous : l'application additionne tout automatiquement.</p>
                                </div>
                                <button onclick="CCMVR.App.handleSavePoleFormula('${poleCode}')" class="px-5 py-2.5 btn-accent text-xs font-extrabold flex items-center gap-2 shrink-0">
                                    <i data-lucide="save" class="w-4 h-4"></i> Enregistrer ce Barème
                                </button>
                            </div>

                            <!-- Forfait de base fixe du pôle -->
                            <div class="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div class="text-xs font-extrabold text-slate-900">Dotation Socle Fixe (Montant de base garanti avant critères)</div>
                                    <div class="text-[11px] text-slate-500">Mettez 0 € si le calcul dépend uniquement des critères d'activité ci-dessous.</div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <span class="text-xs font-bold text-slate-700">Socle fixe :</span>
                                    <input type="number" step="50" min="0" id="bareme-forfait-socle" value="${forfaitSocle}"
                                        oninput="CCMVR.App.recalcVisualBareme('${poleCode}')"
                                        class="w-28 px-3 py-1.5 text-right font-mono-code text-xs font-extrabold text-slate-900 bg-white border border-slate-300 rounded-lg"/>
                                    <span class="text-xs font-extrabold text-slate-700">€</span>
                                </div>
                            </div>

                            <!-- Liste interactive des critères avec leur tarif en € -->
                            <div class="space-y-3">
                                ${baremeRowsHtml || '<div class="text-xs text-slate-400 py-6 text-center">Aucun critère configuré pour ce pôle. Utilisez le formulaire à gauche pour en ajouter.</div>'}
                            </div>

                            <!-- Résumé Visuel Clair en Français (sans code) -->
                            <div class="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                                <div class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                    <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                                    Règle de calcul active (traduite automatiquement en français pour la Commission)
                                </div>
                                <div id="bareme-human-summary" class="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-emerald-950"></div>
                                <input type="hidden" id="pole-formula-expr" value="${formulaObj.expression}"/>
                                <input type="hidden" id="pole-formula-desc" value="${formulaObj.description}"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.recalcVisualBareme(poleCode);
    },

    onNewCritTypeChange(typeVal) {
        const box = document.getElementById('new-crit-weight-box');
        const lbl = document.getElementById('new-crit-weight-label');
        const inp = document.getElementById('new-crit-weight');
        if (!box || !lbl || !inp) return;
        if (typeVal === 'text') {
            box.classList.add('hidden');
            inp.value = 0;
        } else {
            box.classList.remove('hidden');
            if (typeVal === 'boolean') {
                lbl.textContent = 'Bonus forfaitaire attribué si l\'association coche OUI (€) :';
                inp.value = 500;
            } else {
                lbl.textContent = 'Montant attribué par unité saisie (€ / unité) :';
                inp.value = 20;
            }
        }
    },

    recalcVisualBareme(poleCode) {
        const fin = window.CCMVR.FinanceEngine;
        const socle = parseFloat(document.getElementById('bareme-forfait-socle')?.value) || 0;
        const inputs = Array.from(document.querySelectorAll('[data-bareme-var]'));

        const exprParts = [];
        const descParts = [];
        const badgeHtmlParts = [];
        const weights = {};

        if (socle > 0) {
            exprParts.push(`${socle}`);
            descParts.push(`Socle fixe de ${socle} €`);
            badgeHtmlParts.push(`<span class="px-2.5 py-1 bg-white rounded-lg border border-emerald-300 shadow-2xs">Socle fixe : <strong>${fin.formatCurrency(socle)}</strong></span>`);
        }

        inputs.forEach(inp => {
            const varName = inp.getAttribute('data-bareme-var');
            const varType = inp.getAttribute('data-bareme-type');
            const label = inp.getAttribute('data-bareme-label');
            const val = parseFloat(inp.value) || 0;
            weights[varName] = val;

            if (val > 0) {
                if (varType === 'boolean') {
                    exprParts.push(`(${varName} ? ${val} : 0)`);
                    descParts.push(`+${val} € si ${label}`);
                    badgeHtmlParts.push(`<span class="px-2.5 py-1 bg-white rounded-lg border border-emerald-300 shadow-2xs"><strong>+${val} €</strong> si <em>${label}</em> = OUI</span>`);
                } else {
                    exprParts.push(`(${varName} * ${val})`);
                    descParts.push(`${val} € × ${label}`);
                    badgeHtmlParts.push(`<span class="px-2.5 py-1 bg-white rounded-lg border border-emerald-300 shadow-2xs"><strong>${val} €</strong> × <em>${label}</em></span>`);
                }
            }
        });

        const finalExpr = exprParts.length > 0 ? exprParts.join(' + ') : '0';
        const finalDesc = descParts.length > 0 ? descParts.join(' + ') : 'Barème personnalisé du pôle';

        const exprEl = document.getElementById('pole-formula-expr');
        const descEl = document.getElementById('pole-formula-desc');
        const summaryEl = document.getElementById('bareme-human-summary');
        if (exprEl) exprEl.value = finalExpr;
        if (descEl) descEl.value = finalDesc;
        if (summaryEl) {
            summaryEl.innerHTML = badgeHtmlParts.length > 0
                ? badgeHtmlParts.join('<span class="text-emerald-600 font-black px-1">+</span>')
                : '<span class="text-slate-500">Tous les coefficients sont à 0 €</span>';
        }

        // Calcul du simulateur de test en direct
        const simVars = {};
        document.querySelectorAll('[data-sim-var]').forEach(el => {
            const vName = el.getAttribute('data-sim-var');
            simVars[vName] = parseFloat(el.value) || 0;
        });
        const simResult = fin.evaluatePoleFormula(finalExpr, simVars);
        const simTotalEl = document.getElementById('bareme-sim-total');
        if (simTotalEl) simTotalEl.textContent = fin.formatCurrency(simResult);

        return { finalExpr, finalDesc, socle, weights };
    },

    async handleAddCritere(e, poleId, poleCode) {
        e.preventDefault();
        const libelle = document.getElementById('new-crit-libelle').value.trim();
        // Génération automatique du nom de variable sans que l'agent ait à le saisir
        const autoVar = libelle
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 35) || ('critere_' + Date.now());
        const typeDonnee = document.getElementById('new-crit-type').value;
        const weightVal = parseFloat(document.getElementById('new-crit-weight')?.value) || 0;
        const aide = document.getElementById('new-crit-aide').value.trim();

        try {
            await window.CCMVR.Store.addCritereMetier({
                pole_id: poleId,
                annee_millesime: window.CCMVR.Store.activeMillesime,
                libelle,
                code_variable: autoVar,
                type_donnee: typeDonnee,
                aide_saisie: aide,
                est_obligatoire: true,
                ordre_affichage: window.CCMVR.Store.state.criteres_metiers.length + 1
            });

            // Sauvegarde immédiate du poids en € associé à ce nouveau critère
            const currentFormula = window.CCMVR.Store.getPoleFormula(poleCode || window.CCMVR.Store.currentUser.pole_code);
            const newWeights = { ...(currentFormula.weights || {}), [autoVar]: weightVal };
            window.CCMVR.Store.savePoleFormula(
                poleCode || window.CCMVR.Store.currentUser.pole_code,
                currentFormula.expression,
                currentFormula.description,
                currentFormula.forfait_socle,
                newWeights
            );

            this.renderMainView();
            this.handleSavePoleFormula(poleCode || window.CCMVR.Store.currentUser.pole_code, true);
            this.toast(`Critère "${libelle}" ajouté avec succès au barème !`);
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    async handleDeleteCritere(critId) {
        try {
            await window.CCMVR.Store.deleteCritereMetier(critId);
            this.renderMainView();
            this.toast('Critère supprimé du barème.');
        } catch (err) {
            this.toast('Erreur suppression : ' + err.message, 'error');
        }
    },

    handleSavePoleFormula(poleCode, silent = false) {
        const calc = this.recalcVisualBareme(poleCode);
        window.CCMVR.Store.savePoleFormula(poleCode, calc.finalExpr, calc.finalDesc, calc.socle, calc.weights);
        if (!silent) {
            this.toast('Barème de calcul automatique enregistré avec succès !');
        }
    },

    // ==========================================================================
    // 4. MODE PRÉSENTATION COMMISSION (PLEIN ÉCRAN ÉPURÉ POUR PROJECTION ÉLUS)
    // ==========================================================================,

    renderPoleCommissionMode(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const poleCode = store.currentUser.pole_code === 'CDG' ? null : store.currentUser.pole_code;
        const dossiers = store.getEnrichedDossiers(poleCode, store.activeMillesime);

        if (dossiers.length === 0) {
            container.innerHTML = `<div class="card-minimal p-12 text-center text-sm text-slate-500">Aucun dossier à présenter pour cette commission.</div>`;
            return;
        }

        if (typeof this.presentationIndex !== "number" || this.presentationIndex < 0 || this.presentationIndex >= dossiers.length) this.presentationIndex = 0;
        const d = dossiers[this.presentationIndex];
        const b = d.budget || {};
        const ratios = fin.calculateFinancialRatios({ ...b, subvention_ccmvr_demandee: d.montant_demande });

        container.innerHTML = `
            <div class="presentation-mode-overlay text-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-6">
                <!-- Barre supérieure de navigation des dossiers en Commission -->
                <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
                            Mode Séance Commission & Conseil
                        </span>
                        <span class="text-xs text-slate-400">Dossier ${this.presentationIndex + 1} sur ${dossiers.length}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="CCMVR.App.navPresentation(-1)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold border border-slate-600 transition">
                            ← Dossier précédent
                        </button>
                        <button onclick="CCMVR.App.navPresentation(1)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold border border-slate-600 transition">
                            Dossier suivant →
                        </button>
                    </div>
                </div>

                <!-- Fiche Synthétique Projetable -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-4">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <div class="text-xs font-mono-code text-blue-400 font-bold">ACTE #${d.code_hex} • SIRET ${d.structure.siret || '—'}</div>
                                <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">${d.structure.nom_officiel}</h2>
                                <p class="text-sm text-slate-300 mt-1">${d.intitule_projet}</p>
                            </div>
                            <span class="px-3 py-1 rounded-lg bg-white/10 text-white text-xs font-bold">${d.pole.libelle || 'Pôle'}</span>
                        </div>

                        <!-- Chiffres Clés du Dossier -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div class="bg-slate-800/90 border border-slate-700 p-4 rounded-xl">
                                <div class="text-[11px] uppercase text-slate-400 font-semibold">Subvention Demandée</div>
                                <div class="text-2xl font-black text-white font-mono-code mt-1">${fin.formatCurrency(d.montant_demande)}</div>
                                <div class="text-[11px] text-slate-400 mt-1">Budget total asso : ${fin.formatCurrency(ratios.total_produits)}</div>
                            </div>
                            <div class="bg-blue-950/70 border border-blue-500/40 p-4 rounded-xl">
                                <div class="text-[11px] uppercase text-blue-300 font-semibold">Proposition Pôle Instructeur</div>
                                <div class="text-2xl font-black text-blue-300 font-mono-code mt-1">${fin.formatCurrency(d.montant_propose_pole || d.montant_demande)}</div>
                                <div class="text-[11px] text-blue-200/80 mt-1">Dépendance CCMVR : ${ratios.taux_dependance_ccmvr.toFixed(1)} %</div>
                            </div>
                            <div class="bg-emerald-950/60 border border-emerald-500/40 p-4 rounded-xl">
                                <div class="text-[11px] uppercase text-emerald-300 font-semibold">+ Aides en Nature Valorisées</div>
                                <div class="text-2xl font-black text-emerald-300 font-mono-code mt-1">${fin.formatCurrency(d.totalNature)}</div>
                                <div class="text-[11px] text-emerald-200/80 mt-1">Minibus, locaux & régie technique</div>
                            </div>
                        </div>

                        <!-- Synthèse Financière & Avis Technique -->
                        <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
                            <div class="text-xs font-bold uppercase tracking-wider text-slate-300">Synthèse d'Instruction & Ratios Financiers</div>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                                <div>
                                    <span class="text-slate-400 block">Fonds de Roulement</span>
                                    <strong class="text-white font-mono-code">${fin.formatCurrency(ratios.frng_calcule)}</strong>
                                </div>
                                <div>
                                    <span class="text-slate-400 block">Trésorerie en banque</span>
                                    <strong class="text-white font-mono-code">${fin.formatCurrency(b.tresorerie_banque || 0)} (${ratios.tresorerie_mois_charges.toFixed(1)} mois)</strong>
                                </div>
                                <div>
                                    <span class="text-slate-400 block">Autofinancement (CAF)</span>
                                    <strong class="text-white font-mono-code">${fin.formatCurrency(ratios.caf_calculee)}</strong>
                                </div>
                                <div>
                                    <span class="text-slate-400 block">Contrat Républicain</span>
                                    <strong class="text-emerald-400">✓ Signé et conforme</strong>
                                </div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/80 text-xs text-slate-300">
                                <strong>Avis du service :</strong> ${d.notes_internes_pole || 'Dossier complet et conforme aux critères d\'intérêt communautaire.'}
                            </div>
                        </div>
                    </div>

                    <!-- Panneau d'Arbitrage en Direct des Élus -->
                    <div class="bg-white text-slate-900 rounded-xl p-5 flex flex-col justify-between space-y-4">
                        <div class="space-y-3">
                            <div class="text-xs font-bold uppercase tracking-wider text-blue-600">Décision de la Commission / Conseil</div>
                            <h3 class="text-base font-bold text-slate-900">Enregistrer l'arbitrage en séance</h3>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Montant retenu et voté (€)</label>
                                <input type="number" id="comm-montant-vote" step="50" value="${d.montant_vote || d.montant_propose_pole || d.montant_demande}" class="input-clean font-mono-code text-base font-bold"/>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Observation de la Commission</label>
                                <textarea id="comm-notes" rows="3" class="input-clean text-xs" placeholder="Mentionner l'avis de la commission...">${d.notes_internes_pole || ''}</textarea>
                            </div>
                        </div>
                        <div class="space-y-2 pt-2">
                            <button onclick="CCMVR.App.handleCommissionVote('${d.id}', 'VALIDE_COMMISSION')" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition">
                                ✓ Valider l'avis favorable en Commission
                            </button>
                            <button onclick="CCMVR.App.handleCommissionVote('${d.id}', 'VOTE_CONSEIL')" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">
                                ★ Acter le Vote Conseil & Générer la Convention
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    navPresentation(delta) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser.pole_code === 'CDG' ? null : store.currentUser.pole_code;
        const dossiers = store.getEnrichedDossiers(poleCode, store.activeMillesime);
        if (!dossiers.length) return;
        this.presentationIndex = (this.presentationIndex + delta + dossiers.length) % dossiers.length;
        this.renderMainView();
    },

    async handleCommissionVote(dossierId, newStatut) {
        const montantVote = parseFloat(document.getElementById('comm-montant-vote').value) || 0;
        const notes = document.getElementById('comm-notes').value;
        try {
            await window.CCMVR.Store.updateDossierInstruction(dossierId, {
                montant_vote: montantVote,
                montant_propose_pole: montantVote,
                statut_workflow: newStatut,
                notes_internes_pole: notes,
                date_vote_conseil: newStatut === 'VOTE_CONSEIL' ? new Date().toISOString() : null
            });
            this.renderMainView();
            this.toast(newStatut === 'VOTE_CONSEIL'
                ? 'Subvention votée ! La convention officielle a été générée dans le registre.'
                : 'Avis favorable de la commission enregistré.');
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    // ==========================================================================
    // 5. VUES BÂTIMENTS, MINIBUS & DSI : CALENDRIER, POINTAGE & ATTESTATIONS
    // ==========================================================================,

    switchPoleAnnexeType(typeCode) {
        this.activePoleAnnexeType = typeCode;
        this.renderMainView();
    },

    renderPoleAnnexeEditor(container) {
        const store = window.CCMVR.Store;
        const cfg = window.CCMVR.CONFIG;
        const poleCode = store.currentUser.pole_code === 'CDG' ? 'SPORT' : (store.currentUser.pole_code || 'SPORT');
        const pole = store.state.poles.find(p => p.code === poleCode) || { code: poleCode, libelle: `Service ${poleCode}` };
        const activeType = this.activePoleAnnexeType || 'COM_OBJECTIFS';
        const typesMap = cfg.TYPES_CONVENTIONS || {};
        const typeInfo = typesMap[activeType] || { code: activeType, label: activeType, hasTroncCommun: true };
        const isHorsCadre = activeType === 'HORS_CADRE';

        const tpl = store.getPoleAnnexeTemplate(poleCode, activeType);
        const conventionsPole = store.getEnrichedConventions().filter(c => store.currentUser.role === 'admin' || c.pole.code === poleCode);

        const typeTabsHtml = Object.values(typesMap).map(t => {
            const isSel = t.code === activeType;
            return `
                <button type="button" onclick="CCMVR.App.switchPoleAnnexeType('${t.code}')"
                    class="px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 border ${
                        isSel
                            ? (t.code === 'HORS_CADRE' ? 'bg-rose-700 text-white border-rose-800 shadow-md' : 'bg-blue-700 text-white border-blue-800 shadow-md')
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }">
                    <span>${t.code === 'HORS_CADRE' ? '⚡ ' : '📄 '}${t.shortLabel}</span>
                </button>
            `;
        }).join('');

        // Pour HORS_CADRE, le pôle peut aussi éditer les articles du corps de la convention
        const horsCadreBodyHtml = isHorsCadre ? `
            <div class="card-minimal border-2 border-rose-300 bg-rose-50/30 p-6 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase">Dérogation au Socle Commun • Visa Contrôle de Gestion requis</span>
                        <h2 class="text-base font-extrabold text-slate-900 mt-1">Corps de la Convention Hors Cadre (Articles modifiables par le Pôle)</h2>
                        <p class="text-xs text-slate-600">Contrairement aux 4 autres types de conventions qui embarquent le Socle Commun verrouillé de 12 articles, cette convention ponctuelle vous permet de rédiger librement le corps des articles. Elle sera soumise au visa du Contrôleur de Gestion.</p>
                    </div>
                    <button type="button" onclick="CCMVR.App.handleAddPoleHorsCadreBodyArticle()" class="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-extrabold shrink-0">
                        + Ajouter un Article au Corps Hors Cadre
                    </button>
                </div>
                <div class="space-y-3">
                    ${(tpl.articles_corps || []).map((art, idx) => `
                        <div class="p-4 bg-white rounded-xl border border-rose-200 space-y-2">
                            <div class="flex items-center justify-between gap-2">
                                <div class="flex items-center gap-2 flex-1">
                                    <span class="px-2 py-0.5 rounded bg-rose-700 text-white text-[10px] font-extrabold uppercase">Article ${idx + 1}</span>
                                    <input type="text" id="pole-hc-art-titre-${idx}" value="${art.titre || ''}" class="input-clean font-bold text-xs bg-white"/>
                                </div>
                                <button type="button" onclick="CCMVR.App.handleRemovePoleHorsCadreBodyArticle(${idx})" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold">
                                    Supprimer
                                </button>
                            </div>
                            <textarea id="pole-hc-art-contenu-${idx}" rows="3" class="input-clean text-xs bg-white leading-relaxed">${art.contenu || ''}</textarea>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-2.5">
                    <span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold uppercase text-[10px]">🔒 Socle Commun Actif</span>
                    <span class="text-slate-700">Pour une <strong>${typeInfo.label}</strong>, le Socle Juridique institutionnel (administré par le Contrôle de Gestion pour ce type d'acte) s'applique automatiquement. Votre service personnalise librement l'<strong>Annexe 1</strong> ci-dessous.</span>
                </div>
            </div>
        `;

        const clausesHtml = (tpl.clauses || []).map((cl, idx) => `
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-1">
                        <span class="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-extrabold uppercase">Clause Annexe ${idx + 1}</span>
                        <input type="text" id="pole-annexe-clause-titre-${idx}" value="${cl.titre || ''}" class="input-clean font-bold text-xs bg-white" placeholder="Titre de la clause d'annexe"/>
                    </div>
                    <button type="button" onclick="CCMVR.App.handleRemovePoleAnnexeClause(${idx})" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold">
                        Supprimer
                    </button>
                </div>
                <textarea id="pole-annexe-clause-texte-${idx}" rows="3" class="input-clean text-xs bg-white leading-relaxed" placeholder="Rédigez librement les modalités techniques et opérationnelles du service...">${cl.texte || ''}</textarea>
            </div>
        `).join('');

        const convCardsHtml = conventionsPole.map(c => {
            const isTransmis = Boolean(c.isTransmisAsso);
            const isPresSigned = Boolean(c.isSignePresidente);
            const isAssoSigned = Boolean(c.isSigneAsso);
            const isValide = c.statut_signature === 'VALIDE';

            const statusBadge = isValide
                ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">✓ 2/2 Signé (Complet)</span>`
                : !isTransmis
                    ? (isPresSigned
                        ? `<span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">✓ Signé Présidente (À transmettre)</span>`
                        : `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">⏳ En préparation Pôle</span>`)
                    : (isAssoSigned
                        ? `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Signé Asso (Attente CCMVR)</span>`
                        : `<span class="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">📨 Transmise (Attente signature asso)</span>`);

            return `
            <div class="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono-code text-xs font-extrabold text-slate-900">#${c.code_hex}</span>
                        <span class="px-2 py-0.5 rounded border text-[10px] font-extrabold ${c.typeInfo?.badgeClass || ''}">${c.typeInfo?.shortLabel || c.type_convention}</span>
                        <strong class="text-xs text-slate-900">${c.structure.nom_officiel}</strong>
                        ${statusBadge}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">Objet : ${c.intitule_specifique} • Du ${window.CCMVR.FinanceEngine.formatDate(c.date_debut)} au ${window.CCMVR.FinanceEngine.formatDate(c.date_fin)}</div>
                    ${!c.is_avenant && store.getAvenantsForConvention(c.id).length > 0 ? `
                        <div class="mt-2 flex flex-wrap items-center gap-1.5">
                            <span class="text-[10px] font-extrabold text-purple-900 uppercase">Avenants (${store.getAvenantsForConvention(c.id).length}) :</span>
                            ${store.getAvenantsForConvention(c.id).map(av => `
                                <button type="button" onclick="CCMVR.App.openConventionPreviewModal(null, '${av.id}')" class="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold">
                                    #${av.code_hex} (Av. n° ${av.numero_avenant || 1}) ${av.statut_signature === 'VALIDE' ? '✓' : (av.soumis_visa_cdg && av.statut_visa_cdg !== 'VISE_CDG' ? '⏳ Visa CdG' : '⏳')}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    ${!isTransmis ? `
                        <button type="button" onclick="CCMVR.App.handleTransmettreConventionAsso('${c.id}')" class="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-extrabold shadow-2xs flex items-center gap-1" title="Valider et transmettre la convention à l'association pour signature">
                            📨 Transmettre Asso
                        </button>
                    ` : ''}
                    ${!c.is_avenant ? `
                        <button type="button" onclick="CCMVR.App.openCreateAvenantModal('${c.id}')" class="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold" title="Créer un avenant modificateur rattaché à cette convention">
                            ➕ Avenant
                        </button>
                    ` : ''}
                    <button type="button" onclick="CCMVR.App.openCreateOrEditConventionModal('${c.id}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold">
                        ✏️ Modifier l'Annexe
                    </button>
                    <button type="button" onclick="CCMVR.App.openCreateOrEditConventionModal(null, '${c.structure_id}', null, '${activeType}')" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold" title="Créer une convention supplémentaire pour cette même association">
                        + Autre convention
                    </button>
                    <button type="button" onclick="CCMVR.App.openConventionPreviewModal('${c.dossier_id || ''}', '${c.id}')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold">
                        👁️ Voir Acte & Signer
                    </button>
                </div>
            </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <div class="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase">
                            Architecture Multi-Conventions • ${pole?.libelle || poleCode}
                        </span>
                        <h1 class="text-xl font-extrabold mt-1">Éditeur des 5 Types de Conventions & Annexes Métiers (${pole?.libelle || poleCode})</h1>
                        <p class="text-xs text-blue-200 mt-1 max-w-3xl">
                            Chaque service peut éditer des <strong>Conventions d'Objectifs et de Moyens</strong>, <strong>Conventions Minibus</strong>, <strong>Conventions d'Occupation de Locaux</strong>, <strong>Conventions de Mise à Disposition de Personnel</strong> (avec Socle Commun verrouillé + Annexe modifiable par le service) ainsi que des <strong>Conventions Hors Cadre de Socle Commun</strong> pour un besoin ponctuel.
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, '${activeType}')" class="px-4 py-2.5 bg-white text-slate-900 hover:bg-blue-50 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition">
                            + Créer une « ${typeInfo.shortLabel} » pour une Association
                        </button>
                        <button onclick="CCMVR.App.handleSavePoleAnnexeTemplate()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition">
                            <i data-lucide="save" class="w-4 h-4"></i> Enregistrer ce Modèle (${typeInfo.shortLabel})
                        </button>
                    </div>
                </div>

                <!-- Sélecteur des 5 types de conventions -->
                <div class="flex flex-wrap items-center gap-2">
                    ${typeTabsHtml}
                </div>

                ${horsCadreBodyHtml}

                <!-- Clauses de l'Annexe 1 du Pôle pour ce type de convention -->
                <div class="card-minimal card-accent-blue p-6 space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <h2 class="text-base font-extrabold text-slate-900">Modèle d'Annexe 1 du Service pour : « ${typeInfo.label} »</h2>
                            <p class="text-xs text-slate-500">${typeInfo.description || ''}</p>
                        </div>
                        <button type="button" onclick="CCMVR.App.handleAddPoleAnnexeClause()" class="px-3.5 py-2 btn-accent text-xs font-extrabold flex items-center gap-1.5">
                            <i data-lucide="plus" class="w-4 h-4"></i> Ajouter une clause à cette Annexe
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Titre officiel de l'Annexe 1 (${typeInfo.shortLabel})</label>
                            <input type="text" id="pole-annexe-titre" value="${tpl.intitule || tpl.titre_annexe || ''}" class="input-clean font-bold"/>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Préambule / Cadre opérationnel du Service</label>
                            <input type="text" id="pole-annexe-intro" value="${tpl.introduction || ''}" class="input-clean"/>
                        </div>
                    </div>

                    <div class="space-y-3">
                        ${clausesHtml}
                    </div>
                </div>

                <!-- Liste des conventions existantes avec possibilité d'en créer plusieurs par association -->
                <div class="card-minimal card-accent-indigo p-6 space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 class="text-base font-extrabold text-slate-900">Conventions individuelles éditées pour les associations (${conventionsPole.length})</h2>
                            <p class="text-xs text-slate-500">Une même association peut cumuler plusieurs conventions (ex: une COM + une convention Minibus + une convention d'Occupation de Locaux + une convention Hors Cadre ponctuelle).</p>
                        </div>
                        <button type="button" onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, '${activeType}')" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold">
                            + Nouvelle Convention Individuelle
                        </button>
                    </div>
                    <div class="space-y-2.5">
                        ${convCardsHtml || `<div class="text-xs text-slate-400 py-4">Aucune convention enregistrée pour ce pôle. Cliquez sur « + Nouvelle Convention Individuelle » ci-dessus.</div>`}
                    </div>
                </div>
            </div>
        `;
    },

    handleAddPoleHorsCadreBodyArticle() {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser.pole_code === 'CDG' ? 'SPORT' : (store.currentUser.pole_code || 'SPORT');
        const activeType = this.activePoleAnnexeType || 'HORS_CADRE';
        const tpl = store.getPoleAnnexeTemplate(poleCode, activeType);
        this.syncPoleAnnexeInputsToTemplate(tpl);
        tpl.articles_corps = tpl.articles_corps || [];
        tpl.articles_corps.push({
            num: tpl.articles_corps.length + 1,
            titre: 'Nouvelle disposition contractuelle ponctuelle',
            contenu: 'Précisez les engagements réciproques spécifiques à ce besoin ponctuel...'
        });
        store.savePoleAnnexeTemplate(poleCode, tpl, activeType);
        this.renderMainView();
        this.toast('Article ajouté au corps de la convention Hors Cadre.');
    },

    handleRemovePoleHorsCadreBodyArticle(idx) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser.pole_code === 'CDG' ? 'SPORT' : (store.currentUser.pole_code || 'SPORT');
        const activeType = this.activePoleAnnexeType || 'HORS_CADRE';
        const tpl = store.getPoleAnnexeTemplate(poleCode, activeType);
        this.syncPoleAnnexeInputsToTemplate(tpl);
        if (Array.isArray(tpl.articles_corps)) {
            tpl.articles_corps.splice(idx, 1);
        }
        store.savePoleAnnexeTemplate(poleCode, tpl, activeType);
        this.renderMainView();
        this.toast('Article retiré du corps Hors Cadre.');
    },

    handleAddPoleAnnexeClause() {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser.pole_code === 'CDG' ? 'SPORT' : (store.currentUser.pole_code || 'SPORT');
        const activeType = this.activePoleAnnexeType || 'COM_OBJECTIFS';
        const tpl = store.getPoleAnnexeTemplate(poleCode, activeType);
        this.syncPoleAnnexeInputsToTemplate(tpl);
        tpl.clauses.push({
            titre: `Article ${tpl.clauses.length + 1} — Nouvel engagement opérationnel`,
            texte: 'Précisez ici les modalités techniques, calendaires ou qualitatives attendues par le service...'
        });
        store.savePoleAnnexeTemplate(poleCode, tpl, activeType);
        this.renderMainView();
        this.toast('Nouvel article ajouté à l\'Annexe 1 !');
    },

    handleRemovePoleAnnexeClause(idx) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser.pole_code === 'CDG' ? 'SPORT' : (store.currentUser.pole_code || 'SPORT');
        const activeType = this.activePoleAnnexeType || 'COM_OBJECTIFS';
        const tpl = store.getPoleAnnexeTemplate(poleCode, activeType);
        this.syncPoleAnnexeInputsToTemplate(tpl);
        tpl.clauses.splice(idx, 1);
        store.savePoleAnnexeTemplate(poleCode, tpl, activeType);
        this.renderMainView();
        this.toast('Clause supprimée de l\'Annexe 1.');
    },

    syncPoleAnnexeInputsToTemplate(tpl) {
        const titreEl = document.getElementById('pole-annexe-titre');
        const introEl = document.getElementById('pole-annexe-intro');
        if (titreEl) {
            tpl.intitule = titreEl.value.trim();
            tpl.titre_annexe = titreEl.value.trim();
        }
        if (introEl) tpl.introduction = introEl.value.trim();
        (tpl.clauses || []).forEach((cl, idx) => {
            const t = document.getElementById(`pole-annexe-clause-titre-${idx}`);
            const x = document.getElementById(`pole-annexe-clause-texte-${idx}`);
            if (t) cl.titre = t.value.trim();
            if (x) cl.texte = x.value.trim();
        });
        if (Array.isArray(tpl.articles_corps)) {
            tpl.articles_corps.forEach((art, idx) => {
                const t = document.getElementById(`pole-hc-art-titre-${idx}`);
                const c = document.getElementById(`pole-hc-art-contenu-${idx}`);
                art.num = idx + 1;
                if (t) art.titre = t.value.trim();
                if (c) art.contenu = c.value.trim();
            });
        }
    },

    handleSavePoleAnnexeTemplate() {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser.pole_code === 'CDG' ? 'SPORT' : (store.currentUser.pole_code || 'SPORT');
        const activeType = this.activePoleAnnexeType || 'COM_OBJECTIFS';
        const tpl = store.getPoleAnnexeTemplate(poleCode, activeType);
        this.syncPoleAnnexeInputsToTemplate(tpl);
        store.savePoleAnnexeTemplate(poleCode, tpl, activeType);
        this.toast(`Modèle (${activeType}) du Pôle ${poleCode} enregistré avec succès !`);
    },


    // Modale complète de création / édition d'une convention individuelle (parmi les 5 types) pour une association,

        renderPoleFaqMemo(container) {
        const store = window.CCMVR.Store;
        const badges = store.getActionBadgesCount();
        const faqList = window.CCMVR.CONFIG.FAQ_MEMO_POLES || [];

        const faqCardsHtml = faqList.map((item, i) => `
            <div class="card-minimal p-4 space-y-1.5 border-l-4 border-l-blue-600 bg-white">
                <div class="flex flex-wrap items-start justify-between gap-2">
                    <h4 class="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold inline-flex items-center justify-center shrink-0">${i + 1}</span>
                        <span>${item.q}</span>
                    </h4>
                    <span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-extrabold uppercase shrink-0">${item.tag}</span>
                </div>
                <p class="text-[11px] text-slate-600 leading-relaxed pl-7">${item.a}</p>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="space-y-6 max-w-5xl mx-auto">
                <!-- En-tête -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                            <span>Processus Décisionnel & Doctrine CCMVR</span>
                        </div>
                        <h1 class="text-xl font-extrabold text-slate-900">Mémo & Organigramme des Processus d'Instruction</h1>
                        <p class="text-xs text-slate-500 mt-0.5">Schéma décisionnel minimaliste pas-à-pas pour instruire les demandes et appliquer les seuils réglementaires.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="CCMVR.App.toggleMemoView('schema')" id="btn-memo-schema" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs transition">
                            📊 Organigramme Visuel
                        </button>
                        <button onclick="CCMVR.App.toggleMemoView('faq')" id="btn-memo-faq" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition">
                            📖 FAQ Détaillée
                        </button>
                    </div>
                </div>

                <!-- Bandeau Synthèse des Actions Requises -->
                <div class="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                        <div>
                            <div class="text-[10px] text-blue-200 font-semibold uppercase">Dossiers à instruire</div>
                            <div class="text-xs text-white/80 mt-0.5">File active Pôles Métiers</div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full ${(badges.pole_instruction || 0) > 0 ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-white'} font-mono-code text-xs font-extrabold">
                            ${badges.pole_instruction || 0}
                        </span>
                    </div>
                    <div class="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                        <div>
                            <div class="text-[10px] text-blue-200 font-semibold uppercase">Visas ≥ 23 000 €</div>
                            <div class="text-xs text-white/80 mt-0.5">Audit obligatoire CdG</div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full ${(badges.cdg_dashboard || 0) > 0 ? 'bg-indigo-400 text-slate-900' : 'bg-white/20 text-white'} font-mono-code text-xs font-extrabold">
                            ${badges.cdg_dashboard || 0}
                        </span>
                    </div>
                    <div class="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                        <div>
                            <div class="text-[10px] text-blue-200 font-semibold uppercase">Conventions en signature</div>
                            <div class="text-xs text-white/80 mt-0.5">Scan Présidente / SES Asso</div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full ${(badges.asso_conventions || 0) > 0 ? 'bg-emerald-400 text-slate-900' : 'bg-white/20 text-white'} font-mono-code text-xs font-extrabold">
                            ${badges.asso_conventions || 0}
                        </span>
                    </div>
                </div>

                                <!-- VUE 1 : ORGANIGRAMME MINIMALISTE DE DÉCISION (PAR DÉFAUT) -->
                <div id="memo-view-schema" class="space-y-6">
                    <div class="relative p-6 sm:p-10 rounded-3xl bg-slate-50/80 border border-slate-200 shadow-sm max-w-4xl mx-auto overflow-hidden">
                        
                        <!-- Légende épurée en haut -->
                        <div class="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-200/80 text-xs text-slate-500">
                            <span class="font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span> Pipeline Décisionnel des Subventions & Conventions
                            </span>
                            <div class="flex items-center gap-3">
                                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Circuit Allégé (&lt; 23k€)</span>
                                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Circuit Renforcé (≥ 23k€)</span>
                            </div>
                        </div>

                        <!-- 1. Nœud de départ : Dépôt Dossier Association -->
                        <div class="pt-6 flex flex-col items-center">
                            <div class="w-full max-w-md p-4 rounded-2xl bg-white border-2 border-blue-500 shadow-md text-center relative group hover:shadow-lg transition">
                                <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                    Étape 1 • Extranet Association
                                </div>
                                <div class="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-sm mt-1">
                                    <i data-lucide="file-up" class="w-4 h-4 text-blue-600"></i>
                                    <span>Dépôt & Vérification de Complétude</span>
                                </div>
                                <div class="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
                                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">RIB certifié</span>
                                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">Statuts</span>
                                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">Budget équilibré</span>
                                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">CER validé</span>
                                </div>
                                <div class="mt-2 text-[10px] font-mono-code font-bold text-blue-700 bg-blue-50 py-1 px-2.5 rounded-lg inline-block">
                                    Statut initial : DÉPOSÉ
                                </div>
                            </div>

                            <!-- Flèche descendante SVG vers le filtre seuil -->
                            <div class="py-2 flex flex-col items-center text-slate-400">
                                <svg class="w-6 h-8 text-slate-300" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="0" x2="12" y2="24"></line>
                                    <polyline points="6 18 12 24 18 18"></polyline>
                                </svg>
                            </div>

                            <!-- 2. Nœud Décisionnel (Seuil 23 000 €) -->
                            <div class="relative px-5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md text-center max-w-sm border border-indigo-400/30">
                                <div class="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">Aiguillage Légal (Décret 2001-495)</div>
                                <div class="text-xs font-black text-white mt-0.5 flex items-center justify-center gap-1.5">
                                    <i data-lucide="scale" class="w-4 h-4 text-amber-400"></i>
                                    <span>Cumul Annuel des Aides ≥ 23 000 € ?</span>
                                </div>
                            </div>

                            <!-- Double flèche de bifurcation (SVG Connecteur Gauche / Droite) -->
                            <div class="w-full max-w-2xl px-4 py-2 hidden sm:block">
                                <svg class="w-full h-10 text-slate-300" viewBox="0 0 600 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M 300 0 L 300 15 Q 300 25 285 25 L 165 25 Q 150 25 150 35 L 150 40"></path>
                                    <path d="M 300 0 L 300 15 Q 300 25 315 25 L 435 25 Q 450 25 450 35 L 450 40"></path>
                                </svg>
                            </div>
                        </div>

                        <!-- 3. Bifurcation : Circuit Allégé vs Circuit Renforcé -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-1 sm:mt-0">
                            
                            <!-- BRANCHE GAUCHE : Circuit Allégé (< 23 000 €) -->
                            <div class="flex flex-col items-center">
                                <div class="w-full p-5 rounded-2xl bg-emerald-50/60 border-2 border-emerald-300 shadow-sm space-y-3 relative">
                                    <div class="flex items-center justify-between">
                                        <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                                            Circuit Allégé (&lt; 23 k€)
                                        </span>
                                        <span class="text-xs font-black text-emerald-800 font-mono-code">1 validation</span>
                                    </div>

                                    <div class="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1.5">
                                        <div class="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                                            <div class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
                                            </div>
                                            <span>Instruction Pôle Unique</span>
                                        </div>
                                        <p class="text-[11px] text-slate-500 pl-8">Calcul barème pôle + proposition subvention</p>
                                        <div class="pl-8 pt-1">
                                            <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] inline-flex items-center gap-1 font-mono-code">
                                                ✓ AVIS_POLE_FAVORABLE
                                            </span>
                                        </div>
                                    </div>

                                    <div class="text-[10px] text-emerald-800 text-center font-medium bg-emerald-100/50 rounded-lg py-1">
                                        🚀 Pas de visa préalable Contrôle de Gestion
                                    </div>
                                </div>

                                <!-- Flèche descendante vers convergence -->
                                <div class="py-2 text-emerald-400 hidden sm:block">
                                    <svg class="w-6 h-8 text-emerald-400" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="0" x2="12" y2="24"></line>
                                        <polyline points="6 18 12 24 18 18"></polyline>
                                    </svg>
                                </div>
                            </div>

                            <!-- BRANCHE DROITE : Circuit Renforcé (≥ 23 000 €) -->
                            <div class="flex flex-col items-center">
                                <div class="w-full p-5 rounded-2xl bg-amber-50/60 border-2 border-amber-300 shadow-sm space-y-3 relative">
                                    <div class="flex items-center justify-between">
                                        <span class="px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider">
                                            Circuit Renforcé (≥ 23 k€)
                                        </span>
                                        <span class="text-xs font-black text-amber-900 font-mono-code">Double validation</span>
                                    </div>

                                    <!-- Étape 1 : CDG -->
                                    <div class="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                                                <div class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                                <span>Visa Contrôle de Gestion</span>
                                            </div>
                                            <span class="text-[10px] font-mono-code text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">Audit 360°</span>
                                        </div>
                                        <p class="text-[11px] text-slate-500 pl-8">Ratios M57, trésorerie & dépendance publique</p>
                                        <div class="pl-8 pt-1">
                                            <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px] inline-flex items-center gap-1 font-mono-code">
                                                ✓ VISE_CDG
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Connecteur interne -->
                                    <div class="flex justify-center -my-1 text-amber-400">
                                        <svg class="w-4 h-5 text-amber-500" viewBox="0 0 16 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="8" y1="0" x2="8" y2="15"></line>
                                            <polyline points="4 11 8 15 12 11"></polyline>
                                        </svg>
                                    </div>

                                    <!-- Étape 2 : Pôle -->
                                    <div class="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                                                <div class="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                                <span>Avis Pôle Instructeur</span>
                                            </div>
                                            <span class="text-[10px] font-mono-code text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Barème</span>
                                        </div>
                                        <p class="text-[11px] text-slate-500 pl-8">Vérification technique des critères & objectifs</p>
                                        <div class="pl-8 pt-1">
                                            <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] inline-flex items-center gap-1 font-mono-code">
                                                ✓ AVIS_POLE_FAVORABLE
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Flèche descendante vers convergence -->
                                <div class="py-2 text-amber-400 hidden sm:block">
                                    <svg class="w-6 h-8 text-amber-400" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="0" x2="12" y2="24"></line>
                                        <polyline points="6 18 12 24 18 18"></polyline>
                                    </svg>
                                </div>
                            </div>

                        </div>

                        <!-- Connecteur de convergence SVG vers l'Étape 3 -->
                        <div class="w-full max-w-2xl mx-auto px-4 py-1 hidden sm:block">
                            <svg class="w-full h-8 text-slate-300" viewBox="0 0 600 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M 150 0 L 150 10 Q 150 20 165 20 L 285 20 Q 300 20 300 28 L 300 32"></path>
                                <path d="M 450 0 L 450 10 Q 450 20 435 20 L 315 20 Q 300 20 300 28 L 300 32"></path>
                            </svg>
                        </div>

                        <!-- 4. Nœud de convergence : Commission & Conseil Communautaire -->
                        <div class="flex flex-col items-center mt-2 sm:mt-0">
                            <div class="w-full max-w-lg p-4 rounded-2xl bg-white border-2 border-purple-400 shadow-md text-center space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
                                        Étape 3 • Arbitrage Politique
                                    </span>
                                    <span class="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Élus Communautaires</span>
                                </div>
                                <div class="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-sm">
                                    <i data-lucide="landmark" class="w-4 h-4 text-purple-600"></i>
                                    <span>Séance Commission & Vote du Conseil</span>
                                </div>
                                <div class="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-600">
                                    <span class="px-2 py-0.5 bg-slate-100 rounded">Projection grand écran</span>
                                    <span>→</span>
                                    <span class="px-2 py-0.5 bg-slate-100 rounded">Saisie du montant voté</span>
                                    <span>→</span>
                                    <span class="px-2 py-0.5 bg-purple-100 text-purple-900 font-bold rounded font-mono-code">VOTE_CONSEIL</span>
                                </div>
                            </div>

                            <!-- Flèche descendante SVG vers les signatures -->
                            <div class="py-2 flex flex-col items-center text-slate-400">
                                <svg class="w-6 h-8 text-slate-300" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="0" x2="12" y2="24"></line>
                                    <polyline points="6 18 12 24 18 18"></polyline>
                                </svg>
                            </div>
                        </div>

                        <!-- 5. Nœud final : Édition d'Acte & Double Signature Certifiée -->
                        <div class="w-full max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-3">
                            <div class="flex items-center justify-between border-b border-white/10 pb-2">
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                                    <span class="text-xs font-black uppercase tracking-wider text-emerald-300">Étape 4 & 5 • Formalisation Contractuelle & Signatures</span>
                                </div>
                                <span class="text-[10px] font-mono-code text-indigo-200">pdf-lib + OTP eIDAS</span>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <!-- Signature 1 : Présidente -->
                                <div class="p-3 rounded-xl bg-white/10 border border-white/15 space-y-1">
                                    <div class="flex items-center justify-between text-xs font-bold text-white">
                                        <span class="flex items-center gap-1.5">
                                            <i data-lucide="stamp" class="w-3.5 h-3.5 text-blue-300"></i> 1. Présidente CCMVR
                                        </span>
                                        <span class="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded">Scan découpé p.5</span>
                                    </div>
                                    <p class="text-[10px] text-slate-300">Génération du contrat A4 officiel. Signature manuscrite scannée ou certificat.</p>
                                </div>

                                <!-- Signature 2 : Association -->
                                <div class="p-3 rounded-xl bg-white/10 border border-white/15 space-y-1">
                                    <div class="flex items-center justify-between text-xs font-bold text-white">
                                        <span class="flex items-center gap-1.5">
                                            <i data-lucide="smartphone" class="w-3.5 h-3.5 text-emerald-300"></i> 2. Association (Extranet)
                                        </span>
                                        <span class="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded">Code OTP 6 chiffres</span>
                                    </div>
                                    <p class="text-[10px] text-slate-300">Notification e-mail automatique, lecture acte, signature en 1 clic certifiée eIDAS.</p>
                                </div>
                            </div>

                            <!-- Clôture -->
                            <div class="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                <span class="text-emerald-300 font-bold flex items-center gap-1">
                                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Convention exécutoire & télétransmise en Préfecture
                                </span>
                                <span class="px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] uppercase font-mono-code">
                                    ACTE CLOS & VALIDE
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- VUE 2 : FAQ DÉTAILLÉE (OPTIONNELLE) -->
                <div id="memo-view-faq" class="space-y-3 hidden">
                    <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                        💡 <strong>Consultez ci-dessous les fiches opérationnelles détaillées</strong> pour chaque étape de l'instruction et de la gestion administrative.
                    </div>
                    ${faqCardsHtml}
                </div>
            </div>
        `;

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    },

    toggleMemoView(view) {
        const schemaEl = document.getElementById('memo-view-schema');
        const faqEl = document.getElementById('memo-view-faq');
        const btnSchema = document.getElementById('btn-memo-schema');
        const btnFaq = document.getElementById('btn-memo-faq');
        if (!schemaEl || !faqEl) return;

        if (view === 'faq') {
            schemaEl.classList.add('hidden');
            faqEl.classList.remove('hidden');
            if (btnFaq) btnFaq.className = 'px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs transition';
            if (btnSchema) btnSchema.className = 'px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition';
        } else {
            faqEl.classList.add('hidden');
            schemaEl.classList.remove('hidden');
            if (btnSchema) btnSchema.className = 'px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs transition';
            if (btnFaq) btnFaq.className = 'px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition';
        }
    },

    // ==========================================================================
    // 6quater. REGISTRE TABLEUR DES ASSOCIATIONS (API ENTREPRISE DJEPVA + EXTRANET)
    // ==========================================================================
    assoRegistrySearch: '',

        // ==========================================================================
    // 7. GESTION DYNAMIQUE & FLEXIBLE DES CATÉGORIES / DISPOSITIFS ET VOLETS TOUS PÔLES
    // ==========================================================================

    openEditCategoryModal(categoryId = null) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const cat = categoryId ? store.getPoleCategory(poleCode, categoryId) : null;
        const isNew = !cat;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8 animate-scale-in';
        content.innerHTML = `
            <div class="bg-gradient-to-r from-orange-900 via-slate-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold">
                        <i data-lucide="tag" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">${isNew ? 'Nouveau Dispositif / Catégorie' : 'Modifier le Dispositif'}</h3>
                        <p class="text-[11px] text-orange-200">Paramétrage du programme de subvention pour le pôle ${poleCode}</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <form onsubmit="CCMVR.App.handleSaveCategory(event, '${cat ? cat.id : ''}')" class="p-6 space-y-4 text-xs">
                <div>
                    <label class="block font-bold text-slate-800 mb-1">Nom du dispositif / catégorie *</label>
                    <input type="text" id="cat-nom" required value="${cat ? (cat.nom || '').replace(/"/g, '&quot;') : ''}" placeholder="Ex: Fonctionnement global club, Appel à projet territorial..." class="input-clean font-bold text-xs w-full"/>
                    <p class="text-[10px] text-slate-500 mt-1">Ce libellé apparaîtra dans le menu déroulant proposé aux associations lors de leur dépôt.</p>
                </div>

                <div>
                    <label class="block font-bold text-slate-800 mb-1">Description / Objet du dispositif</label>
                    <textarea id="cat-description" rows="2" class="input-clean text-xs w-full" placeholder="Ex: Soutien au fonctionnement régulier ou projets exceptionnels...">${cat ? (cat.description || '') : ''}</textarea>
                </div>

                <div>
                    <label class="block font-bold text-slate-800 mb-1">Mode de valorisation initial</label>
                    <select id="cat-mode" class="input-clean font-semibold text-xs w-full">
                        <option value="POINTS" ${!cat || cat.mode_calcul === 'POINTS' ? 'selected' : ''}>Système à Points avec Barème (pondération chiffrée)</option>
                        <option value="EUROS" ${cat && cat.mode_calcul === 'EUROS' ? 'selected' : ''}>Forfait direct en Euros (€) ou Pourcentage</option>
                        <option value="SANS_CALCUL" ${cat && cat.mode_calcul === 'SANS_CALCUL' ? 'selected' : ''}>Sans barème automatique (Montant libre / Arbitrage Commission)</option>
                    </select>
                </div>

                <div class="p-4 bg-slate-50 border-t border-slate-200 -mx-6 -mb-6 flex items-center justify-between gap-2">
                    ${!isNew ? `
                        <button type="button" onclick="CCMVR.App.handleDeleteCategory('${cat.id}')" class="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1.5">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer ce dispositif
                        </button>
                    ` : '<div></div>'}
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition">Annuler</button>
                        <button type="submit" class="px-5 py-2 btn-accent font-bold shadow-md flex items-center gap-1.5">
                            <i data-lucide="check" class="w-4 h-4"></i> Enregistrer
                        </button>
                    </div>
                </div>
            </form>
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    handleSaveCategory(e, categoryId = null) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const nom = document.getElementById('cat-nom')?.value?.trim();
        const description = document.getElementById('cat-description')?.value?.trim();
        const modeCalcul = document.getElementById('cat-mode')?.value || 'POINTS';

        if (!nom) return;

        let cat = categoryId ? store.getPoleCategory(poleCode, categoryId) : null;
        if (cat) {
            cat.nom = nom;
            cat.description = description;
            cat.mode_calcul = modeCalcul;
        } else {
            const catId = 'cat_' + Date.now();
            cat = {
                id: catId,
                nom: nom,
                description: description,
                mode_calcul: modeCalcul,
                valeur_point: 5.25,
                forfait_socle: 0,
                volets: [
                    {
                        id: 'volet_1',
                        numero: 1,
                        titre: '1. VOLET GÉNÉRAL',
                        description: 'Critères d’appréciation du dispositif',
                        justificatif_requis: false,
                        criteres: []
                    }
                ]
            };
        }

        store.savePoleCategory(poleCode, cat);
        this.currentPoleCategory = cat.id;
        this.closeModal();
        this.toast(`Dispositif « ${nom} » enregistré avec succès !`, 'success');
        this.renderPoleCriteresConfig();
    },

    handleDeleteCategory(categoryId) {
        if (!categoryId) return;
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const cat = store.getPoleCategory(poleCode, categoryId);
        if (!cat) return;

        if (!confirm(`Confirmez-vous la suppression définitive du dispositif « ${cat.nom} » et de tous ses volets ?`)) return;

        store.deletePoleCategory(poleCode, categoryId);
        this.currentPoleCategory = null;
        this.closeModal();
        this.toast(`Dispositif « ${cat.nom} » supprimé.`, 'info');
        this.renderPoleCriteresConfig();
    },

    selectPoleCategory(categoryId) {
        this.currentPoleCategory = categoryId;
        this.renderPoleCriteresConfig();
    },

    handleSaveSportPointValue() {
        const input = document.getElementById('pole-sport-point-valeur');
        if (!input) return;
        const val = parseFloat(input.value) || 5.25;
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
        if (category) {
            category.valeur_point = val;
            store.savePoleCategory(poleCode, category);
            this.toast(`Valeur du point mise à jour à ${val.toFixed(2)} € pour « ${category.nom} » !`, 'success');
        }
        this.renderPoleCriteresConfig();
    },

    handleToggleSportMode(mode) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
        if (category) {
            category.mode_calcul = mode;
            store.savePoleCategory(poleCode, category);
            this.toast(`Mode de valorisation basculé en : ${mode === 'POINTS' ? 'Système à Points' : (mode === 'EUROS' ? 'Forfait Direct (€)' : 'Sans barème automatique')}`, 'info');
        }
        this.renderPoleCriteresConfig();
    },

    handleResetSportGrid() {
        if (!confirm('Réinitialiser la catégorie Sport aux paramètres officiels par défaut (7 volets, point à 5,25 €) ?')) return;
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const defGrid = window.CCMVR.CONFIG.GRILLES_POLES?.SPORT?.categories?.[0];
        if (defGrid) {
            store.savePoleCategory(poleCode, JSON.parse(JSON.stringify(defGrid)));
        }
        this.toast('Dispositif réinitialisé aux normes officielles CCMVR.', 'info');
        this.renderPoleCriteresConfig();
    },

    openEditCritereModal(voletId, critereCode = null) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
        if (!category) return;
        const volet = (category.volets || []).find(v => v.id === voletId) || (category.volets && category.volets[0]);
        if (!volet) return;

        const crit = critereCode ? (volet.criteres || []).find(c => c.code === critereCode) : null;
        const isNew = !crit;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-8 animate-scale-in';
        content.innerHTML = `
            <div class="bg-gradient-to-r from-orange-900 via-slate-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold">
                        <i data-lucide="${isNew ? 'plus-circle' : 'edit-3'}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">${isNew ? 'Ajouter un Critère' : 'Modifier le Critère'}</h3>
                        <p class="text-[11px] text-orange-200">${category.nom} • ${volet.titre}</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <form onsubmit="CCMVR.App.handleSaveCritere(event, '${volet.id}', '${crit ? crit.code : ''}')" class="p-6 space-y-4 text-xs">
                <div>
                    <label class="block font-bold text-slate-800 mb-1">Intitulé du critère *</label>
                    <input type="text" id="crit-libelle" required value="${crit ? (crit.libelle || '').replace(/"/g, '&quot;') : ''}" placeholder="Ex: Licenciés jeunes, Brevet d'État, Stage..." class="input-clean font-bold text-xs w-full"/>
                </div>

                <div>
                    <label class="block font-bold text-slate-800 mb-1">Aide à la saisie (pour l'association)</label>
                    <input type="text" id="crit-aide" value="${crit ? (crit.aide || '').replace(/"/g, '&quot;') : ''}" placeholder="Ex: 6 points / licencié compétition né entre 2008 et 2018" class="input-clean text-xs w-full"/>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-800 mb-1">Format de saisie de l'association *</label>
                        <select id="crit-type" onchange="CCMVR.App.onCritereTypeChange()" class="input-clean font-semibold text-xs w-full">
                            <option value="number" ${!crit || crit.type === 'number' ? 'selected' : ''}>Nombre / Quantité</option>
                            <option value="boolean" ${crit && crit.type === 'boolean' ? 'selected' : ''}>Case Oui / Non</option>
                            <option value="currency" ${crit && crit.type === 'currency' ? 'selected' : ''}>Montant en € (ex: Dépense TTC)</option>
                            <option value="text" ${crit && crit.type === 'text' ? 'selected' : ''}>Texte libre (qualitatif)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-800 mb-1">Mode de valorisation financière *</label>
                        <select id="crit-mode-val" onchange="CCMVR.App.onCritereModeValChange()" class="input-clean font-semibold text-xs w-full">
                            <option value="POINTS" ${!crit || crit.mode_val === 'POINTS' || !crit.mode_val ? 'selected' : ''}>Attribution de Points (selon valeur du pt)</option>
                            <option value="POURCENTAGE_DIRECT" ${crit && crit.mode_val === 'POURCENTAGE_DIRECT' ? 'selected' : ''}>Pourcentage direct sur le montant (€)</option>
                            <option value="EUROS_DIRECT" ${crit && crit.mode_val === 'EUROS_DIRECT' ? 'selected' : ''}>Forfait direct en Euros (€)</option>
                        </select>
                    </div>
                </div>

                <div id="crit-box-points" class="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2">
                    <label class="block font-extrabold text-orange-950">Nombre de points attribués par unité :</label>
                    <div class="flex items-center gap-2">
                        <input type="number" id="crit-points" step="0.5" min="0" value="${crit && crit.points !== undefined ? crit.points : 10}" class="input-clean font-mono-code text-sm font-extrabold text-orange-700 w-28 bg-white"/>
                        <span class="text-xs font-bold text-orange-900">point(s) par unité</span>
                    </div>
                </div>

                <div id="crit-box-pourcentage" class="hidden p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-extrabold text-indigo-950 mb-1">Taux pris en charge (%) :</label>
                            <input type="number" id="crit-taux" min="1" max="100" value="${crit && crit.taux ? Math.round(crit.taux * 100) : 25}" class="input-clean font-mono-code text-sm font-extrabold text-indigo-700 w-full bg-white"/>
                        </div>
                        <div>
                            <label class="block font-extrabold text-indigo-950 mb-1">Plafond max (€) :</label>
                            <input type="number" id="crit-plafond-montant" min="0" placeholder="Optionnel" value="${crit && crit.plafond_montant ? crit.plafond_montant : ''}" class="input-clean font-mono-code text-sm font-bold text-indigo-700 w-full bg-white"/>
                        </div>
                    </div>
                </div>

                <div id="crit-box-euros" class="hidden p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                    <label class="block font-extrabold text-emerald-950">Montant forfaitaire fixe (€) :</label>
                    <input type="number" id="crit-montant-fixe" min="0" placeholder="Ex: 500" value="${crit && crit.montant_fixe ? crit.montant_fixe : ''}" class="input-clean font-mono-code text-sm font-extrabold text-emerald-700 w-36 bg-white"/>
                </div>

                <div class="grid grid-cols-3 gap-3 pt-1">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Plafond d'unités</label>
                        <input type="number" id="crit-plafond" min="0" placeholder="Ex: 25" value="${crit && crit.plafond ? crit.plafond : ''}" class="input-clean text-xs w-full"/>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Plancher minimum</label>
                        <input type="number" id="crit-plancher" min="0" placeholder="Ex: 2" value="${crit && crit.plancher ? crit.plancher : ''}" class="input-clean text-xs w-full"/>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Unité affichée</label>
                        <input type="text" id="crit-unite" placeholder="Ex: licencié(s), heure(s)..." value="${crit && crit.unite ? crit.unite : ''}" class="input-clean text-xs w-full"/>
                    </div>
                </div>

                <div class="p-4 bg-slate-50 border-t border-slate-200 -mx-6 -mb-6 flex items-center justify-between gap-2">
                    ${!isNew ? `
                        <button type="button" onclick="CCMVR.App.handleDeleteCritere('${volet.id}', '${crit.code}')" class="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1.5">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer
                        </button>
                    ` : '<div></div>'}
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition">Annuler</button>
                        <button type="submit" class="px-5 py-2 btn-accent font-bold shadow-md flex items-center gap-1.5">
                            <i data-lucide="check" class="w-4 h-4"></i> Enregistrer
                        </button>
                    </div>
                </div>
            </form>
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
        this.onCritereModeValChange();
    },

    onCritereModeValChange() {
        const mode = document.getElementById('crit-mode-val')?.value;
        const boxPts = document.getElementById('crit-box-points');
        const boxPct = document.getElementById('crit-box-pourcentage');
        const boxEur = document.getElementById('crit-box-euros');

        if (boxPts) boxPts.classList.toggle('hidden', mode !== 'POINTS');
        if (boxPct) boxPct.classList.toggle('hidden', mode !== 'POURCENTAGE_DIRECT');
        if (boxEur) boxEur.classList.toggle('hidden', mode !== 'EUROS_DIRECT');
    },

    onCritereTypeChange() {
        const type = document.getElementById('crit-type')?.value;
        const modeSelect = document.getElementById('crit-mode-val');
        if (type === 'currency' && modeSelect) {
            modeSelect.value = 'POURCENTAGE_DIRECT';
            this.onCritereModeValChange();
        }
    },

    handleSaveCritere(e, voletId, critereCode) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
        if (!category) return;
        const volet = (category.volets || []).find(v => v.id === voletId);
        if (!volet) return;

        const libelle = document.getElementById('crit-libelle')?.value?.trim();
        const aide = document.getElementById('crit-aide')?.value?.trim();
        const type = document.getElementById('crit-type')?.value || 'number';
        const mode_val = document.getElementById('crit-mode-val')?.value || 'POINTS';

        const points = parseFloat(document.getElementById('crit-points')?.value) || 0;
        const taux = (parseFloat(document.getElementById('crit-taux')?.value) || 25) / 100;
        const plafond_montant = parseFloat(document.getElementById('crit-plafond-montant')?.value) || null;
        const montant_fixe = parseFloat(document.getElementById('crit-montant-fixe')?.value) || null;

        const plafond = parseFloat(document.getElementById('crit-plafond')?.value) || null;
        const plancher = parseFloat(document.getElementById('crit-plancher')?.value) || null;
        const unite = document.getElementById('crit-unite')?.value?.trim() || '';

        const code = critereCode || ('crit_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4));

        volet.criteres = volet.criteres || [];
        const existingIdx = volet.criteres.findIndex(c => c.code === code);

        const newCrit = {
            code,
            libelle,
            aide,
            type,
            mode_val,
            points: mode_val === 'POINTS' ? points : undefined,
            taux: mode_val === 'POURCENTAGE_DIRECT' ? taux : undefined,
            plafond_montant: mode_val === 'POURCENTAGE_DIRECT' ? plafond_montant : undefined,
            montant_fixe: mode_val === 'EUROS_DIRECT' ? montant_fixe : undefined,
            plafond: plafond !== null ? plafond : undefined,
            plancher: plancher !== null ? plancher : undefined,
            unite: unite || undefined
        };

        if (existingIdx >= 0) {
            volet.criteres[existingIdx] = { ...volet.criteres[existingIdx], ...newCrit };
        } else {
            volet.criteres.push(newCrit);
        }

        store.savePoleCategory(poleCode, category);
        this.closeModal();
        this.toast(`Critère « ${libelle} » sauvegardé avec succès !`, 'success');
        this.renderPoleCriteresConfig();
    },

    handleDeleteCritere(arg1, arg2) {
        if (arg2) {
            // Appel 2 paramètres (voletId, critereCode) pour grille multi-volets
            const voletId = arg1;
            const critereCode = arg2;
            const store = window.CCMVR.Store;
            const poleCode = store.currentUser?.pole_code || 'SPORT';
            const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
            if (!category) return;
            const volet = (category.volets || []).find(v => v.id === voletId);
            if (!volet) return;

            const crit = (volet.criteres || []).find(c => c.code === critereCode);
            const name = crit ? crit.libelle : critereCode;

            if (!confirm(`Confirmez-vous la suppression du critère « ${name} » ?`)) return;

            volet.criteres = (volet.criteres || []).filter(c => c.code !== critereCode);
            store.savePoleCategory(poleCode, category);
            this.closeModal();
            this.toast(`Critère supprimé du dispositif.`, 'info');
            this.renderPoleCriteresConfig();
        } else {
            // Appel 1 paramètre (critId) pour barème visuel simple
            const critId = arg1;
            window.CCMVR.Store.deleteCritereMetier(critId)
                .then(() => {
                    this.renderMainView();
                    this.toast('Critère supprimé du barème.');
                })
                .catch(err => {
                    this.toast('Erreur suppression : ' + err.message, 'error');
                });
        }
    },

    openEditVoletModal(voletId = null) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
        if (!category) return;
        const volet = voletId ? (category.volets || []).find(v => v.id === voletId) : null;
        const isNew = !volet;
        const nextNum = (category.volets || []).length + 1;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8 animate-scale-in';
        content.innerHTML = `
            <div class="bg-gradient-to-r from-orange-900 via-slate-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold">
                        <i data-lucide="layers" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">${isNew ? 'Créer un nouveau Volet' : 'Modifier le Volet ' + volet.numero}</h3>
                        <p class="text-[11px] text-orange-200">${category.nom} • Organisation des critères</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <form onsubmit="CCMVR.App.handleSaveVolet(event, '${volet ? volet.id : ''}')" class="p-6 space-y-4 text-xs">
                <div>
                    <label class="block font-bold text-slate-800 mb-1">Titre du volet *</label>
                    <input type="text" id="volet-titre" required value="${volet ? (volet.titre || '').replace(/"/g, '&quot;') : (nextNum + '. NOUVEAU VOLET')}" placeholder="Ex: ${nextNum}. ANIMATION LOCALE" class="input-clean font-bold text-xs w-full"/>
                </div>

                <div>
                    <label class="block font-bold text-slate-800 mb-1">Description / Objectif</label>
                    <textarea id="volet-description" rows="2" class="input-clean text-xs w-full" placeholder="Consignes générales pour ce volet">${volet ? (volet.description || '') : ''}</textarea>
                </div>

                <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <label class="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
                        <input type="checkbox" id="volet-justif-requis" ${volet && volet.justificatif_requis ? 'checked' : ''} onchange="document.getElementById('volet-justif-box').classList.toggle('hidden', !this.checked)" class="rounded text-orange-600 focus:ring-orange-500"/>
                        <span>Exiger un justificatif obligatoire pour ce volet</span>
                    </label>
                    <div id="volet-justif-box" class="${volet && volet.justificatif_requis ? '' : 'hidden'} pt-2">
                        <label class="block text-[11px] font-bold text-amber-900 mb-1">Nom / Nature du justificatif attendu :</label>
                        <input type="text" id="volet-justif-label" value="${volet ? (volet.justificatif_label || '') : 'Attestation ou facture justificative'}" placeholder="Ex: Facture certifiée ou attestation fédérale" class="input-clean text-xs w-full"/>
                    </div>
                </div>

                <div class="p-4 bg-slate-50 border-t border-slate-200 -mx-6 -mb-6 flex items-center justify-between gap-2">
                    ${!isNew && (category.volets || []).length > 1 ? `
                        <button type="button" onclick="CCMVR.App.handleDeleteVolet('${volet.id}')" class="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1.5">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer ce volet
                        </button>
                    ` : '<div></div>'}
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition">Annuler</button>
                        <button type="submit" class="px-5 py-2 btn-accent font-bold shadow-md flex items-center gap-1.5">
                            <i data-lucide="check" class="w-4 h-4"></i> Enregistrer
                        </button>
                    </div>
                </div>
            </form>
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    handleSaveVolet(e, voletId) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
        if (!category) return;
        category.volets = category.volets || [];

        const titre = document.getElementById('volet-titre')?.value?.trim();
        const description = document.getElementById('volet-description')?.value?.trim();
        const justifRequis = document.getElementById('volet-justif-requis')?.checked === true;
        const justifLabel = document.getElementById('volet-justif-label')?.value?.trim() || 'Justificatif requis';

        if (voletId) {
            const v = category.volets.find(x => x.id === voletId);
            if (v) {
                v.titre = titre;
                v.description = description;
                v.justificatif_requis = justifRequis;
                v.justificatif_label = justifLabel;
            }
        } else {
            const newId = 'volet_' + (category.volets.length + 1);
            category.volets.push({
                id: newId,
                numero: category.volets.length + 1,
                titre: titre,
                description: description,
                justificatif_requis: justifRequis,
                justificatif_label: justifLabel,
                criteres: []
            });
        }

        store.savePoleCategory(poleCode, category);
        this.closeModal();
        this.toast(`Volet « ${titre} » enregistré avec succès !`, 'success');
        this.renderPoleCriteresConfig();
    },

    handleDeleteVolet(voletId) {
        const store = window.CCMVR.Store;
        const poleCode = store.currentUser?.pole_code || 'SPORT';
        const category = store.getPoleCategory(poleCode, this.currentPoleCategory);
        if (!category) return;
        const volet = (category.volets || []).find(v => v.id === voletId);
        if (!volet) return;

        if (!confirm(`Confirmez-vous la suppression complète du volet « ${volet.titre} » et de tous ses critères ?`)) return;

        category.volets = (category.volets || []).filter(v => v.id !== voletId);
        category.volets.forEach((v, idx) => {
            v.numero = idx + 1;
        });

        store.savePoleCategory(poleCode, category);
        this.closeModal();
        this.toast(`Volet supprimé.`, 'info');
        this.renderPoleCriteresConfig();
    },
};
