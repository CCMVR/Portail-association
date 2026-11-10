// ==============================================================================
// MODULE CCMVR: REGIE
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.Modules.Regie = {
    renderNatCalendrierMinibus(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        const minibusType = store.state.types_prestations_nature.find(t => t.code === 'MINIBUS_KM') || store.state.types_prestations_nature[0];
        const tarifKm = minibusType ? store.getTarifUnitaire(minibusType.id, annee) : 0.48;
        const reservations = store.getEnrichedPrestations(null, annee).filter(p => p.type_code === 'MINIBUS_KM');

        const structuresOptions = store.state.structures.map(s => `<option value="${s.id}">${s.nom_officiel}</option>`).join('');

        const rowsHtml = reservations.map(r => {
            let edl = null;
            try {
                if (r.observations && r.observations.startsWith('{')) {
                    edl = JSON.parse(r.observations);
                }
            } catch (_) {}

            const immat = edl?.immatriculation || 'GK-412-VR';
            const condNom = edl?.conducteur_nom || 'Conducteur désigné';
            const condPermis = edl?.conducteur_permis ? `Permis N° ${edl.conducteur_permis}` : 'Permis B';
            const isClos = Boolean(edl?.etat_des_lieux_clos || r.statut === 'VALIDE');
            const kmParcourus = edl?.retour_km_parcourus || r.quantite || 0;
            const montantTotal = parseFloat(r.montant_total_valorise) || (kmParcourus * tarifKm);

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td class="py-3 px-4 text-xs font-semibold text-slate-900">${fin.formatDate(r.date_debut)}</td>
                    <td class="py-3 px-4 text-xs font-bold text-slate-800">${r.structure_nom}</td>
                    <td class="py-3 px-4 text-xs text-slate-700">
                        <div class="font-bold text-slate-900 flex items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono-code text-[10px] font-bold">${immat}</span>
                            <span>${condNom}</span>
                        </div>
                        <div class="text-[11px] text-slate-500">${condPermis} • Caution : ${edl?.caution_numero ? edl.caution_numero : '500 € OK'}</div>
                    </td>
                    <td class="py-3 px-4 text-center font-mono-code text-xs font-bold">${kmParcourus} km</td>
                    <td class="py-3 px-4 text-right font-mono-code text-xs text-slate-500">${fin.formatCurrency(r.tarif_unitaire_applique || tarifKm)} / km</td>
                    <td class="py-3 px-4 text-right font-mono-code text-xs font-extrabold text-emerald-700">${fin.formatCurrency(montantTotal)}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isClos ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${isClos ? '✓ État des Lieux Clos' : 'â³ En cours (Départ validé)'}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="CCMVR.App.openEtatDesLieuxModal('${r.id}')" class="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs">
                                📋 État des Lieux
                            </button>
                            <button onclick="CCMVR.App.printEtatDesLieux('${r.id}')" class="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition" title="Imprimer la Fiche A4 Officielle">
                                🖨️ï¸
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Bannière Service Accueil (Minibus) -->
                <div class="p-5 rounded-2xl bg-gradient-to-r from-cyan-900 via-blue-900 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/30 text-cyan-200 border border-cyan-400/30">
                            Service Accueil CCMVR • Gestion de la Flotte Minibus
                        </span>
                        <h1 class="text-xl font-extrabold text-white mt-1">Calendrier & Réservations des Minibus Communautaires (${annee})</h1>
                        <p class="text-xs text-cyan-100 mt-0.5">Barème kilométrique actif (${annee}) : <strong class="text-emerald-300 font-mono-code">${fin.formatCurrency(tarifKm)} / km</strong> (Amortissement, assurance tous risques et entretien).</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'CONV_MINIBUS')" class="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition">
                            + Éditer une Convention Minibus
                        </button>
                        <button onclick="CCMVR.App.switchTab('pole_annexe')" class="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition">
                            Modèles d'Annexes & Hors Cadre
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Formulaire d'enregistrement / Réservation Minibus avec État des Lieux Départ Pré-rempli -->
                    <div class="card-minimal card-accent-blue p-5 space-y-4">
                        <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i data-lucide="calendar-plus" class="w-4 h-4 text-cyan-600"></i>
                            Inscrire une Sortie Minibus & Prise en Charge
                        </h2>
                        <form onsubmit="CCMVR.App.handleAddMinibus(event, '${minibusType ? minibusType.id : ''}')" class="space-y-3 text-xs">
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Association bénéficiaire *</label>
                                <select id="mb-struct" required class="input-clean">${structuresOptions}</select>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Véhicule assigné</label>
                                    <select id="mb-immat" class="input-clean font-mono-code text-xs">
                                        <option value="GK-412-VR (Minibus 1 - 9 places)">GK-412-VR (Minibus 1)</option>
                                        <option value="EF-890-AB (Minibus 2 - 9 places)">EF-890-AB (Minibus 2)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Kilométrage prévu</label>
                                    <input type="number" id="mb-km" required min="1" value="250" oninput="CCMVR.App.updateMinibusPreview(${tarifKm})" class="input-clean font-mono-code font-bold"/>
                                </div>
                            </div>

                            <!-- Identification Conducteur & Permis (100% textuel sans scan lourd) -->
                            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <span class="text-[11px] font-extrabold uppercase text-slate-700 block">Conducteur Habilité & Permis B</span>
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Nom et Prénom du conducteur</label>
                                    <input type="text" id="mb-conducteur" required placeholder="Ex: Jean DUPONT" class="input-clean"/>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">N° Permis de conduire</label>
                                        <input type="text" id="mb-permis" required placeholder="Ex: 14AA987654" class="input-clean font-mono-code"/>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">Délivré le</label>
                                        <input type="date" id="mb-permis-date" required value="" placeholder="AAAA-MM-JJ" class="input-clean"/>
                                    </div>
                                </div>
                            </div>

                            <!-- Chèque de caution -->
                            <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-[11px]">
                                <span class="font-extrabold uppercase text-amber-900 block">Dépôt du Chèque de Caution (500 €)</span>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block font-semibold text-amber-800 mb-0.5">N° du chèque</label>
                                        <input type="text" id="mb-caution-chq" required placeholder="Ex: 8765432" class="input-clean font-mono-code"/>
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-amber-800 mb-0.5">Banque</label>
                                        <input type="text" id="mb-caution-banque" required placeholder="Ex: Crédit Agricole" class="input-clean"/>
                                    </div>
                                </div>
                            </div>

                            <!-- Dates départ / retour -->
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Date départ</label>
                                    <input type="date" id="mb-debut" required value="" placeholder="AAAA-MM-JJ" class="input-clean"/>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Date retour</label>
                                    <input type="date" id="mb-fin" required value="" placeholder="AAAA-MM-JJ" class="input-clean"/>
                                </div>
                            </div>

                            <!-- État des lieux de départ pré-rempli par l'accueil -->
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">État des lieux départ & Anomalies préexistantes</label>
                                <textarea id="mb-dep-anomalies" rows="2" class="input-clean text-xs" placeholder="Noter ici les éventuels défauts préexistants sur le véhicule...">Véhicule propre. Rayure superficielle aile arrière droite (15 cm). Plein carburant effectué (4/4).</textarea>
                            </div>

                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Motif / Destination</label>
                                <input type="text" id="mb-obs" required placeholder="Ex: Déplacement tournoi régional" class="input-clean"/>
                            </div>

                            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                                <span class="text-emerald-800 font-medium">Subvention estimée :</span>
                                <span id="mb-preview-val" class="font-mono-code text-sm font-extrabold text-emerald-700">${fin.formatCurrency(250 * tarifKm)}</span>
                            </div>

                            <button type="submit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs">
                                Enregistrer la Réservation & l'État des Lieux Départ
                            </button>
                        </form>
                    </div>

                    <!-- Journal du Calendrier Minibus -->
                    <div class="lg:col-span-2 card-minimal card-accent-emerald overflow-hidden">
                        <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                            <span class="text-xs font-bold text-slate-900 uppercase tracking-wide">Registre des Sorties & Réservations Minibus (${annee})</span>
                            <span class="text-xs font-semibold text-emerald-700">${reservations.length} sortie(s)</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                        <th class="py-2.5 px-4">Date</th>
                                        <th class="py-2.5 px-4">Association</th>
                                        <th class="py-2.5 px-4">Véhicule & Conducteur</th>
                                        <th class="py-2.5 px-4 text-center">Distance</th>
                                        <th class="py-2.5 px-4 text-right">Barème</th>
                                        <th class="py-2.5 px-4 text-right">Valorisation</th>
                                        <th class="py-2.5 px-4 text-center">État des Lieux</th>
                                        <th class="py-2.5 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml || `<tr><td colspan="8" class="py-8 text-center text-xs text-slate-400">Aucune réservation minibus sur l'exercice ${annee}</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    updateMinibusPreview(tarifKm) {
        const km = parseFloat(document.getElementById('mb-km')?.value) || 0;
        const el = document.getElementById('mb-preview-val');
        if (el) el.textContent = window.CCMVR.FinanceEngine.formatCurrency(km * tarifKm);
    },

    async handleAddMinibus(e, typeId) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        const structId = document.getElementById('mb-struct').value;
        const immat = document.getElementById('mb-immat')?.value || 'GK-412-VR';
        const dateDebut = document.getElementById('mb-debut').value;
        const dateFin = document.getElementById('mb-fin').value;
        const km = parseFloat(document.getElementById('mb-km').value) || 0;
        const conducteurNom = document.getElementById('mb-conducteur')?.value.trim() || '';
        const permisNum = document.getElementById('mb-permis')?.value.trim() || '';
        const permisDate = document.getElementById('mb-permis-date')?.value || '';
        const cautionChq = document.getElementById('mb-caution-chq')?.value.trim() || '';
        const cautionBanque = document.getElementById('mb-caution-banque')?.value.trim() || '';
        const depAnomalies = document.getElementById('mb-dep-anomalies')?.value.trim() || '';
        const obs = document.getElementById('mb-obs').value.trim();

        const edlPayload = {
            immatriculation: immat,
            motif: obs,
            conducteur_nom: conducteurNom,
            conducteur_permis: permisNum,
            conducteur_permis_date: permisDate,
            caution_numero: cautionChq,
            caution_banque: cautionBanque,
            caution_montant: 500,
            caution_deposee: true,
            depart_date: dateDebut,
            depart_heure: '08:00',
            depart_km: 0,
            depart_carburant: '4/4 (Plein)',
            depart_proprete_int: 'Très propre',
            depart_proprete_ext: 'Propre',
            depart_anomalies: depAnomalies,
            depart_valide: true,
            retour_date: dateFin,
            retour_heure: '18:00',
            retour_km: 0 + km,
            retour_km_parcourus: km,
            retour_carburant: '4/4 (Plein)',
            retour_proprete_int: 'Propre',
            retour_proprete_ext: 'Propre',
            retour_incidents: 'Rien à signaler. Véhicule restitué nettoyé avec le plein.',
            retour_caution_statut: 'RESTITUEE',
            etat_des_lieux_clos: false
        };

        try {
            await store.addPrestationNature({
                structure_id: structId,
                type_prestation_id: typeId,
                annee: store.activeMillesime,
                date_debut: dateDebut,
                date_fin: dateFin,
                quantite: km,
                observations: JSON.stringify(edlPayload),
                statut: 'EN_ATTENTE'
            });
            this.renderMainView();
            this.toast('Sortie minibus et fiche d\'état des lieux enregistrées avec succès !', 'success');
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    openEtatDesLieuxModal(prestationId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        const p = store.getEnrichedPrestations(null, annee).find(x => x.id === prestationId);
        if (!p) return;

        let edl = {};
        try {
            if (p.observations && p.observations.startsWith('{')) {
                edl = JSON.parse(p.observations);
            }
        } catch (_) {}

        const immat = edl.immatriculation || 'GK-412-VR';
        const condNom = edl.conducteur_nom || p.structure_nom || 'Conducteur désigné';
        const condPermis = edl.conducteur_permis || '';
        const condPermisDate = edl.conducteur_permis_date || '';
        const cautionNum = edl.caution_numero || '';
        const cautionBanque = edl.caution_banque || '';
        const depKm = edl.depart_km !== undefined ? edl.depart_km : 0;
        const depCarb = edl.depart_carburant || '4/4 (Plein)';
        const depPropInt = edl.depart_proprete_int || 'Très propre';
        const depPropExt = edl.depart_proprete_ext || 'Propre';
        const depAnomalies = edl.depart_anomalies || 'Véhicule propre. Rayure superficielle aile arrière droite (15 cm).';
        const retKm = edl.retour_km !== undefined ? edl.retour_km : (depKm + (p.quantite || 250));
        const retKmDiff = Math.max(0, retKm - depKm);
        const retCarb = edl.retour_carburant || '4/4 (Plein)';
        const retPropInt = edl.retour_proprete_int || 'Propre';
        const retPropExt = edl.retour_proprete_ext || 'Propre';
        const retIncidents = edl.retour_incidents || 'Rien à signaler au retour.';
        const cautionStatut = edl.retour_caution_statut || 'RESTITUEE';
        const isClos = Boolean(edl.etat_des_lieux_clos);
        const tarifKm = parseFloat(p.tarif_unitaire_applique) || 0.48;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full mx-auto overflow-hidden animate-scale-in text-slate-800">
                <!-- En-tête -->
                <div class="p-5 bg-gradient-to-r from-cyan-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 text-[10px] font-extrabold uppercase">
                                Document Officiel Dématérialisé (100% Textuel)
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-white/10 text-white">
                                ${immat}
                            </span>
                        </div>
                        <h2 class="text-base font-extrabold text-white mt-1">État des Lieux Contradictoire — Minibus CCMVR</h2>
                        <p class="text-xs text-cyan-200 mt-0.5">Bénéficiaire : ${p.structure_nom} • Sortie du ${fin.formatDate(p.date_debut)} au ${fin.formatDate(p.date_fin)}</p>
                    </div>
                    <button type="button" onclick="CCMVR.App.closeModal()" class="text-white/70 hover:text-white p-2 rounded-xl text-lg font-bold hover:bg-white/10">✕</button>
                </div>

                <!-- Formulaire en 2 colonnes (Départ / Retour) -->
                <form onsubmit="CCMVR.App.handleSaveEtatDesLieux(event, '${prestationId}')" class="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-xs">
                    
                    <!-- Bandeau Conducteur & Caution -->
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <span class="text-slate-500 font-semibold block text-[10px] uppercase">Conducteur Habilité</span>
                            <input type="text" id="edl-cond-nom" value="${condNom}" class="input-clean font-bold text-xs mt-1" required/>
                        </div>
                        <div>
                            <span class="text-slate-500 font-semibold block text-[10px] uppercase">N° Permis de Conduire</span>
                            <input type="text" id="edl-cond-permis" value="${condPermis}" placeholder="Ex: 14AA987654" class="input-clean font-mono-code text-xs mt-1" required/>
                        </div>
                        <div>
                            <span class="text-slate-500 font-semibold block text-[10px] uppercase">Chèque de Caution (500 €)</span>
                            <input type="text" id="edl-caution" value="${cautionNum ? cautionNum + ' (' + cautionBanque + ')' : '500 € — Reçu physique'}" class="input-clean text-xs mt-1"/>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <!-- COLONNE 1 : ÉTAT DES LIEUX DE DÉPART (PRISE EN CHARGE) -->
                        <div class="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                            <div class="flex items-center justify-between pb-2 border-b border-blue-200">
                                <h3 class="text-xs font-extrabold uppercase text-blue-950 flex items-center gap-1.5">
                                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                    Départ • Prise en Main du Véhicule
                                </h3>
                                <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Émargé Accueil</span>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Kilométrage Compteur Départ</label>
                                    <input type="number" id="edl-dep-km" value="${depKm}" oninput="CCMVR.App.recalcEdlKm(${tarifKm})" class="input-clean font-mono-code font-bold text-xs" required/>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Niveau Carburant Départ</label>
                                    <select id="edl-dep-carb" class="input-clean text-xs">
                                        <option value="4/4 (Plein)" ${depCarb.includes('4/4') ? 'selected' : ''}>4/4 (Plein)</option>
                                        <option value="3/4" ${depCarb.includes('3/4') ? 'selected' : ''}>3/4</option>
                                        <option value="1/2" ${depCarb.includes('1/2') ? 'selected' : ''}>1/2</option>
                                        <option value="1/4" ${depCarb.includes('1/4') ? 'selected' : ''}>1/4</option>
                                    </select>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Propreté Intérieure</label>
                                    <select id="edl-dep-prop-int" class="input-clean text-xs">
                                        <option value="Très propre" ${depPropInt === 'Très propre' ? 'selected' : ''}>Très propre</option>
                                        <option value="Propre" ${depPropInt === 'Propre' ? 'selected' : ''}>Propre</option>
                                        <option value="Acceptable" ${depPropInt === 'Acceptable' ? 'selected' : ''}>Acceptable</option>
                                        <option value="Sale" ${depPropInt === 'Sale' ? 'selected' : ''}>Sale</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Propreté Extérieure</label>
                                    <select id="edl-dep-prop-ext" class="input-clean text-xs">
                                        <option value="Très propre" ${depPropExt === 'Très propre' ? 'selected' : ''}>Très propre</option>
                                        <option value="Propre" ${depPropExt === 'Propre' ? 'selected' : ''}>Propre</option>
                                        <option value="Acceptable" ${depPropExt === 'Acceptable' ? 'selected' : ''}>Acceptable</option>
                                        <option value="Sale" ${depPropExt === 'Sale' ? 'selected' : ''}>Sale</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label class="block font-semibold text-slate-700 mb-0.5">
                                    Points accidentés & Anomalies préexistantes (notés par l'Accueil)
                                </label>
                                <textarea id="edl-dep-anomalies" rows="3" class="input-clean text-xs text-slate-800" placeholder="Signalez les rayures, bosses ou anomalies constatées avant la remise des clés...">${depAnomalies}</textarea>
                                <span class="text-[10px] text-slate-500 mt-0.5 block">Pré-rempli automatiquement par l'Accueil pour protéger l'association.</span>
                            </div>
                        </div>

                        <!-- COLONNE 2 : ÉTAT DES LIEUX DE RETOUR (RESTITUTION) -->
                        <div class="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                            <div class="flex items-center justify-between pb-2 border-b border-emerald-200">
                                <h3 class="text-xs font-extrabold uppercase text-emerald-950 flex items-center gap-1.5">
                                    <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                                    Retour • Restitution du Véhicule
                                </h3>
                                <span class="px-2 py-0.5 rounded ${isClos ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-900'} text-[10px] font-bold">
                                    ${isClos ? '✓ Clôturé' : 'En attente émargement'}
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Kilométrage Compteur Retour</label>
                                    <input type="number" id="edl-ret-km" value="${retKm}" oninput="CCMVR.App.recalcEdlKm(${tarifKm})" class="input-clean font-mono-code font-bold text-xs" required/>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Niveau Carburant Restitution</label>
                                    <select id="edl-ret-carb" class="input-clean text-xs">
                                        <option value="4/4 (Plein)" ${retCarb.includes('4/4') ? 'selected' : ''}>4/4 (Plein effectué)</option>
                                        <option value="3/4" ${retCarb.includes('3/4') ? 'selected' : ''}>3/4</option>
                                        <option value="1/2" ${retCarb.includes('1/2') ? 'selected' : ''}>1/2</option>
                                        <option value="1/4" ${retCarb.includes('1/4') ? 'selected' : ''}>1/4 (Incomplet)</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Calculateur automatique de distance parcourue -->
                            <div class="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between">
                                <div>
                                    <span class="text-[10px] text-slate-500 uppercase block font-semibold">Distance parcourue</span>
                                    <span id="edl-live-diff" class="font-mono-code text-sm font-extrabold text-emerald-800">${retKmDiff} km</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] text-slate-500 uppercase block font-semibold">Valorisation (${fin.formatCurrency(tarifKm)}/km)</span>
                                    <span id="edl-live-montant" class="font-mono-code text-sm font-extrabold text-slate-900">${fin.formatCurrency(retKmDiff * tarifKm)}</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Propreté Intérieure Retour</label>
                                    <select id="edl-ret-prop-int" class="input-clean text-xs">
                                        <option value="Très propre" ${retPropInt === 'Très propre' ? 'selected' : ''}>Très propre</option>
                                        <option value="Propre" ${retPropInt === 'Propre' ? 'selected' : ''}>Propre</option>
                                        <option value="Acceptable" ${retPropInt === 'Acceptable' ? 'selected' : ''}>Acceptable</option>
                                        <option value="À nettoyer" ${retPropInt === 'À nettoyer' ? 'selected' : ''}>À nettoyer</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Propreté Extérieure Retour</label>
                                    <select id="edl-ret-prop-ext" class="input-clean text-xs">
                                        <option value="Très propre" ${retPropExt === 'Très propre' ? 'selected' : ''}>Très propre</option>
                                        <option value="Propre" ${retPropExt === 'Propre' ? 'selected' : ''}>Propre</option>
                                        <option value="Acceptable" ${retPropExt === 'Acceptable' ? 'selected' : ''}>Acceptable</option>
                                        <option value="À nettoyer" ${retPropExt === 'À nettoyer' ? 'selected' : ''}>À nettoyer</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label class="block font-semibold text-slate-700 mb-0.5">
                                    Incidents, chocs ou remarques au retour (rempli par l'association)
                                </label>
                                <textarea id="edl-ret-incidents" rows="2" class="input-clean text-xs text-slate-800" placeholder="Signalez tout incident, choc éventuel, voyant tableau de bord...">${retIncidents}</textarea>
                            </div>

                            <div class="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-0.5">Sort du chèque de caution</label>
                                    <select id="edl-caution-statut" class="input-clean text-xs font-semibold">
                                        <option value="RESTITUEE" ${cautionStatut === 'RESTITUEE' ? 'selected' : ''}>✓ Caution Restituée</option>
                                        <option value="RETENUE" ${cautionStatut === 'RETENUE' ? 'selected' : ''}>âš ï¸ Caution Retenue (Dégâts)</option>
                                        <option value="EN_ATTENTE" ${cautionStatut === 'EN_ATTENTE' ? 'selected' : ''}>â³ En attente de contrôle</option>
                                    </select>
                                </div>
                                <div class="flex items-center pt-4">
                                    <label class="flex items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" id="edl-clos" ${isClos ? 'checked' : ''} class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"/>
                                        <span class="text-xs font-bold text-slate-900">Clôturer l'état des lieux</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Pied d'action -->
                    <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onclick="CCMVR.App.printEtatDesLieux('${prestationId}')" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition">
                            🖨️ï¸ Imprimer la Fiche A4 Officielle
                        </button>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold">
                                Annuler
                            </button>
                            <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition">
                                💾 Enregistrer l'État des Lieux dans Supabase
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');
    },

    recalcEdlKm(tarifKm = 0.48) {
        const dep = parseFloat(document.getElementById('edl-dep-km')?.value) || 0;
        const ret = parseFloat(document.getElementById('edl-ret-km')?.value) || 0;
        const diff = Math.max(0, ret - dep);
        const diffEl = document.getElementById('edl-live-diff');
        const montantEl = document.getElementById('edl-live-montant');
        if (diffEl) diffEl.textContent = `${diff} km`;
        if (montantEl) montantEl.textContent = window.CCMVR.FinanceEngine.formatCurrency(diff * tarifKm);
    },

    async handleSaveEtatDesLieux(e, prestationId) {
        e.preventDefault();
        const condNom = document.getElementById('edl-cond-nom')?.value.trim() || '';
        const condPermis = document.getElementById('edl-cond-permis')?.value.trim() || '';
        const caution = document.getElementById('edl-caution')?.value.trim() || '';
        const depKm = parseFloat(document.getElementById('edl-dep-km')?.value) || 0;
        const depCarb = document.getElementById('edl-dep-carb')?.value || '';
        const depPropInt = document.getElementById('edl-dep-prop-int')?.value || '';
        const depPropExt = document.getElementById('edl-dep-prop-ext')?.value || '';
        const depAnomalies = document.getElementById('edl-dep-anomalies')?.value.trim() || '';
        const retKm = parseFloat(document.getElementById('edl-ret-km')?.value) || 0;
        const retCarb = document.getElementById('edl-ret-carb')?.value || '';
        const retPropInt = document.getElementById('edl-ret-prop-int')?.value || '';
        const retPropExt = document.getElementById('edl-ret-prop-ext')?.value || '';
        const retIncidents = document.getElementById('edl-ret-incidents')?.value.trim() || '';
        const cautionStatut = document.getElementById('edl-caution-statut')?.value || 'RESTITUEE';
        const isClos = Boolean(document.getElementById('edl-clos')?.checked);
        const kmParcourus = Math.max(0, retKm - depKm);

        const edlPayload = {
            conducteur_nom: condNom,
            conducteur_permis: condPermis,
            caution_details: caution,
            depart_km: depKm,
            depart_carburant: depCarb,
            depart_proprete_int: depPropInt,
            depart_proprete_ext: depPropExt,
            depart_anomalies: depAnomalies,
            retour_km: retKm,
            retour_km_parcourus: kmParcourus,
            retour_carburant: retCarb,
            retour_proprete_int: retPropInt,
            retour_proprete_ext: retPropExt,
            retour_incidents: retIncidents,
            retour_caution_statut: cautionStatut,
            etat_des_lieux_clos: isClos,
            updated_at: new Date().toISOString()
        };

        try {
            await window.CCMVR.Store.saveEtatDesLieuxPrestation(prestationId, edlPayload);
            this.closeModal();
            this.renderMainView();
            this.toast(`État des lieux enregistré avec succès (${kmParcourus} km validés) !`, 'success');
        } catch (err) {
            this.toast('Erreur lors de l\'enregistrement : ' + err.message, 'error');
        }
    },

    printEtatDesLieux(prestationId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        const p = store.getEnrichedPrestations(null, annee).find(x => x.id === prestationId);
        if (!p) return;

        let edl = {};
        try {
            if (p.observations && p.observations.startsWith('{')) {
                edl = JSON.parse(p.observations);
            }
        } catch (_) {}

        const immat = edl.immatriculation || 'GK-412-VR';
        const depKm = edl.depart_km || 0;
        const retKm = edl.retour_km || (depKm + (p.quantite || 250));
        const diffKm = Math.max(0, retKm - depKm);
        const tarifKm = parseFloat(p.tarif_unitaire_applique) || 0.48;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8"/>
                <title>Fiche d'État des Lieux Minibus — ${p.structure_nom}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #1e293b; padding: 25px; max-width: 800px; margin: 0 auto; }
                    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                    .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
                    .box h2 { font-size: 13px; margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
                    .label { color: #64748b; font-weight: 600; }
                    .val { font-weight: 700; }
                    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
                    .sign-box { border: 1px dashed #94a3b8; border-radius: 8px; height: 90px; padding: 10px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Communauté de Communes Marches du Velay Rochebaron</h1>
                        <p style="margin: 3px 0; color: #64748b;">Fiche Contradictoire d'État des Lieux — Flotte Minibus Communautaire</p>
                    </div>
                    <div style="text-align: right; font-mono: monospace;">
                        <strong>Véhicule : ${immat}</strong><br/>
                        Exercice Civil ${annee}
                    </div>
                </div>

                <div class="box" style="margin-bottom: 15px;">
                    <div class="row"><span class="label">Association Bénéficiaire :</span><span class="val">${p.structure_nom}</span></div>
                    <div class="row"><span class="label">Conducteur Habilité :</span><span class="val">${edl.conducteur_nom || 'Non renseigné'} (Permis N° ${edl.conducteur_permis || 'Non renseigné'})</span></div>
                    <div class="row"><span class="label">Chèque de Caution :</span><span class="val">${edl.caution_details || 'Dépôt physique 500 € validé'}</span></div>
                    <div class="row"><span class="label">Dates de Mise à Disposition :</span><span class="val">Du ${fin.formatDate(p.date_debut)} au ${fin.formatDate(p.date_fin)}</span></div>
                </div>

                <div class="grid">
                    <div class="box">
                        <h2>1. Prise en Charge (Départ)</h2>
                        <div class="row"><span class="label">Compteur Départ :</span><span class="val">${depKm} km</span></div>
                        <div class="row"><span class="label">Carburant :</span><span class="val">${edl.depart_carburant || '4/4'}</span></div>
                        <div class="row"><span class="label">Propreté Int. / Ext. :</span><span class="val">${edl.depart_proprete_int || 'Propre'} / ${edl.depart_proprete_ext || 'Propre'}</span></div>
                        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
                            <span class="label">Anomalies préexistantes constatées :</span>
                            <p style="margin: 4px 0 0; font-size: 11px;">${edl.depart_anomalies || 'Aucun dommage préexistant.'}</p>
                        </div>
                    </div>

                    <div class="box">
                        <h2>2. Restitution (Retour)</h2>
                        <div class="row"><span class="label">Compteur Retour :</span><span class="val">${retKm} km</span></div>
                        <div class="row"><span class="label">Distance Parcourue :</span><span class="val">${diffKm} km</span></div>
                        <div class="row"><span class="label">Valorisation Réalisée :</span><span class="val">${fin.formatCurrency(diffKm * tarifKm)}</span></div>
                        <div class="row"><span class="label">Carburant Retour :</span><span class="val">${edl.retour_carburant || '4/4'}</span></div>
                        <div class="row"><span class="label">Propreté Int. / Ext. :</span><span class="val">${edl.retour_proprete_int || 'Propre'} / ${edl.retour_proprete_ext || 'Propre'}</span></div>
                        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
                            <span class="label">Incidents / Remarques :</span>
                            <p style="margin: 4px 0 0; font-size: 11px;">${edl.retour_incidents || 'Véhicule restitué en bon état.'}</p>
                        </div>
                    </div>
                </div>

                <div class="sign-grid">
                    <div class="sign-box">
                        <span style="font-weight: 700; color: #475569;">Pour la Collectivité (Service Accueil) :</span>
                        <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">Signature & date</p>
                    </div>
                    <div class="sign-box">
                        <span style="font-weight: 700; color: #475569;">Pour l'Association (Conducteur) :</span>
                        <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">Signature précédée de la mention « Bon pour accord »</p>
                    </div>
                </div>
                <script>window.onload = function() { window.print(); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    // Pointage Régie (Bâtiments, Agents Techniques, Salles, Informatique),

    renderNatPointageRegie(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        const prestations = store.getEnrichedPrestations(null, annee);
        const structuresOptions = store.state.structures.map(s => `<option value="${s.id}">${s.nom_officiel}</option>`).join('');
        const typesOptions = store.state.types_prestations_nature
            .filter(t => t.code !== 'MINIBUS_KM')
            .map(t => {
                const tarif = store.getTarifUnitaire(t.id, annee);
                return `<option value="${t.id}" data-tarif="${tarif}" data-unite="${t.unite_mesure}">[${t.pole_gestionnaire}] ${t.libelle} (${fin.formatCurrency(tarif)} / ${t.unite_mesure})</option>`;
            }).join('');

        const rowsHtml = prestations.map(p => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="py-3 px-4 text-xs text-slate-600">${fin.formatDate(p.date_debut)}</td>
                <td class="py-3 px-4 text-xs font-bold text-slate-900">${p.structure_nom}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${p.pole_gestionnaire}</span>
                    <span class="text-xs font-medium text-slate-800 ml-1">${p.type_libelle}</span>
                </td>
                <td class="py-3 px-4 text-xs text-slate-500">${p.observations || '—'}</td>
                <td class="py-3 px-4 text-center font-mono-code text-xs font-semibold">${p.quantite} ${p.unite}</td>
                <td class="py-3 px-4 text-right font-mono-code text-xs text-slate-500">${fin.formatCurrency(p.tarif_unitaire_applique)}</td>
                <td class="py-3 px-4 text-right font-mono-code text-xs font-extrabold text-emerald-700">${fin.formatCurrency(p.montant_total_valorise)}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Bannière Service Bâtiments & Logistique -->
                <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                            Service Bâtiments, Logistique & DSI • Concours en Nature
                        </span>
                        <h1 class="text-xl font-extrabold text-white mt-1">Pointage des Locaux, Gymnases, Heures d'Agents Techniques & Matériel</h1>
                        <p class="text-xs text-emerald-100 mt-0.5">Pointage des locaux, matériel événementiel et régie technique.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <button onclick="CCMVR.App.openDirectInKindGrantModal()" class="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold shadow-md transition flex items-center gap-1.5" title="Accorder directement une aide en nature d'office sans dossier préalable">
                            <i data-lucide="gift" class="w-4 h-4"></i> + Aide en Nature d'Office
                        </button>
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'CONV_LOCAUX')" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md transition">
                            + Convention Locaux
                        </button>
                        <button onclick="CCMVR.App.openCreateOrEditConventionModal(null, null, null, 'CONV_PERSONNEL')" class="px-3.5 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-xl text-xs font-extrabold shadow-md transition">
                            + Convention Personnel
                        </button>
                        <button onclick="CCMVR.App.switchTab('pole_annexe')" class="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition">
                            Modèles d'Annexes
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="card-minimal card-accent-emerald p-5 space-y-4">
                        <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i data-lucide="plus-square" class="w-4 h-4 text-emerald-600"></i>
                            Pointer une Prestation Bâtiments / Technique
                        </h2>
                        <form onsubmit="CCMVR.App.handleAddPrestationRegie(event)" class="space-y-3 text-xs">
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Structure bénéficiaire</label>
                                <select id="regie-struct" required class="input-clean">${structuresOptions}</select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Nature de la prestation (Barème ${annee})</label>
                                <select id="regie-type" required class="input-clean">${typesOptions}</select>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Date d'intervention</label>
                                    <input type="date" id="regie-date" required value="${annee}-05-18" class="input-clean"/>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Quantité (heures, jours, unités)</label>
                                    <input type="number" id="regie-qte" step="0.5" min="0.5" required value="8" class="input-clean font-mono-code font-bold"/>
                                </div>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Détail de l'intervention (affiché sur l'attestation)</label>
                                <input type="text" id="regie-obs" required placeholder="Ex: Montage chapiteau & raccordement électrique tournoi" class="input-clean"/>
                            </div>
                            <button type="submit" class="w-full py-2.5 btn-primary text-xs font-semibold">
                                Imputer au Compte de l'Association
                            </button>
                        </form>
                    </div>

                    <div class="lg:col-span-2 card-minimal card-accent-blue overflow-hidden">
                        <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                            <span class="text-xs font-bold text-slate-900 uppercase">Journal Consolidé des Interventions & Concours en Nature (${annee})</span>
                            <span class="text-xs text-slate-500">${prestations.length} ligne(s)</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                        <th class="py-2.5 px-4">Date</th>
                                        <th class="py-2.5 px-4">Association</th>
                                        <th class="py-2.5 px-4">Service & Prestation</th>
                                        <th class="py-2.5 px-4">Détail</th>
                                        <th class="py-2.5 px-4 text-center">Volume</th>
                                        <th class="py-2.5 px-4 text-right">Coût Unitaire</th>
                                        <th class="py-2.5 px-4 text-right">Valorisation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async handleAddPrestationRegie(e) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        const structId = document.getElementById('regie-struct').value;
        const typeId = document.getElementById('regie-type').value;
        const dateDebut = document.getElementById('regie-date').value;
        const qte = parseFloat(document.getElementById('regie-qte').value) || 1;
        const obs = document.getElementById('regie-obs').value.trim();

        try {
            await store.addPrestationNature({
                structure_id: structId,
                type_prestation_id: typeId,
                annee: store.activeMillesime,
                date_debut: dateDebut,
                quantite: qte,
                observations: obs,
                statut: 'VALIDE'
            });
            this.renderMainView();
            this.toast('Prestation enregistrée et valorisée automatiquement !');
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    // Grille Tarifaire par Année Civile (Millésimes 2026 / 2027 / 2028),

    renderNatTarifsAndOverview(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        const types = store.state.types_prestations_nature;

        const rowsHtml = types.map(t => {
            const tarif2026 = store.getTarifUnitaire(t.id, 2026);
            const tarifActif = store.getTarifUnitaire(t.id, annee);
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${t.pole_gestionnaire}</span>
                    </td>
                    <td class="py-3 px-4 text-xs font-bold text-slate-900">${t.libelle}</td>
                    <td class="py-3 px-4 text-xs text-slate-500 font-mono-code">${t.unite_mesure}</td>
                    <td class="py-3 px-4 text-right font-mono-code text-xs text-slate-500">${fin.formatCurrency(tarif2026)}</td>
                    <td class="py-3 px-4 text-right">
                        <div class="inline-flex items-center gap-1.5">
                            <input type="number" step="0.01" id="tarif-input-${t.id}" value="${tarifActif}" class="w-24 px-2 py-1 text-right font-mono-code text-xs font-bold border border-slate-300 rounded"/>
                            <span class="text-xs text-slate-500">€ / ${t.unite_mesure}</span>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <button onclick="CCMVR.App.handleSaveTarif('${t.id}', ${annee})" class="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium">
                            Actualiser ${annee}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 class="text-xl font-bold text-slate-900">Barème Annuel des Concours en Nature — Millésime Civil ${annee}</h1>
                        <p class="text-xs text-slate-500 mt-0.5">Barème officiel de valorisation des concours en nature (Art. L. 2313-1 CGCT).</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="CCMVR.App.switchMillesime(2026)" class="px-3 py-1.5 rounded-lg text-xs font-bold ${annee === 2026 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}">Millésime 2026</button>
                        <button onclick="CCMVR.App.switchMillesime(2027)" class="px-3 py-1.5 rounded-lg text-xs font-bold ${annee === 2027 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}">Millésime 2027</button>
                        <button onclick="CCMVR.App.switchMillesime(2028)" class="px-3 py-1.5 rounded-lg text-xs font-bold ${annee === 2028 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}">Millésime 2028</button>
                        <button onclick="CCMVR.App.openDirectInKindGrantModal()" class="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm" title="Attribuer une aide en nature d'office">
                            <i data-lucide="gift" class="w-3.5 h-3.5"></i> + Attribuer Aide d'Office
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Création d'un nouveau critère de valorisation en nature -->
                    <div class="card-minimal p-5 space-y-4">
                        <h2 class="text-sm font-bold text-slate-900">Créer un Nouveau Type de Prestation en Nature</h2>
                        <form onsubmit="CCMVR.App.handleAddTypeNature(event)" class="space-y-3 text-xs">
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Pôle gestionnaire</label>
                                <select id="tn-pole" class="input-clean">
                                    <option value="BATIMENTS">Pôle Bâtiments & Salles</option>
                                    <option value="TECHNIQUE">Services Techniques & Flotte</option>
                                    <option value="DSI">Pôle Informatique (DSI)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Désignation de la ressource</label>
                                <input type="text" id="tn-libelle" required placeholder="Ex: Prêt sono portable / Barrières Vauban" class="input-clean"/>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Unité de calcul</label>
                                    <input type="text" id="tn-unite" required placeholder="heure, jour, km..." value="forfait_jour" class="input-clean"/>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Tarif ${annee} (€)</label>
                                    <input type="number" step="0.5" id="tn-tarif" required value="45" class="input-clean font-mono-code font-bold"/>
                                </div>
                            </div>
                            <button type="submit" class="w-full py-2.5 btn-accent text-xs font-semibold">
                                Ajouter à la grille tarifaire
                            </button>
                        </form>
                    </div>

                    <div class="lg:col-span-2 card-minimal overflow-hidden">
                        <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                            <span class="text-xs font-bold text-slate-900 uppercase">Grille Tarifaire Unitaire Officielle — Exercice ${annee}</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                        <th class="py-2.5 px-4">Service</th>
                                        <th class="py-2.5 px-4">Intitulé de la ressource</th>
                                        <th class="py-2.5 px-4">Unité</th>
                                        <th class="py-2.5 px-4 text-right">Rappel 2026</th>
                                        <th class="py-2.5 px-4 text-right">Tarif Unitaire ${annee}</th>
                                        <th class="py-2.5 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async handleSaveTarif(typeId, annee) {
        const val = parseFloat(document.getElementById(`tarif-input-${typeId}`)?.value) || 0;
        try {
            await window.CCMVR.Store.upsertTarifMillesime(typeId, annee, val);
            this.renderMainView();
            this.toast(`Tarif ${annee} mis à jour à ${window.CCMVR.FinanceEngine.formatCurrency(val)} !`);
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    async handleAddTypeNature(e) {
        e.preventDefault();
        const pole = document.getElementById('tn-pole').value;
        const libelle = document.getElementById('tn-libelle').value.trim();
        const unite = document.getElementById('tn-unite').value.trim();
        const tarif = parseFloat(document.getElementById('tn-tarif').value) || 0;
        try {
            await window.CCMVR.Store.addTypePrestationNature({
                pole_gestionnaire: pole,
                libelle,
                unite_mesure: unite,
                tarif_initial: tarif
            });
            this.renderMainView();
            this.toast(`Ressource "${libelle}" ajoutée au barème !`);
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    // Génération des Attestations Annuelles d'Aides en Nature par Association,

    renderNatAttestations(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;

        const cardsHtml = store.state.structures.map(s => {
            const prestations = store.getEnrichedPrestations(s.id, annee);
            const totalVal = prestations.reduce((acc, p) => acc + p.montant_total_valorise, 0);
            return `
                <div class="card-minimal p-5 flex flex-col justify-between space-y-4">
                    <div>
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-mono-code text-slate-500">SIRET ${s.siret}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Exercice ${annee}</span>
                        </div>
                        <h3 class="text-base font-bold text-slate-900 mt-1">${s.nom_officiel}</h3>
                        <p class="text-xs text-slate-500">${s.ville || 'CCMVR'} • Représentant : ${s.representant_prenom || ''} ${s.representant_nom || ''}</p>
                        <div class="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                                <div class="text-[11px] text-slate-500">Prestations pointées (${annee})</div>
                                <div class="text-xs font-bold text-slate-800">${prestations.length} intervention(s) / sortie(s)</div>
                            </div>
                            <div class="text-right">
                                <div class="text-[11px] text-slate-500">Total valorisé L. 2313-1</div>
                                <div class="text-base font-extrabold text-emerald-700 font-mono-code">${fin.formatCurrency(totalVal)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-2">
                        <button onclick="CCMVR.App.openAttestationPreviewModal('${s.id}')" class="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                            <i data-lucide="award" class="w-4 h-4 text-emerald-400"></i> Éditer l'Attestation Officielle
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <div>
                    <h1 class="text-xl font-bold text-slate-900">Attestations Annuelles de Concours en Nature (Art. L. 2313-1 du CGCT)</h1>
                    <p class="text-xs text-slate-500 mt-0.5">Clôturez et éditez en un clic les certificats annuels valorisés en coût complet pour les associations et pour l'annexe budgétaire M57 de la CCMVR.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    ${cardsHtml}
                </div>
            </div>
        `;
    },

    // ==========================================================================
    // 6. PANEL COMPLET DES CONVENTIONS, JAUGE TEMPORELLE, ÉDITEUR ANNEXE 1 & FAQ
    // ==========================================================================
    registreSearchQuery: '',
    registrePoleFilter: 'ALL',
    registreStatutFilter: 'ALL',
    registreTypeFilter: 'ALL',
    activePoleAnnexeType: 'COM_OBJECTIFS'

};

// Export ES6 si utilisé via bundler/modules natifs
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CCMVR.Modules.Regie;
}
