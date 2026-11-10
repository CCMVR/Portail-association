// ==============================================================================
// MODULE CCMVR: MODALES D'INSTRUCTION 360°, WORKFLOW & VALORISATION EN NATURE
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.Modules.ModalsDossier = {

    openDossierModal(dossierId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const d = store.getEnrichedDossiers().find(x => x.id === dossierId);
        if (!d) return;

        const b = d.budget || {};
        const ratios = fin.calculateFinancialRatios({ ...b, subvention_ccmvr_demandee: d.montant_demande });
        const warningsHtml = ratios.warnings.map(w => `
            <div class="p-3 rounded-lg border text-xs ${w.level === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}">
                <div class="font-bold">⚠️ ${w.title}</div>
                <div class="text-[11px] mt-0.5">${w.desc}</div>
            </div>
        `).join('');

        const dossierPrestations = (store.state.prestations_nature_consommees || [])
            .filter(p => p.dossier_id === d.id || (p.structure_id === d.structure_id && Number(p.annee) === Number(d.annee)))
            .map(p => {
                const t = store.state.types_prestations_nature.find(x => x.id === p.type_prestation_id);
                return {
                    ...p,
                    type_libelle: t ? t.libelle : 'Ressource',
                    type_unite: t ? t.unite_mesure : ''
                };
            });
        const totalNatureDossier = dossierPrestations.reduce((acc, p) => acc + (parseFloat(p.montant_total_valorise) || 0), 0);

        // Pièces Le Compte Asso / RNA
        const s = d.structure || {};
        const apiInfo = fin.getEnrichedApiEntrepriseData(s);
        const rnaDocs = apiInfo.documents_rna || [];

        const docs = fin.getLeCompteAssoChecklist(s);
        const redDocs = docs.filter(x => x.status === 'RED');
        const yellowDocs = docs.filter(x => x.status === 'YELLOW');
        const docsSummaryBadge = redDocs.length > 0
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">🔴 ${redDocs.length} pièce(s) manquante(s)</span>`
            : yellowDocs.length > 0
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">🟡 ${yellowDocs.length} en retard (N-2)</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">🟢 10/10 conformes</span>`;

        const docsRowsHtml = docs.map(doc => {
            const safeNom = (doc.nomFichier || doc.nom).replace(/'/g, "\\'");
            const safeDocType = doc.nom.replace(/'/g, "\\'");
            let statusPill = doc.status === 'RED'
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">🔴 Manquant</span>`
                : doc.status === 'YELLOW'
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">🟡 Retard (${doc.validite})</span>`
                    : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">🟢 À jour (${doc.validite})</span>`;

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs ${doc.status === 'RED' ? 'bg-rose-50/30' : doc.status === 'YELLOW' ? 'bg-amber-50/30' : ''}">
                    <td class="py-1.5 px-3 font-semibold text-slate-900">
                        <div class="flex items-center gap-1.5">
                            <span>${doc.nom}</span>
                            ${doc.isMandatoryAnnual ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800">Annuel</span>' : ''}
                        </div>
                    </td>
                    <td class="py-1.5 px-3 text-slate-500 text-[11px]">${doc.source || 'RNA'}</td>
                    <td class="py-1.5 px-3 text-slate-600 text-[11px]">${doc.dateCharge || '—'}</td>
                    <td class="py-1.5 px-3">${statusPill}</td>
                    <td class="py-1.5 px-3 text-right">
                        ${doc.url ? `
                            <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeNom}', url: '${doc.url}', date: '${doc.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso', docId: '${doc.id}', structKey: '${s.id}' })" class="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs">
                                <i data-lucide="eye" class="w-3 h-3 text-blue-600"></i> Voir
                            </button>
                        ` : '<span class="text-slate-400 text-[11px]">—</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        // Actes et statuts directs au RNA (Ministère de l'Intérieur)
        const rnaDocsRowsHtml = rnaDocs.length === 0 ? `
            <tr><td colspan="4" class="py-2.5 px-3 text-center text-slate-400 italic">Aucun document statutory direct dans le flux RNA</td></tr>
        ` : rnaDocs.map(doc => {
            const safeTitle = (doc.libelle || 'Document RNA').replace(/'/g, "\\'");
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs">
                    <td class="py-2 px-3 font-semibold text-slate-900">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="file-text" class="w-3.5 h-3.5 text-indigo-600"></i>
                            <span>${doc.libelle || 'Pièce statutaire'}</span>
                        </div>
                    </td>
                    <td class="py-2 px-3 text-slate-500 text-[11px] font-mono-code">${doc.date || doc.annee || '—'}</td>
                    <td class="py-2 px-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">Flux RNA Officiel</span>
                    </td>
                    <td class="py-2 px-3 text-right space-x-1.5">
                        ${doc.url ? `
                            <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeTitle}', url: '${doc.url}', date: '${doc.date || doc.annee || ''}', type: 'RNA', structKey: '${s.id}' })" class="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs">
                                <i data-lucide="eye" class="w-3 h-3 text-indigo-600"></i> Visualiser
                            </button>
                            <button type="button" onclick="CCMVR.App.downloadDocumentOrAttestation({ title: '${safeTitle}', url: '${doc.url}', date: '${doc.date || doc.annee || ''}', type: 'RNA', structKey: '${s.id}' })" class="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[11px] font-semibold inline-flex items-center gap-1">
                                <i data-lucide="download" class="w-3 h-3"></i> Télécharger
                            </button>
                        ` : '<span class="text-slate-400 text-[11px]">—</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        // Indicateurs d'activité spécifiques au pôle et calcul de subvention
        const criteresPole = store.state.criteres_metiers.filter(c => c.pole_id === d.pole_id);
        const poleCode = d.pole?.code || '';
        const allVals = (Array.isArray(d.valeurs) && d.valeurs.length > 0)
            ? d.valeurs
            : (Array.isArray(d.criteres_reponses) && d.criteres_reponses.length > 0
                ? d.criteres_reponses
                : []);
        const varsDict = {};
        allVals.forEach(v => {
            const code = v.critere_code || v.code_variable || v.code || v.critere_id;
            if (code) {
                varsDict[code] = (v.valeur_numerique !== null && v.valeur_numerique !== undefined)
                    ? v.valeur_numerique
                    : ((v.valeur_booleenne !== null && v.valeur_booleenne !== undefined)
                        ? v.valeur_booleenne
                        : v.valeur_texte);
            }
        });

        // Évaluation via le Moteur de Grille Multi-Volets selon le Dispositif / Catégorie
        const catGrid = store.getPoleCategory(poleCode, d.categorie_id);
        const categorieNom = d.categorie_nom || (catGrid ? catGrid.nom : null);
        const scoringEvaluation = fin.evaluatePoleDossier(poleCode, varsDict, catGrid);
        const montantFormuleTheorique = scoringEvaluation.subvention_totale || 0;

        // Récupération des pièces justificatives rattachées au dossier
        const justifsDossier = store.getJustificatifsForDossier(d.id);
        const justifsListHtml = justifsDossier.length === 0 ? `
            <div class="p-3 bg-white rounded-lg border border-slate-200 text-slate-400 text-xs italic text-center">
                Aucun justificatif téléversé pour ce dossier.
            </div>
        ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${justifsDossier.map(j => `
                    <div class="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-slate-900 truncate" title="${j.nom_fichier}">
                                📎 ${j.nom_fichier}
                            </div>
                            <div class="text-[10px] text-slate-500">
                                ${j.volet_id ? j.volet_id.toUpperCase() : 'Pièce'} • ${j.taille_octets ? Math.round(j.taille_octets / 1024) + ' Ko' : 'Fichier'} • Déposé le ${new Date(j.date_depot).toLocaleDateString()}
                            </div>
                        </div>
                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${j.nom_fichier.replace(/'/g, "\\'")}', url: '${j.url}', date: '${new Date(j.date_depot).toLocaleDateString()}', type: 'Justificatif Subvention', source: 'Dossier #${d.code_hex}' })" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-extrabold flex items-center gap-1 transition shrink-0">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i> Voir
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // Affichage des volets de calcul (selon le dispositif actif ou barème standard)
        let scoringSectionHtml = '';
        if (scoringEvaluation.volets_breakdown && scoringEvaluation.volets_breakdown.length > 0) {
            const vb = scoringEvaluation.volets_breakdown || [];
            scoringSectionHtml = `
                <div class="space-y-3">
                    <div class="overflow-x-auto rounded-xl border border-orange-200 bg-white shadow-2xs">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-orange-50/80 text-orange-950 font-extrabold uppercase text-[10px] border-b border-orange-200">
                                <tr>
                                    <th class="p-2.5">Volet d'Évaluation</th>
                                    <th class="p-2.5 text-center">Points</th>
                                    <th class="p-2.5 text-right">Aides Directes</th>
                                    <th class="p-2.5">Détails & Justificatifs</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${vb.map(v => `
                                    <tr class="hover:bg-slate-50/60">
                                        <td class="p-2.5 font-bold text-slate-900">${v.titre}</td>
                                        <td class="p-2.5 text-center font-mono-code font-black text-orange-600">${v.points > 0 ? v.points + ' pts' : '—'}</td>
                                        <td class="p-2.5 text-right font-mono-code font-extrabold text-indigo-700">${v.aides_euros > 0 ? fin.formatCurrency(v.aides_euros) : '—'}</td>
                                        <td class="p-2.5 text-slate-600 text-[11px]">${v.details}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot class="bg-slate-900 text-white font-extrabold">
                                <tr>
                                    <td class="p-3">TOTAL CALCULÉ (Valeur point : ${scoringEvaluation.valeur_point} €)</td>
                                    <td class="p-3 text-center font-mono-code font-black text-orange-400 text-sm">${scoringEvaluation.total_points} pts</td>
                                    <td class="p-3 text-right font-mono-code font-black text-emerald-400 text-sm">${fin.formatCurrency(scoringEvaluation.total_aides_directes_euros)}</td>
                                    <td class="p-3 text-right">
                                        <span class="text-xs text-slate-400 mr-2">Subvention théorique :</span>
                                        <strong class="text-base font-mono-code text-emerald-400">${fin.formatCurrency(scoringEvaluation.subvention_totale)}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        } else {
            scoringSectionHtml = criteresPole.length === 0 ? `
                <div class="col-span-full p-3 text-center text-slate-400 italic bg-white rounded-lg border border-slate-200 text-xs">
                    Aucun indicateur d'activité spécifique paramétré pour ce pôle.
                </div>
            ` : `
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    ${criteresPole.map(c => {
                        const v = (d.valeurs || []).find(x => x.critere_id === c.id || x.critere_code === c.code_variable);
                        let valDisplay = 'Non renseigné';
                        if (v) {
                            if (v.valeur_numerique !== null && v.valeur_numerique !== undefined) valDisplay = `${v.valeur_numerique} ${c.unite_mesure || ''}`;
                            else if (v.valeur_booleenne !== null && v.valeur_booleenne !== undefined) valDisplay = v.valeur_booleenne ? '✓ Oui' : '✕ Non';
                            else if (v.valeur_texte) valDisplay = v.valeur_texte;
                        }
                        return `
                            <div class="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-xs">
                                <span class="text-[10px] uppercase font-bold text-slate-500 block truncate" title="${c.libelle}">${c.libelle}</span>
                                <strong class="text-xs font-mono-code ${valDisplay === 'Non renseigné' ? 'text-slate-400 font-normal italic' : 'text-slate-900'}">${valDisplay}</strong>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        const cfg = window.CCMVR.CONFIG;
        const formulaObj = (cfg.FORMULES_POLES && cfg.FORMULES_POLES[d.pole?.code]) || { expression: '', description: 'Barème standard du pôle' };

        // Historique chronologique des arbitrages et décisions
        const historique = d.historique_etapes || [];
        const historiqueHtml = historique.length === 0 ? `
            <div class="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-400 italic text-[11px] text-center">
                Dépôt initial enregistré. Aucun arbitrage postérieur pour le moment.
            </div>
        ` : `
            <div class="space-y-1.5 max-h-44 overflow-y-auto">
                ${historique.map(h => `
                    <div class="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div>
                            <div class="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${h.etape === 'VOTE_CONSEIL' ? 'bg-emerald-100 text-emerald-800' : h.etape === 'VALIDE_COMMISSION' ? 'bg-purple-100 text-purple-800' : h.etape === 'VISE_CDG' ? 'bg-blue-100 text-blue-800' : h.etape === 'INCOMPLET' ? 'bg-amber-100 text-amber-800' : h.etape === 'ARCHIVE_ANNULATION' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}">
                                    ${h.etape || 'Jalon'}
                                </span>
                                <span class="text-slate-500 font-normal text-[11px]">${new Date(h.date).toLocaleString('fr-FR')}</span>
                                <span class="text-slate-600 font-medium text-[11px]">par <strong>${h.acteur}</strong> (${h.role})</span>
                            </div>
                            ${h.commentaire ? `<div class="text-slate-700 text-[11px] mt-1 italic pl-1 border-l-2 border-slate-200">« ${h.commentaire} »</div>` : ''}
                        </div>
                        ${h.montant > 0 ? `
                            <div class="text-right shrink-0">
                                <span class="text-[9px] text-slate-400 block uppercase font-bold">Montant retenu</span>
                                <strong class="font-mono-code text-emerald-700 text-xs font-black">${fin.formatCurrency(h.montant)}</strong>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;

        // Nettoyage de l'annotation interne : ne jamais afficher le JSON de sérialisation
        let cleanNotes = d.notes_internes_pole || '';
        if (cleanNotes.trim().startsWith('{')) {
            const closingBraceIdx = cleanNotes.lastIndexOf('}');
            if (closingBraceIdx !== -1) {
                cleanNotes = cleanNotes.slice(closingBraceIdx + 1).trim();
            }
        }

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-6 max-h-[92vh] overflow-y-auto';

        const montantRecommande = d.montant_propose_pole || d.montant_demande;
        const isHigh = store.isDossierSoumisCdg(d);
        const isAsso = store.currentUser?.role === 'association';

        content.innerHTML = `
            <div class="p-6 space-y-4">
                <div class="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono-code text-xs font-extrabold px-2 py-0.5 bg-slate-900 text-white rounded">#${d.code_hex}</span>
                            <span class="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">${d.pole.libelle || 'Pôle'}</span>
                            ${categorieNom ? `
                                <span class="px-2 py-0.5 rounded text-xs font-extrabold bg-orange-100 text-orange-950 border border-orange-300 flex items-center gap-1 shadow-2xs">
                                    <i data-lucide="tag" class="w-3 h-3 text-orange-600"></i> ${categorieNom}
                                </span>
                            ` : ''}
                            <span class="px-2 py-0.5 rounded text-xs font-bold ${d.nature_demande === 'NATURE' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' : (d.nature_demande === 'MIXTE' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-slate-100 text-slate-700')}">
                                ${d.nature_demande === 'NATURE' ? '🚐 Concours en Nature' : (d.nature_demande === 'MIXTE' ? '🤝 Mixte (Monétaire + Nature)' : '💶 Monétaire')}
                            </span>
                            ${this.getWorkflowBadge(d.statut_workflow, d)}
                            <button type="button" onclick="CCMVR.App.openChangeDossierCategoryModal('${d.id}')" class="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition" title="Changer ou réajuster le dispositif du dossier">
                                ✏️ Dispositif
                            </button>
                        </div>
                        <h2 class="text-lg font-extrabold text-slate-900 mt-1">${s.nom_officiel || 'Association'} — ${d.intitule_projet}</h2>
                        <div class="text-xs text-slate-500">Demande : <strong class="text-slate-900">${fin.formatCurrency(d.montant_demande)}</strong> • Déposé le : ${new Date(d.date_depot || d.created_at || Date.now()).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <button onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
                </div>

                <!-- SUIVI SIGNATURES CONVENTION SI EXISTANTE -->
                ${(() => {
                    const conv = store.getEnrichedConventions().find(c => c.dossier_id === d.id);
                    if (!conv) return '';
                    const isScan = Boolean(conv.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${conv.id}`));
                    const isDoubleSigned = conv.statut_signature === 'VALIDE' || (conv.isSignePresidente && conv.isSigneAsso) || isScan;
                    const isAssoSigned = conv.isSigneAsso || isDoubleSigned;
                    const isPresSigned = conv.isSignePresidente || isDoubleSigned;
                    
                    return `
                        <div class="p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200 text-xs space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="font-extrabold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                                    <i data-lucide="file-check-2" class="w-4 h-4 text-blue-600"></i>
                                    Avancement des Signatures Juridiques (Convention #${conv.code_hex || '—'})
                                </span>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${isDoubleSigned ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                                    ${isDoubleSigned ? '🟢 2/2 Validée & Exécutoire' : (isAssoSigned ? '✍️ 1/2 Signé Asso (Attente Présidente)' : (isPresSigned ? '✍️ 1/2 Signé Présidente (Attente Asso)' : '⏳ 0/2 En attente de signatures'))}
                                </span>
                            </div>
                            <div class="grid grid-cols-2 gap-3 text-[11px]">
                                <div class="p-2 bg-white rounded-lg border ${isAssoSigned ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}">
                                    <div class="font-bold text-slate-800 flex items-center gap-1">
                                        <span class="${isAssoSigned ? 'text-emerald-600' : 'text-slate-400'}">${isAssoSigned ? '✓' : '○'}</span>
                                        Signature Association (Mandataire)
                                    </div>
                                    <div class="text-slate-600 mt-0.5">${d.signataire_nom ? `${d.signataire_nom} (${d.signataire_fonction || 'Mandataire'})` : (s.representant_prenom + ' ' + s.representant_nom)}</div>
                                    <div class="text-[10px] text-slate-400 font-mono-code">${conv.date_signature_asso ? 'Signé le ' + new Date(conv.date_signature_asso).toLocaleDateString('fr-FR') : (isDoubleSigned ? 'Certifié' : 'En attente signature OTP')}</div>
                                </div>
                                <div class="p-2 bg-white rounded-lg border ${isPresSigned ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}">
                                    <div class="font-bold text-slate-800 flex items-center gap-1">
                                        <span class="${isPresSigned ? 'text-emerald-600' : 'text-slate-400'}">${isPresSigned ? '✓' : '○'}</span>
                                        Signature Collectivité (Présidente CCMVR)
                                    </div>
                                    <div class="text-slate-600 mt-0.5">Mme la Présidente de la CCMVR</div>
                                    <div class="text-[10px] text-slate-400 font-mono-code">${conv.date_signature_ccmvr ? 'Signé le ' + new Date(conv.date_signature_ccmvr).toLocaleDateString('fr-FR') : (isScan ? 'Scan manuscrit certifié' : (isDoubleSigned ? 'Certifié' : 'En attente signature'))}</div>
                                </div>
                            </div>
                        </div>
                    `;
                })()}

                <!-- 1. IDENTITÉ & GOUVERNANCE DE L'ASSOCIATION -->
                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <strong class="text-slate-900 font-bold uppercase tracking-wider text-[11px]">1. Identité Juridique & Mandat</strong>
                        <span class="text-slate-500 text-[11px]">Contrôle préalable obligatoire à l'avis</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                        <div>
                            <span class="text-slate-400 uppercase text-[10px] font-bold block">Association & Siège</span>
                            <div class="font-bold text-slate-900">${s.nom_officiel || 'Association'}</div>
                            <div class="text-[11px] text-slate-600">${s.adresse_siege || ''} ${s.code_postal || ''} ${s.ville || ''}</div>
                        </div>
                        <div>
                            <span class="text-slate-400 uppercase text-[10px] font-bold block">Immatriculation</span>
                            <div class="font-mono-code text-slate-900 font-semibold">SIRET : ${s.siret || '—'}</div>
                            <div class="font-mono-code text-slate-600 text-[11px]">RNA : ${s.rna || '—'}</div>
                        </div>
                        <div>
                            <span class="text-slate-400 uppercase text-[10px] font-bold block">Dirigeant Mandaté</span>
                            <div class="font-bold text-slate-900">${s.representant_fonction || 'Président(e)'}</div>
                            <div class="text-slate-700 font-medium">${s.representant_prenom || ''} ${s.representant_nom || '—'}</div>
                            <div class="text-slate-500 text-[11px]">${s.email_contact || ''} ${s.telephone ? '• ' + s.telephone : ''}</div>
                        </div>
                        <div>
                            <span class="text-slate-400 uppercase text-[10px] font-bold block">Règlement & Engagement</span>
                            <div class="text-[11px] mt-0.5">
                                ${s.iban ? `<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono-code font-bold inline-block">IBAN ✓ (${s.iban.slice(0, 8)}...)</span>` : `<span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold inline-block">⚠️ IBAN non saisi</span>`}
                            </div>
                            <div class="text-[11px] mt-1">
                                ${s.date_signature_cer ? `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-block">✓ CER souscrit (${s.signataire_cer_nom || 'Président'})</span>` : `<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold inline-block">🔴 CER non souscrit</span>`}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MOTIVATION DE LA DEMANDE & EXPLICATIONS LIBRES DE L'ASSOCIATION -->
                <div class="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2 text-xs">
                    <div class="flex items-center justify-between border-b border-blue-200/80 pb-1.5">
                        <strong class="text-blue-950 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <i data-lucide="file-text" class="w-4 h-4 text-blue-700"></i>
                            <span>Motivation de la Demande & Présentation du Projet par l'Association</span>
                        </strong>
                        <span class="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                            Exposé libre de l'association
                        </span>
                    </div>
                    <div class="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-blue-100 font-normal">
                        ${d.description_projet || d.motivation_demande || '<span class="text-slate-400 italic">Aucune explication libre renseignée lors du dépôt initial.</span>'}
                    </div>
                    ${d.nature_details ? `
                        <div class="pt-1.5 border-t border-blue-200/60 text-[11px] flex items-start gap-1.5">
                            <strong class="text-indigo-900 shrink-0">🚐 Besoins spécifiques en concours en nature :</strong>
                            <span class="text-slate-700 italic">${d.nature_details}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- 2. CONTRÔLE DES 10 PIÈCES RÉGLEMENTAIRES (LE COMPTE ASSO / RNA) -->
                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <div class="flex items-center gap-2">
                            <strong class="text-slate-900 font-bold uppercase tracking-wider text-[11px]">2. Pièces Réglementaires (Flux Le Compte Asso / RNA)</strong>
                            ${docsSummaryBadge}
                        </div>
                        <button type="button" onclick="CCMVR.App.openLeCompteAssoChecklistModal('${s.id}')" class="text-blue-600 hover:text-blue-800 text-[11px] font-bold">
                            Gérer les 10 pièces ↗
                        </button>
                    </div>
                    <div class="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-44 overflow-y-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase sticky top-0">
                                    <th class="py-1.5 px-3">Modèle / Type de document</th>
                                    <th class="py-1.5 px-3">Origine</th>
                                    <th class="py-1.5 px-3">Dernier Dépôt</th>
                                    <th class="py-1.5 px-3">Validité</th>
                                    <th class="py-1.5 px-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${docsRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2bis. ACTES ET STATUTS OFFICIELS • DOCUMENTS AU RNA (MINISTÈRE DE L'INTÉRIEUR) -->
                <div class="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200 space-y-1.5 text-xs">
                    <div class="flex items-center justify-between border-b border-indigo-200 pb-1.5">
                        <div class="flex items-center gap-2">
                            <strong class="text-indigo-950 font-bold uppercase tracking-wider text-[11px]">📜 Actes et Statuts • Documents au RNA (Ministère de l'Intérieur)</strong>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">${rnaDocs.length} acte(s) officiel(s)</span>
                        </div>
                        <span class="text-slate-500 text-[11px]">Flux direct DINUM / DJEPVA</span>
                    </div>
                    <div class="overflow-x-auto bg-white rounded-lg border border-indigo-100 max-h-44 overflow-y-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase sticky top-0">
                                    <th class="py-1.5 px-3">Type d'acte statutory</th>
                                    <th class="py-1.5 px-3">Dernière Mise à Jour</th>
                                    <th class="py-1.5 px-3">Origine</th>
                                    <th class="py-1.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rnaDocsRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2ter. INDICATEURS D'ACTIVITÉ SPÉCIFIQUES AU PÔLE & CALCUL AUTOMATIQUE DU BARÈME -->
                <div class="p-4 bg-orange-50/30 rounded-2xl border border-orange-200 space-y-3 text-xs">
                    <div class="flex items-center justify-between border-b border-orange-200 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="p-1 rounded-md bg-orange-100 text-orange-800 font-black text-[10px] uppercase">Grille Officielle</span>
                            <strong class="text-orange-950 font-bold uppercase tracking-wider text-xs">📊 Grille d'Évaluation & Calcul de Subvention — ${d.pole.libelle || 'Pôle'}</strong>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="document.getElementById('modal-montant-propose').value = '${montantFormuleTheorique}'; CCMVR.App.toast('Montant aligné sur le calcul officiel : ${fin.formatCurrency(montantFormuleTheorique)}');" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition shadow-2xs">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i> Aligner la proposition sur le calcul
                            </button>
                        </div>
                    </div>

                    <!-- Affichage de la grille d'évaluation -->
                    ${scoringSectionHtml}

                    <!-- Encart Pièces Justificatives Déposées avec Visionneuse Instantanée -->
                    <div class="pt-2 border-t border-orange-200/80 space-y-2">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                                <i data-lucide="folder-check" class="w-4 h-4 text-orange-600"></i>
                                Justificatifs & Pièces Déposées par l'Association (${justifsDossier.length}) :
                            </div>
                            <label class="cursor-pointer px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs">
                                <i data-lucide="plus" class="w-3 h-3 text-indigo-600"></i>
                                <span>Ajouter une pièce (secours)</span>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden" onchange="CCMVR.App.handleInstructorEmergencyUpload(this, '${d.id}')"/>
                            </label>
                        </div>
                        ${justifsListHtml}
                    </div>
                </div>

                <!-- Alertes automatiques du Contrôle de Gestion -->
                ${warningsHtml ? `<div class="space-y-2">${warningsHtml}</div>` : `<div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold">✓ Aucun signal d'alerte financière détecté : ratios d'équilibre, trésorerie et dépendance conformes.</div>`}

                <!-- Ratios financiers calculés automatiquement -->
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span class="text-slate-500 block text-[11px]">Fonds de Roulement (FRNG)</span>
                        <strong class="font-mono-code text-sm text-slate-900">${fin.formatCurrency(ratios.frng_calcule)}</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span class="text-slate-500 block text-[11px]">Trésorerie Nette</span>
                        <strong class="font-mono-code text-sm text-slate-900">${fin.formatCurrency(b.tresorerie_banque || 0)}</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span class="text-slate-500 block text-[11px]">Autonomie (Mois charges)</span>
                        <strong class="font-mono-code text-sm text-blue-700">${ratios.tresorerie_mois_charges.toFixed(1)} mois</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span class="text-slate-500 block text-[11px]">Capacité Autofin. (CAF)</span>
                        <strong class="font-mono-code text-sm text-emerald-700">${fin.formatCurrency(ratios.caf_calculee)}</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span class="text-slate-500 block text-[11px]">Dépendance CCMVR</span>
                        <strong class="font-mono-code text-sm text-slate-900">${ratios.taux_dependance_ccmvr.toFixed(1)} %</strong>
                    </div>
                </div>

                <!-- Encart Spécifique Concours en Nature & Valorisation CCMVR (Art. L. 2313-1 CGCT) -->
                <div class="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 text-xs">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">🚐</span>
                            <div>
                                <strong class="text-indigo-950 font-extrabold text-sm">Concours en Nature & Valorisation Financière CCMVR</strong>
                                <span class="text-[11px] text-indigo-700 block">Obligation légale de valorisation des locaux, matériels, minibus et régie (Art. L. 2313-1 CGCT)</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 rounded-full text-xs font-black ${totalNatureDossier > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}">
                                ${totalNatureDossier > 0 ? `✓ Valorisé : ${fin.formatCurrency(totalNatureDossier)}` : 'En attente de valorisation'}
                            </span>
                            <button type="button" onclick="CCMVR.App.openValuateInKindDossierModal('${d.id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition">
                                <i data-lucide="calculator" class="w-3.5 h-3.5"></i> + Valoriser une prestation en nature
                            </button>
                        </div>
                    </div>

                    <!-- Détails de la sollicitation exprimée par l'association -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-indigo-100">
                        <div>
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Nature de la demande</span>
                            <strong class="text-slate-900 font-bold">${d.nature_demande === 'NATURE' ? '🚐 Concours en Nature Exclusif (0 € monétaire)' : (d.nature_demande === 'MIXTE' ? '🤝 Demande Mixte (Numéraire + Nature)' : '💶 Subvention Monétaire')}</strong>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Catégories sollicitées</span>
                            <div class="flex flex-wrap gap-1 mt-0.5">
                                ${(d.nature_categories && d.nature_categories.length > 0) ? d.nature_categories.map(c => `<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">${c}</span>`).join('') : '<span class="text-slate-400 text-xs">Aucune catégorie spécifiée</span>'}
                            </div>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Total valorisé en nature</span>
                            <strong class="text-indigo-900 font-mono-code text-sm">${fin.formatCurrency(totalNatureDossier)}</strong>
                        </div>
                        ${d.nature_details ? `
                            <div class="sm:col-span-3 pt-1 border-t border-slate-100">
                                <span class="text-[10px] uppercase font-bold text-slate-400 block">Besoins exprimés par l'association :</span>
                                <p class="text-slate-700 italic text-[11px] whitespace-pre-line mt-0.5">${d.nature_details}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Tableau des prestations imputées au dossier -->
                    ${dossierPrestations.length > 0 ? `
                        <div class="overflow-x-auto bg-white rounded-xl border border-indigo-100">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                                        <th class="py-2 px-3">Ressource mise à disposition</th>
                                        <th class="py-2 px-3">Quantité</th>
                                        <th class="py-2 px-3 text-right">Tarif Unitaire Barème</th>
                                        <th class="py-2 px-3 text-right">Valorisation Totale</th>
                                        <th class="py-2 px-3">Agent / Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${dossierPrestations.map(p => `
                                        <tr class="border-b border-slate-100">
                                            <td class="py-2 px-3 font-bold text-slate-900">${p.type_libelle || 'Prestation'}</td>
                                            <td class="py-2 px-3 font-mono-code">${p.quantite} ${p.type_unite || ''}</td>
                                            <td class="py-2 px-3 text-right font-mono-code">${fin.formatCurrency(p.tarif_unitaire_applique)}</td>
                                            <td class="py-2 px-3 text-right font-mono-code font-bold text-indigo-900">${fin.formatCurrency(p.montant_total_valorise)}</td>
                                            <td class="py-2 px-3 text-span text-slate-500">${p.observations || p.saisi_par_agent || '—'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>

                <!-- 4. HISTORIQUE CHRONOLOGIQUE DES ARBITRAGES ET DÉLIBÉRATIONS -->
                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <strong class="text-slate-900 font-bold uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1.5">
                        📜 Historique des Arbitrages & Décisions Successives
                    </strong>
                    ${historiqueHtml}
                </div>

                <!-- ALERTE RÉSERVES ET DEMANDE DE RÉGULARISATION DU CONTRÔLE DE GESTION -->
                ${(!isAsso && (d.notes_internes_cdg || d.statut_workflow === 'RETOUR_CDG_POLE')) ? `
                    <div class="p-4 bg-amber-50 rounded-xl border-2 border-amber-300 space-y-2 text-xs">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-amber-900 font-black text-sm">
                                <i data-lucide="alert-octagon" class="w-5 h-5 text-amber-600"></i>
                                <span>Réserves & Demande de Régularisation du Contrôle de Gestion (CdG)</span>
                            </div>
                            ${d.date_retour_cdg ? `<span class="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">Retourné le ${new Date(d.date_retour_cdg).toLocaleDateString('fr-FR')}</span>` : ''}
                        </div>
                        <div class="p-3 bg-white rounded-lg border border-amber-200 text-slate-800 font-medium whitespace-pre-wrap text-xs">
                            ${d.notes_internes_cdg || 'Le Contrôle de Gestion a retourné ce dossier avec des réserves financières à éclaircir.'}
                        </div>
                        <div class="text-[11px] text-amber-800 font-semibold">
                            ⚠️ <strong>Consignes Pôle instructeur :</strong> Vous pouvez soit renvoyer le dossier à l'association en statut <em>Incomplet</em> pour qu'elle modifie sa demande (montant, descriptif, budget ou pièces justificatives), soit corriger vous-même la proposition et réémettre l'avis favorable pour soumission au visa CdG.
                        </div>
                    </div>
                ` : ''}

                ${isAsso ? `
                    <!-- 5. COMMUNICATION & RETOURS SERVICES INSTRUCTEURS (Vue Association) -->
                    <div class="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3 text-xs">
                        <div class="flex items-center justify-between border-b border-blue-200 pb-2">
                            <strong class="text-blue-950 font-bold uppercase tracking-wider text-[11px]">📢 Échanges & Communications du Service Instructeur</strong>
                            <span class="text-blue-800 text-[11px]">Statut : <strong>${d.statut_workflow}</strong></span>
                        </div>
                        <div class="p-3 bg-white rounded-lg border border-blue-100 text-slate-800 font-medium">
                            ${d.commentaire_association ? d.commentaire_association : '<em class="text-slate-400">Aucun message particulier de la part du service instructeur pour l’instant.</em>'}
                        </div>
                        <div class="text-[11px] text-slate-600">
                            Montant sollicité : <strong class="font-bold text-slate-900">${fin.formatCurrency(d.montant_demande)}</strong>
                            ${d.statut_workflow === 'VOTE_CONSEIL' && d.montant_vote ? ` • Montant voté par le Conseil : <strong class="font-bold text-emerald-700">${fin.formatCurrency(d.montant_vote)}</strong>` : ' • Décision finale lors de la prochaine séance du Conseil Communautaire.'}
                        </div>
                    </div>
                ` : `
                    <!-- 5. DÉCISION D'INSTRUCTION & CIRCUIT DE VALIDATION (Collectivité) -->
                    <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                            <strong class="text-slate-900 font-bold uppercase tracking-wider text-[11px]">Décision & Montant Proposé</strong>
                            <span class="text-slate-600 text-[11px]">Statut actuel : <strong class="text-slate-900">${d.statut_workflow}</strong></span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label class="block font-bold text-slate-700 mb-1">Montant proposé (€)</label>
                                <input type="number" id="modal-montant-propose" value="${montantRecommande}" class="input-clean font-mono-code font-bold text-sm"/>
                                <div class="text-[11px] text-slate-500 mt-1">Montant initial : ${fin.formatCurrency(d.montant_demande)} ${isHigh ? '• ⚠️ Seuil ≥ 23 000 € (Visa CdG préalable requis)' : '• Circuit allégé (< 23 000 €)'}</div>
                            </div>
                            <div>
                                <label class="block font-bold text-slate-700 mb-1">🔒 Encart Interne Collectivité <span class="text-[10px] text-slate-500 font-normal">(Confidentiel CDG & Pôle)</span></label>
                                <textarea id="modal-notes-pole" rows="2" class="input-clean text-xs" placeholder="Notes internes, arbitrage financier ou réserves confidentielles...">${cleanNotes}</textarea>
                            </div>
                            <div>
                                <label class="block font-bold text-slate-700 mb-1">📢 Encart Communication Asso <span class="text-[10px] text-emerald-700 font-normal">(Visible espace asso)</span></label>
                                <textarea id="modal-commentaire-association" rows="2" class="input-clean text-xs border-blue-200" placeholder="Message transmis à l'association (notamment si pièces manquantes ou motif refus)...">${d.commentaire_association || ''}</textarea>
                            </div>
                        </div>
                    </div>
                `}

                <!-- ACTIONS DU BAS DE MODAL -->
                <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="CCMVR.App.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
                            Fermer
                        </button>
                        ${d.statut_workflow === 'VOTE_CONSEIL' ? `
                            <button onclick="CCMVR.App.openConventionPreviewModal('${d.id}')" class="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                <i data-lucide="file-text" class="w-4 h-4 text-blue-600"></i> Aperçu Convention Votée
                            </button>
                        ` : ''}
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        ${!isAsso && (d.statut_workflow === 'DEPOSE' || d.statut_workflow === 'EN_INSTRUCTION' || d.statut_workflow === 'RETOUR_INCOMPLET_SOUMIS' || d.statut_workflow === 'INCOMPLET') ? `
                            ${isHigh ? `
                                <span class="text-xs text-indigo-900 font-bold px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-md">
                                    Étape 1 : Visa CDG requis (≥ 23 000 €)
                                </span>
                                <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'INCOMPLET')" class="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs">
                                    ⚠️ Incomplet
                                </button>
                                <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'REJETE')" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition shadow-2xs">
                                    ✕ Rejeter
                                </button>
                                <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'VISE_CDG')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5" title="Apposer le visa réglementaire Contrôle de Gestion (1ère étape)">
                                    ✓ Apposer Visa Contrôle de Gestion (Étape 1)
                                </button>
                            ` : `
                                <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'INCOMPLET')" class="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs">
                                    ⚠️ Incomplet
                                </button>
                                <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'REJETE')" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition shadow-2xs">
                                    ✕ Rejeter
                                </button>
                                <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'FAVORABLE')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5">
                                    ✓ Émettre Avis Pôle Favorable
                                </button>
                            `}
                        ` : ''}

                        ${d.statut_workflow === 'VISE_CDG' ? `
                            <span class="text-xs text-indigo-800 font-bold px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-md">
                                ✓ Visé CDG (Étape 1 validée) → Étape 2 : Avis Pôle requis
                            </span>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'INCOMPLET')" class="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs">
                                ⚠️ Incomplet
                            </button>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'REJETE')" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition shadow-2xs">
                                ✕ Rejeter
                            </button>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'FAVORABLE')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5" title="Émettre le 2ème avis technique par le Pôle Métier">
                                ✓ Émettre Avis Pôle Favorable (Étape 2)
                            </button>
                        ` : ''}

                        ${d.statut_workflow === 'AVIS_POLE_FAVORABLE' ? `
                            <span class="text-xs text-emerald-800 font-bold px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md">
                                ✓ Avis Pôle Favorable (Prêt pour Commission)
                            </span>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'VALIDE_COMMISSION')" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5">
                                🏛️ Valider en Commission d'Arbitrage
                            </button>
                        ` : ''}

                        ${d.statut_workflow === 'RETOUR_CDG_POLE' ? `
                            <span class="text-xs text-amber-900 font-extrabold px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-md">⚠️ Réserves CdG en cours</span>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'INCOMPLET')" class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-extrabold transition shadow-2xs flex items-center gap-1.5" title="Transmettre à l'association pour régulariser le projet, le budget ou les pièces">
                                ⚠️ Transmettre à l'Association (Incomplet)
                            </button>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'REJETE')" class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1.5">
                                ✕ Rejeter Définitivement
                            </button>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'VISE_CDG')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5" title="Lever les réserves et apposer le Visa CDG">
                                ✓ Lever Réserves & Viser CDG
                            </button>
                        ` : ''}

                        ${d.statut_workflow === 'VALIDE_COMMISSION' ? `
                            <span class="text-xs text-purple-800 font-bold px-2 py-1 bg-purple-50 border border-purple-200 rounded-md">Validé en Commission</span>
                            <button type="button" onclick="CCMVR.App.executeDirectDossierDecision('${d.id}', 'VOTE_CONSEIL')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5">
                                ★ Acter Vote Conseil & Générer Convention
                            </button>
                        ` : ''}

                        ${d.statut_workflow === 'VOTE_CONSEIL' ? `
                            <span class="text-xs text-emerald-800 font-bold px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md">★ Voté en Conseil</span>
                            <button type="button" onclick="CCMVR.App.openConventionPreviewModal('${d.id}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5">
                                📄 Consulter & Signer la Convention
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

        // Exécution directe sans double modal depuis la fiche instruction
    async executeDirectDossierDecision(dossierId, targetStatut) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const d = store.state.dossiers_subventions.find(x => x.id === dossierId);
        if (!d) return;

        const inlineAmount = document.getElementById('modal-montant-propose');
        const inlineInterne = document.getElementById('modal-notes-pole');
        const inlineAsso = document.getElementById('modal-commentaire-association');

        const montant = inlineAmount ? (parseFloat(inlineAmount.value) || 0) : (d.montant_propose_pole || d.montant_demande || 0);
        const commentInterne = inlineInterne ? inlineInterne.value.trim() : '';
        const commentAsso = inlineAsso ? inlineAsso.value.trim() : '';

        if (targetStatut === 'INCOMPLET' && !commentAsso && !commentInterne) {
            this.toast('Veuillez préciser le motif ou les pièces manquantes dans l\'encart de communication ci-dessus.', 'warning');
            inlineAsso?.focus();
            return;
        }
        if (targetStatut === 'RETOUR_CDG_POLE' && !commentInterne) {
            this.toast('Veuillez préciser vos réserves dans l\'encart interne collectivité ci-dessus.', 'warning');
            inlineInterne?.focus();
            return;
        }
        if (targetStatut === 'REJETE' && !commentAsso && !commentInterne) {
            this.toast('Veuillez préciser le motif du rejet dans l\'encart communication ci-dessus.', 'warning');
            inlineAsso?.focus();
            return;
        }

        const realStatut = targetStatut === 'FAVORABLE' ? 'AVIS_POLE_FAVORABLE' : targetStatut;
        const actorName = store.currentUser?.nom || store.currentUser?.email || 'Instructeur';
        const actorRole = store.currentUser?.role || 'pole';

        const historyEntry = {
            date: new Date().toISOString(),
            acteur: actorName,
            role: actorRole,
            etape: realStatut,
            montant: montant !== null ? montant : (d.montant_vote || d.montant_propose_pole || d.montant_demande || 0),
            commentaire: commentInterne || commentAsso || (realStatut === 'VISE_CDG' ? 'Visa réglementaire CDG accordé' : '')
        };

        const patch = {
            statut_workflow: realStatut,
            nouvelle_etape_historique: historyEntry
        };

        if (commentInterne) {
            if (actorRole === 'cdg' || realStatut === 'VISE_CDG' || realStatut === 'RETOUR_CDG_POLE') {
                patch.notes_internes_cdg = commentInterne;
            } else {
                patch.notes_internes_pole = commentInterne;
            }
        }
        if (commentAsso) {
            patch.commentaire_association = commentAsso;
        }

        if (realStatut === 'AVIS_POLE_FAVORABLE') {
            patch.date_avis_pole = new Date().toISOString();
            patch.montant_propose_pole = montant;
        } else if (realStatut === 'RETOUR_CDG_POLE') {
            patch.date_retour_cdg = new Date().toISOString();
            patch.notes_internes_cdg = commentInterne;
        } else if (realStatut === 'VISE_CDG') {
            patch.date_visa_cdg = new Date().toISOString();
            patch.notes_internes_cdg = commentInterne || 'Visa réglementaire Contrôle de Gestion accordé sans réserve.';
        } else if (realStatut === 'VALIDE_COMMISSION') {
            patch.date_commission = new Date().toISOString();
            patch.montant_vote = montant;
        } else if (realStatut === 'VOTE_CONSEIL') {
            patch.date_vote_conseil = new Date().toISOString();
            patch.montant_vote = montant;
        }

        try {
            await store.updateDossierInstruction(dossierId, patch);
            this.closeModal();
            this.renderMainView();

            if (realStatut === 'AVIS_POLE_FAVORABLE') {
                this.toast(`✓ Avis favorable du Pôle émis (${fin.formatCurrency(montant)}) ! Dossier transmis pour la commission.`, 'success');
            } else if (realStatut === 'VISE_CDG') {
                this.toast(`✓ Visa réglementaire Contrôle de Gestion validé (${fin.formatCurrency(montant)}) !`, 'success');
            } else if (realStatut === 'INCOMPLET') {
                this.toast(`⚠️ Dossier notifié Incomplet à l'association avec vos consignes.`, 'info');
            } else if (realStatut === 'REJETE') {
                this.toast(`✕ Rejet du dossier acté (${fin.formatCurrency(montant)}).`, 'info');
            } else if (realStatut === 'VALIDE_COMMISSION') {
                this.toast(`🏛️ Dossier validé en Commission (${fin.formatCurrency(montant)}) !`, 'success');
            } else if (realStatut === 'VOTE_CONSEIL') {
                this.toast(`★ Subvention votée en Conseil Communautaire (${fin.formatCurrency(montant)}) !`, 'success');
            } else {
                this.toast(`Statut mis à jour : ${realStatut}`, 'success');
            }
        } catch (err) {
            this.toast('Erreur instruction : ' + err.message, 'error');
        }
    },

    openWorkflowStepTransitionModal(dossierId, targetStatut) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const d = store.getEnrichedDossiers().find(x => x.id === dossierId);
        if (!d) {
            this.toast('Dossier introuvable.', 'error');
            return;
        }

        const montantDemande = parseFloat(d.montant_demande) || 0;
        const montantPropose = parseFloat(d.montant_propose_pole) || montantDemande;
        const montantVote = parseFloat(d.montant_vote) || montantPropose;

        let title = '';
        let subtitle = '';
        let icon = 'clipboard-check';
        let iconBg = 'bg-blue-100 text-blue-700';
        let showAmountField = false;
        let amountLabel = '';
        let defaultAmount = 0;
        let commentLabel = 'Commentaires / Justification :';
        let commentPlaceholder = '';
        let confirmBtnLabel = 'Confirmer l\'étape';
        let confirmBtnClass = 'bg-blue-600 hover:bg-blue-700 text-white';

        if (targetStatut === 'INCOMPLET') {
            title = 'Demande de compléments au dossier';
            subtitle = `Demander des pièces justificatives ou précisions à l'association ${d.structure.nom_officiel || 'l\'association'}.`;
            icon = 'alert-triangle';
            iconBg = 'bg-amber-100 text-amber-700';
            commentLabel = 'Précisez les pièces ou informations manquantes requises : *';
            commentPlaceholder = 'Ex : Statuts actualisés manquants, compte de résultat 2024 non fourni, détail du projet incomplet...';
            confirmBtnLabel = '⚠️ Notifier l\'association (Incomplet)';
            confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
        } else if (targetStatut === 'RETOUR_CDG_POLE') {
            title = 'Réserves & Retour au Pôle Métier';
            subtitle = `Demande de mise en conformité ou précisions budgétaires pour ${d.structure.nom_officiel || 'l\'association'}.`;
            icon = 'alert-octagon';
            iconBg = 'bg-amber-100 text-amber-800';
            commentLabel = 'Précisez vos réserves et les éléments à régulariser par le pôle et l\'association : *';
            commentPlaceholder = 'Ex : Ratio de trésorerie anormalement élevé, budget prévisionnel non équilibré, manque rapport financier...';
            confirmBtnLabel = '⚠️ Renvoyer au Pôle Métier (Réserves CdG)';
            confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
        } else if (targetStatut === 'REJETE') {
            title = 'Avis défavorable / Rejet du dossier';
            subtitle = `Refuser la demande de subvention pour ${d.structure.nom_officiel || 'l\'association'}.`;
            icon = 'x-circle';
            iconBg = 'bg-rose-100 text-rose-700';
            commentLabel = 'Motif du rejet / avis défavorable : *';
            commentPlaceholder = 'Ex : Projet ne relevant pas des compétences communautaires, budget non conforme...';
            confirmBtnLabel = '✕ Confirmer le rejet';
            confirmBtnClass = 'bg-rose-600 hover:bg-rose-700 text-white';
        } else if (targetStatut === 'FAVORABLE' || targetStatut === 'AVIS_POLE_FAVORABLE') {
            title = 'Avis Favorable du Pôle Métier';
            subtitle = `Instruction technique du Pôle ${d.pole.libelle || ''} pour ${d.structure.nom_officiel || 'l\'association'}.`;
            icon = 'check-circle';
            iconBg = 'bg-emerald-100 text-emerald-700';
            showAmountField = true;
            amountLabel = 'Montant de subvention proposé par le Pôle (€) :';
            defaultAmount = montantPropose;
            commentLabel = 'Observations et avis d\'instruction du Pôle :';
            commentPlaceholder = 'Ex : Projet conforme aux critères d\'attribution, impact territorial avéré...';
            confirmBtnLabel = '✓ Émettre l\'Avis Favorable';
            confirmBtnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white';
        } else if (targetStatut === 'VISE_CDG') {
            title = 'Visa Réglementaire Contrôle de Gestion';
            subtitle = `Validation de conformité financière pour subvention ≥ 23 000 € (${fin.formatCurrency(montantPropose)}).`;
            icon = 'shield-check';
            iconBg = 'bg-indigo-100 text-indigo-700';
            commentLabel = 'Observations & visa du Contrôle de Gestion :';
            commentPlaceholder = 'Ex : Vérification de la soutenabilité budgétaire effectuée, ratios financiers conformes, visa accordé sans réserve.';
            confirmBtnLabel = '✓ Apposer le Visa CdG';
            confirmBtnClass = 'bg-indigo-600 hover:bg-indigo-700 text-white';
        } else if (targetStatut === 'VALIDE_COMMISSION') {
            title = 'Arbitrage & Validation en Commission Thématique';
            subtitle = `Passage en commission thématique avant vote en Conseil Communautaire.`;
            icon = 'landmark';
            iconBg = 'bg-purple-100 text-purple-700';
            showAmountField = true;
            amountLabel = 'Montant validé par la Commission d\'arbitrage (€) :';
            defaultAmount = montantVote;
            commentLabel = 'Délibérations et orientations de la Commission :';
            commentPlaceholder = 'Ex : Avis favorable unanime de la commission, proposition transmise au Conseil Communautaire.';
            confirmBtnLabel = '🏛️ Valider en Commission';
            confirmBtnClass = 'bg-purple-600 hover:bg-purple-700 text-white';
        } else if (targetStatut === 'VOTE_CONSEIL') {
            title = 'Vote du Conseil Communautaire & Conventionnement';
            subtitle = `Acter le vote officiel de la subvention. La convention officielle sera générée dans le registre.`;
            icon = 'star';
            iconBg = 'bg-emerald-100 text-emerald-700';
            showAmountField = true;
            amountLabel = 'Montant définitif voté en Conseil Communautaire (€) :';
            defaultAmount = montantVote;
            commentLabel = 'Référence de délibération & mentions officielles :';
            commentPlaceholder = 'Ex : Délibération du Conseil Communautaire n° 2026-CC-042 adoptée à l\'unanimité.';
            confirmBtnLabel = '★ Acter le Vote & Générer la Convention';
            confirmBtnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white';
        }

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full mx-auto overflow-hidden animate-scale-in">
                <div class="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center font-bold text-lg">
                            <i data-lucide="${icon}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="font-extrabold text-slate-900 text-base">${title}</h3>
                            <p class="text-xs text-slate-500">${subtitle}</p>
                        </div>
                    </div>
                    <button onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="p-6 space-y-4">
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div class="flex justify-between">
                            <span class="text-slate-500 font-medium">Dossier :</span>
                            <span class="font-mono-code font-bold text-slate-900">#${d.code_hex} — ${d.intitule_projet}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500 font-medium">Association :</span>
                            <span class="font-bold text-slate-800">${d.structure.nom_officiel || 'Association'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500 font-medium">Montant demandé initial :</span>
                            <span class="font-mono-code font-bold text-slate-900">${fin.formatCurrency(montantDemande)}</span>
                        </div>
                        ${d.montant_propose_pole ? `
                            <div class="flex justify-between">
                                <span class="text-slate-500 font-medium">Montant proposé Pôle :</span>
                                <span class="font-mono-code font-bold text-emerald-700">${fin.formatCurrency(d.montant_propose_pole)}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${showAmountField ? `
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">${amountLabel}</label>
                            <div class="relative">
                                <input type="number" id="step-modal-amount" step="1" min="0" value="${defaultAmount}" class="w-full px-3 py-2 text-sm font-bold font-mono-code border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                <span class="absolute right-3 top-2 text-xs font-bold text-slate-400">EUR (€)</span>
                            </div>
                            <span class="text-[10px] text-slate-500 mt-1 block">Le montant peut être révisé à cette étape d'arbitrage.</span>
                        </div>
                    ` : ''}

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">
                            🔒 Avis / Notes Internes Collectivité <span class="text-slate-400 font-normal">(Confidentiel CDG & Pôles)</span>
                        </label>
                        <textarea id="step-modal-comment-interne" rows="2" placeholder="${commentPlaceholder}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">
                            📢 Encart Communication Association <span class="text-emerald-700 font-medium">${targetStatut === 'INCOMPLET' || targetStatut === 'REJETE' ? "(Obligatoire - notifié à l'association)" : "(Facultatif - visible sur son espace)"}</span>
                        </label>
                        <textarea id="step-modal-comment-asso" rows="2" placeholder="Précisez les pièces demandées ou explications à destination de l'association..." class="w-full px-3 py-2 text-xs border border-blue-200 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
                    </div>
                </div>

                <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition">
                        Annuler
                    </button>
                    <button type="button" onclick="CCMVR.App.executeWorkflowStepTransition('${d.id}', '${targetStatut}')" class="px-4 py-2 rounded-lg text-xs font-extrabold transition shadow-sm ${confirmBtnClass}">
                        ${confirmBtnLabel}
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    async executeWorkflowStepTransition(dossierId, targetStatut) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const d = store.state.dossiers_subventions.find(x => x.id === dossierId);
        if (!d) return;

        const amountInput = document.getElementById('step-modal-amount');
        const commentInterneInput = document.getElementById('step-modal-comment-interne');
        const commentAssoInput = document.getElementById('step-modal-comment-asso');
        const montant = amountInput ? (parseFloat(amountInput.value) || 0) : null;
        const commentInterne = commentInterneInput ? commentInterneInput.value.trim() : '';
        const commentAsso = commentAssoInput ? commentAssoInput.value.trim() : '';

        if (targetStatut === 'INCOMPLET' && !commentAsso && !commentInterne) {
            this.toast('Veuillez préciser le motif ou les pièces demandées à l\'association.', 'warning');
            return;
        }
        if (targetStatut === 'RETOUR_CDG_POLE' && !commentInterne) {
            this.toast('Veuillez préciser les réserves et demandes de régularisation pour le pôle métier.', 'warning');
            return;
        }
        if (targetStatut === 'REJETE' && !commentAsso && !commentInterne) {
            this.toast('Veuillez préciser le motif du rejet.', 'warning');
            return;
        }

        const realStatut = targetStatut === 'FAVORABLE' ? 'AVIS_POLE_FAVORABLE' : targetStatut;
        const actorName = store.currentUser?.nom || store.currentUser?.email || 'Instructeur';
        const actorRole = store.currentUser?.role || 'pole';

        const historyEntry = {
            date: new Date().toISOString(),
            acteur: actorName,
            role: actorRole,
            etape: realStatut,
            montant: montant !== null ? montant : (d.montant_vote || d.montant_propose_pole || d.montant_demande || 0),
            commentaire: commentInterne || commentAsso || (realStatut === 'VISE_CDG' ? 'Visa réglementaire CDG accordé' : '')
        };

        const patch = {
            statut_workflow: realStatut,
            nouvelle_etape_historique: historyEntry
        };

        if (commentInterne) {
            if (actorRole === 'cdg' || realStatut === 'VISE_CDG' || realStatut === 'RETOUR_CDG_POLE') {
                patch.notes_internes_cdg = commentInterne;
            } else {
                patch.notes_internes_pole = commentInterne;
            }
        }
        if (commentAsso) {
            patch.commentaire_association = commentAsso;
        }

        if (realStatut === 'AVIS_POLE_FAVORABLE') {
            patch.date_avis_pole = new Date().toISOString();
            if (montant !== null) patch.montant_propose_pole = montant;
        } else if (realStatut === 'RETOUR_CDG_POLE') {
            patch.date_retour_cdg = new Date().toISOString();
            patch.notes_internes_cdg = commentInterne;
        } else if (realStatut === 'VISE_CDG') {
            patch.date_visa_cdg = new Date().toISOString();
            patch.notes_internes_cdg = commentInterne || 'Visa réglementaire Contrôle de Gestion accordé sans réserve.';
        } else if (realStatut === 'VALIDE_COMMISSION') {
            patch.date_commission = new Date().toISOString();
            if (montant !== null) patch.montant_vote = montant;
        } else if (realStatut === 'VOTE_CONSEIL') {
            patch.date_vote_conseil = new Date().toISOString();
            if (montant !== null) patch.montant_vote = montant;
        }

        try {
            await store.updateDossierInstruction(dossierId, patch);
            this.closeModal();
            this.renderMainView();

            if (realStatut === 'RETOUR_CDG_POLE') {
                try {
                    await window.CCMVR.NotificationService.notifyCdgReturnToPole({
                        dossier: d,
                        pole: d.pole,
                        structure: d.structure,
                        montant: d.montant_propose_pole || d.montant_demande,
                        notes: commentInterne || commentAsso
                    });
                } catch (notifErr) {
                    console.warn('[CDG Return] Notification warning:', notifErr);
                }
                this.toast('⚠️ Réserves enregistrées. Dossier renvoyé au Pôle Métier avec notification par e-mail.', 'warning');
            } else if (realStatut === 'VOTE_CONSEIL') {
                this.toast(`★ Subvention votée en Conseil Communautaire (${fin.formatCurrency(montant || d.montant_vote)}) ! Convention officielle générée dans le registre.`, 'success');
            } else if (realStatut === 'VALIDE_COMMISSION') {
                this.toast(`🏛️ Dossier validé en Commission (${fin.formatCurrency(montant || d.montant_vote)}) ! Prêt pour le Conseil Communautaire.`, 'success');
            } else if (realStatut === 'VISE_CDG') {
                this.toast('✓ Visa réglementaire Contrôle de Gestion apposé !', 'success');
            } else if (realStatut === 'AVIS_POLE_FAVORABLE') {
                const finalAmt = montant !== null ? montant : (d.montant_propose_pole || d.montant_demande);
                this.toast(finalAmt >= 23000
                    ? `✓ Avis Pôle Favorable (${fin.formatCurrency(finalAmt)}). Transmis au Contrôle de Gestion pour Visa.`
                    : `✓ Avis Pôle Favorable (${fin.formatCurrency(finalAmt)}). Prêt pour arbitrage en Commission.`,
                    'success');
            } else if (realStatut === 'INCOMPLET') {
                this.toast('⚠️ Dossier marqué incomplet : l\'association peut désormais compléter sa demande.', 'warning');
            } else if (realStatut === 'REJETE') {
                this.toast('✕ Avis défavorable enregistré.', 'info');
            }
        } catch (err) {
            this.toast('Erreur lors de la mise à jour : ' + err.message, 'error');
        }
    },

    openValuateInKindDossierModal(dossierId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const d = store.getEnrichedDossiers().find(x => x.id === dossierId);
        if (!d) return;

        const types = store.state.types_prestations_nature || [];
        const activeType = types[0] || {};
        const activeTarif = store.getTarifUnitaire(activeType.id, d.annee);

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-6';
        content.innerHTML = `
            <div class="p-6 space-y-4">
                <div class="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-mono-code text-xs font-extrabold px-2 py-0.5 bg-indigo-900 text-white rounded">#${d.code_hex}</span>
                            <span class="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-900">Valorisation Officielle CCMVR</span>
                        </div>
                        <h2 class="text-base font-extrabold text-slate-900 mt-1">Imputer et Valoriser une Prestation en Nature</h2>
                        <p class="text-xs text-slate-500">Pour <strong>${d.structure.nom_officiel}</strong> (Exercice ${d.annee}) — Art. L. 2313-1 du CGCT</p>
                    </div>
                    <button onclick="CCMVR.App.openDossierModal('${dossierId}')" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
                </div>

                <form onsubmit="CCMVR.App.handleSaveValuationInKind(event, '${dossierId}')" class="space-y-4 text-xs">
                    <div>
                        <label class="block font-bold text-slate-800 mb-1">Ressource / Prestation mise à disposition *</label>
                        <select id="val-type-id" required onchange="CCMVR.App.onValuateTypeChange(${d.annee})" class="input-clean font-bold">
                            ${types.map(t => `<option value="${t.id}" data-unite="${t.unite_mesure}" style="background:#fff;color:#0f172a;">${t.libelle} (${t.pole_gestionnaire})</option>`).join('')}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">Quantité accordée *</label>
                            <input type="number" step="0.5" id="val-qte" required value="20" oninput="CCMVR.App.recalcValuateTotal()" class="input-clean font-mono-code font-bold"/>
                            <span id="val-unite-badge" class="text-[10px] text-slate-500 mt-0.5 block">Unité : ${activeType.unite_mesure || 'heure'}</span>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">Tarif unitaire barème (€) *</label>
                            <input type="number" step="0.01" id="val-tarif" required value="${activeTarif}" oninput="CCMVR.App.recalcValuateTotal()" class="input-clean font-mono-code font-bold bg-slate-50"/>
                            <span class="text-[10px] text-slate-500 mt-0.5 block">Selon grille CCMVR ${d.annee}</span>
                        </div>
                    </div>

                    <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                        <div>
                            <span class="text-[11px] font-bold uppercase text-indigo-950 block">Montant valorisé calculé</span>
                            <span class="text-[10px] text-indigo-700">Imputé au registre consolidé et à la convention</span>
                        </div>
                        <strong id="val-total-preview" class="font-mono-code text-base font-extrabold text-indigo-950">
                            ${fin.formatCurrency(20 * activeTarif)}
                        </strong>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Date début de mise à disposition</label>
                            <input type="date" id="val-date-debut" value="${d.annee}-01-01" class="input-clean font-mono-code"/>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Date fin</label>
                            <input type="date" id="val-date-fin" value="${d.annee}-12-31" class="input-clean font-mono-code"/>
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Observations internes / Modalités techniques</label>
                        <textarea id="val-obs" rows="2" placeholder="Ex: Créneaux réservés tous les mardis soirs au gymnase municipal + mise à disposition des clés régie." class="input-clean"></textarea>
                    </div>

                    <div class="flex items-center justify-between pt-3 border-t border-slate-200">
                        <button type="button" onclick="CCMVR.App.openDossierModal('${dossierId}')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">
                            Retour à l'instruction
                        </button>
                        <button type="submit" class="px-5 py-2 btn-primary font-bold shadow-sm">
                            Enregistrer la Valorisation →
                        </button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    onValuateTypeChange(annee) {
        const typeSelect = document.getElementById('val-type-id');
        const tarifInput = document.getElementById('val-tarif');
        const uniteBadge = document.getElementById('val-unite-badge');
        if (!typeSelect || !tarifInput) return;
        const typeId = typeSelect.value;
        const tarif = window.CCMVR.Store.getTarifUnitaire(typeId, annee || window.CCMVR.Store.activeMillesime);
        tarifInput.value = tarif;
        const opt = typeSelect.selectedOptions[0];
        if (uniteBadge && opt) uniteBadge.textContent = `Unité : ${opt.getAttribute('data-unite') || 'heure'}`;
        this.recalcValuateTotal();
    },

    recalcValuateTotal() {
        const qte = parseFloat(document.getElementById('val-qte')?.value) || 0;
        const tarif = parseFloat(document.getElementById('val-tarif')?.value) || 0;
        const el = document.getElementById('val-total-preview');
        if (el) el.textContent = window.CCMVR.FinanceEngine.formatCurrency(qte * tarif);
    },

    async handleSaveValuationInKind(e, dossierId) {
        e.preventDefault();
        const typeId = document.getElementById('val-type-id').value;
        const qte = parseFloat(document.getElementById('val-qte').value) || 0;
        const tarif = parseFloat(document.getElementById('val-tarif').value) || 0;
        const dateDebut = document.getElementById('val-date-debut').value;
        const dateFin = document.getElementById('val-date-fin').value;
        const obs = document.getElementById('val-obs').value.trim();

        try {
            await window.CCMVR.Store.valuateDossierInKind({
                dossierId,
                type_prestation_id: typeId,
                quantite: qte,
                tarif_unitaire: tarif,
                observations: obs,
                date_debut: dateDebut,
                date_fin: dateFin
            });
            this.toast(`Prestation en nature valorisée avec succès (${window.CCMVR.FinanceEngine.formatCurrency(qte * tarif)}) !`);
            this.openDossierModal(dossierId);
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    // ATTRIBUTION D'OFFICE D'UNE AIDE EN NATURE PAR LE PÔLE OU CONTRÔLEUR DE GESTION,

    openDirectInKindGrantModal(prefillStructId = null, prefillPole = null) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        const structures = store.state.structures || [];
        const types = store.state.types_prestations_nature || [];
        const activeType = types[0] || {};
        const activeTarif = store.getTarifUnitaire(activeType.id, annee);

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-6';
        content.innerHTML = `
            <div class="p-6 space-y-4">
                <div class="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-extrabold text-[10px] uppercase">Décision Ex-Officio</span>
                            <span class="text-xs text-slate-500 font-bold">Millésime ${annee}</span>
                        </div>
                        <h2 class="text-base font-extrabold text-slate-900 mt-1">Attribuer une Aide en Nature d'Office (Sans démarche portail)</h2>
                        <p class="text-xs text-slate-500">Pour régulariser une autorisation d'occupation, un prêt minibus récurrent ou une mise à disposition régie.</p>
                    </div>
                    <button onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
                </div>

                <form onsubmit="CCMVR.App.handleSaveDirectInKindGrant(event)" class="space-y-4 text-xs">
                    <div>
                        <label class="block font-bold text-slate-800 mb-1">Association bénéficiaire *</label>
                        <select id="dir-nature-struct" required class="input-clean font-bold">
                            ${structures.map(st => `
                                <option value="${st.id}" ${prefillStructId === st.id ? 'selected' : ''} style="background:#fff;color:#0f172a;">
                                    ${st.nom_officiel} (SIREN : ${(st.siret || '').slice(0, 9)})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">Ressource mise à disposition *</label>
                            <select id="dir-nature-type" required onchange="CCMVR.App.onDirectNatureTypeChange()" class="input-clean font-bold">
                                ${types.map(t => `<option value="${t.id}" data-unite="${t.unite_mesure}" style="background:#fff;color:#0f172a;">${t.libelle} (${t.pole_gestionnaire})</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">Pôle gestionnaire</label>
                            <select id="dir-nature-pole" class="input-clean font-semibold">
                                <option value="SPORT" ${prefillPole === 'SPORT' ? 'selected' : ''}>Pôle Sport</option>
                                <option value="BATIMENTS" ${prefillPole === 'BATIMENTS' ? 'selected' : ''}>Pôle Bâtiments & Salles</option>
                                <option value="ACCUEIL" ${prefillPole === 'ACCUEIL' ? 'selected' : ''}>Accueil & Minibus</option>
                                <option value="CULTURE" ${prefillPole === 'CULTURE' ? 'selected' : ''}>Pôle Culture</option>
                                <option value="ENFANCE" ${prefillPole === 'ENFANCE' ? 'selected' : ''}>Pôle Enfance-Jeunesse</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">Volume / Quantité *</label>
                            <input type="number" step="1" id="dir-nature-qte" required value="500" oninput="CCMVR.App.recalcDirectNatureTotal()" class="input-clean font-mono-code font-bold"/>
                            <span id="dir-nature-unite-badge" class="text-[10px] text-slate-500 mt-0.5 block">Unité : ${activeType.unite_mesure || 'km'}</span>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">Tarif unitaire barème (€) *</label>
                            <input type="number" step="0.01" id="dir-nature-tarif" required value="${activeTarif}" oninput="CCMVR.App.recalcDirectNatureTotal()" class="input-clean font-mono-code font-bold bg-slate-50"/>
                            <span class="text-[10px] text-slate-500 mt-0.5 block">Barème CCMVR officiel</span>
                        </div>
                    </div>

                    <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                        <div>
                            <span class="text-[11px] font-bold uppercase text-indigo-950 block">Valorisation Financière Totale</span>
                            <span class="text-[10px] text-indigo-700">Comptabilisée dans l'annexe de valorisation (Art. L. 2313-1 CGCT)</span>
                        </div>
                        <strong id="dir-nature-total-preview" class="font-mono-code text-base font-extrabold text-indigo-950">
                            ${fin.formatCurrency(500 * activeTarif)}
                        </strong>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Date début</label>
                            <input type="date" id="dir-nature-debut" value="${annee}-01-01" class="input-clean font-mono-code"/>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Date fin</label>
                            <input type="date" id="dir-nature-fin" value="${annee}-12-31" class="input-clean font-mono-code"/>
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Motif / Justification d'attribution</label>
                        <textarea id="dir-nature-obs" rows="2" placeholder="Ex: Convention annuelle de mise à disposition minibus pour les déplacements en compétitions régionales." class="input-clean"></textarea>
                    </div>

                    <label class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input type="checkbox" id="dir-nature-convention-check" checked class="rounded text-indigo-600 w-4 h-4"/>
                        <span class="text-slate-800 font-semibold">
                            Générer immédiatement la <strong>Convention de mise à disposition</strong> correspondante dans le Registre des Actes
                        </span>
                    </label>

                    <div class="flex items-center justify-between pt-3 border-t border-slate-200">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">
                            Annuler
                        </button>
                        <button type="submit" class="px-5 py-2 btn-primary font-bold shadow-sm">
                            Attribuer d'Office & Enregistrer →
                        </button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    onDirectNatureTypeChange() {
        const typeSelect = document.getElementById('dir-nature-type');
        const tarifInput = document.getElementById('dir-nature-tarif');
        const uniteBadge = document.getElementById('dir-nature-unite-badge');
        if (!typeSelect || !tarifInput) return;
        const typeId = typeSelect.value;
        const tarif = window.CCMVR.Store.getTarifUnitaire(typeId, window.CCMVR.Store.activeMillesime);
        tarifInput.value = tarif;
        const opt = typeSelect.selectedOptions[0];
        if (uniteBadge && opt) uniteBadge.textContent = `Unité : ${opt.getAttribute('data-unite') || 'heure'}`;
        this.recalcDirectNatureTotal();
    },

    recalcDirectNatureTotal() {
        const qte = parseFloat(document.getElementById('dir-nature-qte')?.value) || 0;
        const tarif = parseFloat(document.getElementById('dir-nature-tarif')?.value) || 0;
        const el = document.getElementById('dir-nature-total-preview');
        if (el) el.textContent = window.CCMVR.FinanceEngine.formatCurrency(qte * tarif);
    },

    async handleSaveDirectInKindGrant(e) {
        e.preventDefault();
        const structId = document.getElementById('dir-nature-struct').value;
        const typeId = document.getElementById('dir-nature-type').value;
        const poleCode = document.getElementById('dir-nature-pole').value;
        const qte = parseFloat(document.getElementById('dir-nature-qte').value) || 0;
        const tarif = parseFloat(document.getElementById('dir-nature-tarif').value) || 0;
        const dateDebut = document.getElementById('dir-nature-debut').value;
        const dateFin = document.getElementById('dir-nature-fin').value;
        const obs = document.getElementById('dir-nature-obs').value.trim();
        const genConv = document.getElementById('dir-nature-convention-check').checked;

        const store = window.CCMVR.Store;
        const s = store.state.structures.find(x => x.id === structId);

        try {
            await store.attributeDirectNatureGrant({
                structure_id: structId,
                pole_id: poleCode,
                type_prestation_id: typeId,
                annee: store.activeMillesime,
                quantite: qte,
                tarif_unitaire: tarif,
                date_debut: dateDebut,
                date_fin: dateFin,
                observations: obs,
                generer_convention: genConv
            });

            this.closeModal();
            this.renderMainView();
            this.toast(`Aide en nature d'office attribuée à « ${s?.nom_officiel || 'Association'} » (${window.CCMVR.FinanceEngine.formatCurrency(qte * tarif)})${genConv ? ' et convention générée !' : ' !'}`);
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    async handleInstructorEmergencyUpload(input, dossierId) {
        if (!input || !input.files || input.files.length === 0) return;
        const file = input.files[0];
        try {
            if (this.showLoader) this.showLoader(true);
            await window.CCMVR.Store.uploadJustificatifFile(file, {
                dossierId: dossierId,
                voletId: 'SECOURS_INSTRUCTEUR',
                critereCode: 'PIECE_COMPLEMENTAIRE'
            });
            if (this.toast) this.toast(`Pièce « ${file.name} » ajoutée avec succès au dossier !`, 'success');
            // Réactualiser la modale d'instruction pour afficher la nouvelle pièce immédiatement
            if (typeof this.openDossierModal === 'function') {
                this.openDossierModal(dossierId);
            }
        } catch (err) {
            console.error('Erreur téléversement pièce secours :', err);
            if (this.toast) this.toast('Erreur lors du téléversement : ' + (err.message || err), 'error');
        } finally {
            if (this.showLoader) this.showLoader(false);
            input.value = '';
        }
    },

    openChangeDossierCategoryModal(dossierId) {
        const store = window.CCMVR.Store;
        const d = store.state.dossiers_subventions.find(x => x.id === dossierId || x.code_hex === dossierId);
        if (!d) return;
        const pole = store.state.poles.find(p => p.id === d.pole_id || p.code === d.pole_id);
        const poleCode = pole ? pole.code : (d.pole?.code || 'SPORT');
        const categories = store.getPoleCategories(poleCode);

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden my-8 animate-scale-in';
        content.innerHTML = `
            <div class="bg-gradient-to-r from-orange-900 via-slate-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-300 flex items-center justify-center font-bold">
                        <i data-lucide="tag" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">Réajuster le Dispositif</h3>
                        <p class="text-[11px] text-orange-200">Dossier #${d.code_hex} • ${pole?.libelle || poleCode}</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.openDossierModal('${d.id}')" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <form onsubmit="CCMVR.App.handleSaveDossierCategory(event, '${d.id}')" class="p-6 space-y-4 text-xs">
                <div>
                    <label class="block font-bold text-slate-800 mb-1">Dispositif / Programme d'affectation :</label>
                    <select id="change-dossier-cat" class="input-clean font-bold text-xs w-full">
                        ${categories.map(c => `
                            <option value="${c.id}" ${c.id === d.categorie_id ? 'selected' : ''}>${c.nom}</option>
                        `).join('')}
                    </select>
                    <p class="text-[10px] text-slate-500 mt-1">Permet de corriger une erreur de sélection de l'association lors du dépôt.</p>
                </div>

                <div class="p-4 bg-slate-50 border-t border-slate-200 -mx-6 -mb-6 flex items-center justify-end gap-2">
                    <button type="button" onclick="CCMVR.App.openDossierModal('${d.id}')" class="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition">Annuler</button>
                    <button type="submit" class="px-5 py-2 btn-accent font-bold shadow-md flex items-center gap-1.5">
                        <i data-lucide="check" class="w-4 h-4"></i> Valider la réaffectation
                    </button>
                </div>
            </form>
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    async handleSaveDossierCategory(e, dossierId) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        const select = document.getElementById('change-dossier-cat');
        if (!select) return;
        const catId = select.value;
        const catNom = select.options[select.selectedIndex]?.text || '';

        await store.updateDossierCategory(dossierId, catId, catNom);
        this.openDossierModal(dossierId);
        this.toast(`Dispositif réajusté : « ${catNom} »`, 'success');
    },
};
