// ==============================================================================
// MODULE CCMVR: MODALES CONVENTIONS, AVENANTS, SCANS PDF-LIB & SIGNATURE eIDAS
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.Modules.ModalsConvention = {

    modalDraftSocleArticles: [],
    modalDraftAnnexeClauses: [],

    openCreateOrEditConventionModal(convId = null, prefillStructId = null, prefillDossierId = null, prefillType = null) {
        const store = window.CCMVR.Store;
        const cfg = window.CCMVR.CONFIG;
        const existingConv = convId ? store.getEnrichedConventions().find(c => c.id === convId) : null;

        const normType = existingConv
            ? existingConv.normType
            : (prefillType || this.activePoleAnnexeType || 'COM_OBJECTIFS');
        const typeInfo = cfg.TYPES_CONVENTIONS[normType] || cfg.TYPES_CONVENTIONS.COM_OBJECTIFS;
        const isHorsCadre = normType === 'HORS_CADRE';

        const defaultPoleCode = store.currentUser.pole_code === 'CDG' ? 'SPORT' : (store.currentUser.pole_code || 'SPORT');
        const currentPoleObj = existingConv?.pole?.id
            ? existingConv.pole
            : (store.state.poles.find(p => p.code === defaultPoleCode) || store.state.poles[0]);

        const tpl = store.getPoleAnnexeTemplate(currentPoleObj?.code || 'SPORT', normType);
        const customMeta = existingConv ? store.getConventionCustomMeta(existingConv) : {};

        const activeClauses = (Array.isArray(customMeta.annexe_clauses) && customMeta.annexe_clauses.length > 0)
            ? customMeta.annexe_clauses
            : (tpl.clauses || []);
        const activeBodyArticles = isHorsCadre
            ? ((Array.isArray(customMeta.articles_corps) && customMeta.articles_corps.length > 0)
                ? customMeta.articles_corps
                : (tpl.articles_corps || cfg.ANNEXES_PAR_TYPE_DEFAUT?.HORS_CADRE?.articles_corps || []))
            : [];

        this._editingConvClauses = JSON.parse(JSON.stringify(activeClauses));
        this._editingConvBodyArticles = JSON.parse(JSON.stringify(activeBodyArticles));
        this._editingConvId = existingConv ? existingConv.id : null;

        const selectedStructId = existingConv?.structure_id || prefillStructId || store.activeStructureId || store.state.structures[0]?.id || '';
        const selectedDossierId = existingConv?.dossier_id || prefillDossierId || '';
        const annee = store.activeMillesime;
        const dateDebut = existingConv?.date_debut || `${annee}-01-01`;
        const dateFin = existingConv?.date_fin || (normType === 'HORS_CADRE' ? `${annee}-12-31` : `${annee + 2}-12-31`);
        const intituleVal = existingConv?.intitule_specifique || customMeta.intitule || typeInfo.label;
        const prescriptionsVal = customMeta.prescriptions_specifiques || '';

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        this.renderCreateOrEditConventionModalInner({
            convId: this._editingConvId,
            normType,
            selectedStructId,
            selectedDossierId,
            selectedPoleId: currentPoleObj?.id || store.state.poles[0]?.id,
            dateDebut,
            dateFin,
            intituleVal,
            prescriptionsVal
        });
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    },

    renderCreateOrEditConventionModalInner(state) {
        const store = window.CCMVR.Store;
        const cfg = window.CCMVR.CONFIG;
        const content = document.getElementById('universal-modal-content');
        if (!content) return;

        const typeInfo = cfg.TYPES_CONVENTIONS[state.normType] || cfg.TYPES_CONVENTIONS.COM_OBJECTIFS;
        const isHorsCadre = state.normType === 'HORS_CADRE';
        const dossiersForStruct = (store.state.dossiers_subventions || []).filter(d => d.structure_id === state.selectedStructId);

        content.innerHTML = `
            <div class="p-6 space-y-5 max-h-[88vh] overflow-y-auto">
                <div class="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div>
                        <span class="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${typeInfo.badgeClass || 'bg-blue-100 text-blue-800'}">
                            ${state.convId ? 'Édition de Convention' : 'Nouvelle Convention Associative'} • ${typeInfo.shortLabel}
                        </span>
                        <h2 class="text-lg font-extrabold text-slate-900 mt-1">${typeInfo.label}</h2>
                        <p class="text-xs text-slate-500">
                            ${isHorsCadre
                                ? '⚡ Convention Ponctuelle Hors Socle Commun : vous avez la main complète sur le corps des articles et l\'annexe. Soumise au visa du Contrôle de Gestion.'
                                : '🔒 Socle Commun de 12 articles verrouillé (Contrôle de Gestion) + ✏️ Annexe 1 spécifique modifiable ci-dessous par votre service.'}
                        </p>
                    </div>
                    <button type="button" onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
                </div>

                <form onsubmit="CCMVR.App.handleSaveCustomConventionModal(event)" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">1. Type de Convention *</label>
                            <select id="conv-modal-type" onchange="CCMVR.App.onConvModalTypeOrStructChange()" class="input-clean font-extrabold text-blue-900">
                                ${Object.values(cfg.TYPES_CONVENTIONS).map(t => `
                                    <option value="${t.code}" ${t.code === state.normType ? 'selected' : ''}>${t.label}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">2. Association bénéficiaire *</label>
                            <select id="conv-modal-struct" onchange="CCMVR.App.onConvModalTypeOrStructChange()" class="input-clean font-bold">
                                ${store.state.structures.map(s => `
                                    <option value="${s.id}" ${s.id === state.selectedStructId ? 'selected' : ''}>${s.nom_officiel} (SIREN ${(s.siret || '').slice(0, 9)})</option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">3. Pôle / Service gestionnaire *</label>
                            <select id="conv-modal-pole" class="input-clean font-semibold">
                                ${store.state.poles.map(p => `
                                    <option value="${p.id}" ${p.id === state.selectedPoleId ? 'selected' : ''}>${p.libelle} (${p.code})</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div class="sm:col-span-2">
                            <label class="block font-bold text-slate-700 mb-1">Intitulé / Objet précis de cette convention *</label>
                            <input type="text" id="conv-modal-intitule" required value="${(state.intituleVal || '').replace(/"/g, '&quot;')}" placeholder="Ex: Mise à disposition du gymnase intercommunal / Prêt minibus saison 2026..." class="input-clean font-bold"/>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Date de début *</label>
                            <input type="date" id="conv-modal-debut" required value="${state.dateDebut}" class="input-clean"/>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Date de fin ferme *</label>
                            <input type="date" id="conv-modal-fin" required value="${state.dateFin}" class="input-clean"/>
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-600 mb-1">Dossier de subvention rattaché (facultatif — laissez vide pour une convention autonome Minibus, Locaux, Personnel ou Hors Cadre)</label>
                        <select id="conv-modal-dossier" class="input-clean">
                            <option value="">— Convention autonome (sans dossier de subvention financière) —</option>
                            ${dossiersForStruct.map(d => `
                                <option value="${d.id}" ${d.id === state.selectedDossierId ? 'selected' : ''}>Dossier #${d.code_hex} — ${d.intitule_projet} (${window.CCMVR.FinanceEngine.formatCurrency(d.montant_demande)})</option>
                            `).join('')}
                        </select>
                    </div>

                    ${isHorsCadre ? `
                        <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="text-xs font-extrabold text-rose-900 uppercase">Corps de la Convention Hors Cadre (Sans Socle Commun)</span>
                                    <p class="text-[11px] text-rose-700">Rédigez librement les articles de cette convention ponctuelle. Le Contrôle de Gestion devra la viser avant signature.</p>
                                </div>
                                <button type="button" onclick="CCMVR.App.addClauseInConvModal('BODY')" class="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-bold">
                                    + Ajouter un Article
                                </button>
                            </div>
                            <div class="space-y-2.5">
                                ${(this._editingConvBodyArticles || []).map((art, idx) => `
                                    <div class="p-3 bg-white rounded-lg border border-rose-200 space-y-1.5">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="font-extrabold text-rose-800 text-[11px]">Article ${idx + 1}</span>
                                            <input type="text" data-modal-body-titre="${idx}" value="${(art.titre || '').replace(/"/g, '&quot;')}" class="input-clean font-bold py-1 text-xs flex-1"/>
                                            <button type="button" onclick="CCMVR.App.removeClauseInConvModal('BODY', ${idx})" class="text-rose-600 hover:text-rose-800 font-bold px-2">✕</button>
                                        </div>
                                        <textarea data-modal-body-contenu="${idx}" rows="2" class="input-clean text-xs">${art.contenu || ''}</textarea>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Clauses de l'Annexe 1 modifiables pour cette convention -->
                    <div class="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="text-xs font-extrabold text-blue-950 uppercase">Annexe 1 — Clauses & Dispositions Spécifiques du Service</span>
                                <p class="text-[11px] text-slate-600">Modifiez ou complétez les clauses de l'Annexe 1 propres à cette convention.</p>
                            </div>
                            <button type="button" onclick="CCMVR.App.addClauseInConvModal('ANNEXE')" class="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold">
                                + Ajouter une Clause d'Annexe
                            </button>
                        </div>
                        <div class="space-y-2.5">
                            ${(this._editingConvClauses || []).map((cl, idx) => `
                                <div class="p-3 bg-white rounded-lg border border-blue-200 space-y-1.5">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="font-extrabold text-blue-800 text-[11px]">Clause ${idx + 1}</span>
                                        <input type="text" data-modal-clause-titre="${idx}" value="${(cl.titre || '').replace(/"/g, '&quot;')}" class="input-clean font-bold py-1 text-xs flex-1"/>
                                        <button type="button" onclick="CCMVR.App.removeClauseInConvModal('ANNEXE', ${idx})" class="text-rose-600 hover:text-rose-800 font-bold px-2">✕</button>
                                    </div>
                                    <textarea data-modal-clause-texte="${idx}" rows="2" class="input-clean text-xs">${cl.texte || ''}</textarea>
                                </div>
                            `).join('')}
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Prescriptions particulières additionnelles (créneaux, immatriculation minibus, salle, horaires, agents...)</label>
                            <textarea id="conv-modal-prescriptions" rows="2" class="input-clean bg-white" placeholder="Ex: Créneaux attribués : Mardi et Jeudi de 18h à 21h — Gymnase intercommunal / Véhicule Renault Trafic...">${state.prescriptionsVal || ''}</textarea>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-3 border-t border-slate-200">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold">
                            Annuler
                        </button>
                        <div class="flex items-center gap-2">
                            <button type="submit" class="px-5 py-2.5 btn-accent text-xs font-extrabold shadow-md">
                                ✓ Enregistrer la Convention & Ouvrir l'Aperçu Officiel PDF
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
    },

    syncConvModalDraftArrays() {
        if (Array.isArray(this._editingConvClauses)) {
            this._editingConvClauses.forEach((cl, idx) => {
                const t = document.querySelector(`[data-modal-clause-titre="${idx}"]`);
                const x = document.querySelector(`[data-modal-clause-texte="${idx}"]`);
                if (t) cl.titre = t.value.trim();
                if (x) cl.texte = x.value.trim();
            });
        }
        if (Array.isArray(this._editingConvBodyArticles)) {
            this._editingConvBodyArticles.forEach((art, idx) => {
                const t = document.querySelector(`[data-modal-body-titre="${idx}"]`);
                const c = document.querySelector(`[data-modal-body-contenu="${idx}"]`);
                art.num = idx + 1;
                if (t) art.titre = t.value.trim();
                if (c) art.contenu = c.value.trim();
            });
        }
    },

    onConvModalTypeOrStructChange() {
        const store = window.CCMVR.Store;
        const cfg = window.CCMVR.CONFIG;
        const newType = document.getElementById('conv-modal-type')?.value || 'COM_OBJECTIFS';
        const newStructId = document.getElementById('conv-modal-struct')?.value || '';
        const newPoleId = document.getElementById('conv-modal-pole')?.value || '';
        const poleObj = store.state.poles.find(p => p.id === newPoleId) || store.state.poles[0];
        const tpl = store.getPoleAnnexeTemplate(poleObj?.code || 'SPORT', newType);

        this._editingConvClauses = JSON.parse(JSON.stringify(tpl.clauses || []));
        if (newType === 'HORS_CADRE') {
            this._editingConvBodyArticles = JSON.parse(JSON.stringify(tpl.articles_corps || cfg.ANNEXES_PAR_TYPE_DEFAUT?.HORS_CADRE?.articles_corps || []));
        } else {
            this._editingConvBodyArticles = [];
        }

        const typeInfo = cfg.TYPES_CONVENTIONS[newType] || cfg.TYPES_CONVENTIONS.COM_OBJECTIFS;
        this.renderCreateOrEditConventionModalInner({
            convId: this._editingConvId,
            normType: newType,
            selectedStructId: newStructId,
            selectedDossierId: '',
            selectedPoleId: newPoleId,
            dateDebut: document.getElementById('conv-modal-debut')?.value || `${store.activeMillesime}-01-01`,
            dateFin: document.getElementById('conv-modal-fin')?.value || `${store.activeMillesime}-12-31`,
            intituleVal: typeInfo.label,
            prescriptionsVal: document.getElementById('conv-modal-prescriptions')?.value || ''
        });
    },

    addClauseInConvModal(target) {
        this.syncConvModalDraftArrays();
        if (target === 'BODY') {
            this._editingConvBodyArticles.push({
                num: this._editingConvBodyArticles.length + 1,
                titre: 'Nouvel article contractuel',
                contenu: 'Précisez les dispositions convenues entre la CCMVR et l\'Association...'
            });
        } else {
            this._editingConvClauses.push({
                titre: `Clause ${this._editingConvClauses.length + 1} — Disposition spécifique`,
                texte: 'Précisez les modalités opérationnelles...'
            });
        }
        this.renderCreateOrEditConventionModalInner({
            convId: this._editingConvId,
            normType: document.getElementById('conv-modal-type')?.value || 'COM_OBJECTIFS',
            selectedStructId: document.getElementById('conv-modal-struct')?.value || '',
            selectedDossierId: document.getElementById('conv-modal-dossier')?.value || '',
            selectedPoleId: document.getElementById('conv-modal-pole')?.value || '',
            dateDebut: document.getElementById('conv-modal-debut')?.value || '',
            dateFin: document.getElementById('conv-modal-fin')?.value || '',
            intituleVal: document.getElementById('conv-modal-intitule')?.value || '',
            prescriptionsVal: document.getElementById('conv-modal-prescriptions')?.value || ''
        });
    },

    removeClauseInConvModal(target, idx) {
        this.syncConvModalDraftArrays();
        if (target === 'BODY') {
            this._editingConvBodyArticles.splice(idx, 1);
        } else {
            this._editingConvClauses.splice(idx, 1);
        }
        this.renderCreateOrEditConventionModalInner({
            convId: this._editingConvId,
            normType: document.getElementById('conv-modal-type')?.value || 'COM_OBJECTIFS',
            selectedStructId: document.getElementById('conv-modal-struct')?.value || '',
            selectedDossierId: document.getElementById('conv-modal-dossier')?.value || '',
            selectedPoleId: document.getElementById('conv-modal-pole')?.value || '',
            dateDebut: document.getElementById('conv-modal-debut')?.value || '',
            dateFin: document.getElementById('conv-modal-fin')?.value || '',
            intituleVal: document.getElementById('conv-modal-intitule')?.value || '',
            prescriptionsVal: document.getElementById('conv-modal-prescriptions')?.value || ''
        });
    },

    async handleSaveCustomConventionModal(e) {
        e.preventDefault();
        this.syncConvModalDraftArrays();
        const type_convention = document.getElementById('conv-modal-type')?.value || 'COM_OBJECTIFS';
        const structure_id = document.getElementById('conv-modal-struct')?.value;
        const pole_id = document.getElementById('conv-modal-pole')?.value;
        const dossier_id = document.getElementById('conv-modal-dossier')?.value || null;
        const intitule = document.getElementById('conv-modal-intitule')?.value?.trim();
        const date_debut = document.getElementById('conv-modal-debut')?.value;
        const date_fin = document.getElementById('conv-modal-fin')?.value;
        const prescriptions_specifiques = document.getElementById('conv-modal-prescriptions')?.value?.trim() || '';

        this.showLoader(true);
        try {
            const savedConv = await window.CCMVR.Store.createOrUpdateCustomConvention({
                id: this._editingConvId,
                structure_id,
                pole_id,
                dossier_id,
                type_convention,
                intitule,
                date_debut,
                date_fin,
                annexe_clauses: this._editingConvClauses,
                articles_corps: type_convention === 'HORS_CADRE' ? this._editingConvBodyArticles : null,
                prescriptions_specifiques
            });
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
            this.openConventionPreviewModal(savedConv.dossier_id || '', savedConv.id);
            this.toast(type_convention === 'HORS_CADRE' && window.CCMVR.Store.currentUser.role !== 'admin'
                ? 'Convention Hors Cadre enregistrée et transmise au Contrôle de Gestion pour Visa !'
                : 'Convention enregistrée avec succès !');
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    // ==========================================================================
    // CRÉATION & GESTION DYNAMIQUE DES AVENANTS MODIFICATEURS
    // ==========================================================================

    openCreateAvenantModal(parentConvId) {
        const store = window.CCMVR.Store;
        const parentConv = store.getEnrichedConventions().find(c => c.id === parentConvId) ||
                           store.state.conventions.find(c => c.id === parentConvId);
        if (!parentConv) {
            this.toast("Convention d'origine introuvable.", "error");
            return;
        }

        const existingAvenants = store.getAvenantsForConvention(parentConv.id);
        const nextNum = existingAvenants.length + 1;
        const structure = parentConv.structure || store.state.structures.find(s => s.id === parentConv.structure_id) || {};
        const annee = parentConv.annee || store.activeMillesime || 2027;
        const customMeta = parentConv.customMeta || store.getConventionCustomMeta(parentConv);
        const dossier = parentConv.dossier || store.state.dossiers_subventions.find(d => d.id === parentConv.dossier_id);
        const montantInitial = parseFloat(
            parentConv.montant ||
            parentConv.montant_nouveau ||
            parentConv.montant_vote ||
            customMeta.montant_specifique ||
            dossier?.montant_vote ||
            dossier?.montant_propose_pole ||
            dossier?.montant_demande ||
            0
        ) || 0;

        window._currentAvenantDelta = 0;
        // Pré-remplissage avec le modèle type d'articles par défaut
        const defaultArticles = JSON.parse(JSON.stringify(window.CCMVR.CONFIG.AVENANT_MODELE_DEFAUT?.articles || []));
        window._currentAvenantArticles = defaultArticles;
        window._currentAvenantParentId = parentConv.id;
        window._currentAvenantStructureId = structure.id;
        window._currentAvenantAnnee = annee;
        window._currentAvenantMontantInitial = montantInitial;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden my-6';
        this.renderAvenantModalContent(parentConv, structure, nextNum, annee, montantInitial);

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    renderAvenantModalContent(parentConv, structure, nextNum, annee, montantInitial) {
        const content = document.getElementById('universal-modal-content');
        if (!content) return;
        const fin = window.CCMVR.FinanceEngine;
        const store = window.CCMVR.Store;

        const delta = window._currentAvenantDelta !== undefined ? window._currentAvenantDelta : (parseFloat(document.getElementById('av-delta')?.value) || 0);
        const nouveauMontant = montantInitial + delta;
        const cumulAnnuel = store.getCumulAnnuelStructure(structure.id, annee, delta);
        const isOver23k = cumulAnnuel >= 23000;

        content.innerHTML = `
            <div class="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
                <div class="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-mono-code text-xs font-extrabold px-2.5 py-0.5 bg-purple-900 text-purple-100 rounded-lg">#${parentConv.code_hex}-AV${nextNum}</span>
                            <span class="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-900">Avenant Modificateur N° ${nextNum}</span>
                        </div>
                        <h2 class="text-base font-extrabold text-slate-900 mt-1">Éditer et Générer un Avenant Contractuel</h2>
                        <p class="text-xs text-slate-500">Pour <strong>${structure.nom_officiel || 'Association'}</strong> — Rattaché à la Convention d'origine <strong>#${parentConv.code_hex}</strong> (Exercice ${annee})</p>
                    </div>
                    <button onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
                </div>

                <form onsubmit="CCMVR.App.handleSaveAvenant(event, '${parentConv.id}')" class="space-y-5 text-xs">
                    <div>
                        <label class="block font-bold text-slate-800 mb-1">Objet officiel de l'Avenant *</label>
                        <input type="text" id="av-objet" required value="Avenant n° ${nextNum} portant révision de la subvention et des modalités d'exécution" class="input-clean font-bold text-slate-900" placeholder="Ex: Révision du montant financier et ajout de créneaux..." />
                    </div>

                    <!-- CADRE FINANCIER & VÉRIFICATION DU SEUIL DE 23 000 € -->
                    <div class="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="font-extrabold text-purple-950 uppercase text-[11px] tracking-wide">Incidence Financière & Contrôle du Seuil Réglementaire</span>
                            <span class="text-[10px] text-purple-700 font-semibold">Art. L. 1611-4 du CGCT & Loi 2000-321</span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">Montant initial convention</label>
                                <input type="text" readonly value="${fin.formatCurrency(montantInitial)}" class="input-clean bg-white/80 font-mono-code font-bold text-slate-700 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label class="block font-bold text-purple-950 mb-1">Variation apportée (€) *</label>
                                <input type="number" step="100" id="av-delta" required value="${delta}" oninput="window._currentAvenantDelta = parseFloat(this.value)||0; CCMVR.App.recalcAvenantModal()" class="input-clean font-mono-code font-extrabold text-purple-700 bg-white shadow-2xs" placeholder="Ex: 5000 ou -2000"/>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">Nouveau montant consolidé</label>
                                <div id="av-nouveau-montant" class="p-2.5 rounded-xl bg-purple-900 text-white font-mono-code font-extrabold text-xs flex items-center justify-center">
                                    ${fin.formatCurrency(nouveauMontant)}
                                </div>
                            </div>
                        </div>

                        <div id="av-threshold-badge">
                            ${isOver23k ? `
                                <div class="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2 text-xs">
                                    <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
                                    <div>
                                        <strong>⚠️ Seuil légal des 23 000 € atteint (Cumul annuel consolidé : ${fin.formatCurrency(cumulAnnuel)}) :</strong><br/>
                                        En application des règles de la CCMVR, cet avenant sera <strong>automatiquement soumis au visa préalable du Contrôle de Gestion (CdG)</strong> avant signature et transmission à l'association.
                                    </div>
                                </div>
                            ` : `
                                <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs">
                                    <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 shrink-0"></i>
                                    <span><strong>✓ Cumul annuel sous le seuil de 23 000 € (${fin.formatCurrency(cumulAnnuel)}) :</strong> Instruction et mise en signature directes par le Pôle Métier.</span>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- ÉDITEUR D'ARTICLES DE L'AVENANT (MODÈLE TYPE MODIFIABLE) -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div>
                                <h3 class="font-extrabold text-slate-900 text-xs">Articles Modificateurs de l'Avenant (Modèle type)</h3>
                                <p class="text-[11px] text-slate-500">Le Pôle Métier peut personnaliser librement la rédaction des articles selon les besoins.</p>
                            </div>
                            <button type="button" onclick="CCMVR.App.handleAddAvenantModalArticle()" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-2xs">
                                + Ajouter un Article
                            </button>
                        </div>

                        <div id="av-articles-container" class="space-y-3">
                            ${window._currentAvenantArticles.map((art, idx) => `
                                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                    <div class="flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2 flex-1">
                                            <span class="px-2 py-0.5 rounded bg-purple-700 text-white text-[10px] font-extrabold uppercase">Art. ${idx + 1}</span>
                                            <input type="text" id="av-art-titre-${idx}" value="${art.titre || ''}" class="input-clean font-bold text-xs bg-white" placeholder="Titre de l'article..."/>
                                        </div>
                                        <button type="button" onclick="CCMVR.App.handleRemoveAvenantModalArticle(${idx})" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold">
                                            Supprimer
                                        </button>
                                    </div>
                                    <textarea id="av-art-contenu-${idx}" rows="2" class="input-clean text-xs bg-white leading-relaxed" placeholder="Contenu de la disposition contractuelle modifiée...">${art.contenu || ''}</textarea>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-3 border-t border-slate-200">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">
                            Annuler
                        </button>
                        <button type="submit" class="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-xl shadow-md transition flex items-center gap-1.5">
                            ✓ Créer & Enregistrer l'Avenant →
                        </button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    recalcAvenantModal() {
        const fin = window.CCMVR.FinanceEngine;
        const store = window.CCMVR.Store;
        const montantInitial = window._currentAvenantMontantInitial || 0;
        const delta = parseFloat(document.getElementById('av-delta')?.value) || 0;
        const nouveauMontant = montantInitial + delta;
        const structId = window._currentAvenantStructureId;
        const annee = window._currentAvenantAnnee || store.activeMillesime;

        const nouveauMontantEl = document.getElementById('av-nouveau-montant');
        if (nouveauMontantEl) nouveauMontantEl.textContent = fin.formatCurrency(nouveauMontant);

        const cumulAnnuel = store.getCumulAnnuelStructure(structId, annee, delta);
        const isOver23k = cumulAnnuel >= 23000;
        const badgeEl = document.getElementById('av-threshold-badge');

        if (badgeEl) {
            badgeEl.innerHTML = isOver23k ? `
                <div class="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2 text-xs">
                    <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
                    <div>
                        <strong>⚠️ Seuil légal des 23 000 € atteint (Cumul annuel consolidé : ${fin.formatCurrency(cumulAnnuel)}) :</strong><br/>
                        En application des règles de la CCMVR, cet avenant sera <strong>automatiquement soumis au visa préalable du Contrôle de Gestion (CdG)</strong> avant signature et transmission à l'association.
                    </div>
                </div>
            ` : `
                <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs">
                    <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 shrink-0"></i>
                    <span><strong>✓ Cumul annuel sous le seuil de 23 000 € (${fin.formatCurrency(cumulAnnuel)}) :</strong> Instruction et mise en signature directes par le Pôle Métier.</span>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    syncCurrentAvenantArticlesFromInputs() {
        if (!Array.isArray(window._currentAvenantArticles)) return;
        window._currentAvenantArticles.forEach((art, idx) => {
            const titreEl = document.getElementById(`av-art-titre-${idx}`);
            const contenuEl = document.getElementById(`av-art-contenu-${idx}`);
            if (titreEl) art.titre = titreEl.value;
            if (contenuEl) art.contenu = contenuEl.value;
        });
    },

    handleAddAvenantModalArticle() {
        this.syncCurrentAvenantArticlesFromInputs();
        const nextIdx = (window._currentAvenantArticles || []).length + 1;
        window._currentAvenantArticles.push({
            num: nextIdx,
            titre: `Article ${nextIdx} — Nouvelle disposition`,
            contenu: 'Préciser les modalités et clauses particulières ajoutées par le service...'
        });
        const parentConv = window.CCMVR.Store.state.conventions.find(c => c.id === window._currentAvenantParentId);
        const structure = parentConv?.structure || window.CCMVR.Store.state.structures.find(s => s.id === window._currentAvenantStructureId) || {};
        const nextNum = (window.CCMVR.Store.getAvenantsForConvention(window._currentAvenantParentId) || []).length + 1;
        this.renderAvenantModalContent(parentConv, structure, nextNum, window._currentAvenantAnnee, window._currentAvenantMontantInitial);
    },

    handleRemoveAvenantModalArticle(idx) {
        this.syncCurrentAvenantArticlesFromInputs();
        if (window._currentAvenantArticles && window._currentAvenantArticles.length > 1) {
            window._currentAvenantArticles.splice(idx, 1);
        } else {
            this.toast('Un avenant doit comporter au moins un article.', 'warning');
            return;
        }
        const parentConv = window.CCMVR.Store.state.conventions.find(c => c.id === window._currentAvenantParentId);
        const structure = parentConv?.structure || window.CCMVR.Store.state.structures.find(s => s.id === window._currentAvenantStructureId) || {};
        const nextNum = (window.CCMVR.Store.getAvenantsForConvention(window._currentAvenantParentId) || []).length + 1;
        this.renderAvenantModalContent(parentConv, structure, nextNum, window._currentAvenantAnnee, window._currentAvenantMontantInitial);
    },

    async handleSaveAvenant(e, parentConvId) {
        e.preventDefault();
        this.syncCurrentAvenantArticlesFromInputs();
        const store = window.CCMVR.Store;
        const objet = document.getElementById('av-objet')?.value?.trim() || "Avenant modificateur";
        const delta = parseFloat(document.getElementById('av-delta')?.value) || 0;
        const montantInitial = window._currentAvenantMontantInitial || 0;
        const nouveauMontant = montantInitial + delta;
        const annee = window._currentAvenantAnnee || store.activeMillesime || 2027;

        try {
            const avenant = await store.createAvenant({
                parent_convention_id: parentConvId,
                objet_avenant: objet,
                montant_initial: montantInitial,
                montant_delta: delta,
                montant_nouveau: nouveauMontant,
                annee: annee,
                articles: window._currentAvenantArticles
            });

            this.closeModal();
            this.renderMainView();

            if (avenant.soumis_visa_cdg && avenant.statut_visa_cdg !== 'VISE_CDG') {
                this.toast(`✓ Avenant n° ${avenant.numero_avenant} (#${avenant.code_hex}) créé ! Seuil des 23 000 € dépassé : dossier soumis au Visa préalable du Contrôle de Gestion.`, 'warning');
            } else {
                this.toast(`✓ Avenant n° ${avenant.numero_avenant} (#${avenant.code_hex}) créé avec succès et prêt pour signature !`, 'success');
            }

            // Ouvre directement l'acte généré pour consultation
            setTimeout(() => {
                this.openConventionPreviewModal(null, avenant.id);
            }, 100);

        } catch (err) {
            console.error('Erreur création avenant:', err);
            this.toast('Erreur création avenant : ' + err.message, 'error');
        }
    },

    async handleVisaCdgAvenant(avenantId) {
        if (!avenantId) return;
        try {
            await window.CCMVR.Store.visaCdgAvenant(avenantId);
            this.toast("✓ Visa de conformité du Contrôle de Gestion apposé sur l'Avenant !");
            this.openConventionPreviewModal(null, avenantId);
            this.renderMainView();
        } catch (err) {
            this.toast("Erreur : " + err.message, "error");
        }
    },

    openConventionPreviewModal(dossierId, conventionId = null) {
        const store = window.CCMVR.Store;
        const d = store.getEnrichedDossiers().find(x => x.id === dossierId) || (conventionId ? null : store.getEnrichedDossiers()[0]);

        if (store.currentUser?.role === 'association') {
            // Guard: association must not see the convention or draft before VOTE_CONSEIL
            if (d && d.statut_workflow !== 'VOTE_CONSEIL') {
                this.toast("La convention officielle sera accessible pour consultation et signature une fois validée en commission et actée par le Conseil communautaire.", "info");
                return;
            }
            // Strict guard: if the convention is not yet transmitted by pole métier AND not signed by Presidente, block association access
            const enrichedConvsCheck = store.getEnrichedConventions();
            const targetConv = conventionId
                ? enrichedConvsCheck.find(c => c.id === conventionId)
                : (d ? enrichedConvsCheck.find(c => c.dossier_id === d.id || c.code_hex === d.code_hex) : null);
            const canAssoAccess = targetConv && (targetConv.isTransmisAsso || targetConv.scan_signe_nom || targetConv.isSignePresidente);
            if (!canAssoAccess) {
                this.toast("Ce dossier a été acté par le Conseil Communautaire. La convention est en cours d'édition par le pôle métier et vous sera transmise dès qu'elle sera prête pour signature.", "info");
                return;
            }
        }
        const enrichedConvs = store.getEnrichedConventions();
        const conv = conventionId
            ? enrichedConvs.find(c => c.id === conventionId)
            : (d ? enrichedConvs.find(c => c.dossier_id === d.id || c.code_hex === d.code_hex) : null) || enrichedConvs[0];

        if (conv) {
            const savedScan = localStorage.getItem(`ccmvr_scan_conv_${conv.id}`);
            if (savedScan) conv.scan_signe_nom = savedScan;
        }

        const structure = (d && d.structure) || (conv && store.state.structures.find(s => s.id === conv.structure_id)) || store.state.structures[0];
        const pole = (d && d.pole) || (conv && store.state.poles.find(p => p.id === conv.pole_id)) || store.state.poles[0];
        const criteresPole = store.state.criteres_metiers.filter(c => c.pole_id === pole?.id);
        const valeursCriteres = d ? d.valeurs : [];
        const prestationsNature = store.getEnrichedPrestations(structure?.id, store.activeMillesime);
        const customMeta = conv ? store.getConventionCustomMeta(conv) : null;
        const typeCode = store.normalizeConventionTypeCode((customMeta && customMeta.type_code) || (conv && conv.type_convention) || 'COM_OBJECTIFS');
        const annexePoleModele = store.getPoleAnnexeTemplate(pole?.code || 'SPORT', typeCode);
        const isAdmin = store.currentUser.role === 'admin';
        const isStaff = store.currentUser.role !== 'association';

        const isTransmis = Boolean(conv?.isTransmisAsso);
        const isSignePres = Boolean(conv?.isSignePresidente);
        const isSigneAsso = Boolean(conv?.isSigneAsso);

        const docHtml = window.CCMVR.DocGenerator.buildFullConventionHTML({
            convention: conv,
            dossier: d,
            structure,
            pole,
            valeursCriteres,
            criteresPole,
            prestationsNature,
            annexeMetierTexte: '',
            annexePoleModele
        });

        const filenameBase = `${store.activeMillesime}_${pole?.code || 'CCMVR'}_${structure?.siret || ''}_${(structure?.nom_dusage || structure?.nom_officiel || 'ASSO').replace(/\s+/g, '_')}_${conv?.code_hex || d?.code_hex || 'ACTE'}`;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 rounded-t-2xl no-print">
                <div>
                    <div class="text-xs font-mono-code text-blue-400">${filenameBase}.pdf</div>
                    <div class="text-sm font-bold flex items-center gap-2">
                        <span>Convention Officielle CCMVR (${typeCode === 'HORS_CADRE' ? 'Hors Cadre dérogatoire + Visa CdG' : 'Socle Commun 12 Articles + Annexe Service'})</span>
                        ${!isTransmis ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">⏳ Convention en cours d'édition</span>` : ''}
                        ${isTransmis && !isSigneAsso ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">Prête pour signature</span>` : ''}
                        ${conv && conv.statut_signature === 'VALIDE' ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">✓ Validée (2/2 Signé)</span>` : ''}
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    ${isStaff ? `
                        ${conv && !conv.is_avenant ? `
                            <button onclick="CCMVR.App.openCreateAvenantModal('${conv.id}')" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs" title="Créer un avenant modificateur rattaché à cette convention">
                                ➕ Créer un Avenant
                            </button>
                        ` : ''}
                        ${conv && conv.is_avenant && conv.soumis_visa_cdg && conv.statut_visa_cdg !== 'VISE_CDG' && isAdmin ? `
                            <button onclick="CCMVR.App.handleVisaCdgAvenant('${conv.id}')" class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-1 shadow-md">
                                ✓ Apposer Visa CdG (Avenant)
                            </button>
                        ` : ''}
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(${conv ? `'${conv.id}'` : 'null'}, '${structure?.id || ''}', ${d ? `'${d.id}'` : 'null'})" class="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-1" title="Modifier le type de convention ou personnaliser son annexe">
                            ✏️ Type & Clauses Annexe
                        </button>
                        ${isAdmin && conv && typeCode === 'HORS_CADRE' && (!customMeta || customMeta.statut_visa_cdg !== 'VISE_CDG') ? `
                            <button onclick="CCMVR.App.handleVisaHorsCadreConvention('${conv.id}')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-extrabold transition">
                                ✓ Apposer Visa CdG (Hors Cadre)
                            </button>
                        ` : ''}
                        ${conv ? `
                            ${isSignePres ? `
                                <div class="flex items-center gap-1.5">
                                    <span class="px-2.5 py-1.5 bg-emerald-900/60 border border-emerald-500/60 text-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                                        ✓ Signé Présidente
                                    </span>
                                    ${conv.scan_signe_nom ? `
                                        <button onclick="CCMVR.App.openArchivedSignedScan('${conv.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1" title="Consulter le fichier scanné déposé">
                                            📎 Voir Scan
                                        </button>
                                        <label class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1" title="Remplacer le scan signé par un nouveau fichier">
                                            🔄 Remplacer Scan
                                            <input type="file" accept=".pdf,.jpg,.png" class="hidden" onchange="CCMVR.App.handleUploadSignedConventionScan(this, '${conv.id}')"/>
                                        </label>
                                        <button onclick="CCMVR.App.handleRemoveSignedConventionScan('${conv.id}')" class="px-2 py-1.5 bg-rose-900/50 hover:bg-rose-800 text-rose-200 rounded-lg text-xs font-bold flex items-center gap-1" title="Supprimer ce scan">
                                            🗑️ Retirer
                                        </button>
                                    ` : `
                                        <label class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-extrabold cursor-pointer transition flex items-center gap-1" title="Remplacer par un scan manuscrit">
                                            📥 Déposer Scan Signé
                                            <input type="file" accept=".pdf,.jpg,.png" class="hidden" onchange="CCMVR.App.handleUploadSignedConventionScan(this, '${conv.id}')"/>
                                        </label>
                                    `}
                                </div>
                            ` : `
                                <div class="flex items-center gap-1.5">
                                    <button onclick="CCMVR.App.handleSignConvention('${conv.id}', 'CCMVR')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1" title="Apposer la signature électronique de Madame la Présidente de la CCMVR">
                                        ✍️ Signer (Présidente CCMVR)
                                    </button>
                                    <label class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-extrabold cursor-pointer transition flex items-center gap-1" title="Imprimez le document, faites-le signer par Madame la Présidente puis réimportez ici le scan signé">
                                        📥 Déposer Scan Signé (Présidente)
                                        <input type="file" accept=".pdf,.jpg,.png" class="hidden" onchange="CCMVR.App.handleUploadSignedConventionScan(this, '${conv.id}')"/>
                                    </label>
                                </div>
                            `}
                            ${!isTransmis ? `
                                <button onclick="CCMVR.App.handleTransmettreConventionAsso('${conv.id}')" class="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-extrabold shadow-md flex items-center gap-1.5 transition" title="Valider la convention et autoriser l'association à la signer (notifie l'association par e-mail)">
                                    📨 Valider & Transmettre à l'Association
                                </button>
                            ` : `
                                <span class="px-2.5 py-1.5 bg-teal-900/60 border border-teal-500/60 text-teal-200 rounded-lg text-xs font-semibold flex items-center gap-1" title="Transmise pour signature">
                                    ✓ Transmise à l'association ${conv.date_transmission_formatted ? `(${conv.date_transmission_formatted})` : ''}
                                </span>
                            `}
                            ${isSigneAsso ? `
                                <span class="px-2.5 py-1.5 bg-emerald-900/60 border border-emerald-500/60 text-emerald-200 rounded-lg text-xs font-bold">✓ Signé Association</span>
                            ` : `
                                ${isAdmin ? `
                                    <button onclick="CCMVR.App.openElectronicSignatureModal('${conv.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium" title="Aperçu signature OTP pour test interne">
                                        ✍️ Test OTP (Admin)
                                    </button>
                                ` : ''}
                            `}
                        ` : ''}
                    ` : `
                        <!-- VUE ASSOCIATION -->
                        ${conv ? `
                            ${conv.scan_signe_nom ? `
                                <button onclick="CCMVR.App.openArchivedSignedScan('${conv.id}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-400/40 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs" title="Consulter la version scannée signée par Madame la Présidente">
                                    📎 Voir la Convention signée Présidente
                                </button>
                            ` : ''}
                            ${!isTransmis ? `
                                <span class="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                    ⏳ Convention en cours d'édition
                                </span>
                            ` : !isSigneAsso ? `
                                <button onclick="CCMVR.App.openElectronicSignatureModal('${conv.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-md animate-pulse">
                                    ✍️ Signer la Convention (E-mail OTP)
                                </button>
                            ` : `
                                <span class="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                    ✓ Convention Signée par l'Association
                                </span>
                            `}
                        ` : ''}
                    `}
                    ${isAdmin ? `
                        <button onclick="CCMVR.App.triggerWordExport('${filenameBase}')" class="px-3 py-1.5 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-lg text-xs font-bold flex items-center gap-1" title="Réservé au Contrôle de Gestion">
                            📄 Word
                        </button>
                    ` : ''}
                    <button onclick="CCMVR.App.triggerPrintDocument('${filenameBase}')" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-md">
                        🖨️ PDF / Imprimer
                    </button>
                    <button onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-white">✕</button>
                </div>
            </div>
            <div id="printable-document-area" class="p-6 bg-slate-100 max-h-[80vh] overflow-y-auto">
                ${conv && !conv.is_avenant && store.getAvenantsForConvention(conv.id).length > 0 ? `
                    <div class="mb-4 p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-purple-800 text-white text-[10px] font-extrabold uppercase">Avenants modificateurs (${store.getAvenantsForConvention(conv.id).length})</span>
                            <span class="text-xs text-purple-950 font-bold">Cette convention fait l'objet d'avenants contractuels :</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5">
                            ${store.getAvenantsForConvention(conv.id).map(av => `
                                <button type="button" onclick="CCMVR.App.openConventionPreviewModal(null, '${av.id}')" class="px-3 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-2xs transition">
                                    📄 #${av.code_hex} (Av. n° ${av.numero_avenant || 1}) ${av.statut_signature === 'VALIDE' ? '✓' : (av.soumis_visa_cdg && av.statut_visa_cdg !== 'VISE_CDG' ? '⏳ Visa CdG' : '⏳')}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${!isStaff && !isTransmis ? `
                    <div class="mb-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs">
                        <div class="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold shrink-0 mt-0.5">
                            <i data-lucide="lock" class="w-4 h-4"></i>
                        </div>
                        <div class="text-xs space-y-1">
                            <div class="text-sm font-extrabold text-amber-950">Convention adoptée en Conseil Communautaire — En cours de finalisation & signature CCMVR</div>
                            <p class="text-amber-900 leading-relaxed">
                                Votre subvention a été approuvée par le Conseil Communautaire. La convention d'application est actuellement instruite par le <b>${pole?.libelle || 'Pôle Métier'}</b> pour vérification des clauses techniques et signature par <b>Madame la Présidente de la CCMVR</b>.
                            </p>
                            <p class="text-amber-800 font-semibold">
                                Dès que le pôle métier aura validé et transmis la convention, vous recevrez une notification par e-mail et le bouton de signature électronique sécurisée par OTP sera automatiquement débloqué sur cet écran.
                            </p>
                        </div>
                    </div>
                ` : ''}
                ${!isStaff && isTransmis && !isSigneAsso ? `
                    <div class="mb-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold shrink-0 mt-0.5">
                                <i data-lucide="check-circle" class="w-4 h-4"></i>
                            </div>
                            <div class="text-xs space-y-1">
                                <div class="text-sm font-extrabold text-emerald-950">Convention validée par le Pôle Métier — Prête pour Signature</div>
                                <p class="text-emerald-800 leading-relaxed">
                                    Le Pôle Métier a formellement validé la convention ${isSignePres ? '<b>(déjà signée par Madame la Présidente de la CCMVR)</b>' : ''}. Vous pouvez dès à présent apposer la signature électronique de l'association.
                                </p>
                            </div>
                        </div>
                        <button onclick="CCMVR.App.openElectronicSignatureModal('${conv.id}')" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-extrabold shrink-0 shadow-sm transition">
                            ✍️ Signer Maintenant
                        </button>
                    </div>
                ` : ''}
                ${isStaff && !isTransmis ? `
                    <div class="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-lg bg-blue-200 text-blue-900 flex items-center justify-center font-bold shrink-0 mt-0.5">
                                <i data-lucide="info" class="w-4 h-4"></i>
                            </div>
                            <div class="text-xs space-y-1">
                                <div class="text-sm font-extrabold text-blue-950">Étape Pôle Métier : Vérification, Signature Présidente & Transmission</div>
                                <p class="text-blue-900 leading-relaxed">
                                    Le dossier a été acté au Conseil Communautaire. L'association ne peut pas encore signer la convention.
                                    ${isSignePres ? '<b>✓ Madame la Présidente a déjà signé cette convention.</b>' : '<b>⚠️ Madame la Présidente n\'a pas encore signé cette convention</b> (utilisez le bouton « ✍️ Signer (Présidente CCMVR) » ou « 📥 Déposer Scan Signé » ci-dessus).'}
                                    Une fois vos vérifications terminées, cliquez sur « <b>📨 Valider & Transmettre à l\'Association</b> » pour autoriser la signature de l\'association et lui expédier la notification officielle.
                                </p>
                            </div>
                        </div>
                        <button onclick="CCMVR.App.handleTransmettreConventionAsso('${conv.id}')" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-extrabold shrink-0 shadow-sm transition">
                            📨 Valider & Transmettre
                        </button>
                    </div>
                ` : ''}
                <div class="bg-white shadow-sm rounded-xl border border-slate-200">
                    ${docHtml}
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    openAttestationPreviewModal(structureId) {
        const store = window.CCMVR.Store;
        const structure = store.state.structures.find(s => s.id === structureId) || store.state.structures[0];
        const annee = store.activeMillesime;
        const prestationsNature = store.getEnrichedPrestations(structure.id, annee);
        const isAdmin = store.currentUser.role === 'admin';

        const docHtml = window.CCMVR.DocGenerator.buildAttestationNatureHTML({
            structure,
            annee,
            prestationsNature
        });

        const filenameBase = `ATTESTATION_AIDES_EN_NATURE_${annee}_${(structure.nom_dusage || structure.nom_officiel).replace(/\s+/g, '_')}`;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 rounded-t-2xl no-print">
                <div>
                    <div class="text-xs font-mono-code text-emerald-400">${filenameBase}.pdf</div>
                    <div class="text-sm font-bold">Attestation Annuelle Officielle de Concours en Nature (Art. L. 2313-1 CGCT)</div>
                </div>
                <div class="flex items-center gap-2">
                    ${isAdmin ? `
                        <button onclick="CCMVR.App.triggerWordExport('${filenameBase}')" class="px-3 py-1.5 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-lg text-xs font-bold">
                            📄 Word (Admin)
                        </button>
                    ` : ''}
                    <button onclick="CCMVR.App.triggerPrintDocument('${filenameBase}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold">
                        🖨️ Télécharger en PDF / Imprimer (A4 Complet)
                    </button>
                    <button onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-white">✕</button>
                </div>
            </div>
            <div id="printable-document-area" class="p-6 bg-slate-100 max-h-[80vh] overflow-y-auto">
                <div class="bg-white shadow-sm rounded-xl border border-slate-200">
                    ${docHtml}
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    },

    triggerPrintDocument(filenameBase) {
        const wrapper = document.getElementById('official-doc-wrapper');
        if (!wrapper) return;
        window.CCMVR.DocGenerator.printOfficialDocument(wrapper.innerHTML, filenameBase);
    },

    triggerWordExport(filenameBase) {
        const wrapper = document.getElementById('official-doc-wrapper');
        if (!wrapper) return;
        window.CCMVR.DocGenerator.exportToWord(wrapper.innerHTML, filenameBase);
        this.toast('Document Word (.doc) généré et téléchargé !');
    },

    async handleUploadSignedConventionScan(inputEl, convId) {
        const file = inputEl?.files?.[0];
        if (!file || !convId) return;

        try {
            this.toast('⏳ Analyse et extraction de la signature en cours...', 'info');

            let base64Data = '';
            let stamp = '';
            let finalFileName = file.name;
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

            if (isPdf && window.PDFLib && window.PDFLib.PDFDocument) {
                // Lecture binaire du PDF pour analyse avec pdf-lib
                const arrayBuffer = await file.arrayBuffer();
                const srcDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                const totalPages = srcDoc.getPageCount();

                if (totalPages > 1) {
                    // L'agent a scanné l'intégralité du document (ex: 4 ou 5 pages).
                    // On isole et on n'archive STRICTEMENT que la dernière page (la feuille de clôture et de signatures).
                    // Cela évite de stocker les pages de texte redondantes et allège drastiquement le stockage.
                    const singleDoc = await window.PDFLib.PDFDocument.create();
                    const [lastPage] = await singleDoc.copyPages(srcDoc, [totalPages - 1]);
                    singleDoc.addPage(lastPage);

                    const pdfBytes = await singleDoc.save();

                    // Conversion par blocs sécurisée de Uint8Array vers base64 Data URL
                    let binary = '';
                    const len = pdfBytes.byteLength;
                    const chunkSize = 8192;
                    for (let i = 0; i < len; i += chunkSize) {
                        const slice = pdfBytes.subarray(i, Math.min(i + chunkSize, len));
                        binary += String.fromCharCode.apply(null, slice);
                    }
                    base64Data = 'data:application/pdf;base64,' + btoa(binary);

                    const origKb = Math.round(file.size / 1024);
                    const finalKb = Math.round(pdfBytes.byteLength / 1024);
                    const pctSaved = Math.max(0, Math.round((1 - (pdfBytes.byteLength / file.size)) * 100));

                    finalFileName = `${file.name.replace(/\.pdf$/i, '')}_page_${totalPages}_sur_${totalPages}_signee.pdf`;
                    stamp = `${finalFileName} (feuille signature p.${totalPages}/${totalPages} extraite le ${new Date().toLocaleDateString('fr-FR')})`;

                    this.toast(`✓ Scan multipage analysé (${totalPages} pages) : seule la feuille de signature (${totalPages}/${totalPages}) a été extraite et archivée (${finalKb} Ko au lieu de ${origKb} Ko, économie de ${pctSaved}% d'espace) !`, 'success');
                } else {
                    // Le fichier déposé est déjà une feuille unique
                    const reader = new FileReader();
                    base64Data = await new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    stamp = `${file.name} (déposé le ${new Date().toLocaleDateString('fr-FR')})`;
                    this.toast(`✓ Feuille de signature scannée archivée (${Math.round(file.size / 1024)} Ko) !`, 'success');
                }
            } else {
                // Image (JPG, PNG) ou fallback si PDFLib n'est pas encore initialisé
                const reader = new FileReader();
                base64Data = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                stamp = `${file.name} (déposé le ${new Date().toLocaleDateString('fr-FR')})`;
                this.toast(`✓ Scan de signature (« ${file.name} ») archivé avec succès !`, 'success');
            }

            // Sauvegarde locale du scan
            try {
                localStorage.setItem(`ccmvr_scan_conv_${convId}`, stamp);
                localStorage.setItem(`ccmvr_scan_data_${convId}`, base64Data);
            } catch (storageErr) {
                console.warn('Erreur quota localStorage scan:', storageErr);
            }

            // Mise à jour de la convention dans l'état applicatif
            const conv = window.CCMVR.Store.state.conventions.find(c => c.id === convId);
            if (conv) {
                conv.scan_signe_nom = stamp;
                conv.scan_signe_data = base64Data;
                conv.isSignePresidente = true;
                // La convention n'est transmise à l'association que lors du clic sur le bouton dédié !
                conv.date_signature_ccmvr = conv.date_signature_ccmvr || new Date().toISOString();
                if (window.CCMVR.Store.supabase) {
                    try {
                        await window.CCMVR.Store.supabase
                            .from('conventions')
                            .update({ nom_fichier_pdf: finalFileName, date_signature_ccmvr: conv.date_signature_ccmvr })
                            .eq('id', convId);
                    } catch (_) {}
                }
            }
            const customMeta = window.CCMVR.Store.getConventionCustomMeta(conv || { id: convId });
            customMeta.scan_signe_nom = stamp;
            customMeta.isSignePresidente = true;
            window.CCMVR.Store.saveConventionCustomMeta(convId, conv?.code_hex, customMeta);
            // Double écriture de compatibilité ascendante
            try {
                const allCustomMeta = JSON.parse(localStorage.getItem('ccmvr_custom_conventions_meta') || '{}');
                allCustomMeta[convId] = customMeta;
                localStorage.setItem('ccmvr_custom_conventions_meta', JSON.stringify(allCustomMeta));
            } catch (_) {}

            // On signe STRICTEMENT et UNIQUEMENT pour la collectivité (Présidente CCMVR).
            // L'association n'a pas encore signé et la convention n'est pas encore transmise automatiquement !
            try {
                await window.CCMVR.Store.signConvention(convId, 'CCMVR');
            } catch (_) {}

            const modal = document.getElementById('universal-modal');
            if (modal && !modal.classList.contains('hidden')) {
                CCMVR.App.openConventionPreviewModal(null, convId);
            }
            CCMVR.App.renderMainView();
        } catch (err) {
            console.error('Erreur téléversement scan:', err);
            this.toast('Erreur lors du traitement du scan : ' + (err.message || err), 'error');
        }
    },

    async handleRemoveSignedConventionScan(convId) {
        if (!convId) return;
        if (!confirm("Voulez-vous vraiment retirer le scan signé de Madame la Présidente pour cette convention ?")) {
            return;
        }
        localStorage.removeItem(`ccmvr_scan_conv_${convId}`);
        localStorage.removeItem(`ccmvr_scan_data_${convId}`);

        const conv = window.CCMVR.Store.state.conventions.find(c => c.id === convId);
        if (conv) {
            conv.scan_signe_nom = null;
            conv.scan_signe_data = null;
            conv.isSignePresidente = false;
            conv.date_signature_ccmvr = null;
            conv.statut_signature = conv.transmis_asso ? 'TRANSMIS_ASSO' : 'ATTENTE_TRANSMISSION';
        }
        const customMeta = window.CCMVR.Store.getConventionCustomMeta(conv || { id: convId });
        delete customMeta.scan_signe_nom;
        customMeta.isSignePresidente = false;
        window.CCMVR.Store.saveConventionCustomMeta(convId, conv?.code_hex, customMeta);
        try {
            const allCustomMeta = JSON.parse(localStorage.getItem('ccmvr_custom_conventions_meta') || '{}');
            allCustomMeta[convId] = customMeta;
            localStorage.setItem('ccmvr_custom_conventions_meta', JSON.stringify(allCustomMeta));
        } catch (_) {}

        if (window.CCMVR.Store.supabase) {
            try {
                await window.CCMVR.Store.supabase
                    .from('conventions')
                    .update({ date_signature_ccmvr: null, nom_fichier_pdf: null })
                    .eq('id', convId);
            } catch (_) {}
        }
        localStorage.setItem('ccmvr_custom_conventions', JSON.stringify(window.CCMVR.Store.state.conventions));
        this.toast('Scan signé retiré.');
        const modal = document.getElementById('universal-modal');
        if (modal && !modal.classList.contains('hidden')) {
            this.openConventionPreviewModal(null, convId);
        }
        this.renderMainView();
    },

    openArchivedSignedScan(convId) {
        const dataUrl = localStorage.getItem(`ccmvr_scan_data_${convId}`);
        const name = localStorage.getItem(`ccmvr_scan_conv_${convId}`) || 'Convention_Signee_Presidente.pdf';
        if (dataUrl) {
            const cleanName = name.split(' (déposé le')[0].split(' (feuille signature')[0].trim() || 'Convention_Signee_Presidente.pdf';
            try {
                const arr = dataUrl.split(',');
                const mimeMatch = arr[0].match(/:(.*?);/);
                const mime = (mimeMatch && mimeMatch[1]) || 'application/pdf';
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], { type: mime });
                const blobUrl = URL.createObjectURL(blob);
                const win = window.open(blobUrl, '_blank');
                if (!win) {
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = cleanName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
                this.toast(`Visualisation de la feuille de signature scannée : « ${cleanName} »`);
                return;
            } catch (err) {
                console.warn('Erreur ouverture Blob URL, fallback lien direct:', err);
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = cleanName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                this.toast(`Téléchargement / Affichage de « ${cleanName} »...`);
                return;
            }
        }
        this.toast(`Pièce archivée introuvable en cache local : ${name}`, 'warning');
    },

    openElectronicSignatureModal(convId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const isStaff = store.currentUser?.role !== 'association';
        const conv = store.getEnrichedConventions().find(c => c.id === convId) || store.state.conventions.find(c => c.id === convId);
        if (!conv) {
            this.toast('Convention introuvable.', 'error');
            return;
        }

        // Guard: association cannot sign before pole validation / transmission
        if (!isStaff && !conv.isTransmisAsso) {
            this.toast("Cette convention n'a pas encore été validée et transmise par le Pôle Métier. La signature n'est pas encore ouverte.", "warning");
            return;
        }

        const structure = store.state.structures.find(s => s.id === conv.structure_id) || store.state.structures[0];
        const dossier = store.state.dossiers_subventions.find(d => d.id === conv.dossier_id);
        const montant = parseFloat(conv.montant_vote || dossier?.montant_vote || dossier?.montant_propose_pole || 0);
        const formattedMontant = fin.formatCurrency(montant);
        const contactEmail = structure.email_contact || store.currentUser?.email || 'contact@marchesduvelayrochebaron.fr';

        const signataires = store.getSignatairesHabilites(structure.id);
        const sigOptionsHtml = signataires.map(s => `
            <option value="${s.id}" data-email="${s.email || contactEmail}" data-nom="${s.prenom} ${s.nom}" data-fonction="${s.fonction}" ${s.est_defaut ? 'selected' : ''}>
                ${s.prenom} ${s.nom} — ${s.fonction}${s.email ? ' (' + s.email + ')' : ''}
            </option>
        `).join('');

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8 animate-scale-in';
        content.innerHTML = `
            <div class="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                        <i data-lucide="pen-tool" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">Signature Électronique Sécurisée</h3>
                        <p class="text-[11px] text-emerald-200">Validation e-mail & Horodatage légal (SES eIDAS)</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.openConventionPreviewModal(null, '${convId}')" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <div class="p-6 space-y-4 text-xs">
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div class="flex justify-between">
                        <span class="text-slate-500">Acte juridique :</span>
                        <span class="font-mono-code font-bold text-slate-900">Convention #${conv.code_hex || 'ACTE'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Bénéficiaire :</span>
                        <span class="font-bold text-slate-800">${structure.nom_officiel}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Concours public voté :</span>
                        <span class="font-bold text-emerald-700 font-mono-code">${formattedMontant}</span>
                    </div>
                </div>

                <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                    <label class="block font-bold text-slate-700 text-xs">
                        Mandataire signataire pour l'association :
                    </label>
                    <select id="sig-signataire-select" class="input-clean font-semibold text-xs py-1.5">
                        ${sigOptionsHtml}
                    </select>
                    <p class="text-[10px] text-slate-500">Personne habilitée statutairement ou mandatée par le Conseil d'Administration.</p>
                </div>

                <div class="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg leading-relaxed">
                    <b>Procédure de signature simple par e-mail :</b><br>
                    Pour attester de votre consentement sans SMS coûteux, un <b>code de signature unique à 6 chiffres</b> va être expédié sur l'adresse officielle de l'association.
                </div>

                <div id="sig-error-box" class="hidden p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

                <div class="pt-2 flex items-center justify-between">
                    <button type="button" onclick="CCMVR.App.openConventionPreviewModal(null, '${convId}')" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 transition">
                        &larr; Revenir au document
                    </button>
                    <button type="button" id="sig-request-code-btn" onclick="CCMVR.App.handleRequestSignatureOtp('${convId}')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-sm transition">
                        Envoyer mon code de signature par e-mail →
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    async handleRequestSignatureOtp(convId) {
        const store = window.CCMVR.Store;
        const conv = store.state.conventions.find(c => c.id === convId);
        if (!conv) return;

        const structure = store.state.structures.find(s => s.id === conv.structure_id) || store.state.structures[0];
        const dossier = store.state.dossiers_subventions.find(d => d.id === conv.dossier_id);
        const montant = parseFloat(conv.montant_vote || dossier?.montant_vote || 0);

        const sigSelect = document.getElementById('sig-signataire-select');
        const selectedOption = sigSelect?.options[sigSelect.selectedIndex];
        const selectedSigId = sigSelect?.value;
        const signataires = store.getSignatairesHabilites(structure.id);
        const currentSig = signataires.find(s => s.id === selectedSigId) || signataires[0];

        const repName = currentSig ? `${currentSig.prenom} ${currentSig.nom}` : (`${structure.representant_prenom || ''} ${structure.representant_nom || ''}`.trim() || 'Président(e)');
        const contactEmail = (currentSig && currentSig.email) || structure.email_contact || store.currentUser?.email || 'contact@marchesduvelayrochebaron.fr';
        const repFonction = currentSig ? currentSig.fonction : (structure.representant_fonction || 'Président(e)');
        const btn = document.getElementById('sig-request-code-btn');
        const errBox = document.getElementById('sig-error-box');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Envoi du code...';
        }

        try {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            sessionStorage.setItem('ccmvr_sig_otp', JSON.stringify({
                convId: conv.id,
                email: contactEmail,
                repName: repName,
                repFonction: repFonction,
                code: otpCode,
                expires: Date.now() + 15 * 60 * 1000
            }));

            await window.CCMVR.NotificationService.sendSignatureOtpCode({
                email: contactEmail,
                nomAsso: structure.nom_officiel,
                code: otpCode,
                conventionCode: conv.code_hex || 'ACTE',
                signataireNom: repName,
                montant,
                expireMinutes: 15
            });

            this.toast(`Code de signature envoyé à ${contactEmail}`, 'success');
            this.renderSignatureStep2(convId, contactEmail, repName);
        } catch (err) {
            if (errBox) {
                errBox.textContent = 'Erreur d\'envoi : ' + err.message;
                errBox.classList.remove('hidden');
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Envoyer mon code de signature par e-mail →';
            }
        }
    },

    renderSignatureStep2(convId, email, repName) {
        const content = document.getElementById('universal-modal-content');
        if (!content) return;

        content.innerHTML = `
            <div class="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                        <i data-lucide="shield-check" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">Validation du Consentement</h3>
                        <p class="text-[11px] text-emerald-200">Code secret expédié à ${email}</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.openConventionPreviewModal(null, '${convId}')" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <div class="p-6 space-y-4 text-xs">
                <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg">
                    Consultez votre boîte e-mail (<b>${email}</b>) et saisissez le code à 6 chiffres pour parfaire la signature.
                </div>

                <form onsubmit="CCMVR.App.handleConfirmElectronicSignature(event, '${convId}')" class="space-y-4">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Code de validation reçu par e-mail *</label>
                        <input type="text" id="sig-otp-input" required maxlength="6" placeholder="Ex : 592814" class="input-clean font-mono-code text-center text-xl tracking-widest font-black text-emerald-800"/>
                    </div>

                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <label class="flex items-start gap-2.5 cursor-pointer">
                            <input type="checkbox" id="sig-consent-checkbox" required class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"/>
                            <span class="text-slate-700 leading-relaxed text-[11px]">
                                En cochant cette case, je confirme en qualité de représentant(e) habilité(e) (<b>${repName}</b>) avoir pris connaissance des 12 articles du socle commun et des annexes, et j'appose la signature de l'association avec pleine valeur contractuelle (art. 1367 du Code civil).
                            </span>
                        </label>
                    </div>

                    <div id="sig-step2-error-box" class="hidden p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

                    <div class="pt-2 flex items-center justify-between">
                        <button type="button" onclick="CCMVR.App.openElectronicSignatureModal('${convId}')" class="text-slate-500 hover:text-slate-800 font-bold">
                            &larr; Renvoyer un code
                        </button>
                        <button type="submit" id="sig-confirm-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-sm transition">
                            ✓ Valider & Signer Électroniquement
                        </button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    async handleConfirmElectronicSignature(e, convId) {
        e.preventDefault();
        const codeInput = document.getElementById('sig-otp-input')?.value?.trim();
        const consent = document.getElementById('sig-consent-checkbox')?.checked;
        const errBox = document.getElementById('sig-step2-error-box');
        const submitBtn = document.getElementById('sig-confirm-btn');

        const showError = (msg) => {
            if (errBox) {
                errBox.textContent = msg;
                errBox.classList.remove('hidden');
            }
        };

        if (!consent) {
            showError('Vous devez cocher la case d\'engagement pour valider la signature.');
            return;
        }

        const storedOtpRaw = sessionStorage.getItem('ccmvr_sig_otp');
        if (!storedOtpRaw) {
            showError('Session de signature expirée ou inexistante. Veuillez redemander un code.');
            return;
        }

        const storedOtp = JSON.parse(storedOtpRaw);
        if (storedOtp.convId !== convId) {
            showError('Incohérence de convention.');
            return;
        }
        if (Date.now() > storedOtp.expires) {
            showError('Le code de signature a expiré. Veuillez redemander un nouveau code.');
            return;
        }
        if (storedOtp.code !== codeInput) {
            showError('Code de signature incorrect. Vérifiez le code à 6 chiffres reçu dans votre boîte e-mail.');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Validation en cours...';
        }

        const store = window.CCMVR.Store;
        const conv = store.state.conventions.find(c => c.id === convId);
        const structure = store.state.structures.find(s => s.id === conv?.structure_id) || store.state.structures[0];
        const dossier = store.state.dossiers_subventions.find(d => d.id === conv?.dossier_id);
        const montant = parseFloat(conv?.montant_vote || dossier?.montant_vote || 0);
        const repName = storedOtp.repName || `${structure.representant_prenom || ''} ${structure.representant_nom || ''}`.trim() || 'Président(e)';
        const dateIso = new Date().toISOString();
        const sealHash = 'SES-ASSO-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

        const auditTrail = {
            signataire_nom: repName,
            signataire_fonction: storedOtp.repFonction || structure.representant_fonction || 'Mandataire habilité(e)',
            email: storedOtp.email,
            date: dateIso,
            hash: sealHash,
            type: 'SES_EMAIL_OTP',
            code_hex: conv?.code_hex || 'ACTE'
        };

        try {
            await store.signConvention(convId, 'ASSO', auditTrail);
            sessionStorage.removeItem('ccmvr_sig_otp');

            // Envoi officiel du récépissé d'émargement électronique
            window.CCMVR.NotificationService.sendSignatureReceipt({
                email: storedOtp.email,
                nomAsso: structure.nom_officiel,
                conventionCode: conv?.code_hex || 'ACTE',
                signataireNom: repName,
                horodatage: new Date().toLocaleString('fr-FR'),
                sealHash,
                montant
            }).catch(e => {
                console.warn('Échec envoi récépissé signature :', e);
            });

            this.toast(`✓ Convention #${conv?.code_hex || ''} signée électroniquement avec succès ! Récépissé expédié par e-mail.`, 'success');
            this.openConventionPreviewModal(null, convId);
            this.renderMainView();
        } catch (err) {
            showError('Erreur signature : ' + err.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '✓ Valider & Signer Électroniquement';
            }
        }
    },

    async handleSignConvention(convId, party) {
        try {
            await window.CCMVR.Store.signConvention(convId, party);
            this.toast(`Signature électronique (${party}) apposée et horodatée avec succès !`);
            this.openConventionPreviewModal(null, convId);
            this.renderMainView();
        } catch (err) {
            this.toast('Erreur signature : ' + err.message, 'error');
        }
    },

    async handleTransmettreConventionAsso(convId) {
        const store = window.CCMVR.Store;
        const conv = store.getEnrichedConventions().find(c => c.id === convId) || store.state.conventions.find(c => c.id === convId);
        if (!conv) {
            this.toast('Convention introuvable.', 'error');
            return;
        }

        if (!conv.isSignePresidente) {
            const proceed = confirm(
                "Attention : Madame la Présidente de la CCMVR n'a pas encore apposé sa signature (signature numérique ou scan signé déposé) sur cette convention.\n\n" +
                "Souhaitez-vous tout de même valider et transmettre dès maintenant la convention à l'association ?\n\n" +
                "(Cliquez sur Annuler pour apposer d'abord la signature de la Présidente, ou OK pour transmettre directement)."
            );
            if (!proceed) return;
        } else {
            const proceed = confirm(
                `Confirmez-vous la validation et la transmission de la convention #${conv.code_hex || ''} à l'association ${conv.structure?.nom_officiel || ''} ?\n\n` +
                `Un e-mail de notification officiel lui sera expédié pour l'inviter à signer électroniquement.`
            );
            if (!proceed) return;
        }

        try {
            const updated = await store.transmettreConventionAsso(convId);
            const structure = conv.structure || store.state.structures.find(s => s.id === conv.structure_id);
            const pole = conv.pole || store.state.poles.find(p => p.id === conv.pole_id);
            const dossier = store.state.dossiers_subventions.find(d => d.id === conv.dossier_id);
            const montant = conv.montant_vote || dossier?.montant_vote || dossier?.montant_propose_pole || 0;

            window.CCMVR.NotificationService.notifyConventionReadyForSignature({
                convention: updated || conv,
                structure,
                pole,
                montant
            }).catch(err => console.warn('Échec notification transmission:', err));

            this.toast(`✓ Convention #${conv.code_hex || ''} validée et transmise à l'association ! Notification expédiée.`, 'success');
            this.openConventionPreviewModal(null, convId);
            this.renderMainView();
        } catch (err) {
            this.toast('Erreur lors de la transmission : ' + err.message, 'error');
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CCMVR.Modules.ModalsConvention;
}
