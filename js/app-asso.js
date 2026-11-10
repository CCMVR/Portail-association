// ==============================================================================
// MODULE CCMVR: ASSO
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.Modules.Asso = {
    setAssoDocFilter(filter) {
        this.assoDocFilter = filter;
        const c = document.getElementById('app-main');
        if (c) this.renderAssoProfil(c);
    },

    renderAssoProfil(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        let s = store.state.structures.find(x => x.id === store.activeStructureId)
            || (store.currentUser?.siret_attache ? store.state.structures.find(x => x.siret === store.currentUser.siret_attache) : null)
            || (store.loggedInEmail ? store.state.structures.find(x => (x.email_contact || '').toLowerCase() === store.loggedInEmail.toLowerCase()) : null)
            || (store.currentUser?.email ? store.state.structures.find(x => (x.email_contact || '').toLowerCase() === store.currentUser.email.toLowerCase()) : null)
            || (store.isSuperAdmin ? store.state.structures[0] : null)
            || store.state.structures[0]
            || {};
        if (s.id && !store.activeStructureId) {
            store.activeStructureId = s.id;
        }

        if (!s.id && !s.nom_officiel) {
            container.innerHTML = `
                <div class="card-minimal p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-white">
                    <div class="w-16 h-16 mx-auto rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-3xl">
                        🤝
                    </div>
                    <h3 class="text-lg font-black text-slate-900">Aucune association enregistrée</h3>
                    <p class="text-xs text-slate-500 leading-relaxed">
                        Aucun compte association n'est actuellement actif ou sélectionné sur la plateforme.<br>
                        Vous pouvez créer une toute nouvelle association via le bouton d'inscription ou importer une structure par SIREN dans l'annuaire CDG.
                    </p>
                    <div class="pt-2 flex justify-center gap-3">
                        <button onclick="CCMVR.App.handleStartNewAssociationSignup()" class="btn-accent px-4 py-2 text-xs font-bold flex items-center gap-2">
                            <i data-lucide="user-plus" class="w-4 h-4"></i> Créer une nouvelle association
                        </button>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }
        const hasIban = Boolean(s.iban && s.iban.trim());
        const ibanCheck = hasIban
            ? fin.validateIBAN(s.iban)
            : { valid: false, message: 'ℹ️ Coordonnées bancaires facultatives pour la présentation.' };

        const joafeUrl = s.rna
            ? `https://www.journal-officiel.gouv.fr/pages/associations-recherche/?q=${encodeURIComponent(s.rna)}`
            : `https://annuaire-entreprises.data.gouv.fr/entreprise/${encodeURIComponent(s.siret || '')}`;
        const statutsDeposited = localStorage.getItem(`ccmvr_statuts_${s.siret || 'default'}`) || 'Statuts_Certifies_Loi1901_CCMVR.pdf (Certifiés conformes)';
        const apiEnt = fin.getEnrichedApiEntrepriseData(s);
        const leCompteAssoDocs = fin.getLeCompteAssoChecklist(s);

        const statutsDocItem = leCompteAssoDocs.find(x => x.id === 'STATUTS');
        const dirigeantsDocItem = leCompteAssoDocs.find(x => x.id === 'DIRIGEANTS');
        const pvDocItem = leCompteAssoDocs.find(x => x.id === 'PV_AG');
        const bilanDocItem = leCompteAssoDocs.find(x => x.id === 'CR_DERNIER');
        const budgetDocItem = leCompteAssoDocs.find(x => x.id === 'BUDGET_PREV');

        // Sélection prioritaire du document officiel le plus récent
        const docStatuts = statutsDocItem || (apiEnt.documents_rna || []).find(d => d.code === 'STC' || d.type_code === 'STC');
        const docDirigeants = dirigeantsDocItem || (apiEnt.documents_rna || []).find(d => d.code === 'LDC' || d.type_code === 'LDC');
        const docPv = pvDocItem || (apiEnt.documents_rna || []).find(d => d.code === 'PV' || d.type_code === 'PV');
        const docBilan = bilanDocItem || (apiEnt.documents_dac || []).find(d => (d.nom || '').toLowerCase().includes('bilan') || (d.nom || '').toLowerCase().includes('cr2'));
        const docBudget = budgetDocItem || (apiEnt.documents_dac || []).find(d => (d.nom || '').toLowerCase().includes('budget') || (d.nom || '').toLowerCase().includes('bp'));

        const ibanRedirectAlertHtml = '';

        const filteredDocs = (this.assoDocFilter === 'courants')
            ? leCompteAssoDocs.filter(d => d.status !== 'RED')
            : leCompteAssoDocs;
        const leCompteAssoTableRowsHtml = filteredDocs.map(d => {
            const safeNom = (d.nomFichier || d.nom).replace(/'/g, "\\'");
            const safeDocType = d.nom.replace(/'/g, "\\'");
            const structKey = s.id || s.siret || 'default';

            // Code visuel 3 états :
            // - RED (rouge clair) : Manquant
            // - YELLOW (jaune clair) : Validité antérieure / retard -> bouton Téléverser ou Valider inchangé
            // - GREEN (vert clair) : Conforme & à jour ou certifié inchangé pour l'exercice
            let rowClass = 'border-b border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 border-l-4 border-l-emerald-500 transition text-xs';
            let validiteHtml = '';
            let actionsHtml = '';

            if (d.status === 'RED') {
                rowClass = 'border-b border-rose-200 bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-rose-500 transition text-xs';
                validiteHtml = `
                    <div class="space-y-0.5">
                        <span class="px-2.5 py-1 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            🔴 Manquant
                        </span>
                        <div class="text-[9px] font-bold text-rose-700 leading-tight">${d.statusReason}</div>
                    </div>
                `;
                actionsHtml = `
                    <label class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer">
                        <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                        <span>Téléverser</span>
                        <input type="file" accept=".pdf,.doc,.docx" class="hidden" onchange="CCMVR.App.handleDocFileUpload(this, '${d.id}', '${structKey}')"/>
                    </label>
                `;
            } else if (d.status === 'YELLOW') {
                rowClass = 'border-b border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-amber-500 transition text-xs';
                validiteHtml = `
                    <div class="space-y-0.5">
                        <span class="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 font-mono-code inline-flex items-center gap-1.5 shadow-2xs">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            🟡 ${d.validite} (Retard)
                        </span>
                        <div class="text-[9px] font-bold text-amber-800 leading-tight">${d.statusReason}</div>
                    </div>
                `;
                actionsHtml = `
                    <div class="inline-flex items-center gap-1.5 justify-end">
                        <label class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer" title="Téléverser une version actualisée">
                            <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                            <span>Téléverser</span>
                            <input type="file" accept=".pdf,.doc,.docx" class="hidden" onchange="CCMVR.App.handleDocFileUpload(this, '${d.id}', '${structKey}')"/>
                        </label>
                        ${d.canConfirmUnchanged ? `
                            <button type="button" onclick="CCMVR.App.confirmDocUnchanged('${d.id}', '${structKey}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition shadow-2xs" title="Certifier que ce document est toujours valable pour l'exercice en cours">
                                ✓ Toujours valable
                            </button>
                        ` : ''}
                        ${d.url ? `
                            <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeNom}', url: '${d.url}', date: '${d.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso / DJEPVA', docId: '${d.id}', structKey: '${structKey}' })" class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="Visualiser le document PDF">
                                <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i>
                            </button>
                            <button type="button" onclick="CCMVR.App.downloadDocumentOrAttestation({ title: '${safeNom}', url: '${d.url}', date: '${d.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso / DJEPVA', docId: '${d.id}', structKey: '${structKey}' })" class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="Télécharger le fichier PDF">
                                <i data-lucide="download" class="w-3.5 h-3.5 text-slate-700"></i>
                            </button>
                        ` : ''}
                    </div>
                `;
            } else {
                // GREEN
                validiteHtml = `
                    <div class="space-y-0.5">
                        <span class="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono-code inline-flex items-center gap-1.5 shadow-2xs">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            🟢 ${d.statusLabel}
                        </span>
                        <div class="text-[9px] text-emerald-700 font-semibold leading-tight">${d.statusReason || 'Conforme pour l\'exercice'}</div>
                    </div>
                `;
                actionsHtml = `
                    <div class="inline-flex items-center gap-1.5 justify-end">
                        ${d.url ? `
                            <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeNom}', url: '${d.url}', date: '${d.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso / DJEPVA', docId: '${d.id}', structKey: '${structKey}' })" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs">
                                <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i> Visualiser
                            </button>
                            <button type="button" onclick="CCMVR.App.downloadDocumentOrAttestation({ title: '${safeNom}', url: '${d.url}', date: '${d.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso / DJEPVA', docId: '${d.id}', structKey: '${structKey}' })" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="Télécharger le vrai document PDF">
                                <i data-lucide="download" class="w-3.5 h-3.5 text-blue-600"></i> Télécharger
                            </button>
                        ` : ''}
                        <label class="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer" title="Remplacer le document">
                            <span>Modifier</span>
                            <input type="file" accept=".pdf,.doc,.docx" class="hidden" onchange="CCMVR.App.handleDocFileUpload(this, '${d.id}', '${structKey}')"/>
                        </label>
                    </div>
                `;
            }

            return `
            <tr class="${rowClass}">
                <td class="py-2.5 px-3 font-bold text-slate-900">
                    <div class="flex items-center gap-1.5">
                        <span>${d.nom}</span>
                        ${d.isMandatoryAnnual ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 shrink-0" title="Pièce annuelle obligatoire">Annuel</span>' : ''}
                    </div>
                </td>
                <td class="py-2.5 px-3 text-slate-600 font-medium">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.origine === 'RNA' ? 'bg-indigo-100 text-indigo-800' : (d.origine === 'INSEE' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700')}">
                        ${d.origine}
                    </span>
                </td>
                <td class="py-2.5 px-3 font-mono-code text-[11px] ${d.nomFichier === 'Non défini' ? 'text-rose-600 font-bold italic' : 'text-slate-700'}">${d.nomFichier}</td>
                <td class="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">${d.dateCharge}</td>
                <td class="py-2.5 px-3">${validiteHtml}</td>
                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                    ${actionsHtml}
                </td>
            </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Bandeau Officiel : Mon Identité SIREN, Statuts & Documents -->
                <div class="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="space-y-1.5">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                Identité Juridique SIREN & Répertoire National (INSEE / RNA)
                            </span>
                            <span class="font-mono-code text-xs px-2.5 py-0.5 rounded-md bg-white/10 text-indigo-200 font-bold">
                                SIRET : ${(s.siret || '').replace(/\s+/g, '') || '—'}
                            </span>
                        </div>
                        <h1 class="text-2xl font-black text-white tracking-tight">${s.nom_officiel || 'Mon Association'}</h1>
                        <p class="text-xs text-slate-300 max-w-2xl leading-relaxed">
                            Fiche d'identité certifiée, statuts déposés en Préfecture et souscription au Contrat d'Engagement Républicain. Vos données officielles sont verrouillées et protégées pour sécuriser vos demandes de subventions CCMVR.
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button onclick="CCMVR.App.switchTab('asso_conventions')" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow transition">
                            <i data-lucide="clipboard-list" class="w-4 h-4 text-emerald-400"></i> Suivre mes Demandes
                        </button>
                        <button onclick="CCMVR.App.switchTab('asso_demande')" class="px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-400/30 rounded-xl text-xs font-bold flex items-center gap-2 shadow transition">
                            <i data-lucide="file-plus" class="w-4 h-4 text-indigo-200"></i> Déposer une Subvention →
                        </button>
                    </div>
                </div>

                ${ibanRedirectAlertHtml}

                <!-- Guide visuel dynamique des formulaires (Vert clair / Jaune clair / Rouge clair) -->
                <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                        <span class="text-xs font-bold text-slate-900">Guide visuel dynamique de saisie du formulaire :</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                            <span class="w-2 h-2 rounded-full bg-emerald-600"></span> Vert clair : Bien renseigné
                        </span>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 font-bold">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span> Jaune clair : Facultatif (non bloquant)
                        </span>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-950 border border-rose-300 font-extrabold">
                            <span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span> Rouge clair : Obligatoire (bloquant)
                        </span>
                    </div>
                </div>

                <div class="space-y-6">
                    <!-- Identification Légale & Interrogation API Gouv SIRET -->
                    <div class="card-minimal card-accent-blue p-6 space-y-4">
                            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h2 class="text-base font-extrabold text-slate-900">1. Identité Légale Certifiée de l'Association (INSEE / RNA)</h2>
                                        <span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">🔒 Lecture Seule Certifiée</span>
                                    </div>
                                    <p class="text-xs text-slate-500 mt-0.5">Les données administratives du siège sont issues des répertoires officiels de l'État.</p>
                                </div>
                            </div>

                            <!-- Avertissement officiel Le Compte Asso / Service-Public.fr -->
                            <div class="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 leading-relaxed space-y-1">
                                <div class="font-extrabold flex items-center gap-1.5 text-amber-900">
                                    <span>ℹ️ Données légales verrouillées en lecture seule (Sécurité juridique & Trésor Public / DDFiP) :</span>
                                </div>
                                <p>
                                    Si la dénomination officielle ou l'adresse du siège social de votre association est inexacte ou a changé, merci de mettre à jour votre fiche SIRET/SIREN sur <a href="https://lecompteasso.associations.gouv.fr" target="_blank" rel="noopener" class="underline font-bold text-blue-800 hover:text-blue-950">Le Compte Asso / Service-Public.fr</a>, puis cliquez sur le bouton d'actualisation ci-dessous.
                                </p>
                            </div>

                            <form onsubmit="CCMVR.App.handleSaveAssoProfil(event)" novalidate class="space-y-4 text-xs">
                                <input type="hidden" id="asso-id" value="${s.id || ''}"/>
                                <div class="flex flex-col sm:flex-row gap-2">
                                    <div class="flex-1">
                                        <label class="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                                            <span>N° SIRET Officiel (14 chiffres) *</span>
                                            <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifié INSEE</span>
                                        </label>
                                        <input type="text" id="asso-siret" readonly required value="${s.siret || ''}" class="input-clean font-mono-code font-bold bg-slate-100 text-slate-800 border-slate-300 cursor-not-allowed"/>
                                        <div class="text-[11px] text-slate-500 mt-1">
                                            SIREN détecté (Unité légale tous locaux) : <strong class="font-mono-code text-blue-700">${(s.siret || '').replace(/\s+/g, '').slice(0, 9) || '—'}</strong>
                                        </div>
                                    </div>
                                    <div class="sm:pt-5">
                                        <button type="button" id="btn-asso-apigouv" onclick="CCMVR.App.triggerApiGouvLookup()" class="w-full sm:w-auto px-4 py-2.5 btn-accent text-xs font-extrabold flex items-center justify-center gap-2 transition">
                                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                                            <span>Actualiser via API Gouv / INSEE</span>
                                        </button>
                                    </div>
                                </div>

                                <div id="asso-apigouv-status" class="hidden rounded-xl p-3 text-xs font-semibold"></div>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                    <div class="sm:col-span-2">
                                        <label class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                            <span>Dénomination officielle (JOAFE / INSEE) *</span>
                                            <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifiée</span>
                                        </label>
                                        <input type="text" id="asso-nom" readonly required value="${s.nom_officiel || ''}" class="input-clean font-bold bg-slate-100 text-slate-900 border-slate-300 cursor-not-allowed"/>
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                            <span>Numéro RNA Préfecture (W...)</span>
                                            <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifié</span>
                                        </label>
                                        <input type="text" id="asso-rna" readonly value="${s.rna || ''}" placeholder="Ex: W431000214" class="input-clean font-mono-code font-bold text-indigo-700 bg-slate-100 border-slate-300 cursor-not-allowed"/>
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                            <span>Adresse du siège social</span>
                                            <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifiée</span>
                                        </label>
                                        <input type="text" id="asso-adresse" readonly value="${s.adresse_siege || ''}" class="input-clean bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                            <span>Code Postal</span>
                                            <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifié</span>
                                        </label>
                                        <input type="text" id="asso-cp" readonly value="${s.code_postal || ''}" class="input-clean font-mono-code bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                            <span>Commune</span>
                                            <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifiée</span>
                                        </label>
                                        <input type="text" id="asso-ville" readonly value="${s.ville || ''}" class="input-clean bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                                    </div>
                                </div>

                                <!-- Sigle ou Nom d'usage courant (Éditable) -->
                                <div class="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200">
                                    <label class="block font-bold text-indigo-950 mb-1">Sigle ou Nom d'usage courant (Affichage convivial extranet)</label>
                                    <input type="text" id="asso-nom-dusage" value="${s.nom_dusage || s.nom_officiel || ''}" placeholder="Ex: USM Foot, Planet'Air, MV Natation..." class="input-clean bg-white font-semibold"/>
                                </div>

                                <!-- Organisation de la Gouvernance & Bureau de l'Association -->
                                <div class="border-t border-slate-100 pt-3 space-y-3">
                                    <div class="flex items-center justify-between">
                                        <div class="text-xs font-extrabold uppercase tracking-wide text-slate-900">Organisation du Bureau & Gouvernance</div>
                                        <span class="text-[10px] text-slate-500 font-semibold">Présidence • Co-présidence • Bureau collégial</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label class="block font-semibold text-slate-700 mb-1">Type d'organisation du bureau *</label>
                                            <select id="asso-gov-type" class="input-clean font-bold text-slate-800">
                                                <option value="PRESIDENCE_UNIQUE" ${(s.gov_type || 'PRESIDENCE_UNIQUE') === 'PRESIDENCE_UNIQUE' ? 'selected' : ''}>Présidence unique</option>
                                                <option value="CO_PRESIDENCE" ${s.gov_type === 'CO_PRESIDENCE' ? 'selected' : ''}>Co-présidence</option>
                                                <option value="BUREAU_COLLEGIAL" ${s.gov_type === 'BUREAU_COLLEGIAL' ? 'selected' : ''}>Bureau collégial (Direction partagée)</option>
                                            </select>
                                        </div>
                                        <div class="sm:col-span-2">
                                            <label class="block font-semibold text-slate-700 mb-1">Nom / Prénom des membres du bureau ou bureau collégial *</label>
                                            <input type="text" id="asso-gov-membres" value="${s.gov_membres || `${s.representant_prenom || ''} ${s.representant_nom || ''} (${s.representant_fonction || 'Président'})`.trim()}" placeholder="Ex: Jean DUPONT (Président), Marie MARTIN (Secrétaire), Paul DURAND (Trésorier)" class="input-clean font-medium"/>
                                        </div>
                                    </div>

                                    <!-- Coordonnées directes de la Gouvernance & Coordonnées générales -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div>
                                            <label class="block text-[11px] font-bold text-indigo-950 mb-1">E-mail direct de la Gouvernance *</label>
                                            <input type="email" id="asso-gov-email" value="${s.gov_email || s.email_contact || ''}" placeholder="president@association.fr" class="input-clean font-semibold bg-white"/>
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold text-indigo-950 mb-1">Tél direct de la Gouvernance *</label>
                                            <input type="tel" id="asso-gov-tel" value="${s.gov_tel || s.telephone || ''}" placeholder="06 12 34 56 78" class="input-clean font-semibold bg-white font-mono-code"/>
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold text-slate-700 mb-1">E-mail général de l'association *</label>
                                            <input type="email" id="asso-general-email" value="${s.email_contact || ''}" placeholder="contact@association.fr" class="input-clean bg-white"/>
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Tél général de l'association</label>
                                            <input type="tel" id="asso-general-tel" value="${s.telephone || ''}" placeholder="04 71 66 00 00" class="input-clean bg-white font-mono-code"/>
                                        </div>
                                    </div>
                                </div>

                                <div class="border-t border-slate-100 pt-3 space-y-3">
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <div class="text-xs font-bold text-slate-900">Personnes habilitées à signer (Président, Trésorier, Secrétaire...)</div>
                                            <p class="text-[11px] text-slate-500">Liste des dirigeants statutairement ou mandatés pour signer les conventions et le CER.</p>
                                        </div>
                                        <button type="button" onclick="CCMVR.App.openAddSignataireModal('${s.id}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0">
                                            + Ajouter un signataire habilité
                                        </button>
                                    </div>

                                    <div class="space-y-2">
                                        ${store.getSignatairesHabilites(s.id).map(sig => `
                                            <div class="p-3 bg-white rounded-xl border ${sig.est_defaut ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'} flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs">
                                                <div class="flex items-center gap-2.5 flex-wrap">
                                                    <span class="w-2.5 h-2.5 rounded-full ${sig.est_defaut ? 'bg-emerald-500' : 'bg-slate-300'} shrink-0"></span>
                                                    <strong class="text-slate-900 font-bold">${sig.prenom} ${sig.nom}</strong>
                                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${sig.fonction}</span>
                                                    ${sig.est_defaut ? `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">Signataire par défaut</span>` : ''}
                                                    ${sig.email ? `<span class="text-[11px] text-slate-500">(${sig.email})</span>` : ''}
                                                </div>
                                                <div class="flex items-center gap-1.5 shrink-0">
                                                    ${!sig.est_defaut ? `
                                                        <button type="button" onclick="CCMVR.App.setDefaultSignataire('${s.id}', '${sig.id}')" class="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition">
                                                            Définir par défaut
                                                        </button>
                                                        <button type="button" onclick="CCMVR.App.deleteSignataire('${s.id}', '${sig.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded transition" title="Supprimer ce signataire">
                                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <input type="hidden" id="asso-rep-prenom" value="${s.representant_prenom || ''}"/>
                                    <input type="hidden" id="asso-rep-nom" value="${s.representant_nom || ''}"/>
                                    <input type="hidden" id="asso-rep-fonction" value="${s.representant_fonction || 'Président(e)'}"/>
                                </div>

                                <div id="asso-iban-section" class="border-t border-slate-100 pt-3">
                                    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <div>
                                            <span class="text-xs font-bold text-slate-900">Coordonnées Bancaires (Contrôle Modulo 97)</span>
                                            <span class="ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">Facultatif pour la présentation</span>
                                        </div>
                                        <button type="button" onclick="CCMVR.App.fillDemoValidIban()" class="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline">
                                            Pré-remplir un IBAN valide de test
                                        </button>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div class="sm:col-span-2">
                                            <label class="block font-semibold text-slate-700 mb-1">IBAN (27 caractères France — facultatif pour la présentation)</label>
                                            <input type="text" id="asso-iban" value="${s.iban || ''}" placeholder="Ex: FR76 3000 6000 0112 3456 7890 189" oninput="CCMVR.App.checkIbanLive(this.value)" class="input-clean font-mono-code bg-white"/>
                                            <div id="iban-live-feedback" class="text-[11px] mt-1 font-medium ${!hasIban ? 'text-blue-700' : (ibanCheck.valid ? 'text-emerald-600' : 'text-rose-600')}">
                                                ${ibanCheck.message}
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block font-semibold text-slate-700 mb-1">Code BIC / SWIFT</label>
                                            <input type="text" id="asso-bic" value="${s.bic || ''}" placeholder="Ex: AGRIFRPP" class="input-clean font-mono-code bg-white"/>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex justify-end pt-2">
                                    <button type="submit" class="px-5 py-2.5 btn-primary text-xs font-bold">
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Section 2 : Statuts Officiels, Objet Social & API Entreprise v4 DJEPVA -->
                        <div class="card-minimal card-accent-indigo p-6 space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase">API Entreprise v4 (associations_djepva + INSEE)</span>
                                    <h2 class="text-base font-extrabold text-slate-900 mt-1">2. Statuts Officiels RNA, Objet Social & Pièces Préfectorales</h2>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    ${docStatuts ? `
                                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: 'Statuts Officiels Déposés', url: '${docStatuts.url}', date: '${docStatuts.date || docStatuts.dateCharge || '01/10/2024'}', type: 'Statuts RNA', source: 'Ministère de l\'Intérieur', docId: 'STATUTS', structKey: '${s.id || s.siret}' })" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition">
                                            <i data-lucide="eye" class="w-3.5 h-3.5"></i> Statuts PDF (API État)
                                        </button>
                                    ` : ''}
                                    ${docDirigeants ? `
                                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: 'Liste Officielle des Dirigeants', url: '${docDirigeants.url}', date: '${docDirigeants.date || docDirigeants.dateCharge || '06/11/2025'}', type: 'Dirigeants RNA', source: 'Ministère de l\'Intérieur', docId: 'DIRIGEANTS', structKey: '${s.id || s.siret}' })" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition">
                                            <i data-lucide="eye" class="w-3.5 h-3.5"></i> Dirigeants PDF
                                        </button>
                                    ` : ''}
                                    ${docPv ? `
                                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: 'Procès-Verbal AG Déposé', url: '${docPv.url}', date: '${docPv.date || docPv.dateCharge || '06/11/2025'}', type: 'PV AG RNA', source: 'Ministère de l\'Intérieur', docId: 'PV_AG', structKey: '${s.id || s.siret}' })" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition">
                                            <i data-lucide="eye" class="w-3.5 h-3.5"></i> PV AG PDF
                                        </button>
                                    ` : ''}
                                    ${docBilan ? `
                                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${(docBilan.nom || docBilan.nomFichier || 'Bilan Déposé').replace(/'/g, "\\'")}', url: '${docBilan.url}', date: '${docBilan.date_depot || docBilan.dateCharge || '29/09/2024'}', type: 'Bilan DAC', source: 'DJEPVA — Le Compte Asso', docId: 'CR_DERNIER', structKey: '${s.id || s.siret}' })" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition">
                                            <i data-lucide="eye" class="w-3.5 h-3.5"></i> Bilan (${docBilan.annee_validite || docBilan.validite || 'Clos'})
                                        </button>
                                    ` : ''}
                                    ${docBudget ? `
                                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${(docBudget.nom || docBudget.nomFichier || 'Budget Prévisionnel').replace(/'/g, "\\'")}', url: '${docBudget.url}', date: '${docBudget.date_depot || docBudget.dateCharge || '29/09/2024'}', type: 'Budget DAC', source: 'DJEPVA — Le Compte Asso', docId: 'BUDGET_PREV', structKey: '${s.id || s.siret}' })" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition">
                                            <i data-lucide="eye" class="w-3.5 h-3.5"></i> Budget (${docBudget.annee_validite || docBudget.validite || 'En cours'})
                                        </button>
                                    ` : ''}
                                    <a id="asso-link-joafe" href="${joafeUrl}" target="_blank" rel="noopener" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition">
                                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i> JOAFE
                                    </a>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span class="text-[10px] font-bold uppercase text-slate-400 block">Objet social statutaire (DJEPVA / RNA)</span>
                                    <strong id="asso-statut-objet" class="text-slate-900 mt-0.5 block">${apiEnt.objet_social} (${apiEnt.code_ape})</strong>
                                </div>
                                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span class="text-[10px] font-bold uppercase text-slate-400 block">Création, Multi-locaux & Fiscalité</span>
                                    <strong id="asso-statut-date" class="text-slate-900 font-mono-code mt-0.5 block">Créée le ${apiEnt.date_creation} • ${apiEnt.nb_etablissements_locaux} local(aux)</strong>
                                    <span class="text-[10px] text-slate-500 block mt-0.5">${apiEnt.regime_fiscal}</span>
                                </div>
                                <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <span class="text-[10px] font-bold uppercase text-emerald-700 block">Statut Administratif Préfecture</span>
                                    <strong id="asso-statut-etat" class="text-emerald-900 mt-0.5 block">✓ Association Active (RNA ${apiEnt.rna})</strong>
                                    <span class="text-[10px] text-emerald-700 block mt-0.5">${apiEnt.eligibilite_cec ? '✓ Éligible CEC' : 'Standard Loi 1901'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Contrat d'Engagement Républicain (CER) -->
                        <div class="card-minimal card-accent-emerald p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                    <i data-lucide="shield-check" class="w-5 h-5 text-emerald-700"></i>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h2 class="text-sm font-extrabold text-slate-900">3. Contrat d'Engagement Républicain (CER)</h2>
                                        <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">Décret 2021-1947</span>
                                    </div>
                                    <p class="text-[11px] text-slate-600 mt-0.5">
                                        Souscription républicaine active de plein droit pour vos demandes • Signataire déclaré : <strong>${s.signataire_cer_nom || s.representant_nom || 'Représentant habilité'}</strong>
                                    </p>
                                </div>
                            </div>
                            <button type="button" onclick="CCMVR.App.openCerModal()" class="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-extrabold shrink-0 transition flex items-center gap-2 shadow-2xs">
                                <i data-lucide="file-text" class="w-4 h-4 text-emerald-700"></i>
                                Consulter les 7 engagements du CER
                            </button>
                        </div>
                    </div>

                <!-- Section 2B : Synchronisation Le Compte Asso (lecompteasso.associations.gouv.fr) & Démarches DJEPVA -->
                <div class="card-minimal card-accent-blue p-6 space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div class="flex items-center gap-3">
                            <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-black text-sm shadow-sm">
                                🏛️
                            </span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h2 class="text-base font-extrabold text-slate-900">Synchronisation des 10 Pièces sur « Le Compte Asso » (Gouv.fr)</h2>
                                    <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">DJEPVA • Gouv.fr</span>
                                </div>
                                <p class="text-xs text-slate-500">
                                    Conformément au principe « Dites-le-nous une fois », tenez à jour vos pièces administratives sur 
                                    <a href="https://lecompteasso.associations.gouv.fr/" target="_blank" rel="noopener" class="text-blue-700 font-bold underline hover:text-blue-900">lecompteasso.associations.gouv.fr</a> 
                                    pour que la CCMVR les synchronise automatiquement par flux d'État.
                                </p>
                            </div>
                        </div>
                        <a href="https://lecompteasso.associations.gouv.fr/" target="_blank" rel="noopener" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition shrink-0">
                            <i data-lucide="external-link" class="w-4 h-4"></i> Consulter les documents sur Le Compte Asso ↗
                        </a>
                    </div>

                    <!-- Règle de conformité selon montant demandé (< 23 000 € vs ≥ 23 000 €) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div class="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                            <div class="p-1 rounded bg-emerald-100 text-emerald-800 shrink-0 font-bold">✓</div>
                            <div>
                                <strong class="text-emerald-950 font-extrabold block">Demande &lt; 23 000 € (Procédure Allégée) :</strong>
                                <p class="text-emerald-900 text-[11px] mt-0.5">
                                    Le téléversement des 10 pièces n'est <strong>pas strictement nécessaire</strong> pour le dépôt et l'instruction de votre demande simplifiée par le Pôle Métier.
                                </p>
                            </div>
                        </div>
                        <div class="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5">
                            <div class="p-1 rounded bg-amber-100 text-amber-900 shrink-0 font-bold">⚠️</div>
                            <div>
                                <strong class="text-amber-950 font-extrabold block">Demande ≥ 23 000 € (Seuil Légal Conventionnel) :</strong>
                                <p class="text-amber-950 text-[11px] mt-0.5">
                                    Le dépôt complet et à jour de l'ensemble des pièces ci-dessous sur <strong>Le Compte Asso</strong> est <strong>indispensable</strong> (Art. L. 1611-4 CGCT & Loi n° 2000-321) pour permettre le visa obligatoire du Contrôleur de Gestion.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Tableau officiel de conformité des 10 documents Le Compte Asso -->
                    <div class="card-minimal overflow-hidden border border-slate-200">
                        <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Liste des documents de l'association</span>
                                <span class="text-[10px] text-slate-500 font-medium">(Flux Ministère de l'Intérieur / RNA + DJEPVA)</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-xs">
                                <span class="text-slate-500 text-[11px]">Afficher les documents :</span>
                                <button type="button" onclick="CCMVR.App.setAssoDocFilter('courants')" class="px-2.5 py-0.5 rounded text-[10px] font-bold transition ${(this.assoDocFilter || 'courants') === 'courants' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">Courants (${leCompteAssoDocs.filter(x => x.status !== 'RED').length})</button>
                                <button type="button" onclick="CCMVR.App.setAssoDocFilter('tous')" class="px-2.5 py-0.5 rounded text-[10px] font-bold transition ${(this.assoDocFilter || 'courants') === 'tous' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">Tous (${leCompteAssoDocs.length})</button>
                            </div>
                        </div>

                        <!-- Légende épurée du code visuel de conformité (Vert / Jaune / Rouge) -->
                        <div class="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center gap-3 text-[11px]">
                            <span class="font-bold text-slate-700">Code visuel de conformité :</span>
                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Vert clair : Document 100% à jour ou validé inchangé
                            </span>
                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                                <span class="w-2 h-2 rounded-full bg-amber-500"></span> Jaune clair : Validité antérieure / retard (cliquer pour Mettre à jour ou Valider inchangé)
                            </span>
                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200 font-bold">
                                <span class="w-2 h-2 rounded-full bg-rose-500"></span> Rouge clair : Document manquant
                            </span>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/60">
                                        <th class="py-2.5 px-3">Modèle / Type</th>
                                        <th class="py-2.5 px-3">Origine</th>
                                        <th class="py-2.5 px-3">Nom du document</th>
                                        <th class="py-2.5 px-3">Chargé le</th>
                                        <th class="py-2.5 px-3">Validité</th>
                                        <th class="py-2.5 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="asso-documents-tbody">
                                    ${leCompteAssoTableRowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.applyFormVisualFeedback(container);
            container.addEventListener('input', () => this.applyFormVisualFeedback(container));
            container.addEventListener('change', () => this.applyFormVisualFeedback(container));
        }, 10);
    },

    fillDemoValidIban() {
        const ibanEl = document.getElementById('asso-iban');
        const bicEl = document.getElementById('asso-bic');
        if (ibanEl) {
            ibanEl.value = 'FR76 3000 6000 0112 3456 7890 189';
            this.checkIbanLive(ibanEl.value);
            ibanEl.focus();
        }
        if (bicEl && !bicEl.value) {
            bicEl.value = 'AGRIFRPP';
        }
        this.toast('IBAN valide (Modulo 97 certifié) pré-rempli. Cliquez sur Enregistrer pour continuer.', 'info');
        this.applyFormVisualFeedback();
    },


    checkIbanLive(val) {
        const el = document.getElementById('iban-live-feedback');
        if (!el) return;
        if (!val || !val.trim()) {
            el.textContent = 'ℹ️ Facultatif à la création du compte — Requis uniquement lors du dépôt d\'une demande de subvention financière.';
            el.className = 'text-[11px] mt-1 font-medium text-blue-700';
            return;
        }
        const res = window.CCMVR.FinanceEngine.validateIBAN(val);
        el.textContent = res.message;
        el.className = `text-[11px] mt-1 font-medium ${res.valid ? 'text-emerald-600' : 'text-rose-600'}`;
    },

    async triggerApiGouvLookup() {
        const siretInput = document.getElementById('asso-siret');
        const btn = document.getElementById('btn-asso-apigouv');
        const statusBox = document.getElementById('asso-apigouv-status');
        const query = siretInput ? siretInput.value.trim() : '';

        if (!query || query.replace(/\s+/g, '').length < 3) {
            this.toast('Veuillez saisir un numéro SIREN, SIRET, RNA ou le nom de l\'association.', 'warning');
            if (siretInput) siretInput.focus();
            return;
        }

        const originalBtnHtml = btn ? btn.innerHTML : 'Auto-compléter via API Gouv';
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-80', 'cursor-wait');
            btn.innerHTML = `
                <svg class="animate-spin h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Recherche API Gouv en cours...</span>
            `;
        }
        if (statusBox) {
            statusBox.className = 'rounded-xl p-3 text-xs font-semibold bg-blue-100/90 border border-blue-300 text-blue-900 flex items-center gap-2.5 animate-pulse';
            statusBox.innerHTML = `
                <div class="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin shrink-0"></div>
                <span>Interrogation en direct du répertoire national INSEE / RNA / API Recherche d'Entreprises (api.gouv.fr)... Veuillez patienter.</span>
            `;
            statusBox.classList.remove('hidden');
        }
        this.showLoader(true);

        try {
            const res = await window.CCMVR.FinanceEngine.lookupSiretApiGouv(query);
            if (!res || (res.found === false) || (!res.nom_officiel && !res.siren)) {
                if (statusBox) {
                    statusBox.className = 'rounded-xl p-3 text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-900';
                    statusBox.innerHTML = `⚠️ ${res?.error || 'Aucune structure trouvée.'} Vous pouvez compléter les champs manuellement.`;
                }
                this.toast(res?.error || 'Structure non trouvée sur API Gouv', 'warning');
                return;
            }

            if (document.getElementById('asso-siret')) document.getElementById('asso-siret').value = res.siret || query;
            if (document.getElementById('asso-nom')) document.getElementById('asso-nom').value = res.nom_officiel || '';
            if (document.getElementById('asso-rna')) document.getElementById('asso-rna').value = res.rna || '';
            if (document.getElementById('asso-adresse')) document.getElementById('asso-adresse').value = res.adresse_siege || '';
            if (document.getElementById('asso-cp')) document.getElementById('asso-cp').value = res.code_postal || '';
            if (document.getElementById('asso-ville')) document.getElementById('asso-ville').value = res.ville || '';

            const objEl = document.getElementById('asso-statut-objet');
            const dateEl = document.getElementById('asso-statut-date');
            const etatEl = document.getElementById('asso-statut-etat');
            const linkJoafe = document.getElementById('asso-link-joafe');
            const linkAnnuaire = document.getElementById('asso-link-annuaire');
            if (objEl) objEl.textContent = res.objet_social;
            if (dateEl) dateEl.textContent = res.date_creation || 'Inscrite au Répertoire Sirene';
            if (etatEl) etatEl.textContent = `✓ ${res.etat_administratif} ${res.rna ? `(RNA ${res.rna})` : ''}`;
            if (linkJoafe && res.joafe_url) linkJoafe.href = res.joafe_url;
            if (linkAnnuaire && res.annuaire_gouv_url) linkAnnuaire.href = res.annuaire_gouv_url;

            if (statusBox) {
                statusBox.className = 'rounded-xl p-3 text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-900';
                statusBox.innerHTML = `✓ Données officielles synchronisées avec succès via API Gouv : <strong>${res.nom_officiel}</strong> (SIRET : ${res.siret}${res.rna ? ' — RNA : ' + res.rna : ''}).`;
            }
            this.toast(`Structure officielle & Statuts RNA identifiés : ${res.nom_officiel} !`, 'success');
        } catch (err) {
            if (statusBox) {
                statusBox.className = 'rounded-xl p-3 text-xs font-semibold bg-rose-50 border border-rose-300 text-rose-800';
                statusBox.innerHTML = `⚠️ Erreur lors de l'interrogation API Gouv : ${err.message}`;
            }
            this.toast(err.message, 'warning');
        } finally {
            this.showLoader(false);
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-wait');
                btn.innerHTML = originalBtnHtml;
            }
            if (window.lucide) window.lucide.createIcons();
            this.applyFormVisualFeedback();
        }
    },

    async handleSaveAssoProfil(e) {
        e.preventDefault();
        const ibanVal = (document.getElementById('asso-iban')?.value || '').trim();
        if (ibanVal) {
            const ibanCheck = window.CCMVR.FinanceEngine.validateIBAN(ibanVal);
            if (!ibanCheck.valid) {
                this.toast(ibanCheck.message, 'error');
                return;
            }
        }

        const store = window.CCMVR.Store;
        const currentStruct = store.state.structures.find(x => x.id === store.activeStructureId);
        const genEmail = (document.getElementById('asso-general-email')?.value || currentStruct?.email_contact || store.currentUser?.email || 'contact@association-ccmvr.fr').trim();
        const genTel = (document.getElementById('asso-general-tel')?.value || '').trim();
        const govType = document.getElementById('asso-gov-type')?.value || 'PRESIDENCE_UNIQUE';
        const govMembres = (document.getElementById('asso-gov-membres')?.value || '').trim();
        const govEmail = (document.getElementById('asso-gov-email')?.value || genEmail).trim();
        const govTel = (document.getElementById('asso-gov-tel')?.value || genTel).trim();

        const structId = document.getElementById('asso-id')?.value || store.activeStructureId;

        let existingGov = {};
        try {
            existingGov = JSON.parse(localStorage.getItem(`ccmvr_governance_${structId}`) || '{}');
        } catch (_) {}

        // Persistance locale des données étendues de gouvernance (en préservant les signataires habilités déclarés)
        const govData = {
            ...existingGov,
            gov_type: govType,
            gov_membres: govMembres,
            gov_email: govEmail,
            gov_tel: govTel,
            email_contact: genEmail,
            telephone: genTel
        };
        try {
            localStorage.setItem(`ccmvr_governance_${structId}`, JSON.stringify(govData));
            const curS = store.getCurrentStructure();
            if (curS?.siret) localStorage.setItem(`ccmvr_governance_${curS.siret}`, JSON.stringify(govData));
        } catch (_) {}

        const payload = {
            id: structId || null,
            siret: document.getElementById('asso-siret').value,
            nom_officiel: document.getElementById('asso-nom').value,
            nom_dusage: document.getElementById('asso-nom-dusage')?.value?.trim() || document.getElementById('asso-nom').value,
            rna: document.getElementById('asso-rna').value,
            adresse_siege: document.getElementById('asso-adresse').value,
            code_postal: document.getElementById('asso-cp').value,
            ville: document.getElementById('asso-ville').value,
            representant_prenom: document.getElementById('asso-rep-prenom').value,
            representant_nom: document.getElementById('asso-rep-nom').value,
            representant_fonction: (document.getElementById('asso-rep-fonction')?.value || 'Président(e)').replace(/\s*\([^)]*\)\s*$/, '').trim(),
            iban: ibanVal,
            bic: document.getElementById('asso-bic').value,
            email_contact: genEmail,
            telephone: genTel,
            ...govData
        };

        this.showLoader(true);
        try {
            await store.saveStructure(payload);
            this.highlightIbanRequired = false;
            this.renderHeader();
            this.renderNavigation();
            this.toast(ibanVal
                ? 'Identité juridique et RIB/IBAN enregistrés avec succès ! Vous pouvez déposer vos demandes.'
                : 'Identité juridique enregistrée avec succès (sans IBAN pour l\'instant) !');
            // Maintien sur la page association courante sans redirection
            this.applyFormVisualFeedback();
        } catch (err) {
            this.toast('Erreur sauvegarde : ' + err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    // Formulaire de Dépôt de Demande de Subvention (Zéro Document + Budget Adaptatif Dynamique <23k€ vs ≥23k€ vs ≥50k€),

    renderAssoDemandeForm(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const s = store.state.structures.find(x => x.id === store.activeStructureId) || store.state.structures[0];
        if (!s || !s.nom_officiel) {
            this.switchTab('asso_profil');
            return;
        }
        const metierPoles = store.state.poles.filter(p => ['SPORT', 'ENFANCE', 'CULTURE', 'TOURISME', 'ECONOMIE', 'CDG'].includes(p.code));
        const hasValidIban = s.iban && fin.validateIBAN(s.iban).valid;
        const draft = this.pendingGrantDraft || null;
        if (this.pendingGrantDraft) this.pendingGrantDraft = null;

        const defaultMontant = draft ? draft.montantDem : '';
        const defaultIntitule = draft ? draft.intitule : '';
        const defaultMotivation = draft ? (draft.motivation || draft.description_projet || '') : '';

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Bannière moderne -->
                <div class="p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                            Guichet Unique Zéro Document • Exercice ${store.activeMillesime}
                        </span>
                        <h1 class="text-xl font-extrabold text-white mt-1">Déposer une Demande de Subvention — ${s.nom_officiel}</h1>
                        <p class="text-xs text-blue-200 mt-0.5">Le formulaire budgétaire se calibre automatiquement selon le montant demandé (Simplifié sous 23 000 € • Analytique PCG dès 23 000 € • Audit Stratégique dès 50 000 €).</p>
                    </div>
                </div>

                ${hasValidIban ? `
                    <div class="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                        <span>✓ <strong>IBAN de versement renseigné sur votre Fiche Tiers :</strong> <span class="font-mono-code font-bold">${s.iban}</span></span>
                        <span class="text-[11px] font-bold text-emerald-700">Enregistré</span>
                    </div>
                ` : `
                    <div class="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
                        <span>ℹ️ <strong>Mode Démonstration Présentation :</strong> Dépôt des demandes de subventions ouvert sans obligation d'IBAN préalable.</span>
                        <span class="text-[11px] font-bold text-slate-500">IBAN facultatif</span>
                    </div>
                `}

                <!-- Stepper Pas-à-Pas 3 Étapes (Conforme RGAA AA) -->
                <nav class="flex items-center justify-between gap-2 p-2 bg-slate-100 rounded-2xl border border-slate-200" aria-label="Progression du dossier de demande">
                    <button type="button" id="step-indicator-1" onclick="CCMVR.App.goToDemandeStep(1)" class="flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm transition" aria-current="step">
                        <span class="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">1</span>
                        <span class="truncate">1. Identité & Nature</span>
                    </button>
                    <div class="h-0.5 w-4 bg-slate-300 hidden sm:block shrink-0"></div>
                    <button type="button" id="step-indicator-2" onclick="CCMVR.App.goToDemandeStep(2)" class="flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl bg-white text-slate-600 font-semibold text-xs border border-slate-200 hover:bg-slate-50 transition">
                        <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-extrabold shrink-0">2</span>
                        <span class="truncate">2. Budget Prévisionnel</span>
                    </button>
                    <div class="h-0.5 w-4 bg-slate-300 hidden sm:block shrink-0"></div>
                    <button type="button" id="step-indicator-3" onclick="CCMVR.App.goToDemandeStep(3)" class="flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl bg-white text-slate-600 font-semibold text-xs border border-slate-200 hover:bg-slate-50 transition">
                        <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-extrabold shrink-0">3</span>
                        <span class="truncate">3. CER & Dépôt</span>
                    </button>
                </nav>

                <!-- Guide visuel dynamique des formulaires (Vert clair / Jaune clair / Rouge clair) -->
                <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                        <span class="text-xs font-bold text-slate-900">Guide visuel dynamique de saisie du formulaire :</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                            <span class="w-2 h-2 rounded-full bg-emerald-600"></span> Vert clair : Bien renseigné
                        </span>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 font-bold">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span> Jaune clair : Facultatif (non bloquant)
                        </span>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-950 border border-rose-300 font-extrabold">
                            <span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span> Rouge clair : Obligatoire (bloquant)
                        </span>
                    </div>
                </div>

                <form onsubmit="CCMVR.App.handleSubmitGrantApplication(event)" novalidate class="space-y-6">
                    <!-- ======================================================== -->
                    <!-- ÉTAPE 1 : IDENTITÉ, NATURE & PÉRIMÈTRE DE LA DEMANDE    -->
                    <!-- ======================================================== -->
                    <div id="demande-step-1" class="space-y-6">
                        <div class="card-minimal card-accent-blue p-6 space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h2 class="text-sm font-extrabold uppercase tracking-wider text-blue-900">1. Périmètre de la Demande & Calibrage Automatique du Dossier</h2>
                                <span class="text-[11px] text-slate-500 font-medium">Les champs doivent être renseignés sans pré-remplissage.</span>
                            </div>

                            <!-- 1A. Choix de la Nature de la sollicitation (Monétaire, Nature, Mixte) -->
                            <div class="space-y-2 pt-1 border-b border-slate-100 pb-4">
                                <label id="dem-nature-header" class="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                                    Nature de la Sollicitation auprès de la CCMVR *
                                </label>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label id="card-nature-monetaire" class="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition flex flex-col justify-between" onclick="CCMVR.App.selectNatureDemande('MONETAIRE')">
                                        <div class="flex items-center gap-2">
                                            <input type="radio" name="dem-nature" value="MONETAIRE" class="text-blue-600 focus:ring-blue-500"/>
                                            <span class="font-extrabold text-xs text-slate-900">💶 Subvention Monétaire</span>
                                        </div>
                                        <p class="text-[11px] text-slate-600 mt-2">Aide financière en numéraire versée directement par mandat administratif.</p>
                                    </label>

                                    <label id="card-nature-nature" class="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition flex flex-col justify-between" onclick="CCMVR.App.selectNatureDemande('NATURE')">
                                        <div class="flex items-center gap-2">
                                            <input type="radio" name="dem-nature" value="NATURE" class="text-indigo-600 focus:ring-indigo-500"/>
                                            <span class="font-extrabold text-xs text-slate-900">🚐 Concours en Nature Exclusif</span>
                                        </div>
                                        <p class="text-[11px] text-slate-600 mt-2">Prêt minibus, locaux / gymnase, matériel ou personnel régie (0 € monétaire • valorisation par agent).</p>
                                    </label>

                                    <label id="card-nature-mixte" class="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition flex flex-col justify-between" onclick="CCMVR.App.selectNatureDemande('MIXTE')">
                                        <div class="flex items-center gap-2">
                                            <input type="radio" name="dem-nature" value="MIXTE" class="text-purple-600 focus:ring-purple-500"/>
                                            <span class="font-extrabold text-xs text-slate-900">🤝 Demande Mixte (Numéraire + Nature)</span>
                                        </div>
                                        <p class="text-[11px] text-slate-600 mt-2">Subvention financière complétée par un accompagnement en nature.</p>
                                    </label>
                                </div>

                                <!-- Bloc de sélection des besoins en nature (affiché si NATURE ou MIXTE) -->
                                <div id="bloc-demande-nature" class="hidden p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3 mt-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-extrabold text-indigo-950 uppercase tracking-wide">
                                            🚐 Précisez les Besoins en Concours en Nature sollicités
                                        </span>
                                        <span class="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                                            Valorisation officielle Art. L. 2313-1 CGCT
                                        </span>
                                    </div>
                                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <label class="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-indigo-100 hover:border-indigo-400 cursor-pointer transition">
                                            <input type="radio" name="nat-cat-choice" id="nat-cat-minibus" value="MINIBUS" checked class="text-indigo-600 focus:ring-indigo-500"/>
                                            <span class="font-semibold text-slate-800">🚐 Minibus 9 places</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-indigo-100 hover:border-indigo-400 cursor-pointer transition">
                                            <input type="radio" name="nat-cat-choice" id="nat-cat-locaux" value="LOCAUX" class="text-indigo-600 focus:ring-indigo-500"/>
                                            <span class="font-semibold text-slate-800">🏟️ Gymnase / Salle</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-indigo-100 hover:border-indigo-400 cursor-pointer transition">
                                            <input type="radio" name="nat-cat-choice" id="nat-cat-materiel" value="MATERIEL" class="text-indigo-600 focus:ring-indigo-500"/>
                                            <span class="font-semibold text-slate-800">📦 Matériel événementiel</span>
                                        </label>
                                        <label class="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-indigo-100 hover:border-indigo-400 cursor-pointer transition">
                                            <input type="radio" name="nat-cat-choice" id="nat-cat-personnel" value="PERSONNEL" class="text-indigo-600 focus:ring-indigo-500"/>
                                            <span class="font-semibold text-slate-800">👤 Personnel Régie</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-indigo-950 text-xs mb-1">
                                            Description des besoins (volumes prévus, kilomètres, dates, créneaux souhaités) :
                                        </label>
                                        <textarea id="dem-nature-details" rows="2" placeholder="Ex: Prêt minibus 9 places pour tournois régionaux jeunes (environ 500 km) + créneau gymnase du samedi matin." class="input-clean text-xs"></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- 1B. Paramètres du Dossier -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Pôle instructeur destinataire *</label>
                                    <select id="dem-pole" required onchange="CCMVR.App.onPoleSelectionChange()" class="input-clean font-bold">
                                        <option value="" disabled ${!draft ? 'selected' : ''} style="background:#fff;color:#64748b;">-- Sélectionnez le pôle instructeur --</option>
                                        <optgroup label="1. Pôles Métiers Instructeurs">
                                            ${metierPoles.filter(p => p.code !== 'CDG').map(p => `<option value="${p.id}" data-code="${p.code}" ${draft && draft.poleId === p.id ? 'selected' : ''} style="background:#fff;color:#0f172a;">${p.libelle}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="2. Direction & Contrôle de Gestion (Direct CDG)">
                                            ${metierPoles.filter(p => p.code === 'CDG').map(p => `<option value="${p.id}" data-code="${p.code}" ${draft && draft.poleId === p.id ? 'selected' : ''} style="background:#fff;color:#0f172a;">🏛️ Direction & Contrôle de Gestion (Direct CdG)</option>`).join('')}
                                        </optgroup>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Intitulé de l'action ou projet soutenu *</label>
                                    <input type="text" id="dem-intitule" required value="${defaultIntitule}" placeholder="Ex: Projet de développement de l'école de jeunes, stages, matériel..." class="input-clean"/>
                                </div>
                                <div id="box-dem-montant">
                                    <label class="block font-semibold text-slate-700 mb-1">Montant de subvention sollicité (€) *</label>
                                    <input type="number" id="dem-montant" required min="0" step="100" value="${defaultMontant}" placeholder="Ex: 7000" oninput="CCMVR.App.onDemandeMontantChange()" class="input-clean font-mono-code text-base font-extrabold text-blue-700"/>
                                </div>

                                <!-- Sélecteur dynamique de Dispositif / Catégorie du Pôle -->
                                <div id="box-dem-categorie" class="hidden md:col-span-3 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 shadow-2xs transition-colors">
                                    <div class="flex items-center justify-between">
                                        <label class="block font-extrabold text-rose-950 text-xs flex items-center gap-1.5" id="dem-categorie-label">
                                            <i data-lucide="folder-check" class="w-4 h-4 text-rose-600"></i>
                                            Dispositif / Programme sollicité auprès du Pôle *
                                        </label>
                                        <span id="dem-cat-status-badge" class="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                                            <i data-lucide="alert-circle" class="w-3 h-3 text-rose-600"></i> Information obligatoire requise
                                        </span>
                                    </div>
                                    <select id="dem-categorie" onchange="CCMVR.App.refreshDynamicCriteriaFields()" class="input-clean font-extrabold text-xs bg-white text-slate-900 border-rose-300 focus:ring-rose-500 w-full">
                                    </select>
                                    <p id="dem-categorie-desc" class="text-[11px] text-rose-900 font-medium"></p>
                                </div>
                            </div>

                            <!-- 1C. Motivation libre et explications du projet / soutien au fonctionnement / locaux -->
                            <div class="space-y-2 pt-2 border-t border-slate-100">
                                <label class="block font-bold text-slate-900 text-xs uppercase tracking-wider flex flex-wrap items-center justify-between gap-1">
                                    <span class="flex items-center gap-1.5 text-blue-900">
                                        📝 Motivation de la Demande & Présentation Détaillée du Projet *
                                    </span>
                                    <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Espace libre d'explication
                                    </span>
                                </label>
                                <p class="text-[11px] text-slate-600 leading-relaxed">
                                    Exposez librement ici les motivations de votre association : s'agit-il d'un soutien au fonctionnement général, d'un projet spécifique ou innovant, d'un besoin de locaux / gymnase, d'équipements ou de minibus ? Précisez les objectifs, le calendrier, les publics bénéficiaires et l'intérêt pour le territoire de la Communauté de Communes :
                                </p>
                                <textarea id="dem-motivation" rows="5" required class="input-clean text-xs leading-relaxed font-sans placeholder:italic" placeholder="Rédigez ici vos explications et motivations détaillées :
- Contexte et besoin de l'association (fonctionnement général, renouvellement d'équipement, création de section, etc.)
- Descriptif précis de l'action ou des activités menées
- Publics ciblés (jeunes, scolaires, seniors, tout public, nombre estimé de participants)
- Sollicitations spécifiques (besoin financier, mise à disposition de locaux / gymnase, minibus, soutien technique)
- Retombées pour les habitants des communes des Marches du Velay-Rochebaron...">${defaultMotivation}</textarea>
                            </div>
                            <!-- Bannières verbeuses supprimées pour un parcours épuré et direct -->
                        </div>

                        <!-- Critères Métier Dynamiques créés par le Pôle -->
                        <div class="card-minimal card-accent-indigo p-6 space-y-4">
                            <h2 class="text-sm font-extrabold uppercase tracking-wider text-indigo-900">Indicateurs d'Activité Spécifiques au Pôle</h2>
                            <div id="dem-dynamic-criteres" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"></div>
                        </div>

                        <!-- Boutons Navigation Étape 1 -->
                        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <button type="button" onclick="CCMVR.App.handleSaveDraftDemande()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                                💾 Enregistrer en brouillon (continuer plus tard)
                            </button>
                            <button type="button" onclick="CCMVR.App.goToDemandeStep(2)" class="px-6 py-3 btn-accent text-xs font-extrabold flex items-center gap-2 shadow-sm">
                                Continuer vers l'Étape 2 : Budget Prévisionnel →
                            </button>
                        </div>
                    </div>

                    <!-- ======================================================== -->
                    <!-- ÉTAPE 2 : DONNÉES BUDGÉTAIRES & ANALYSE FINANCIÈRE      -->
                    <!-- ======================================================== -->
                    <div id="demande-step-2" class="space-y-6 hidden">
                        <div class="card-minimal card-accent-emerald p-6 space-y-5">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                    <h2 id="dem-budget-title" class="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                                        2. Données Budgétaires & Éléments de Bilan
                                    </h2>
                                    <p id="dem-budget-subtitle" class="text-xs text-slate-500 mt-0.5"></p>
                                </div>
                                <span id="dem-budget-mode-badge" class="px-3 py-1 rounded-full text-xs font-extrabold"></span>
                            </div>

                            <!-- CONTENEUR 2C : MODE CONCOURS EN NATURE EXCLUSIF (Dispense Budgétaire & Valorisation en Régie) -->
                            <div id="budget-mode-nature" class="hidden p-6 bg-gradient-to-br from-indigo-50/90 to-blue-50/60 rounded-2xl border-2 border-indigo-200 space-y-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                        🚐
                                    </div>
                                    <div>
                                        <h4 class="font-extrabold text-indigo-950 text-base">Demande de Concours en Nature — Dispense Comptable & Exécution en Régie</h4>
                                        <p class="text-xs text-indigo-800">Mise à disposition matérielle ou logistique gratuite de la collectivité (Subvention financière = 0,00 €)</p>
                                    </div>
                                </div>
                                <div class="p-4 bg-white rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-2.5 leading-relaxed">
                                    <p>✓ <strong>Aucune saisie budgétaire financière n'est requise :</strong> S'agissant d'un concours en nature sans versement monétaire, la transmission d'un compte de résultat prévisionnel n'est pas demandée.</p>
                                    <p>✓ <strong>Instruction directe :</strong> Votre sollicitation est instruite sur la disponibilité des véhicules/équipements, les créneaux mentionnés à l'étape 1 et votre attestation d'assurance.</p>
                                    <p>✓ <strong>Valorisation en Régie :</strong> L'évaluation financière officielle (coût d'usage / barème kilométrique) sera calculée lors de la phase d'exécution par le service gestionnaire de la CCMVR.</p>
                                </div>
                            </div>

                            <!-- CONTENEUR 2A : MODE BUDGET SIMPLIFIÉ (< 23 000 €) -->
                            <div id="budget-mode-simplifie" class="hidden space-y-5">
                                <!-- 1. CHOIX OBLIGATOIRE ET BIEN VISIBLE (BLOQUANT EN ROUGE SI NON SÉLECTIONNÉ) -->
                                <div id="box-budget-type-choice" class="p-5 rounded-2xl border-2 border-rose-300 bg-rose-50/60 transition space-y-3 shadow-2xs">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                                            <span class="text-xs font-black uppercase tracking-wide text-slate-900">Nature du besoin financé par la CCMVR * (Choix obligatoire)</span>
                                        </div>
                                        <span id="badge-choice-status" class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-900 border border-rose-300">
                                            ⚠️ Sélection obligatoire
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-600 leading-relaxed">
                                        Précisez obligatoirement si votre demande vise à soutenir l'activité générale de votre structure ou un projet/action spécifique :
                                    </p>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <label id="card-choice-global" onclick="CCMVR.App.selectBudgetType('GLOBAL')" class="cursor-pointer p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition flex flex-col justify-between space-y-2">
                                            <div class="flex items-start gap-2.5">
                                                <input type="radio" name="dem-budget-choice" value="GLOBAL" onchange="CCMVR.App.selectBudgetType('GLOBAL')" class="mt-1 text-blue-600 focus:ring-blue-500"/>
                                                <div>
                                                    <strong class="text-xs font-extrabold text-slate-900 block">🏛️ Activité générale de l'association</strong>
                                                    <span class="text-[11px] text-slate-500">Club, soutien au fonctionnement global régulier, affiliations fédérales, encadrement récurrent.</span>
                                                </div>
                                            </div>
                                        </label>
                                        <label id="card-choice-specific" onclick="CCMVR.App.selectBudgetType('SPECIFIQUE')" class="cursor-pointer p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition flex flex-col justify-between space-y-2">
                                            <div class="flex items-start gap-2.5">
                                                <input type="radio" name="dem-budget-choice" value="SPECIFIQUE" onchange="CCMVR.App.selectBudgetType('SPECIFIQUE')" class="mt-1 text-blue-600 focus:ring-blue-500"/>
                                                <div>
                                                    <strong class="text-xs font-extrabold text-slate-900 block">🎯 Action / Projet spécifique</strong>
                                                    <span class="text-[11px] text-slate-500">Stage, investissement matériel, manifestation, nouvelle section, déplacement ponctuel.</span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <!-- 2. PLAN DE FINANCEMENT PRÉVISIONNEL RÉALISTE & DÉTAILLÉ -->
                                <div class="space-y-4">
                                    <!-- A. DÉPENSES / CHARGES PRÉVISIONNELLES -->
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                                            <div class="flex items-center gap-2">
                                                <span class="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-bold">2</span>
                                                <span class="text-xs font-extrabold uppercase tracking-wide text-slate-900">Dépenses & Charges Prévisionnelles (€)</span>
                                            </div>
                                            <span class="text-[10px] text-slate-500 font-semibold">Charges de l'exercice ou de l'action</span>
                                        </div>
                                        <div class="text-xs">
                                            <div>
                                                <label id="lbl-action-charges" class="block font-bold text-slate-800 mb-1">Total Dépenses / Charges Prévisionnelles (€) *</label>
                                                <input type="number" id="simp-total-charges" value="" placeholder="Ex : 4000" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code font-bold bg-white text-slate-900 text-sm"/>
                                                <span class="text-[10px] text-slate-500 block mt-0.5">Totalité des charges et dépenses prévues pour le projet soutenu (achats, interventions, déplacements, logistique, assurances...)</span>
                                            </div>
                                        </div>
                                        <div class="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                                            <span class="font-bold text-slate-700">Total Dépenses Prévisionnelles :</span>
                                            <strong id="lbl-total-depenses" class="font-mono-code text-sm font-extrabold text-slate-900">0,00 €</strong>
                                        </div>
                                    </div>

                                    <!-- B. RECETTES / FINANCEMENTS PRÉVUS -->
                                    <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3">
                                        <div class="flex items-center justify-between border-b border-blue-200 pb-2">
                                            <div class="flex items-center gap-2">
                                                <span class="w-6 h-6 rounded-lg bg-blue-700 text-white flex items-center justify-center text-xs font-bold">3</span>
                                                <span class="text-xs font-extrabold uppercase tracking-wide text-blue-950">Recettes & Financements Prévus (€)</span>
                                            </div>
                                            <span class="text-[10px] text-blue-800 font-semibold">Ventilation des partenaires & cofinancements</span>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                            <div class="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
                                                <div class="flex justify-between items-center mb-1">
                                                    <label class="font-bold text-blue-950">1. Subvention sollicitée CCMVR (€)</label>
                                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Étape 1</span>
                                                </div>
                                                <input type="number" id="simp-recette-ccmvr" readonly value="" class="input-clean font-mono-code font-bold bg-slate-50 text-blue-900 cursor-not-allowed"/>
                                                <span class="text-[10px] text-slate-500 block mt-0.5">Part demandée à la Communauté de Communes</span>
                                            </div>
                                            <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                                <label class="block font-bold text-slate-800 mb-1">2. Autres subventions publiques attendues (€)</label>
                                                <input type="number" id="simp-recette-autres-subv" value="" placeholder="Ex : 800" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code bg-white text-slate-900"/>
                                                <span class="text-[10px] text-slate-500 block mt-0.5">Communes membres, Département 43, Région AURA, CAF/État</span>
                                            </div>
                                            <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                                <label class="block font-bold text-slate-800 mb-1">3. Recettes propres prévues (€)</label>
                                                <input type="number" id="simp-recette-propres" value="" placeholder="Ex : 1200" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code bg-white text-slate-900"/>
                                                <span class="text-[10px] text-slate-500 block mt-0.5">Cotisations, billetterie, buvette, stages, sponsoring, mécénat</span>
                                            </div>
                                            <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                                <label class="block font-bold text-slate-800 mb-1">4. Autofinancement / Apport fonds propres (€)</label>
                                                <input type="number" id="simp-recette-autofin" value="" placeholder="Ex : 500" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code bg-white text-slate-900"/>
                                                <span class="text-[10px] text-slate-500 block mt-0.5">Prélèvement prévu sur la trésorerie ou réserves</span>
                                            </div>
                                        </div>
                                        <div class="pt-2 border-t border-blue-200 flex justify-between items-center text-xs">
                                            <span class="font-bold text-blue-950">Total Recettes & Financements :</span>
                                            <strong id="lbl-total-recettes" class="font-mono-code text-sm font-extrabold text-blue-900">0,00 €</strong>
                                        </div>
                                    </div>

                                    <!-- C. BARRE D'ÉQUILIBRE BUDGÉTAIRE TEMPS RÉEL -->
                                    <div id="box-equilibre-budget" class="p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 bg-slate-50 border-slate-200">
                                        <span class="text-slate-500 italic">Renseignez vos charges et financements pour évaluer l'équilibre du projet.</span>
                                    </div>

                                    <!-- D. BILAN & SANTÉ FINANCIÈRE GLOBALE -->
                                    <div class="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                                        <div class="flex items-center justify-between border-b border-emerald-200 pb-2">
                                            <div class="flex items-center gap-2">
                                                <span class="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">4</span>
                                                <span class="text-xs font-extrabold uppercase tracking-wide text-emerald-950">Trésorerie & Réserves Associatives</span>
                                            </div>
                                            <span class="text-[10px] text-emerald-800 font-semibold">Situation globale en banque</span>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <label class="block font-bold text-slate-800 mb-1">Trésorerie active disponible en banque (€) *</label>
                                                <input type="number" id="simp-treso" value="" placeholder="Ex: 3800" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code font-bold text-blue-900 bg-white"/>
                                                <span class="text-[10px] text-slate-500 block mt-0.5">Solde compte courant + livrets bancaires au dernier arrêté</span>
                                            </div>
                                            <div>
                                                <label class="block font-bold text-slate-800 mb-1">Fonds propres / Réserves associatives (€)</label>
                                                <input type="number" id="simp-reserves" value="" placeholder="Ex: 4200" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code font-bold text-slate-900 bg-white"/>
                                                <span class="text-[10px] text-slate-500 block mt-0.5">Fonds associatifs cumulés de la structure (comptes 10/11)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- CONTENEUR 2B : MODE BUDGET ANALYTIQUE COMPLET PCG (≥ 23 000 €) -->
                            <div id="budget-mode-analytique" class="space-y-5">
                                <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center gap-2">
                                    <i data-lucide="scale" class="w-4 h-4 text-amber-600 shrink-0"></i>
                                    <span><strong>Seuil légal de conventionnement (≥ 23 000 € — Loi n° 2000-321) :</strong> Ventilation analytique complète selon le Plan Comptable Associatif (ANC n° 2018-06) pour visa obligatoire du Contrôle de Gestion.</span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                                    <!-- Colonne 1 : Charges détaillées par nature -->
                                    <div class="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div class="font-extrabold text-slate-900 uppercase border-b border-slate-200 pb-2 flex items-center justify-between">
                                            <span>Charges par Nature (Classes 6)</span>
                                            <span class="text-[10px] font-mono-code text-slate-400">PCG Asso</span>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">60 — Achats (équipements, fournitures, licences)</label>
                                            <input type="number" id="bud-achats" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">61/62 — Services extérieurs (locations, déplacements, assurances)</label>
                                            <input type="number" id="bud-services-ext" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div class="grid grid-cols-3 gap-2">
                                            <div class="col-span-2">
                                                <label class="block text-slate-700 font-medium mb-1">64 — Charges de personnel (Salaires + URSSAF)</label>
                                                <input type="number" id="bud-personnel" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                            </div>
                                            <div>
                                                <label class="block text-slate-700 font-medium mb-1">Effectif ETP</label>
                                                <input type="number" step="0.1" id="bud-etp" value="" placeholder="0" class="input-clean font-mono-code font-bold text-indigo-700"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">63/65 — Impôts, taxes & Autres charges de gestion</label>
                                            <input type="number" id="bud-autres-charges" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">66/68 — Charges financières & Dotations amortissements</label>
                                            <input type="number" id="bud-dotations" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div class="pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs">
                                            <span class="font-bold text-slate-700">Total Charges (Cl. 6) :</span>
                                            <strong id="lbl-pcg-total-charges" class="font-mono-code text-sm font-extrabold text-slate-900">0,00 €</strong>
                                        </div>
                                    </div>

                                    <!-- Colonne 2 : Produits détaillés par origine -->
                                    <div class="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div class="font-extrabold text-slate-900 uppercase border-b border-slate-200 pb-2 flex items-center justify-between">
                                            <span>Produits par Origine (Classes 7)</span>
                                            <span class="text-[10px] font-mono-code text-slate-400">PCG Asso</span>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">756 — Cotisations & Licences des adhérents</label>
                                            <input type="number" id="bud-cotisations" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">70 — Recettes activités (billetterie, buvette, stages)</label>
                                            <input type="number" id="bud-recettes" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">754/758 — Sponsoring privé, mécénat & dons</label>
                                            <input type="number" id="bud-sponsoring" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">74-Autres — Subventions (État ANS, Région, Dépt, CAF)</label>
                                            <input type="number" id="bud-subv-autres" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">76/78 — Produits financiers & Reprises provisions</label>
                                            <input type="number" id="bud-prod-fin" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code"/>
                                        </div>
                                        <div class="pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs">
                                            <span class="font-bold text-blue-950">Total Produits (Cl. 7) :</span>
                                            <strong id="lbl-pcg-total-produits" class="font-mono-code text-sm font-extrabold text-blue-900">0,00 €</strong>
                                        </div>
                                    </div>

                                    <!-- Colonne 3 : Bilan Prudentiel Complet -->
                                    <div class="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                                        <div class="font-extrabold text-blue-950 uppercase border-b border-blue-200 pb-2 flex items-center justify-between">
                                            <span>Bilan Prudentiel (Actif / Passif)</span>
                                            <span class="text-[10px] font-mono-code text-blue-600">FRNG & BFR</span>
                                        </div>
                                        <div>
                                            <label class="block text-slate-800 font-bold mb-1">512/53 — Trésorerie active (Banque + Livret A)</label>
                                            <input type="number" id="bud-treso" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code font-bold bg-white"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">10/11 — Fonds propres & Réserves associatives</label>
                                            <input type="number" id="bud-reserves" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code bg-white"/>
                                        </div>
                                        <div class="grid grid-cols-2 gap-2">
                                            <div>
                                                <label class="block text-slate-700 font-medium mb-1">20/21 — Actif immobilisé</label>
                                                <input type="number" id="bud-immo" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code bg-white"/>
                                            </div>
                                            <div>
                                                <label class="block text-slate-700 font-medium mb-1">41 — Créances à recevoir</label>
                                                <input type="number" id="bud-creances" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code bg-white"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">40/42/43 — Dettes à court terme (Fournisseurs, URSSAF)</label>
                                            <input type="number" id="bud-dettes" value="" placeholder="0" oninput="CCMVR.App.recalcLiveFormRatios()" class="input-clean font-mono-code bg-white"/>
                                        </div>
                                        <div>
                                            <label class="block text-slate-700 font-medium mb-1">86/87 — Valorisation comptable du bénévolat (€)</label>
                                            <input type="number" id="bud-benevolat" value="" placeholder="0" class="input-clean font-mono-code bg-white"/>
                                        </div>
                                    </div>
                                </div>

                                <!-- Volet Stratégique supprimé conformément aux consignes de simplification -->
                            </div>

                            <!-- Bandeau Équilibre & Balance globale en direct PCG (≥ 23 000 €) -->
                            <div id="box-pcg-equilibre-budget" class="p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 border-slate-200 text-slate-600 transition">
                                <div class="flex items-center gap-2 font-bold">
                                    <i data-lucide="scale" class="w-4 h-4 text-blue-600"></i>
                                    <span>Renseignez les comptes pour évaluer l'équilibre du projet en temps réel.</span>
                                </div>
                                <span class="font-mono-code text-xs font-bold text-slate-500">0,00 €</span>
                            </div>

                            <!-- Aperçu en direct des indicateurs calculés automatiquement -->
                            <div id="live-ratios-summary" class="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs shadow-md"></div>
                        </div>

                        <!-- Boutons Navigation Étape 2 -->
                        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <button type="button" onclick="CCMVR.App.goToDemandeStep(1)" class="px-5 py-2.5 btn-secondary text-xs font-bold flex items-center gap-2">
                                ← Revenir à l'Étape 1
                            </button>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="CCMVR.App.handleSaveDraftDemande()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                                    💾 Enregistrer en brouillon
                                </button>
                                <button type="button" onclick="CCMVR.App.goToDemandeStep(3)" class="px-6 py-3 btn-accent text-xs font-extrabold flex items-center gap-2 shadow-sm">
                                    Continuer vers l'Étape 3 : CER & Dépôt →
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- ======================================================== -->
                    <!-- ÉTAPE 3 : ENGAGEMENTS CER & DÉPÔT OFFICIEL               -->
                    <!-- ======================================================== -->
                    <div id="demande-step-3" class="space-y-6 hidden">
                        <!-- Récapitulatif dynamique de la demande -->
                        <div id="demande-step3-summary" class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"></div>

                        <!-- Rappel du Contrat d'Engagement Républicain (CER) -->
                        <div class="card-minimal p-5 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white uppercase">Légalité</span>
                                <h3 class="text-xs font-extrabold text-blue-950 uppercase">Contrat d'Engagement Républicain (CER) — Décret n° 2021-1947</h3>
                            </div>
                            <p class="text-xs text-slate-700 leading-relaxed">
                                En sollicitant une subvention auprès de la Communauté de Communes Marches du Velay-Rochebaron, l'association s'engage formellement au respect des 7 engagements de la République :
                            </p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                                <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
                                    <span class="text-blue-600 font-bold">1.</span>
                                    <span>Respect des lois de la République et refus de toute incitation à la violence</span>
                                </div>
                                <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
                                    <span class="text-blue-600 font-bold">2.</span>
                                    <span>Liberté de conscience et respect du pluralisme démocratique</span>
                                </div>
                                <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
                                    <span class="text-blue-600 font-bold">3.</span>
                                    <span>Liberté des membres de l'association d'adhérer ou de se retirer librement</span>
                                </div>
                                <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
                                    <span class="text-blue-600 font-bold">4.</span>
                                    <span>Égalité et non-discrimination (respect absolu de la parité et diversité)</span>
                                </div>
                                <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
                                    <span class="text-blue-600 font-bold">5.</span>
                                    <span>Fraternité et prévention de la haine ou de la stigmatisation</span>
                                </div>
                                <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
                                    <span class="text-blue-600 font-bold">6.</span>
                                    <span>Respect de la dignité humaine et des droits fondamentaux</span>
                                </div>
                                <div class="p-2.5 bg-white rounded-lg border border-blue-100 flex items-start gap-2 col-span-1 sm:col-span-2">
                                    <span class="text-blue-600 font-bold">7.</span>
                                    <span>Respect des symboles de la République et neutralité des services publics concédés</span>
                                </div>
                            </div>
                        </div>

                        <!-- Attestation & signature mandatée -->
                        <div class="card-minimal p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                            <label class="flex items-start gap-3 cursor-pointer text-xs text-slate-800">
                                <input type="checkbox" id="dem-cer-check" required class="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300"/>
                                <span>
                                    <strong>Attestation sur l'honneur & Engagement officiel :</strong> Je soussigné(e), représentant légal ou mandaté de l'association, certifie sincères et véritables les informations saisies et m'engage au respect intégral du Contrat d'Engagement Républicain et des règles de contrôle financier de la CCMVR.
                                </span>
                            </label>

                            <div class="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <label class="font-bold text-slate-800">Signataire mandaté :</label>
                                    <select id="dem-signataire-select" class="input-clean font-bold text-xs py-1 px-2 border-slate-300 bg-white">
                                        ${store.getSignatairesHabilites(s.id).map(sig => `
                                            <option value="${sig.id}" ${sig.est_defaut ? 'selected' : ''}>
                                                ${sig.prenom} ${sig.nom} (${sig.fonction})
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <span>Date : <strong>${new Date().toLocaleDateString('fr-FR')}</strong></span>
                            </div>
                        </div>

                        <!-- Boutons Navigation Étape 3 -->
                        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <button type="button" onclick="CCMVR.App.goToDemandeStep(2)" class="px-5 py-2.5 btn-secondary text-xs font-bold flex items-center gap-2">
                                ← Revenir à l'Étape 2
                            </button>
                            <div class="flex flex-wrap items-center gap-2">
                                <button type="button" onclick="CCMVR.App.handleSaveDraftDemande()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                                    💾 Enregistrer en brouillon
                                </button>
                                <button type="submit" class="px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-lg">
                                    🚀 Valider et transmettre définitivement au service instructeur
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;

        this.currentAssoDemandeStep = 1;
        this.onDemandeMontantChange();
        this.refreshDynamicCriteriaFields();
        this.recalcLiveFormRatios();

        setTimeout(() => {
            this.applyFormVisualFeedback(container);
            container.addEventListener('input', () => this.applyFormVisualFeedback(container));
            container.addEventListener('change', () => this.applyFormVisualFeedback(container));
        }, 10);
    },

    goToDemandeStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > 3) return;

        // Validation avant de passer à l'étape 2 (Identité & Nature)
        if (stepNumber > 1) {
            const nature = document.querySelector('input[name="dem-nature"]:checked')?.value;
            const poleSelect = document.getElementById('dem-pole');
            const poleId = poleSelect?.value;
            const intitule = (document.getElementById('dem-intitule')?.value || '').trim();
            const montant = parseFloat(document.getElementById('dem-montant')?.value);

            if (!nature) {
                this.toast('Veuillez sélectionner la nature de votre sollicitation (Monétaire, Nature ou Mixte).', 'warning');
                return;
            }
            if (!poleId) {
                this.toast('Veuillez sélectionner le pôle instructeur destinataire.', 'warning');
                poleSelect?.focus();
                return;
            }
            if (!intitule) {
                this.toast('Veuillez renseigner un intitulé de projet avant de continuer.', 'warning');
                document.getElementById('dem-intitule')?.focus();
                return;
            }
            if (nature !== 'NATURE' && (isNaN(montant) || montant <= 0)) {
                this.toast('Veuillez saisir un montant de subvention supérieur à 0 €.', 'warning');
                document.getElementById('dem-montant')?.focus();
                return;
            }
        }

        // Préparation du récapitulatif avant l'étape 3
        if (stepNumber === 3) {
            const nature = document.querySelector('input[name="dem-nature"]:checked')?.value || 'MONETAIRE';
            const montantDem = nature === 'NATURE' ? 0 : (parseFloat(document.getElementById('dem-montant')?.value) || 0);
            if (nature !== 'NATURE' && montantDem < 23000) {
                const choice = document.querySelector('input[name="dem-budget-choice"]:checked')?.value;
                if (!choice) {
                    const boxChoice = document.getElementById('box-budget-type-choice');
                    if (boxChoice) {
                        boxChoice.classList.remove('border-slate-200', 'bg-white');
                        boxChoice.classList.add('border-rose-400', 'bg-rose-50');
                        boxChoice.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    this.toast('Choix obligatoire : veuillez préciser si l’action concerne l’activité générale ou un projet spécifique.', 'warning');
                    return;
                }
            }
            this.updateStep3Summary();
        }

        this.currentAssoDemandeStep = stepNumber;

        // Affichage / masquage des étapes du Wizard
        [1, 2, 3].forEach(step => {
            const panel = document.getElementById(`demande-step-${step}`);
            const indicator = document.getElementById(`step-indicator-${step}`);
            if (panel) {
                if (step === stepNumber) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            }
            if (indicator) {
                if (step === stepNumber) {
                    indicator.className = 'flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm transition';
                    indicator.setAttribute('aria-current', 'step');
                    const badge = indicator.querySelector('span');
                    if (badge) badge.className = 'w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-extrabold shrink-0';
                } else if (step < stepNumber) {
                    indicator.className = 'flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs cursor-pointer hover:bg-emerald-100 transition';
                    indicator.removeAttribute('aria-current');
                    const badge = indicator.querySelector('span');
                    if (badge) badge.className = 'w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-extrabold shrink-0';
                } else {
                    indicator.className = 'flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl bg-white text-slate-500 font-semibold text-xs border border-slate-200 transition';
                    indicator.removeAttribute('aria-current');
                    const badge = indicator.querySelector('span');
                    if (badge) badge.className = 'w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-extrabold shrink-0';
                }
            }
        });

        this.onDemandeMontantChange();
        this.recalcLiveFormRatios();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => this.applyFormVisualFeedback(), 10);
    },

    updateStep3Summary() {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const s = store.state.structures.find(x => x.id === store.activeStructureId) || store.state.structures[0];
        const summaryEl = document.getElementById('demande-step3-summary');
        if (!summaryEl || !s) return;

        const intitule = (document.getElementById('dem-intitule')?.value || '').trim();
        const poleEl = document.getElementById('dem-pole');
        const poleLibelle = poleEl?.options[poleEl.selectedIndex]?.text || 'Pôle Métier';
        const nature = document.querySelector('input[name="dem-nature"]:checked')?.value || 'MONETAIRE';
        const rawMontant = nature === 'NATURE' ? 0 : (parseFloat(document.getElementById('dem-montant')?.value) || 0);

        let palierBadge = '';
        let conventionType = '';
        if (rawMontant >= 50000) {
            palierBadge = '<span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-extrabold text-[10px]">Palier 3 • Partenariat Stratégique (≥ 50k€)</span>';
            conventionType = 'Convention pluriannuelle d\'objectifs & de moyens + Commissaire aux Comptes';
        } else if (rawMontant >= 23000) {
            palierBadge = '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[10px]">Palier 2 • Conventionnement Légal (≥ 23k€)</span>';
            conventionType = 'Convention d\'objectifs et de moyens obligatoire (Loi n° 2000-321)';
        } else {
            palierBadge = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">Palier 1 • Procédure Simplifiée (&lt; 23k€)</span>';
            conventionType = 'Arrêté attributif simple / Délibération directe du Conseil';
        }

        const natureLabel = nature === 'MONETAIRE' ? '💶 Subvention Monétaire' : (nature === 'NATURE' ? '🚐 Concours en Nature Exclusif' : '🤝 Demande Mixte');

        summaryEl.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Récapitulatif de votre demande</span>
                    <h3 class="text-sm font-extrabold text-slate-900">${intitule || 'Projet associatif'}</h3>
                </div>
                ${palierBadge}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                <div class="p-3 bg-white rounded-xl border border-slate-200">
                    <span class="text-[10px] text-slate-400 block font-bold uppercase">Association</span>
                    <strong class="text-slate-900 block truncate">${s.nom_officiel}</strong>
                    <span class="font-mono-code text-[11px] text-slate-500">SIREN : ${s.siren}</span>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200">
                    <span class="text-[10px] text-slate-400 block font-bold uppercase">Pôle & Nature</span>
                    <strong class="text-slate-900 block truncate">${poleLibelle}</strong>
                    <span class="text-[11px] text-blue-600 font-semibold">${natureLabel}</span>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200">
                    <span class="text-[10px] text-slate-400 block font-bold uppercase">Montant Sollicité</span>
                    <strong class="text-blue-700 text-sm font-extrabold block font-mono-code">${nature === 'NATURE' ? '0,00 € (Nature)' : fin.formatCurrency(rawMontant)}</strong>
                    <span class="text-[10px] text-slate-500">Exercice ${store.activeMillesime}</span>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200">
                    <span class="text-[10px] text-slate-400 block font-bold uppercase">Régime Juridique</span>
                    <strong class="text-slate-800 text-[11px] block leading-tight">${conventionType}</strong>
                </div>
            </div>
        `;
    },

    selectNatureDemande(nature) {
        const radio = document.querySelector(`input[name="dem-nature"][value="${nature}"]`);
        if (radio) radio.checked = true;

        const cardMonetaire = document.getElementById('card-nature-monetaire');
        const cardNature = document.getElementById('card-nature-nature');
        const cardMixte = document.getElementById('card-nature-mixte');
        const blocNature = document.getElementById('bloc-demande-nature');
        const montantInput = document.getElementById('dem-montant');

        [cardMonetaire, cardNature, cardMixte].forEach(c => {
            if (c) c.className = 'p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition flex flex-col justify-between';
        });

        if (nature === 'NATURE') {
            if (cardNature) cardNature.className = 'p-3.5 rounded-xl border-2 border-indigo-600 bg-indigo-50/60 cursor-pointer transition flex flex-col justify-between shadow-2xs';
            if (blocNature) blocNature.classList.remove('hidden');
            if (montantInput) {
                montantInput.value = 0;
                montantInput.disabled = true;
                montantInput.classList.add('bg-slate-100', 'text-slate-400');
            }
        } else if (nature === 'MIXTE') {
            if (cardMixte) cardMixte.className = 'p-3.5 rounded-xl border-2 border-purple-600 bg-purple-50/60 cursor-pointer transition flex flex-col justify-between shadow-2xs';
            if (blocNature) blocNature.classList.remove('hidden');
            if (montantInput) {
                montantInput.disabled = false;
                montantInput.classList.remove('bg-slate-100', 'text-slate-400');
            }
        } else {
            if (cardMonetaire) cardMonetaire.className = 'p-3.5 rounded-xl border-2 border-blue-600 bg-blue-50/60 cursor-pointer transition flex flex-col justify-between shadow-2xs';
            if (blocNature) blocNature.classList.add('hidden');
            if (montantInput) {
                montantInput.disabled = false;
                montantInput.classList.remove('bg-slate-100', 'text-slate-400');
            }
        }

        if (window.lucide) window.lucide.createIcons();
        this.onDemandeMontantChange();
    },

    onDemandeMontantChange() {
        const nature = document.querySelector('input[name="dem-nature"]:checked')?.value || 'MONETAIRE';
        const montant = nature === 'NATURE' ? 0 : (parseFloat(document.getElementById('dem-montant')?.value) || 0);

        // Bascule visuelle sobre et minimaliste entre Mode Simplifié (<23k€ ou Nature) et Mode Analytique (≥23k€)
        const boxSimplifie = document.getElementById('budget-mode-simplifie');
        const boxAnalytique = document.getElementById('budget-mode-analytique');
        const modeBadge = document.getElementById('dem-budget-mode-badge');
        const subTitle = document.getElementById('dem-budget-subtitle');

        const boxNature = document.getElementById('budget-mode-nature');
        if (nature === 'NATURE') {
            if (boxSimplifie) boxSimplifie.classList.add('hidden');
            if (boxAnalytique) boxAnalytique.classList.add('hidden');
            if (boxNature) boxNature.classList.remove('hidden');
            if (modeBadge) {
                modeBadge.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-300';
                modeBadge.textContent = '🚐 Mode Concours en Nature (Dispense Budgétaire)';
            }
            if (subTitle) subTitle.textContent = 'Mise à disposition gratuite : aucune saisie budgétaire financière requise.';
        } else if (montant < 23000) {
            if (boxNature) boxNature.classList.add('hidden');
            if (boxSimplifie) boxSimplifie.classList.remove('hidden');
            if (boxAnalytique) boxAnalytique.classList.add('hidden');
            if (modeBadge) {
                modeBadge.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300';
                modeBadge.textContent = '✓ Formulaire Budgétaire Simplifié (< 23 000 €)';
            }
            if (subTitle) subTitle.textContent = 'Budget de l\'association, budget spécifique de l\'action soutenue et situation de trésorerie.';
        } else {
            if (boxNature) boxNature.classList.add('hidden');
            if (boxSimplifie) boxSimplifie.classList.add('hidden');
            if (boxAnalytique) boxAnalytique.classList.remove('hidden');
            if (modeBadge) {
                modeBadge.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-300';
                modeBadge.textContent = '⚖️ Formulaire Budgétaire Analytique (≥ 23 000 €)';
            }
            if (subTitle) subTitle.textContent = 'Ventilation analytique par nature de charges et de produits, et situation bilancielle.';
        }

        if (window.lucide) window.lucide.createIcons();
        this.recalcLiveFormRatios();
        this.applyFormVisualFeedback();
    },

    toggleActionIsGlobal(isGlobal) {
        const box = document.getElementById('box-action-specific');
        if (box) {
            if (isGlobal) {
                box.classList.add('hidden');
            } else {
                box.classList.remove('hidden');
            }
        }
        this.recalcLiveFormRatios();
    },

    confirmDocUnchanged(docId, structKey) {
        const activeYear = window.CCMVR.Store.activeMillesime || 2027;
        let overrides = {};
        try {
            overrides = JSON.parse(localStorage.getItem(`ccmvr_doc_overrides_${structKey}`)) || {};
        } catch (_) {}

        overrides[docId] = {
            validatedUnchanged: true,
            validite: `${activeYear} (Inchangé)`,
            dateCharge: new Date().toLocaleDateString('fr-FR')
        };

        localStorage.setItem(`ccmvr_doc_overrides_${structKey}`, JSON.stringify(overrides));
        this.toast('✓ Document certifié toujours valable pour l\'exercice. La ligne passe en vert clair.', 'success');
        this.renderMainView();
    },

    handleDocFileUpload(inputEl, docId, structKey) {
        const file = inputEl.files && inputEl.files[0];
        if (!file) return;
        const activeYear = window.CCMVR.Store.activeMillesime || 2027;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            let overrides = {};
            try {
                overrides = JSON.parse(localStorage.getItem(`ccmvr_doc_overrides_${structKey}`)) || {};
            } catch (_) {}

            overrides[docId] = {
                uploaded: true,
                nomFichier: file.name,
                dateCharge: new Date().toLocaleDateString('fr-FR'),
                validite: String(activeYear),
                url: dataUrl
            };

            try {
                localStorage.setItem(`ccmvr_doc_overrides_${structKey}`, JSON.stringify(overrides));
            } catch (err) {
                console.warn('[Doc Override] LocalStorage quota, saving in runtime cache:', err);
            }

            this.toast(`✓ Document "${file.name}" téléversé avec succès. Statut conforme (vert clair).`, 'success');
            this.renderMainView();
        };
        reader.readAsDataURL(file);
    },

    updateCategoryBoxStyle(hasSelected) {
        const boxCat = document.getElementById('box-dem-categorie');
        const badge = document.getElementById('dem-cat-status-badge');
        const label = document.getElementById('dem-categorie-label');
        const catSelect = document.getElementById('dem-categorie');
        const catDesc = document.getElementById('dem-categorie-desc');
        if (!boxCat) return;

        if (hasSelected) {
            boxCat.className = 'md:col-span-3 p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-2 shadow-2xs transition-colors';
            if (badge) {
                badge.className = 'text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1';
                badge.innerHTML = '<i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> Dispositif sélectionné';
            }
            if (label) {
                label.className = 'block font-extrabold text-emerald-950 text-xs flex items-center gap-1.5';
                const icon = label.querySelector('i');
                if (icon) icon.className = 'w-4 h-4 text-emerald-600';
            }
            if (catSelect) {
                catSelect.className = 'input-clean font-extrabold text-xs bg-white text-slate-900 border-emerald-300 focus:ring-emerald-500 w-full';
            }
            if (catDesc) {
                catDesc.className = 'text-[11px] text-emerald-900 font-medium';
            }
        } else {
            boxCat.className = 'md:col-span-3 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 shadow-2xs transition-colors';
            if (badge) {
                badge.className = 'text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1 animate-pulse';
                badge.innerHTML = '<i data-lucide="alert-circle" class="w-3 h-3 text-rose-600"></i> Information obligatoire requise';
            }
            if (label) {
                label.className = 'block font-extrabold text-rose-950 text-xs flex items-center gap-1.5';
                const icon = label.querySelector('i');
                if (icon) icon.className = 'w-4 h-4 text-rose-600';
            }
            if (catSelect) {
                catSelect.className = 'input-clean font-extrabold text-xs bg-white text-slate-900 border-rose-300 focus:ring-rose-500 w-full';
            }
            if (catDesc) {
                catDesc.className = 'text-[11px] text-rose-900 font-medium';
                catDesc.textContent = "Veuillez choisir obligatoirement le dispositif correspondant à votre projet.";
            }
        }
        if (window.lucide) window.lucide.createIcons();
    },

    onPoleSelectionChange() {
        const store = window.CCMVR.Store;
        const poleSelect = document.getElementById('dem-pole');
        const boxCat = document.getElementById('box-dem-categorie');
        const catSelect = document.getElementById('dem-categorie');
        const catDesc = document.getElementById('dem-categorie-desc');

        if (!poleSelect) return;
        const poleId = poleSelect.value;
        const poleObj = store.state.poles.find(p => p.id === poleId);
        const poleCode = poleObj ? poleObj.code : '';

        const categories = store.getPoleCategories(poleCode);

        if (categories && categories.length > 0) {
            if (boxCat) boxCat.classList.remove('hidden');
            if (catSelect) {
                catSelect.innerHTML = `
                    <option value="" disabled selected style="background:#fff;color:#64748b;">-- Sélectionnez obligatoirement un dispositif / programme --</option>
                    ${categories.map(c => `<option value="${c.id}" style="background:#fff;color:#0f172a;">${c.nom}</option>`).join('')}
                `;
                catSelect.value = '';
            }
            this.updateCategoryBoxStyle(false);
        } else {
            if (boxCat) boxCat.classList.add('hidden');
            if (catSelect) catSelect.innerHTML = '';
            if (catDesc) catDesc.textContent = '';
        }

        if (window.lucide) window.lucide.createIcons();
        this.refreshDynamicCriteriaFields();
    },

    refreshDynamicCriteriaFields() {
        const poleSelect = document.getElementById('dem-pole');
        const target = document.getElementById('dem-dynamic-criteres');
        const boxCat = document.getElementById('box-dem-categorie');
        const catSelect = document.getElementById('dem-categorie');
        const catDesc = document.getElementById('dem-categorie-desc');
        if (!poleSelect || !target) return;
        const poleId = poleSelect.value;

        if (!poleId) {
            target.innerHTML = `<div class="col-span-full text-center text-slate-400 py-3 italic">Sélectionnez d'abord un pôle instructeur destinataire ci-dessus pour afficher ses critères spécifiques.</div>`;
            return;
        }

        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const poleObj = store.state.poles.find(p => p.id === poleId);
        const poleCode = poleObj ? poleObj.code : '';

        const categories = store.getPoleCategories(poleCode);

        // CAS AVEC CATÉGORIES / DISPOSITIFS CONFIGURÉS
        if (categories && categories.length > 0) {
            if (boxCat) boxCat.classList.remove('hidden');
            const selectedCatId = catSelect ? catSelect.value : '';

            if (!selectedCatId || !categories.some(c => c.id === selectedCatId)) {
                this.updateCategoryBoxStyle(false);
                target.innerHTML = `
                    <div class="col-span-full p-4 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-900 text-xs flex items-center gap-3">
                        <i data-lucide="alert-circle" class="w-5 h-5 text-rose-600 shrink-0"></i>
                        <div>
                            <strong class="font-extrabold block">Sélection obligatoire requise ci-dessus</strong>
                            <span class="text-rose-800 text-[11px]">Veuillez sélectionner le dispositif ou programme sollicité dans l'encart rouge ci-dessus pour afficher la grille de critères correspondante.</span>
                        </div>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            this.updateCategoryBoxStyle(true);
            const activeCat = categories.find(c => c.id === selectedCatId) || categories[0];
            if (catDesc) catDesc.textContent = activeCat.description || '';

            // Si le dispositif est en mode sans calcul ou sans volets
            if (activeCat.mode_calcul === 'SANS_CALCUL' || !activeCat.volets || activeCat.volets.length === 0) {
                target.innerHTML = `
                    <div class="col-span-full p-4 rounded-xl bg-orange-50/60 border border-orange-200 text-slate-700 text-xs space-y-1">
                        <div class="font-extrabold text-orange-950 flex items-center gap-1.5">
                            <i data-lucide="info" class="w-4 h-4 text-orange-600"></i>
                            Dispositif : ${activeCat.nom}
                        </div>
                        <p class="text-[11px] text-slate-600">Ce dispositif ne requiert aucun indicateur d'activité chiffré préalable. Renseignez simplement l'intitulé et la motivation détaillée de votre projet ci-dessus.</p>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            // Affichage des volets et critères de la catégorie sélectionnée
            const draftJustifs = store.getJustificatifsForDossier(this.currentDraftDossierId || 'draft');
            const voletsHtml = activeCat.volets.map(v => {
                const justifForVolet = draftJustifs.find(j => j.volet_id === v.id);

                const criteresHtml = (v.criteres || []).map(c => {
                    let inputEl = '';
                    if (c.type === 'select') {
                        const opts = c.options || [];
                        inputEl = `
                            <select data-crit-code="${c.code}" data-crit-id="${c.id || c.code}" data-crit-type="select" onchange="CCMVR.App.recalcAssoScoringGrid()" class="input-clean dyn-crit-input font-semibold text-xs">
                                ${opts.map(o => `<option value="${o.value}" style="background:#fff;color:#0f172a;">${o.label}</option>`).join('')}
                            </select>
                        `;
                    } else if (c.type === 'boolean') {
                        inputEl = `
                            <div class="flex items-center gap-2 pt-1">
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" data-crit-code="${c.code}" data-crit-id="${c.id || c.code}" data-crit-type="boolean" onchange="CCMVR.App.recalcAssoScoringGrid()" class="sr-only peer dyn-crit-input">
                                    <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                                    <span class="ml-2 text-xs font-bold text-slate-700">OUI (${c.points !== undefined ? c.points : 10} pts)</span>
                                </label>
                            </div>
                        `;
                    } else if (c.type === 'currency') {
                        inputEl = `
                            <div class="flex items-center gap-2">
                                <input type="number" step="10" min="0" data-crit-code="${c.code}" data-crit-id="${c.id || c.code}" data-crit-type="currency" value="" placeholder="0" oninput="CCMVR.App.recalcAssoScoringGrid()" class="input-clean font-mono-code text-xs font-bold text-indigo-700 dyn-crit-input"/>
                                <span class="text-xs font-extrabold text-slate-600">€ TTC</span>
                            </div>
                        `;
                    } else {
                        const maxAttr = c.plafond ? `max="${c.plafond}"` : '';
                        const minAttr = c.plancher ? `min="0"` : `min="0"`;
                        inputEl = `
                            <div class="flex items-center gap-2">
                                <input type="number" ${minAttr} ${maxAttr} data-crit-code="${c.code}" data-crit-id="${c.id || c.code}" data-crit-type="number" value="" placeholder="0" oninput="CCMVR.App.recalcAssoScoringGrid()" class="input-clean font-mono-code text-xs font-bold text-slate-900 dyn-crit-input"/>
                                ${c.unite ? `<span class="text-[11px] font-semibold text-slate-500 whitespace-nowrap">${c.unite}</span>` : ''}
                            </div>
                        `;
                    }

                    return `
                        <div class="p-3 bg-white rounded-xl border border-slate-200 hover:border-orange-200 transition space-y-1 shadow-2xs">
                            <div class="flex items-baseline justify-between gap-2">
                                <label class="block font-extrabold text-slate-900 text-xs leading-snug">${c.libelle}</label>
                                ${c.points !== undefined && c.type !== 'boolean' ? `<span class="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 shrink-0">${c.points} pt${c.points > 1 ? 's' : ''}</span>` : ''}
                            </div>
                            ${inputEl}
                            <div class="text-[10px] text-slate-500 italic">${c.aide || ''}</div>
                        </div>
                    `;
                }).join('');

                const justifHtml = v.justificatif_requis ? `
                    <div class="p-3.5 bg-gradient-to-r from-amber-50/70 to-orange-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                                <i data-lucide="paperclip" class="w-3.5 h-3.5 text-amber-700"></i>
                                Justificatif requis pour ce volet :
                            </div>
                            <div class="text-[11px] text-amber-900 font-medium">${v.justificatif_label}</div>
                        </div>
                        <div id="box-justif-${v.id}" class="shrink-0">
                            ${justifForVolet ? `
                                <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
                                    <span class="text-xs font-bold text-emerald-800 flex items-center gap-1">
                                        <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                                        ${justifForVolet.nom_fichier}
                                    </span>
                                    <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${justifForVolet.nom_fichier.replace(/'/g, "\\'")}', url: '${justifForVolet.url}', date: '${new Date(justifForVolet.date_depot).toLocaleDateString()}', type: 'Justificatif Volet', source: 'Dépôt Association' })" class="p-1 text-slate-500 hover:text-blue-600" title="Aperçu">
                                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                    </button>
                                    <button type="button" onclick="CCMVR.App.handleRemoveJustificatif('${justifForVolet.id}', '${v.id}')" class="p-1 text-slate-400 hover:text-rose-600" title="Remplacer la pièce">
                                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            ` : `
                                <label class="cursor-pointer px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-2xs">
                                    <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                                    <span>Déposer le justificatif (PDF ou photo)</span>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden" onchange="CCMVR.App.handleJustificatifUpload(this, '${v.id}', '${v.numero}')"/>
                                </label>
                            `}
                        </div>
                    </div>
                ` : '';

                return `
                    <div class="col-span-full border border-orange-200 rounded-2xl bg-orange-50/20 overflow-hidden shadow-2xs space-y-3 p-4">
                        <div class="flex items-center justify-between border-b border-orange-200 pb-2 flex-wrap gap-2">
                            <div>
                                <span class="text-[10px] font-black uppercase text-orange-700 bg-orange-100 px-2 py-0.5 rounded">Volet ${v.numero}</span>
                                <h3 class="text-xs font-black text-slate-900 inline ml-2">${v.titre}</h3>
                                ${v.description ? `<p class="text-[11px] text-slate-500 mt-0.5">${v.description}</p>` : ''}
                            </div>
                            <span id="subtotal-badge-${v.id}" class="text-xs font-mono-code font-bold text-orange-700 bg-white px-2.5 py-1 rounded-lg border border-orange-200">0 pt</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            ${criteresHtml}
                        </div>
                        ${justifHtml}
                    </div>
                `;
            }).join('');

            target.innerHTML = `
                <div class="col-span-full space-y-4">
                    <div class="p-4 bg-gradient-to-r from-orange-950 via-slate-900 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                        <div>
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-orange-300">
                                Dispositif sélectionné : ${activeCat.nom}
                            </span>
                            <h3 class="text-sm font-black text-white mt-0.5">Grille d'Évaluation & Barème du Dispositif</h3>
                            <p class="text-[11px] text-orange-200">Renseignez les indicateurs demandés pour ce dispositif.</p>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <div class="text-right">
                                <span class="text-[10px] text-orange-200 block">Aide théorique :</span>
                                <span id="score-live-total" class="font-mono-code text-lg font-black text-orange-400">0,00 €</span>
                            </div>
                            <button type="button" onclick="CCMVR.App.applyCalculatedSubventionToDemand()" class="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5" title="Reporter le calcul officiel">
                                <i data-lucide="check" class="w-4 h-4"></i> Reporter au montant
                            </button>
                        </div>
                    </div>
                    ${voletsHtml}
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            this.recalcAssoScoringGrid();
            return;
        }

        // Si AUCUNE catégorie configurée pour ce pôle
        if (boxCat) boxCat.classList.add('hidden');
        const criteres = store.state.criteres_metiers.filter(c => c.pole_id === poleId);
        if (criteres.length === 0) {
            target.innerHTML = `<div class="col-span-full p-4 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200 text-xs">Aucun indicateur d'activité spécifique requis pour ce pôle. Vous pouvez passer directement à l'étape suivante.</div>`;
            return;
        }

        target.innerHTML = criteres.map(c => `
            <div class="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                <label class="block font-bold text-slate-800 text-xs">${c.libelle}</label>
                <input type="number" min="0" data-crit-id="${c.id}" data-crit-type="number" class="input-clean font-mono-code text-xs font-bold text-slate-900 dyn-crit-input" placeholder="0"/>
                <div class="text-[10px] text-slate-500">${c.aide_saisie || ''}</div>
            </div>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    },

    recalcAssoScoringGrid() {
        const fin = window.CCMVR.FinanceEngine;
        const store = window.CCMVR.Store;
        const poleSelect = document.getElementById('dem-pole');
        const poleId = poleSelect?.value;
        const poleObj = store.state.poles.find(p => p.id === poleId);
        const poleCode = poleObj ? poleObj.code : '';
        const catSelect = document.getElementById('dem-categorie');
        const catId = catSelect && !document.getElementById('box-dem-categorie')?.classList.contains('hidden') ? catSelect.value : null;
        const activeCategory = store.getPoleCategory(poleCode, catId);

        const inputs = document.querySelectorAll('.dyn-crit-input');
        const answers = {};
        inputs.forEach(inp => {
            const code = inp.getAttribute('data-crit-code');
            const type = inp.getAttribute('data-crit-type');
            if (!code) return;
            if (type === 'boolean') {
                answers[code] = inp.checked || inp.value === 'true';
            } else if (type === 'number' || type === 'currency') {
                answers[code] = parseFloat(inp.value) || 0;
            } else {
                answers[code] = inp.value;
            }
        });

        const res = fin.evaluatePoleDossier(poleCode, answers, activeCategory);

        // Mise à jour des sous-totaux par volet
        if (res.volets_breakdown) {
            res.volets_breakdown.forEach(v => {
                const badge = document.getElementById(`subtotal-badge-${v.id}`);
                if (badge) {
                    let txt = `${v.points} pt${v.points > 1 ? 's' : ''}`;
                    if (v.aides_euros > 0) txt += ` + ${fin.formatCurrency(v.aides_euros)}`;
                    badge.textContent = txt;
                }
            });
        }

        // Mise à jour du bandeau flottant
        const ptsEl = document.getElementById('score-live-points');
        const aidesEl = document.getElementById('score-live-aides');
        const totEl = document.getElementById('score-live-total');

        if (ptsEl) ptsEl.textContent = res.total_points;
        if (aidesEl) aidesEl.textContent = `(+ ${fin.formatCurrency(res.total_aides_directes_euros)} d'aides directes)`;
        if (totEl) totEl.textContent = fin.formatCurrency(res.subvention_totale);

        window.CCMVR._lastCalculatedSubvention = res;
    },

    // Reporter automatiquement le montant calculé dans la case de demande officielle
    applyCalculatedSubventionToDemand() {
        const last = window.CCMVR._lastCalculatedSubvention;
        const montantInput = document.getElementById('dem-montant');
        if (last && montantInput) {
            montantInput.value = Math.round(last.subvention_totale);
            this.onDemandeMontantChange();
            this.toast(`Montant de ${window.CCMVR.FinanceEngine.formatCurrency(last.subvention_totale)} reporté dans votre demande !`);
            document.getElementById('dem-montant')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    // Téléversement d'un justificatif pour un volet de la grille
    async handleJustificatifUpload(inputEl, voletId, voletNumero) {
        const file = inputEl.files && inputEl.files[0];
        if (!file) return;

        const store = window.CCMVR.Store;
        try {
            const doc = await store.uploadJustificatifFile(file, {
                dossierId: 'draft',
                voletId: voletId
            });

            this.toast(`Justificatif "${file.name}" téléversé avec succès !`);
            this.refreshDynamicCriteriaFields();
        } catch(err) {
            this.toast('Erreur téléversement : ' + err.message, 'error');
        }
    },

    // Suppression / Remplacement d'un justificatif
    handleRemoveJustificatif(justifId, voletId) {
        window.CCMVR.Store.deleteJustificatifFile(justifId);
        this.toast('Justificatif retiré.');
        this.refreshDynamicCriteriaFields();
    },

    getActiveFormBudgetPayload() {
        const nature = document.querySelector('input[name="dem-nature"]:checked')?.value || 'MONETAIRE';
        const montantDem = nature === 'NATURE' ? 0 : (parseFloat(document.getElementById('dem-montant')?.value) || 0);

        if (nature === 'NATURE') {
            return {
                budget_type_choice: 'NATURE',
                is_action_global: true,
                subvention_ccmvr_demandee: 0,
                total_charges: 0,
                total_produits: 0,
                total_charges_association: 0,
                total_produits_association: 0,
                tresorerie_banque: 0,
                tresorerie_active: 0,
                fonds_propres_reserves: 0,
                reserves_associatives: 0
            };
        }

        if (montantDem < 23000) {
            const choice = document.querySelector('input[name="dem-budget-choice"]:checked')?.value || 'GLOBAL';
            const isActionGlobal = choice === 'GLOBAL';
            const totalCharges = parseFloat(document.getElementById('simp-total-charges')?.value) || (parseFloat(document.getElementById('simp-action-charges')?.value) || 0) + (parseFloat(document.getElementById('simp-structure-charges')?.value) || 0);
            const actionCharges = totalCharges;
            const structureCharges = 0;

            const ccmvrSubv = montantDem;
            const autresSubv = parseFloat(document.getElementById('simp-recette-autres-subv')?.value) || 0;
            const recettesPropres = parseFloat(document.getElementById('simp-recette-propres')?.value) || 0;
            const autofin = parseFloat(document.getElementById('simp-recette-autofin')?.value) || 0;
            const totalRecettes = ccmvrSubv + autresSubv + recettesPropres + autofin;

            const tresoSimp = parseFloat(document.getElementById('simp-treso')?.value) || 0;
            const reservesSimp = parseFloat(document.getElementById('simp-reserves')?.value) || 0;

            return {
                budget_type_choice: choice,
                is_action_global: isActionGlobal,
                action_charges_specifiques: actionCharges,
                charges_structure_generales: structureCharges,
                total_charges_association: totalCharges,
                total_charges: totalCharges,
                achats_charges_externes: totalCharges,
                charges_personnel: 0,
                autres_charges: structureCharges,
                dotations_amortissements: 0,
                subvention_ccmvr_demandee: ccmvrSubv,
                subventions_autres: autresSubv,
                cotisations: recettesPropres,
                recettes_activites: recettesPropres,
                apport_fonds_propres: autofin,
                total_produits_association: totalRecettes,
                total_produits: totalRecettes,
                tresorerie_banque: tresoSimp,
                tresorerie_active: tresoSimp,
                fonds_propres_reserves: reservesSimp,
                reserves_associatives: reservesSimp,
                dettes_court_terme: 0,
                actif_immobilise: reservesSimp,
                creances_recevoir: autresSubv
            };
        }

        const achats = (parseFloat(document.getElementById('bud-achats')?.value) || 0) + (parseFloat(document.getElementById('bud-services-ext')?.value) || 0);
        const personnel = parseFloat(document.getElementById('bud-personnel')?.value) || 0;
        const autresCharges = parseFloat(document.getElementById('bud-autres-charges')?.value) || 0;
        const dotations = parseFloat(document.getElementById('bud-dotations')?.value) || 0;
        const cotisations = parseFloat(document.getElementById('bud-cotisations')?.value) || 0;
        const recettes = (parseFloat(document.getElementById('bud-recettes')?.value) || 0)
            + (parseFloat(document.getElementById('bud-sponsoring')?.value) || 0)
            + (parseFloat(document.getElementById('bud-prod-fin')?.value) || 0);
        const subvAutres = parseFloat(document.getElementById('bud-subv-autres')?.value) || 0;
        const treso = parseFloat(document.getElementById('bud-treso')?.value) || 0;
        const reserves = parseFloat(document.getElementById('bud-reserves')?.value) || 0;
        const dettes = parseFloat(document.getElementById('bud-dettes')?.value) || 0;
        const immo = parseFloat(document.getElementById('bud-immo')?.value) || 0;
        const creances = parseFloat(document.getElementById('bud-creances')?.value) || 0;

        return {
            achats_charges_externes: achats,
            charges_personnel: personnel,
            autres_charges: autresCharges,
            dotations_amortissements: dotations,
            cotisations,
            recettes_activites: recettes,
            subventions_autres: subvAutres,
            subvention_ccmvr_demandee: montantDem,
            tresorerie_banque: treso,
            fonds_propres_reserves: reserves,
            dettes_court_terme: dettes,
            actif_immobilise: immo,
            actif_circulant: treso + creances
        };
    },

    recalcLiveFormRatios() {
        const fin = window.CCMVR.FinanceEngine;
        const payload = this.getActiveFormBudgetPayload();
        const r = fin.calculateFinancialRatios(payload);

        // Mise à jour des totaux dynamiques du Plan de Financement (< 23 000 €)
        const montantDem = parseFloat(document.getElementById('dem-montant')?.value) || 0;
        const ccmvrInp = document.getElementById('simp-recette-ccmvr');
        if (ccmvrInp && ccmvrInp.value != montantDem) ccmvrInp.value = montantDem;

        const totDep = parseFloat(document.getElementById('simp-total-charges')?.value) || (parseFloat(document.getElementById('simp-action-charges')?.value) || 0) + (parseFloat(document.getElementById('simp-structure-charges')?.value) || 0);
        const lblDep = document.getElementById('lbl-total-depenses');
        if (lblDep) lblDep.textContent = fin.formatCurrency(totDep);

        const autresSubv = parseFloat(document.getElementById('simp-recette-autres-subv')?.value) || 0;
        const recPropres = parseFloat(document.getElementById('simp-recette-propres')?.value) || 0;
        const autoFin = parseFloat(document.getElementById('simp-recette-autofin')?.value) || 0;
        const totRec = montantDem + autresSubv + recPropres + autoFin;
        const lblRec = document.getElementById('lbl-total-recettes');
        if (lblRec) lblRec.textContent = fin.formatCurrency(totRec);

        const boxEq = document.getElementById('box-equilibre-budget');
        if (boxEq) {
            const diff = totRec - totDep;
            if (totDep > 0 && Math.abs(diff) < 0.01) {
                boxEq.className = 'p-3 rounded-xl border text-xs flex items-center justify-between bg-emerald-50 border-emerald-200 text-emerald-900';
                boxEq.innerHTML = `
                    <div class="flex items-center gap-2 font-bold">
                        <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                        <span>✓ Plan de financement rigoureusement équilibré (Solde : 0,00 €)</span>
                    </div>
                    <span class="font-mono-code font-extrabold text-xs text-emerald-700">${fin.formatCurrency(totRec)}</span>
                `;
            } else if (totDep > 0 || totRec > 0) {
                boxEq.className = 'p-3 rounded-xl border text-xs flex items-center justify-between bg-amber-50 border-amber-200 text-amber-900';
                boxEq.innerHTML = `
                    <div class="flex items-center gap-2 font-bold">
                        <i data-lucide="scale" class="w-4 h-4 text-amber-600"></i>
                        <span>Écart prévisionnel : ${diff > 0 ? 'Excédent de +' + fin.formatCurrency(diff) : 'Déficit de ' + fin.formatCurrency(diff)} (Dépenses : ${fin.formatCurrency(totDep)} • Financements : ${fin.formatCurrency(totRec)})</span>
                    </div>
                    <span class="text-[10px] font-bold text-amber-800">Ajustez les charges ou cofinancements</span>
                `;
            } else {
                boxEq.className = 'p-3 rounded-xl border text-xs flex items-center justify-between bg-slate-50 border-slate-200 text-slate-500';
                boxEq.innerHTML = `
                    <span class="italic">Renseignez les dépenses et financements pour évaluer l'équilibre du projet.</span>
                `;
            }
            if (window.lucide) window.lucide.createIcons();
        }

        // Calcul et affichage de la balance globale PCG (≥ 23 000 €)
        const pcgAchats = (parseFloat(document.getElementById('bud-achats')?.value) || 0) + (parseFloat(document.getElementById('bud-services-ext')?.value) || 0);
        const pcgPersonnel = parseFloat(document.getElementById('bud-personnel')?.value) || 0;
        const pcgAutresCh = parseFloat(document.getElementById('bud-autres-charges')?.value) || 0;
        const pcgDotations = parseFloat(document.getElementById('bud-dotations')?.value) || 0;
        const pcgTotalCharges = pcgAchats + pcgPersonnel + pcgAutresCh + pcgDotations;

        const pcgCotis = parseFloat(document.getElementById('bud-cotisations')?.value) || 0;
        const pcgRecettes = parseFloat(document.getElementById('bud-recettes')?.value) || 0;
        const pcgSponsoring = parseFloat(document.getElementById('bud-sponsoring')?.value) || 0;
        const pcgSubvAutres = parseFloat(document.getElementById('bud-subv-autres')?.value) || 0;
        const pcgProdFin = parseFloat(document.getElementById('bud-prod-fin')?.value) || 0;
        const pcgTotalProduits = montantDem + pcgCotis + pcgRecettes + pcgSponsoring + pcgSubvAutres + pcgProdFin;

        const lblPcgCh = document.getElementById('lbl-pcg-total-charges');
        if (lblPcgCh) lblPcgCh.textContent = fin.formatCurrency(pcgTotalCharges);
        const lblPcgPr = document.getElementById('lbl-pcg-total-produits');
        if (lblPcgPr) lblPcgPr.textContent = fin.formatCurrency(pcgTotalProduits);

        const boxPcgEq = document.getElementById('box-pcg-equilibre-budget');
        if (boxPcgEq) {
            const diffPcg = pcgTotalProduits - pcgTotalCharges;
            if (pcgTotalCharges > 0 && Math.abs(diffPcg) < 0.01) {
                boxPcgEq.className = 'p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-emerald-50 border-emerald-300 text-emerald-900';
                boxPcgEq.innerHTML = `
                    <div class="flex items-center gap-2 font-bold">
                        <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                        <span>✓ Budget PCG Asso rigoureusement équilibré (Solde : 0,00 €)</span>
                    </div>
                    <span class="font-mono-code font-extrabold text-xs text-emerald-700">${fin.formatCurrency(pcgTotalProduits)}</span>
                `;
            } else if (pcgTotalCharges > 0 || pcgTotalProduits > 0) {
                boxPcgEq.className = 'p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-amber-50 border-amber-300 text-amber-900';
                boxPcgEq.innerHTML = `
                    <div class="flex items-center gap-2 font-bold">
                        <i data-lucide="scale" class="w-4 h-4 text-amber-600"></i>
                        <span>Balance d'exploitation PCG : ${diffPcg > 0 ? 'Excédent de +' + fin.formatCurrency(diffPcg) : 'Déficit de ' + fin.formatCurrency(diffPcg)} (Charges : ${fin.formatCurrency(pcgTotalCharges)} • Produits : ${fin.formatCurrency(pcgTotalProduits)})</span>
                    </div>
                    <span class="text-[10px] font-bold text-amber-800">${diffPcg > 0 ? 'Excédent prévisionnel' : 'Déficit à équilibrer'}</span>
                `;
            } else {
                boxPcgEq.className = 'p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 border-slate-200 text-slate-500';
                boxPcgEq.innerHTML = `<span class="italic">Renseignez les comptes pour évaluer l'équilibre du projet en temps réel.</span>`;
            }
        }

        const box = document.getElementById('live-ratios-summary');
        if (!box) return;
        box.innerHTML = `
            <div>
                <span class="text-slate-400 block text-[11px]">Total Budget Charges / Produits</span>
                <strong class="font-mono-code text-sm">${fin.formatCurrency(r.total_charges)} / ${fin.formatCurrency(r.total_produits)}</strong>
            </div>
            <div>
                <span class="text-slate-400 block text-[11px]">Fonds de Roulement (FRNG)</span>
                <strong class="font-mono-code text-sm text-emerald-400">${fin.formatCurrency(r.frng_calcule)}</strong>
            </div>
            <div>
                <span class="text-slate-400 block text-[11px]">Autonomie Trésorerie</span>
                <strong class="font-mono-code text-sm ${r.tresorerie_mois_charges >= 12 ? 'text-amber-400' : 'text-blue-300'}">${r.tresorerie_mois_charges.toFixed(1)} mois de charges</strong>
            </div>
            <div>
                <span class="text-slate-400 block text-[11px]">Capacité Autofinancement (CAF)</span>
                <strong class="font-mono-code text-sm">${fin.formatCurrency(r.caf_calculee)}</strong>
            </div>
            <div>
                <span class="text-slate-400 block text-[11px]">Taux Dépendance CCMVR</span>
                <strong class="font-mono-code text-sm ${r.taux_dependance_ccmvr >= 70 ? 'text-amber-400' : 'text-white'}">${r.taux_dependance_ccmvr.toFixed(1)} %</strong>
            </div>
        `;
        this.applyFormVisualFeedback();
    },

    async handleSubmitGrantApplication(e, isDraft = false) {
        if (e && e.preventDefault) e.preventDefault();
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const poleSelect = document.getElementById('dem-pole');
        const poleId = poleSelect?.value || (isDraft ? store.state.poles[0]?.id : null);
        let intitule = (document.getElementById('dem-intitule')?.value || '').trim();
        if (isDraft && !intitule) intitule = 'Brouillon de demande en cours';
        const natureDemande = document.querySelector('input[name="dem-nature"]:checked')?.value || 'MONETAIRE';
        const selectedNatureCat = document.querySelector('input[name="nat-cat-choice"]:checked')?.value || 'MINIBUS';
        const natureCats = [selectedNatureCat];
        const natureDetails = (document.getElementById('dem-nature-details')?.value || '').trim();
        const motivation = (document.getElementById('dem-motivation')?.value || '').trim();
        const montantDem = natureDemande === 'NATURE' ? 0 : (parseFloat(document.getElementById('dem-montant')?.value) || 0);

        // Validation stricte uniquement si transmission définitive (non brouillon)
        if (!isDraft) {
            if (!poleId) {
                this.toast('Veuillez sélectionner le pôle instructeur destinataire.', 'warning');
                this.goToDemandeStep(1);
                poleSelect?.focus();
                return;
            }
            if (!intitule) {
                this.toast('Veuillez renseigner un intitulé de projet avant de continuer.', 'warning');
                this.goToDemandeStep(1);
                document.getElementById('dem-intitule')?.focus();
                return;
            }
            if (natureDemande !== 'NATURE' && (isNaN(montantDem) || montantDem <= 0)) {
                this.toast('Veuillez saisir un montant de subvention supérieur à 0 €.', 'warning');
                this.goToDemandeStep(1);
                document.getElementById('dem-montant')?.focus();
                return;
            }

            const cerCheck = document.getElementById('dem-cer-check');
            if (cerCheck && !cerCheck.checked) {
                this.toast('Veuillez certifier sur l’honneur le respect du Contrat d’Engagement Républicain (CER) pour déposer votre demande.', 'warning');
                this.goToDemandeStep(3);
                cerCheck.focus();
                return;
            }
        }

        // Note : obligation d'IBAN temporairement désactivée pour la présentation

        const catSelect = document.getElementById('dem-categorie');
        const boxCat = document.getElementById('box-dem-categorie');
        if (boxCat && !boxCat.classList.contains('hidden')) {
            if (!catSelect || !catSelect.value) {
                this.toast('Veuillez obligatoirement sélectionner le dispositif ou programme sollicité auprès du Pôle.', 'warning');
                this.goToDemandeStep(1);
                catSelect?.focus();
                return;
            }
        }
        const categorieId = (catSelect && boxCat && !boxCat.classList.contains('hidden')) ? catSelect.value : null;
        const categorieNom = (catSelect && boxCat && !boxCat.classList.contains('hidden')) ? (catSelect.options[catSelect.selectedIndex]?.text || null) : null;

        const critInputs = document.querySelectorAll('.dyn-crit-input');
        const critValues = Array.from(critInputs).map(inp => {
            const cCode = inp.getAttribute('data-crit-code') || inp.getAttribute('data-crit-id');
            const cId = inp.getAttribute('data-crit-id') || cCode;
            const cType = inp.getAttribute('data-crit-type');
            return {
                critere_id: cId,
                critere_code: cCode,
                code_variable: cCode,
                valeur_numerique: (cType === 'number' || cType === 'currency') ? (parseFloat(inp.value) || 0) : (cType === 'select' && !isNaN(parseFloat(inp.value)) ? parseFloat(inp.value) : null),
                valeur_booleenne: cType === 'boolean' ? Boolean(inp.checked) : null,
                valeur_texte: (cType === 'text' || (cType === 'select' && isNaN(parseFloat(inp.value)))) ? inp.value : (inp.value || null)
            };
        });

        const budgetPayload = this.getActiveFormBudgetPayload();

        const selectedSigId = document.getElementById('dem-signataire-select')?.value;
        const signataires = store.getSignatairesHabilites(store.activeStructureId);
        const selectedSig = signataires.find(s => s.id === selectedSigId) || signataires[0];

        try {
            const saved = await store.submitGrantApplication({
                dossierPayload: {
                    id: this.currentDraftDossierId || null,
                    structure_id: store.activeStructureId,
                    pole_id: poleId,
                    annee: store.activeMillesime,
                    intitule_projet: intitule,
                    nature_demande: natureDemande,
                    nature_categories: natureCats,
                    nature_details: natureDetails,
                    montant_demande: montantDem,
                    statut_workflow: isDraft ? 'BROUILLON' : 'DEPOSE',
                    description_projet: motivation,
                    motivation_demande: motivation,
                    categorie_id: categorieId,
                    categorie_nom: categorieNom,
                    signataire_nom: selectedSig ? `${selectedSig.prenom} ${selectedSig.nom}` : '',
                    signataire_fonction: selectedSig ? selectedSig.fonction : ''
                },
                budgetPayload,
                criteresValues: critValues
            });
            this.currentDraftDossierId = null;

            // Rattachement des justificatifs déposés en brouillon au nouveau dossier
            try {
                const allJustifs = JSON.parse(localStorage.getItem('ccmvr_justificatifs_subventions') || '[]');
                let updatedJustifs = false;
                allJustifs.forEach(j => {
                    if (j.dossier_id === 'draft') {
                        j.dossier_id = saved.id;
                        updatedJustifs = true;
                    }
                });
                if (updatedJustifs) {
                    localStorage.setItem('ccmvr_justificatifs_subventions', JSON.stringify(allJustifs));
                }
            } catch(e){}

            if (isDraft) {
                this.toast('Demande enregistrée en brouillon. Vous pourrez la reprendre à tout moment.', 'success');
            } else {
                this.toast(`Demande #${saved.code_hex} (${natureDemande === 'NATURE' ? 'Concours en Nature' : (natureDemande === 'MIXTE' ? 'Demande Mixte' : 'Subvention Monétaire')}) transmise définitivement au pôle instructeur !`, 'success');
            }
            this.switchTab('asso_conventions');
        } catch (err) {
            this.toast('Erreur dépôt : ' + err.message, 'error');
        }
    },

    startMinibusOrNatureDemand(cat = 'MINIBUS') {
        this.switchTab('asso_demande');
        setTimeout(() => {
            this.selectNatureDemande('NATURE');
            const mb = document.getElementById('nat-cat-minibus');
            if (mb) mb.checked = (cat === 'MINIBUS');
            const loc = document.getElementById('nat-cat-locaux');
            if (loc) loc.checked = (cat === 'LOCAUX');
            const mat = document.getElementById('nat-cat-materiel');
            if (mat) mat.checked = (cat === 'MATERIEL');
            const pers = document.getElementById('nat-cat-personnel');
            if (pers) pers.checked = (cat === 'PERSONNEL');

            const det = document.getElementById('dem-nature-details');
            if (det && !det.value) {
                det.value = "Demande de mise à disposition d'un minibus intercommunal 9 places pour les déplacements des adhérents et tournois de la saison.";
            }
            const intitule = document.getElementById('dem-intitule');
            if (intitule && !intitule.value) {
                intitule.value = `Convention de mise à disposition Minibus & Concours en nature — Exercice ${window.CCMVR.Store.activeMillesime}`;
            }
            const poleSelect = document.getElementById('dem-pole');
            if (poleSelect && !poleSelect.value) {
                const opt = Array.from(poleSelect.options).find(o => (o.getAttribute('data-code') === 'SPORT' || o.text.includes('Sport')));
                if (opt) {
                    poleSelect.value = opt.value;
                    this.onPoleSelectionChange();
                }
            }
            this.applyFormVisualFeedback();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.toast("Formulaire configuré : complétez votre demande pour établir la convention Minibus.", "info");
        }, 80);
    },

    // Réservation Minibus & Suivi des Aides en Nature côté Association (Conditionné à une Convention signée)
    renderAssoMinibusAndNature(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const annee = store.activeMillesime;
        let s = store.state.structures.find(x => x.id === store.activeStructureId)
            || (store.currentUser?.siret_attache ? store.state.structures.find(x => x.siret === store.currentUser.siret_attache) : null)
            || (store.loggedInEmail ? store.state.structures.find(x => (x.email_contact || '').toLowerCase() === store.loggedInEmail.toLowerCase()) : null)
            || (store.currentUser?.email ? store.state.structures.find(x => (x.email_contact || '').toLowerCase() === store.currentUser.email.toLowerCase()) : null)
            || (store.isSuperAdmin ? store.state.structures[0] : null)
            || store.state.structures[0]
            || {};

        if (s.id && !store.activeStructureId) {
            store.activeStructureId = s.id;
        }

        const conventions = store.getEnrichedConventions().filter(c => c.structure_id === s.id);
        const dossiers = store.getEnrichedDossiers().filter(d => d.structure_id === s.id);
        const prestations = store.getEnrichedPrestations(s.id, annee);
        const totalNature = prestations.reduce((acc, p) => acc + p.montant_total_valorise, 0);
        const minibusType = store.state.types_prestations_nature.find(t => t.code === 'MINIBUS_KM') || store.state.types_prestations_nature[0];

        // 1. Détection d'une convention MINIBUS valide et signée par les 2 parties
        const signedMinibusConv = conventions.find(c => {
            const isMb = (c.normType === 'CONV_MINIBUS') ||
                (c.type_convention || '').toUpperCase().includes('MINIBUS') ||
                (c.intitule || '').toUpperCase().includes('MINIBUS') ||
                (c.customMeta?.nature_categories || []).includes('MINIBUS') ||
                (c.dossier?.categories_nature || []).includes('MINIBUS');
            const isSigned = (c.statut_signature === 'VALIDE') ||
                (c.isSignePresidente && c.isSigneAsso) ||
                Boolean(c.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${c.id}`));
            return isMb && isSigned;
        });

        // 2. Détection d'une convention MINIBUS en cours de signature
        const pendingMinibusConv = conventions.find(c => {
            const isMb = (c.normType === 'CONV_MINIBUS') ||
                (c.type_convention || '').toUpperCase().includes('MINIBUS') ||
                (c.intitule || '').toUpperCase().includes('MINIBUS') ||
                (c.customMeta?.nature_categories || []).includes('MINIBUS') ||
                (c.dossier?.categories_nature || []).includes('MINIBUS');
            const isSigned = (c.statut_signature === 'VALIDE') ||
                (c.isSignePresidente && c.isSigneAsso) ||
                Boolean(c.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${c.id}`));
            return isMb && !isSigned;
        });

        // 3. Détection d'un dossier de subvention en nature demandant le minibus en cours d'instruction
        const pendingNatureDossier = dossiers.find(d => {
            const isNature = (d.nature_demande === 'NATURE' || d.nature_demande === 'MIXTE');
            const hasMb = (d.categories_nature || []).includes('MINIBUS') || (d.nature_details || '').toUpperCase().includes('MINIBUS') || isNature;
            return hasMb && !['REFUSE', 'REJETE', 'ARCHIVE'].includes(d.statut_workflow);
        });

        // Construction du bloc de gauche : Débloqué OU Verrouillé selon statut conventionnel
        let leftPanelHtml = '';

        if (signedMinibusConv) {
            // ACCÈS DÉBLOQUÉ : Convention Minibus signée et valide
            leftPanelHtml = `
                <div class="card-minimal p-5 space-y-4 border-2 border-emerald-300 bg-white shadow-sm">
                    <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                        <div class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                            ✓
                        </div>
                        <div class="text-xs">
                            <div class="font-extrabold text-emerald-950">Convention Minibus Active (#${signedMinibusConv.code_hex})</div>
                            <div class="text-emerald-800 text-[11px] mt-0.5">
                                Signée des 2 parties • Valide du ${fin.formatDate(signedMinibusConv.date_debut)} au ${fin.formatDate(signedMinibusConv.date_fin)}.
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h2 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <i data-lucide="calendar-plus" class="w-4 h-4 text-emerald-600"></i>
                            Réserver un Créneau Minibus
                        </h2>
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                            Autorisé
                        </span>
                    </div>

                    <form onsubmit="CCMVR.App.handleAssoReserveMinibus(event, '${s.id}', '${minibusType ? minibusType.id : ''}')" novalidate class="space-y-3 text-xs">
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Date de départ *</label>
                                <input type="date" id="asso-mb-deb" required value="" placeholder="AAAA-MM-JJ" class="input-clean bg-white"/>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Date de retour *</label>
                                <input type="date" id="asso-mb-fin" required value="" placeholder="AAAA-MM-JJ" class="input-clean bg-white"/>
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Distance aller-retour estimée (km) *</label>
                            <input type="number" id="asso-mb-km" required value="" placeholder="Ex: 180" class="input-clean font-mono-code font-bold bg-white"/>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Destination & Objet du déplacement *</label>
                            <input type="text" id="asso-mb-obs" required placeholder="Ex: Déplacement championnat jeunes à Lyon" class="input-clean bg-white"/>
                        </div>
                        <button type="submit" class="w-full py-2.5 btn-accent text-xs font-bold shadow-md flex items-center justify-center gap-2">
                            <i data-lucide="send" class="w-4 h-4"></i> Envoyer la Demande de Réservation
                        </button>
                    </form>
                </div>
            `;
        } else if (pendingMinibusConv) {
            // CONVENTION EN COURS DE SIGNATURE
            const presSigned = pendingMinibusConv.isSignePresidente;
            const assoSigned = pendingMinibusConv.isSigneAsso;
            leftPanelHtml = `
                <div class="card-minimal p-6 space-y-5 border-2 border-amber-300 bg-amber-50/30">
                    <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl mx-auto shadow-xs">
                        ⏳
                    </div>
                    <div class="text-center space-y-1">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            Convention en cours de signature
                        </span>
                        <h2 class="text-sm font-black text-slate-900 pt-1">Convention Minibus #${pendingMinibusConv.code_hex}</h2>
                        <p class="text-[11.5px] text-slate-600 leading-relaxed">
                            Votre convention a été rédigée suite à votre demande. Pour que le droit de réservation soit actif, les 2 signatures sont requises :
                        </p>
                    </div>

                    <div class="p-3 bg-white rounded-xl border border-amber-200 space-y-2 text-xs">
                        <div class="flex items-center justify-between">
                            <span class="font-semibold text-slate-700">1. Présidente CCMVR :</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${presSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                                ${presSigned ? '✓ Signé CCMVR' : 'En attente signature'}
                            </span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-semibold text-slate-700">2. Association :</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${assoSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900 animate-pulse'}">
                                ${assoSigned ? '✓ Signé Asso' : '✍️ Votre signature requise'}
                            </span>
                        </div>
                    </div>

                    <div class="space-y-2 pt-1">
                        ${!assoSigned ? `
                            <button onclick="CCMVR.App.openSignModal('${pendingMinibusConv.id}', 'ASSO')" class="w-full py-2.5 btn-accent text-xs font-black flex items-center justify-center gap-2 shadow-md">
                                ✍️ Signer ma Convention en Ligne (Code OTP) →
                            </button>
                        ` : ''}
                        <button onclick="CCMVR.App.switchTab('asso_conventions')" class="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition">
                            Voir le suivi dans mes conventions
                        </button>
                    </div>
                    <div class="text-[10.5px] text-slate-500 text-center italic">
                        Le calendrier et le formulaire de réservation s'ouvriront automatiquement dès la validation des signatures.
                    </div>
                </div>
            `;
        } else if (pendingNatureDossier) {
            // DOSSIER EN COURS D'INSTRUCTION
            leftPanelHtml = `
                <div class="card-minimal p-6 space-y-5 border-2 border-blue-200 bg-blue-50/30">
                    <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-2xl mx-auto shadow-xs">
                        📋
                    </div>
                    <div class="text-center space-y-1">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
                            Demande en cours d'instruction
                        </span>
                        <h2 class="text-sm font-black text-slate-900 pt-1">Dossier #${pendingNatureDossier.code_hex || pendingNatureDossier.id}</h2>
                        <p class="text-[11.5px] text-slate-600 leading-relaxed">
                            Votre demande de subvention en nature (minibus) est actuellement instruite par le Pôle <strong>${pendingNatureDossier.pole?.libelle || 'CCMVR'}</strong>.
                        </p>
                    </div>

                    <div class="p-3 bg-white rounded-xl border border-blue-200 text-xs space-y-1.5">
                        <div class="text-[11px] text-blue-950 font-bold">Cycle d'approbation :</div>
                        <div class="text-[10.5px] text-slate-600 leading-relaxed">
                            1. Instruction technique par le service<br>
                            2. Validation en Commission<br>
                            3. Édition de la Convention et signatures conjointe
                        </div>
                    </div>

                    <button onclick="CCMVR.App.switchTab('asso_conventions')" class="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold transition shadow-sm">
                        Suivre l'avancement de ma demande →
                    </button>
                </div>
            `;
        } else {
            // AUCUNE DEMANDE NI CONVENTION : ACCÈS VERROUILLÉ & EXPLICATION RÉGLEMENTAIRE
            leftPanelHtml = `
                <div class="card-minimal p-6 space-y-5 border-2 border-slate-300 bg-slate-50/60 shadow-sm">
                    <div class="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center text-3xl mx-auto shadow-xs">
                        🔒
                    </div>

                    <div class="text-center space-y-1.5">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                            Convention Préalable Obligatoire
                        </span>
                        <h2 class="text-base font-black text-slate-900">Réservation Minibus Verrouillée</h2>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            Pour pouvoir réserver un minibus intercommunal, votre association doit impérativement avoir conclu une <strong>Convention de mise à disposition</strong> avec la Communauté de Communes.
                        </p>
                    </div>

                    <div class="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                        <div class="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <i data-lucide="shield-alert" class="w-4 h-4 text-amber-600"></i>
                            Cadre Juridique (Art. L. 1611-4 CGCT) :
                        </div>
                        <p class="text-[11px] text-slate-600 leading-relaxed">
                            Toute mise à disposition d'un équipement ou véhicule de la collectivité constitue un concours en nature réglementé. La réservation directe n'est accessible qu'une fois la convention établie et signée des deux parties.
                        </p>
                    </div>

                    <div class="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 text-xs">
                        <div class="font-extrabold text-indigo-950 text-center uppercase tracking-wider text-[11px]">
                            Comment obtenir l'accès à la réservation ?
                        </div>
                        <ol class="list-decimal list-inside space-y-1 text-[11px] text-indigo-900 leading-relaxed">
                            <li>Déposez une <strong>demande en nature</strong> (option Minibus 9 places).</li>
                            <li>Le Pôle instructeur valide votre demande et édite la convention.</li>
                            <li>Vous signez la convention en ligne avec le code OTP.</li>
                            <li>L'accès au calendrier de réservation s'ouvre immédiatement !</li>
                        </ol>
                    </div>

                    <button onclick="CCMVR.App.startMinibusOrNatureDemand('MINIBUS')" class="w-full py-3 btn-accent text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2">
                        <span>🚐 Déposer une Demande de Convention Minibus →</span>
                    </button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="space-y-6">
                <!-- En-tête de section -->
                <div class="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${signedMinibusConv ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'}">
                                ${signedMinibusConv ? '✓ Convention Minibus Validée' : '🔒 Convention Minibus Requise'}
                            </span>
                            <span class="text-xs text-indigo-200">• Exercice ${annee}</span>
                        </div>
                        <h1 class="text-xl font-extrabold text-white mt-1">Réservation Minibus & Aides en Nature — ${s.nom_officiel}</h1>
                        <p class="text-xs text-slate-300 mt-0.5">Accès au parc minibus et suivi de la valorisation de vos concours en nature (Art. L. 2313-1 CGCT).</p>
                    </div>
                    <button onclick="CCMVR.App.openAttestationPreviewModal('${s.id}')" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow transition shrink-0">
                        <i data-lucide="download" class="w-4 h-4 text-emerald-400"></i> Télécharger mon Attestation (${annee})
                    </button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Colonne gauche : Réservation (si convention signée) OU Écran d'état/verrouillé -->
                    <div>
                        ${leftPanelHtml}
                    </div>

                    <!-- Colonne droite : Tableau des Prestations Consommées & Valorisation -->
                    <div class="lg:col-span-2 card-minimal overflow-hidden">
                        <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap justify-between items-center gap-2">
                            <div class="flex items-center gap-2">
                                <i data-lucide="award" class="w-4 h-4 text-indigo-600"></i>
                                <span class="text-xs font-bold text-slate-900 uppercase">Mes Concours en Nature Consommés (${annee})</span>
                            </div>
                            <span class="font-mono-code text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                Total valorisé : ${fin.formatCurrency(totalNature)}
                            </span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                        <th class="py-2.5 px-4">Date</th>
                                        <th class="py-2.5 px-4">Prestation</th>
                                        <th class="py-2.5 px-4">Détail</th>
                                        <th class="py-2.5 px-4 text-center">Volume</th>
                                        <th class="py-2.5 px-4 text-right">Valeur Équivalente</th>
                                        <th class="py-2.5 px-4 text-center">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${prestations.map(p => `
                                        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                            <td class="py-3 px-4 text-xs font-medium text-slate-700">${fin.formatDate(p.date_debut)}</td>
                                            <td class="py-3 px-4 text-xs font-bold text-slate-900">${p.type_libelle}</td>
                                            <td class="py-3 px-4 text-xs text-slate-500">${p.observations || '—'}</td>
                                            <td class="py-3 px-4 text-center font-mono-code text-xs font-semibold">${p.quantite} ${p.unite}</td>
                                            <td class="py-3 px-4 text-right font-mono-code text-xs font-bold text-emerald-700">${fin.formatCurrency(p.montant_total_valorise)}</td>
                                            <td class="py-3 px-4 text-center">
                                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.statut === 'VALIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${p.statut}</span>
                                            </td>
                                        </tr>
                                    `).join('') || `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400">Aucune prestation en nature consommée pour l'exercice ${annee}.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    async handleAssoReserveMinibus(e, structId, typeId) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        // Vérification de sécurité : existence d'une convention minibus signée des 2 parties
        const conventions = store.getEnrichedConventions().filter(c => c.structure_id === structId);
        const signedMb = conventions.some(c => {
            const isMb = (c.normType === 'CONV_MINIBUS') ||
                (c.type_convention || '').toUpperCase().includes('MINIBUS') ||
                (c.intitule || '').toUpperCase().includes('MINIBUS') ||
                (c.customMeta?.nature_categories || []).includes('MINIBUS') ||
                (c.dossier?.categories_nature || []).includes('MINIBUS');
            return isMb && (c.statut_signature === 'VALIDE' || (c.isSignePresidente && c.isSigneAsso) || Boolean(c.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${c.id}`)));
        });
        if (!signedMb) {
            this.toast("Réservation impossible : aucune convention minibus validée et signée par les 2 parties.", "error");
            return;
        }
        try {
            await store.addPrestationNature({
                structure_id: structId,
                type_prestation_id: typeId,
                annee: store.activeMillesime,
                date_debut: document.getElementById('asso-mb-deb').value,
                date_fin: document.getElementById('asso-mb-fin').value,
                quantite: parseFloat(document.getElementById('asso-mb-km').value) || 100,
                observations: document.getElementById('asso-mb-obs').value.trim(),
                statut: 'DEMANDE_RESERVATION'
            });
            this.renderMainView();
            this.toast('Demande de réservation minibus transmise au service logistique !');
        } catch (err) {
            this.toast('Erreur : ' + err.message, 'error');
        }
    },

    renderAssoConventions(container) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const typesMap = window.CCMVR.Config?.TYPES_CONVENTIONS || window.CCMVR.CONFIG?.TYPES_CONVENTIONS || {};
        const s = store.state.structures.find(x => x.id === store.activeStructureId) || store.state.structures[0] || { id: 'temp', nom_officiel: 'Mon Association' };
        const dossiers = store.getEnrichedDossiers(null, null, true).filter(d => s.id && d.structure_id === s.id);
        const conventions = store.state.conventions.filter(c => s.id && c.structure_id === s.id);

        const rowsHtml = dossiers.map(d => {
            const palier = fin.getPalierForAmount(d.montant_demande);
            const isIncomplet = d.statut_workflow === 'INCOMPLET';
            const isRefuse = d.statut_workflow === 'REJETE' || d.statut_workflow === 'REFUSE';
            const isVote = d.statut_workflow === 'VOTE_CONSEIL';
            const isArchive = d.statut_workflow === 'ARCHIVE';

            let rowClass = 'border-b border-slate-100 hover:bg-slate-50 transition text-xs';
            if (isIncomplet) {
                rowClass = 'bg-amber-50/80 hover:bg-amber-100/70 border-l-4 border-l-amber-500 border-b border-amber-200 transition text-xs font-medium';
            } else if (isRefuse) {
                rowClass = 'bg-rose-50/80 hover:bg-rose-100/70 border-l-4 border-l-rose-500 border-b border-rose-200 transition text-xs';
            }

            const isBrouillon = d.statut_workflow === 'BROUILLON';
            return `
            <tr class="${rowClass}">
                <td class="py-3.5 px-4 font-mono-code text-xs font-bold text-slate-900">#${d.code_hex || 'BROUILLON'}</td>
                <td class="py-3.5 px-4 text-xs">
                    <div class="font-bold text-slate-900">${d.intitule_projet}</div>
                    <span class="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${palier.color}">${palier.label}</span>
                    ${(d.description_projet || d.motivation_demande) ? `
                        <div class="mt-1 text-[11px] text-slate-600 line-clamp-2 italic" title="${(d.description_projet || d.motivation_demande).replace(/"/g, '&quot;')}">
                            « ${(d.description_projet || d.motivation_demande).slice(0, 150)}${(d.description_projet || d.motivation_demande).length > 150 ? '...' : ''} »
                        </div>
                    ` : ''}
                    ${d.commentaire_association ? `
                        <div class="mt-2 text-[11px] font-medium ${isRefuse ? 'text-rose-900 bg-rose-50 border-rose-300' : isIncomplet ? 'text-amber-900 bg-amber-50 border-amber-300' : 'text-blue-900 bg-blue-50 border-blue-200'} p-2 rounded border">
                            <strong>📢 Message du service instructeur :</strong> ${d.commentaire_association}
                        </div>
                    ` : ''}
                </td>
                <td class="py-3.5 px-4 text-xs">${d.pole.libelle || 'Pôle'}</td>
                <td class="py-3.5 px-4 text-right font-mono-code text-xs font-bold">${fin.formatCurrency(d.montant_demande)}</td>
                <td class="py-3.5 px-4 text-right font-mono-code text-xs font-extrabold text-emerald-700">${(isVote && d.montant_vote) ? fin.formatCurrency(d.montant_vote) : '— (Instruction en cours)'}</td>
                <td class="py-3.5 px-4 text-center">
                    <div class="space-y-1 inline-flex flex-col items-center">
                        ${
                            isBrouillon
                                ? '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">🟡 Brouillon (non transmis)</span>'
                                : (typeof this.getWorkflowBadge === 'function'
                                    ? this.getWorkflowBadge(d.statut_workflow, d)
                                    : '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">' + d.statut_workflow + '</span>')
                        }
                        <div class="text-[9px] text-slate-500 font-medium">
                            ${d.statut_workflow === 'DEPOSE' ? (store.isDossierSoumisCdg(d) ? 'Étape 1 : En attente du visa Contrôle de Gestion' : 'Étape 1 : Instruction Pôle métier') :
                              d.statut_workflow === 'EN_INSTRUCTION' ? (store.isDossierSoumisCdg(d) ? 'Étape 1 : En instruction Contrôle de Gestion' : 'Étape 1 : En instruction Pôle métier') :
                              d.statut_workflow === 'RETOUR_INCOMPLET_SOUMIS' ? 'Compléments reçus : En cours de traitement' :
                              d.statut_workflow === 'INCOMPLET' ? 'Action requise : complétez votre demande' :
                              d.statut_workflow === 'VISE_CDG' ? 'Étape 2 : Instruction technique Pôle métier' :
                              d.statut_workflow === 'AVIS_POLE_FAVORABLE' ? 'Étape 3 : Arbitrage Commission' :
                              d.statut_workflow === 'VALIDE_COMMISSION' ? 'Étape 4 : Vote du Conseil Communautaire' :
                              d.statut_workflow === 'VOTE_CONSEIL' ? (() => {
                                  const conv = store.getEnrichedConventions().find(c => c.dossier_id === d.id);
                                  if (conv?.isSigneAsso) return '✓ Dossier acté — Convention signée';
                                  if (conv?.isTransmisAsso) return '🔔 Convention transmise — Prête pour signature';
                                  return '✓ Voté en Conseil — En attente du traitement par le pôle métier';
                              })() :
                              isRefuse ? 'Dossier non retenu' : isArchive ? 'Dossier archivé' : 'En instruction'}
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4 text-right">
                    ${isBrouillon ? `
                        <div class="inline-flex items-center gap-1.5 justify-end">
                            <button type="button" onclick="CCMVR.App.resumeDraftDemande('${d.id}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-extrabold shadow-2xs inline-flex items-center gap-1">
                                ✏️ Reprendre et compléter
                            </button>
                            <button type="button" onclick="CCMVR.App.deleteDraftDemande('${d.id}')" class="px-2 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 rounded text-xs transition" title="Supprimer ce brouillon">
                                🗑️
                            </button>
                        </div>
                    ` : isVote ? `
                        ${(() => {
                            const conv = store.getEnrichedConventions().find(c => c.dossier_id === d.id);
                            const isTransmis = conv?.isTransmisAsso;
                            const isSigneAsso = conv?.isSigneAsso;
                            if (isSigneAsso) {
                                return `
                                    <button onclick="CCMVR.App.openConventionPreviewModal('${d.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-2xs inline-flex items-center gap-1">
                                        ✓ Convention Signée
                                    </button>
                                `;
                            }
                            const isPresOrTransmis = Boolean(conv?.isSignePresidente || conv?.scan_signe_nom || conv?.isTransmisAsso);
                            if (isPresOrTransmis) {
                                return `
                                    <button onclick="CCMVR.App.openConventionPreviewModal('${d.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-extrabold shadow-2xs inline-flex items-center gap-1 animate-pulse" title="Consulter la convention signée par Madame la Présidente et apposer la signature de l'association">
                                        ✍️ Convention à signer
                                    </button>
                                `;
                            }
                            return `
                                <button onclick="CCMVR.App.openConventionPreviewModal('${d.id}')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition" title="Consulter l'état de préparation de la convention">
                                    ⏳ Convention en cours d'édition
                                </button>
                            `;
                        })()}
                    ` : isIncomplet ? `
                        <button onclick="CCMVR.App.openCompleteIncompleteDossier('${d.id}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-extrabold shadow-2xs inline-flex items-center gap-1">
                            ✏️ Compléter ma demande
                        </button>
                    ` : isRefuse ? `
                        <span class="px-2.5 py-1 text-xs font-semibold text-rose-700">Demande non retenue</span>
                    ` : isArchive ? `
                        <span class="px-2.5 py-1 text-xs text-slate-400 italic">Demande annulée</span>
                    ` : `
                        <span class="text-xs text-slate-400 italic">Instruction en cours</span>
                    `}
                </td>
            </tr>
            `;
        }).join('');

        const annee = store.activeMillesime;
        const assoPrestations = store.getEnrichedPrestations(s.id, annee);
        const prestationsRowsHtml = assoPrestations.map(pr => {
            let edl = null;
            try {
                if (pr.observations && pr.observations.startsWith('{')) {
                    edl = JSON.parse(pr.observations);
                }
            } catch (_) {}
            const immat = edl?.immatriculation || (pr.type_code === 'MINIBUS_KM' ? 'GK-412-VR' : pr.type_libelle);
            const condNom = edl?.conducteur_nom || 'Non renseigné';
            const isClos = Boolean(edl?.etat_des_lieux_clos || pr.statut === 'VALIDE');
            const kmParcourus = edl?.retour_km_parcourus || pr.quantite || 0;

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3 px-4 text-xs font-semibold text-slate-900">${fin.formatDate(pr.date_debut)} au ${fin.formatDate(pr.date_fin)}</td>
                    <td class="py-3 px-4 text-xs font-bold text-slate-800">
                        <span class="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 font-mono-code text-[10px] font-bold">${immat}</span>
                        <div class="text-[11px] text-slate-500">${pr.type_libelle}</div>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-700">
                        <div class="font-semibold text-slate-900">${condNom}</div>
                        <div class="text-[11px] text-slate-500">${edl?.conducteur_permis ? 'Permis ' + edl.conducteur_permis : 'Conducteur désigné'}</div>
                    </td>
                    <td class="py-3 px-4 text-center font-mono-code text-xs font-bold">${kmParcourus} ${pr.unite || 'km'}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isClos ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${isClos ? '✓ État des Lieux Clos' : 'â³ En cours (À compléter au retour)'}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="CCMVR.App.openEtatDesLieuxModal('${pr.id}')" class="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1">
                                📋 ${isClos ? 'Consulter' : 'Valider Sortie'}
                            </button>
                            <button onclick="CCMVR.App.printEtatDesLieux('${pr.id}')" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition" title="Imprimer la Fiche Officielle">
                                🖨️ï¸
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const convRowsHtml = store.getEnrichedConventions().filter(c => c.structure_id === s.id).map(c => {
            const typeConf = c.typeInfo || typesMap.COM_OBJECTIFS || { shortLabel: c.normType, badgeClass: 'bg-slate-100 text-slate-800' };
            const isTransmis = Boolean(c.isTransmisAsso);
            const isSigneAsso = Boolean(c.isSigneAsso);
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3 px-4 font-mono-code text-xs font-bold text-blue-700">#${c.code_hex}</td>
                    <td class="py-3 px-4 text-xs">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${typeConf.badgeClass}">${typeConf.shortLabel}</span>
                    </td>
                    <td class="py-3 px-4 text-xs font-semibold text-slate-900">
                        ${c.is_avenant ? `<strong>${c.objet_avenant || 'Avenant modificateur'}</strong> (Convention mère #${c.parentConvention?.code_hex || (c.code_hex.split('-AV')[0])})` : (c.intitule || typeConf.label || 'Convention CCMVR')}
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-600">${c.pole?.libelle || 'Intercommunalité'}</td>
                    <td class="py-3 px-4 text-center text-xs">
                        ${c.statut_signature === 'VALIDE'
                            ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">✓ Signé des 2 parties</span>`
                            : isSigneAsso
                                ? `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Signé Asso (Attente CCMVR)</span>`
                                : !isTransmis
                                    ? (c.visaCdgAvenantPending
                                        ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">⏳ En attente Visa CdG (Avenant)</span>`
                                        : `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">⏳ En cours d'instruction Pôle</span>`)
                                    : c.visaCdgHorsCadrePending
                                        ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">Attente Visa CdG (Hors Cadre)</span>`
                                        : `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold">🔔 Prêt pour Signature</span>`}
                    </td>
                    <td class="py-3 px-4 text-right">
                        ${!isTransmis ? `
                            <span class="text-xs text-slate-400 italic">En attente de transmission</span>
                        ` : !isSigneAsso ? `
                            <button onclick="CCMVR.App.openConventionPreviewModal('${c.dossier_id || ''}', '${c.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-extrabold shadow-sm animate-pulse">
                                ✍️ ${c.is_avenant ? 'Signer l\'Avenant' : 'Signer la Convention'}
                            </button>
                        ` : `
                            <button onclick="CCMVR.App.openConventionPreviewModal('${c.dossier_id || ''}', '${c.id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold">
                                📄 ${c.is_avenant ? 'Consulter l\'Avenant' : 'Consulter la Convention'}
                            </button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 class="text-xl font-bold text-slate-900">Mes Demandes de Subventions & Mes Conventions — ${s.nom_officiel || 'Mon Association'}</h1>
                        <p class="text-xs text-slate-500">Suivez l'instruction de vos dossiers par palier de contrôle et signez vos différentes conventions (Objectifs et Moyens, Minibus, Locaux, Personnel, Hors Cadre).</p>
                    </div>
                    <button onclick="CCMVR.App.switchTab('asso_demande')" class="px-4 py-2 btn-primary text-xs font-bold flex items-center gap-1.5 self-start">
                        + Déposer un nouveau dossier
                    </button>
                </div>

                <!-- Sous-vue 1 : Mes Conventions Actives & Signées (2/2 Exécutoires) -->
                <div class="card-minimal overflow-hidden border-2 border-emerald-300 shadow-sm">
                    <div class="px-5 py-3.5 border-b border-emerald-200 bg-emerald-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold shadow-2xs">✓</span>
                            <span class="text-xs font-extrabold uppercase tracking-wider text-emerald-950">Mes Conventions Actives & Signées (2/2 Exécutoires)</span>
                        </div>
                        <span class="text-[11px] text-emerald-800 font-semibold">Contrats bilatéraux signés et juridiquement applicables</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-emerald-200 text-[11px] font-semibold text-emerald-900 uppercase bg-emerald-50/30">
                                    <th class="py-2.5 px-4">Code Acte</th>
                                    <th class="py-2.5 px-4">Type de Convention</th>
                                    <th class="py-2.5 px-4">Objet & Période d'Effet</th>
                                    <th class="py-2.5 px-4">Pôle Référent</th>
                                    <th class="py-2.5 px-4 text-center">Statut Juridique</th>
                                    <th class="py-2.5 px-4 text-right">Document & Prestations</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                                    const enriched = store.getEnrichedConventions().filter(c => c.structure_id === s.id);
                                    const activeConvs = enriched.filter(c => c.statut_signature === 'VALIDE' || (c.isSignePresidente && c.isSigneAsso) || Boolean(c.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${c.id}`)));
                                    if (activeConvs.length === 0) {
                                        return `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Aucune convention activement signée (2/2) pour le moment. Dès signature réciproque, vos conventions apparaîtront ici.</td></tr>`;
                                    }
                                    return activeConvs.map(c => {
                                        const typeConf = c.typeInfo || typesMap.COM_OBJECTIFS || { shortLabel: c.normType, badgeClass: 'bg-emerald-100 text-emerald-800' };
                                        const isMb = (c.normType === 'CONV_MINIBUS') || (c.type_convention || '').toUpperCase().includes('MINIBUS');
                                        return `
                                            <tr class="border-b border-slate-100 hover:bg-emerald-50/30 transition">
                                                <td class="py-3.5 px-4 font-mono-code text-xs font-extrabold text-emerald-800">#${c.code_hex}</td>
                                                <td class="py-3.5 px-4 text-xs">
                                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${typeConf.badgeClass}">${typeConf.shortLabel}</span>
                                                </td>
                                                <td class="py-3.5 px-4 text-xs font-bold text-slate-900">
                                                    ${c.is_avenant ? `<strong>${c.objet_avenant || 'Avenant modificateur'}</strong> (Mère #${c.parentConvention?.code_hex || (c.code_hex.split('-AV')[0])})` : (c.intitule || typeConf.label || 'Convention CCMVR')}
                                                    <div class="text-[10px] text-slate-500 font-normal">Effet : du ${fin.formatDate(c.date_debut)} au ${fin.formatDate(c.date_fin)}</div>
                                                </td>
                                                <td class="py-3.5 px-4 text-xs text-slate-600">${c.pole?.libelle || 'CCMVR'}</td>
                                                <td class="py-3.5 px-4 text-center text-xs">
                                                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold">🟢 2/2 Validé & Exécutoire</span>
                                                </td>
                                                <td class="py-3.5 px-4 text-right">
                                                    <div class="inline-flex items-center gap-1.5 justify-end">
                                                        <button onclick="CCMVR.App.openConventionPreviewModal('${c.dossier_id || ''}', '${c.id}')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1">
                                                            <i data-lucide="file-check" class="w-3.5 h-3.5"></i> PDF Scellé
                                                        </button>
                                                        ${isMb ? `
                                                            <button onclick="CCMVR.App.switchTab('asso_minibus')" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-extrabold shadow-2xs flex items-center gap-1" title="Accéder au planning de réservation du minibus">
                                                                🚐 Réserver Minibus
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('');
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Sous-vue 2 : Demandes en Cours d'Instruction & Conventions en Attente -->
                <div class="card-minimal overflow-hidden">
                    <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold shadow-2xs">📝</span>
                            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-900">Demandes en Cours d'Instruction (${dossiers.length})</span>
                        </div>
                        <span class="text-[11px] text-slate-500">Suivi des étapes d'avis Pôle, Commission et Vote</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                    <th class="py-2.5 px-4">Réf.</th>
                                    <th class="py-2.5 px-4">Intitulé & Palier de Contrôle</th>
                                    <th class="py-2.5 px-4">Pôle</th>
                                    <th class="py-2.5 px-4 text-right">Montant Demandé</th>
                                    <th class="py-2.5 px-4 text-right">Montant Alloué</th>
                                    <th class="py-2.5 px-4 text-center">Statut Workflow</th>
                                    <th class="py-2.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml || `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-400">Aucune demande en cours d'instruction. Cliquez sur « + Déposer un nouveau dossier ».</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Sous-vue 3 : Conventions en Attente de Signature -->
                <div class="card-minimal overflow-hidden">
                    <div class="px-5 py-3.5 border-b border-slate-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-extrabold shadow-2xs">✍️</span>
                            <span class="text-xs font-extrabold uppercase tracking-wider text-amber-950">Conventions en Attente de Signature ou Transmission</span>
                        </div>
                        <span class="text-[11px] text-amber-800 font-semibold">Paraphes en attente (Association ou Présidente CCMVR)</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50/40">
                                    <th class="py-2.5 px-4">Code Acte</th>
                                    <th class="py-2.5 px-4">Type de Convention</th>
                                    <th class="py-2.5 px-4">Objet / Dispositif</th>
                                    <th class="py-2.5 px-4">Pôle Référent</th>
                                    <th class="py-2.5 px-4 text-center">État des Signatures</th>
                                    <th class="py-2.5 px-4 text-right">Action Requise</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                                    const enriched = store.getEnrichedConventions().filter(c => c.structure_id === s.id);
                                    const pendingConvs = enriched.filter(c => !(c.statut_signature === 'VALIDE' || (c.isSignePresidente && c.isSigneAsso) || Boolean(c.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${c.id}`))));
                                    if (pendingConvs.length === 0) {
                                        return `<tr><td colspan="6" class="py-6 text-center text-xs text-slate-400">Aucune convention en attente de signature. Toutes vos conventions sont signées ou en cours de préparation.</td></tr>`;
                                    }
                                    return pendingConvs.map(c => {
                                        const typeConf = c.typeInfo || typesMap.COM_OBJECTIFS || { shortLabel: c.normType, badgeClass: 'bg-amber-100 text-amber-800' };
                                        const isTransmis = Boolean(c.isTransmisAsso);
                                        const isSigneAsso = Boolean(c.isSigneAsso);
                                        return `
                                            <tr class="border-b border-slate-100 hover:bg-amber-50/20 transition">
                                                <td class="py-3 px-4 font-mono-code text-xs font-bold text-blue-700">#${c.code_hex}</td>
                                                <td class="py-3 px-4 text-xs">
                                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${typeConf.badgeClass}">${typeConf.shortLabel}</span>
                                                </td>
                                                <td class="py-3 px-4 text-xs font-semibold text-slate-900">
                                                    ${c.is_avenant ? `<strong>${c.objet_avenant || 'Avenant modificateur'}</strong> (Convention mère #${c.parentConvention?.code_hex || (c.code_hex.split('-AV')[0])})` : (c.intitule || typeConf.label || 'Convention CCMVR')}
                                                </td>
                                                <td class="py-3 px-4 text-xs text-slate-600">${c.pole?.libelle || 'Intercommunalité'}</td>
                                                <td class="py-3 px-4 text-center text-xs">
                                                    ${isSigneAsso
                                                        ? `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">✍️ 1/2 Signé Asso (Attente Présidente)</span>`
                                                        : !isTransmis
                                                            ? (c.visaCdgAvenantPending
                                                                ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">⏳ En attente Visa CdG (Avenant)</span>`
                                                                : `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">⏳ En cours d'instruction Pôle</span>`)
                                                            : c.visaCdgHorsCadrePending
                                                                ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">Attente Visa CdG (Hors Cadre)</span>`
                                                                : `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold">🔔 Prêt pour Signature</span>`}
                                                </td>
                                                <td class="py-3 px-4 text-right">
                                                    ${!isTransmis ? `
                                                        <span class="text-xs text-slate-400 italic">En attente de transmission</span>
                                                    ` : !isSigneAsso ? `
                                                        <button onclick="CCMVR.App.openConventionPreviewModal('${c.dossier_id || ''}', '${c.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-extrabold shadow-sm animate-pulse">
                                                            ✍️ ${c.is_avenant ? 'Signer l\'Avenant' : 'Signer la Convention'}
                                                        </button>
                                                    ` : `
                                                        <button onclick="CCMVR.App.openConventionPreviewModal('${c.dossier_id || ''}', '${c.id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold">
                                                            📄 ${c.is_avenant ? 'Consulter l\'Avenant' : 'Consulter la Convention'}
                                                        </button>
                                                    `}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('');
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    openCompleteIncompleteDossier(dossierId) {
        const store = window.CCMVR.Store;
        const d = store.getEnrichedDossiers().find(x => x.id === dossierId);
        if (!d) return;

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full mx-auto overflow-hidden animate-scale-in">
                <div class="p-5 border-b border-slate-200 bg-amber-50 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                            <i data-lucide="edit-3" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="font-extrabold text-slate-900 text-base">Compléter ma demande de subvention</h3>
                            <p class="text-xs text-slate-500">Dossier #${d.code_hex} — ${d.structure.nom_officiel || 'Association'}</p>
                        </div>
                    </div>
                    <button onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="p-6 space-y-4">
                    <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
                        <div class="font-bold text-amber-900 flex items-center gap-1.5">
                            <i data-lucide="alert-circle" class="w-4 h-4 text-amber-700"></i>
                            <span>Demande de régularisation & compléments :</span>
                        </div>
                        <p class="text-amber-800 leading-relaxed font-medium pl-5 whitespace-pre-wrap">${d.commentaire_association || 'Veuillez préciser vos éléments, ajuster votre demande ou transmettre des pièces complémentaires.'}</p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Intitulé du projet :</label>
                        <input type="text" id="complete-dossier-intitule" value="${d.intitule_projet || ''}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Montant demandé (€) :</label>
                        <input type="number" id="complete-dossier-montant" step="1" min="0" value="${d.montant_demande || 0}" class="w-full px-3 py-2 text-xs font-bold font-mono-code border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">📝 Motivation & Descriptif du projet (Fonctionnement / Projet / Locaux) :</label>
                        <textarea id="complete-dossier-description" rows="4" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none" placeholder="Précisez les motivations de votre demande (soutien au fonctionnement, achat de matériel, locaux, etc.)...">${d.description_projet || d.motivation_demande || ''}</textarea>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Vos explications et compléments détaillés : *</label>
                        <textarea id="complete-dossier-complements" rows="3" placeholder="Ex : Nous avons mis à jour le budget prévisionnel ci-joint, ajusté le montant de subvention demandé selon les consignes..." class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"></textarea>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Pièce justificative complémentaire (optionnel) :</label>
                        <input type="file" id="complete-dossier-file" accept=".pdf,.doc,.docx" class="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200">
                    </div>
                </div>

                <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition">
                        Annuler
                    </button>
                    <button type="button" onclick="CCMVR.App.submitIncompleteComplements('${d.id}')" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-extrabold transition shadow-sm flex items-center gap-1.5">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i> Transmettre les compléments
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    async submitIncompleteComplements(dossierId) {
        const store = window.CCMVR.Store;
        const d = store.state.dossiers_subventions.find(x => x.id === dossierId);
        if (!d) return;

        const intitule = document.getElementById('complete-dossier-intitule')?.value.trim() || d.intitule_projet;
        const montant = parseFloat(document.getElementById('complete-dossier-montant')?.value) || d.montant_demande;
        const description = document.getElementById('complete-dossier-description')?.value.trim() || d.description_projet || d.motivation_demande || '';
        const complements = document.getElementById('complete-dossier-complements')?.value.trim();
        const fileInput = document.getElementById('complete-dossier-file');

        if (!complements) {
            this.toast('Veuillez renseigner vos explications ou compléments.', 'warning');
            return;
        }

        const handleSave = async (fileDataUrl, fileName) => {
            let pieceInfo = fileName ? ` (Pièce jointe : ${fileName})` : '';

            const historyEntry = {
                date: new Date().toISOString(),
                acteur: store.currentUser?.nom || 'Association',
                role: 'association',
                etape: 'RETOUR_INCOMPLET_SOUMIS',
                montant: montant,
                commentaire: complements + pieceInfo
            };

            const notesMisesAJour = (d.notes_internes_pole ? d.notes_internes_pole + '\n\n' : '') +
                `[Compléments association le ${new Date().toLocaleDateString('fr-FR')}] : ${complements}${pieceInfo}`;

            const patch = {
                intitule_projet: intitule,
                montant_demande: montant,
                description_projet: description,
                motivation_demande: description,
                statut_workflow: 'RETOUR_INCOMPLET_SOUMIS',
                notes_internes_pole: notesMisesAJour,
                nouvelle_etape_historique: historyEntry
            };

            if (fileDataUrl) {
                patch.document_complementaire_url = fileDataUrl;
                patch.document_complementaire_nom = fileName;
            }

            try {
                await store.updateDossierInstruction(dossierId, patch);
                this.closeModal();
                this.renderMainView();
                this.toast('✓ Vos compléments ont été transmis au Pôle instructeur avec succès !', 'success');
            } catch (err) {
                this.toast('Erreur lors de la transmission : ' + err.message, 'error');
            }
        };

        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => handleSave(e.target.result, file.name);
            reader.readAsDataURL(file);
        } else {
            await handleSave(null, null);
        }
    },


    // ==========================================================================
    // VALIDATION VISUELLE TEMPS RÉEL (VERT CLAIR / JAUNE CLAIR / ROUGE CLAIR)
    // ==========================================================================

    applyFormVisualFeedback(container = null) {
        const root = container || document.getElementById('app-main');
        if (!root) return;

        // 1. Contrôles formulaires textuels, number, email, tel, selects et textareas
        const controls = root.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="radio"]):not([type="checkbox"]), select, textarea');

        // Identifiants des champs obligatoires (bloquants)
        const blockingIds = new Set([
            'asso-siret', 'asso-nom', 'asso-gov-type', 'asso-gov-membres', 'asso-gov-email', 
            'asso-gov-tel', 'asso-general-email', 'asso-rep-prenom', 'asso-rep-nom', 
            'asso-rep-fonction', 'dem-pole', 'dem-intitule', 'dem-montant', 
            'simp-total-charges', 'simp-recette-propres', 'simp-treso', 
            'dem-cer-signataire',
            'signup-siret', 'signup-nom', 'signup-adresse', 'signup-cp', 'signup-ville',
            'signup-rep-prenom', 'signup-rep-nom', 'signup-rep-fonction', 'signup-email', 'signup-password'
        ]);

        const currentNature = document.querySelector('input[name="dem-nature"]:checked')?.value || 'MONETAIRE';
        if (currentNature === 'NATURE') {
            blockingIds.delete('simp-total-charges');
            blockingIds.delete('simp-recette-propres');
            blockingIds.delete('simp-treso');
            blockingIds.delete('dem-montant');
        }

        controls.forEach(el => {
            if (el.closest('.no-feedback-style')) return;

            // Déterminer si le champ est bloquant (obligatoire) ou non
            const isBlocking = el.hasAttribute('required') || 
                               el.getAttribute('aria-required') === 'true' || 
                               blockingIds.has(el.id);

            const val = el.value ? el.value.trim() : '';
            let isFilled = false;

            if (el.tagName === 'SELECT') {
                isFilled = Boolean(val && val !== '' && val !== 'null' && !val.startsWith('--'));
            } else if (el.type === 'number') {
                const n = parseFloat(val);
                if (el.id === 'dem-montant' || el.id === 'simp-total-charges' || el.id === 'simp-recette-propres') {
                    isFilled = !isNaN(n) && n > 0;
                } else {
                    isFilled = !isNaN(n) && val !== '';
                }
            } else if (el.id === 'signup-password') {
                isFilled = val.length >= 6;
            } else {
                isFilled = val.length > 0;
            }

            // Réinitialiser les classes
            el.classList.remove('field-status-green', 'field-status-yellow', 'field-status-red');

            if (isFilled) {
                // VERT CLAIR : Bien renseigné
                el.classList.add('field-status-green');
            } else if (isBlocking) {
                // ROUGE CLAIR : Non renseigné et bloquant (obligatoire)
                el.classList.add('field-status-red');
            } else {
                // JAUNE CLAIR : Non renseigné mais pas bloquant (facultatif)
                el.classList.add('field-status-yellow');
            }

            this.updateFieldLabelBadge(el, isFilled, isBlocking);
        });

        // 2. Gestion du groupe radio dem-nature
        const natureRadios = root.querySelectorAll('input[type="radio"][name="dem-nature"]');
        if (natureRadios.length > 0) {
            const hasChecked = Array.from(natureRadios).some(r => r.checked);
            natureRadios.forEach(r => {
                const card = r.closest('label');
                if (card) {
                    card.classList.remove('card-status-green', 'card-status-red', 'card-status-yellow');
                    if (r.checked) {
                        card.classList.add('card-status-green');
                    } else if (!hasChecked) {
                        card.classList.add('card-status-red');
                    }
                }
            });

            const natureHeader = root.querySelector('#dem-nature-header');
            if (natureHeader) {
                const old = natureHeader.querySelector('.field-feedback-badge');
                if (old) old.remove();
                if (hasChecked) {
                    natureHeader.insertAdjacentHTML('beforeend', '<span class="field-feedback-badge text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded ml-1.5 inline-flex items-center gap-0.5">✓ Renseigné</span>');
                } else {
                    natureHeader.insertAdjacentHTML('beforeend', '<span class="field-feedback-badge text-[9px] font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded ml-1.5 inline-flex items-center gap-0.5 animate-pulse">🔴 Requis</span>');
                }
            }
        }

        // 3. Gestion des Checkboxes obligatoires du CER (dem-cer-check, dem-engagement-check)
        ['dem-cer-check', 'dem-engagement-check'].forEach(id => {
            const cb = document.getElementById(id);
            if (cb) {
                const card = cb.closest('label');
                if (card) {
                    card.classList.remove('card-status-green', 'card-status-red');
                    if (cb.checked) {
                        card.classList.add('card-status-green');
                    } else {
                        card.classList.add('card-status-red');
                    }
                }
            }
        });
    },

    updateFieldLabelBadge(el, isFilled, isBlocking) {
        const formGroup = el.closest('div');
        if (!formGroup) return;
        let label = formGroup.querySelector('label');
        if (!label && formGroup.parentElement) {
            label = formGroup.parentElement.querySelector('label');
        }
        if (!label) return;

        const old = label.querySelector('.field-feedback-badge');
        if (old) old.remove();

        let badgeHtml = '';
        if (isFilled) {
            badgeHtml = '<span class="field-feedback-badge text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded ml-1.5 inline-flex items-center gap-0.5" title="Bien renseigné">✓ Renseigné</span>';
        } else if (isBlocking) {
            badgeHtml = '<span class="field-feedback-badge text-[9px] font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded ml-1.5 inline-flex items-center gap-0.5 animate-pulse" title="Ce champ est obligatoire pour valider la démarche">🔴 Requis</span>';
        } else {
            badgeHtml = '<span class="field-feedback-badge text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded ml-1.5 inline-flex items-center gap-0.5" title="Ce champ est facultatif (non bloquant)">🟡 Facultatif</span>';
        }

        label.insertAdjacentHTML('beforeend', badgeHtml);
    },

    // ==========================================================================
    // MODALES D'AUDIT 360° ET D'ÉDITION DE CONVENTIONS / ATTESTATIONS (WORD & PDF)
    // ==========================================================================


    selectBudgetType(type) {
        const radio = document.querySelector(`input[name="dem-budget-choice"][value="${type}"]`);
        if (radio) radio.checked = true;

        const cardGlobal = document.getElementById('card-choice-global');
        const cardSpecific = document.getElementById('card-choice-specific');
        const boxChoice = document.getElementById('box-budget-type-choice');
        const badgeStatus = document.getElementById('badge-choice-status');
        const lblCharges = document.getElementById('lbl-action-charges');

        if (boxChoice) {
            boxChoice.classList.remove('border-rose-300', 'bg-rose-50/60');
            boxChoice.classList.add('border-emerald-300', 'bg-emerald-50/20');
        }
        if (badgeStatus) {
            badgeStatus.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300';
            badgeStatus.textContent = '✓ Choix validé';
        }

        if (type === 'GLOBAL') {
            if (cardGlobal) cardGlobal.className = 'cursor-pointer p-4 rounded-xl border-2 border-blue-600 bg-blue-50/60 ring-2 ring-blue-500 shadow-sm transition flex flex-col justify-between space-y-2';
            if (cardSpecific) cardSpecific.className = 'cursor-pointer p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition flex flex-col justify-between space-y-2 opacity-70';
            if (lblCharges) lblCharges.textContent = "Charges directes de fonctionnement global de l'association (€) *";
        } else {
            if (cardSpecific) cardSpecific.className = 'cursor-pointer p-4 rounded-xl border-2 border-blue-600 bg-blue-50/60 ring-2 ring-blue-500 shadow-sm transition flex flex-col justify-between space-y-2';
            if (cardGlobal) cardGlobal.className = 'cursor-pointer p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition flex flex-col justify-between space-y-2 opacity-70';
            if (lblCharges) lblCharges.textContent = "Charges prévisionnelles affectées à cette action / ce projet (€) *";
        }

        this.recalcLiveFormRatios();
        this.applyFormVisualFeedback();
    },

    handleSaveDraftDemande() {
        this.handleSubmitGrantApplication(null, true);
    },

    resumeDraftDemande(dossierId) {
        const store = window.CCMVR.Store;
        const d = store.state.dossiers_subventions.find(x => x.id === dossierId);
        if (!d) return;

        this.currentDraftDossierId = dossierId;
        this.switchTab('asso_demande');

        setTimeout(() => {
            if (d.nature_demande) {
                this.selectNatureDemande(d.nature_demande);
            }
            if (d.pole_id) {
                const poleSelect = document.getElementById('dem-pole');
                if (poleSelect) {
                    poleSelect.value = d.pole_id;
                    this.onPoleSelectionChange();
                }
            }
            if (d.categorie_id) {
                const catSelect = document.getElementById('dem-categorie');
                if (catSelect) {
                    catSelect.value = d.categorie_id;
                    this.onCategorySelectionChange();
                }
            }
            if (d.valeurs && Array.isArray(d.valeurs)) {
                d.valeurs.forEach(v => {
                    const inputEl = document.getElementById(`crit-${v.critere_code || v.critere_id}`);
                    if (inputEl) {
                        if (inputEl.type === 'checkbox') inputEl.checked = Boolean(v.valeur_booleenne);
                        else inputEl.value = v.valeur_numerique ?? v.valeur_texte ?? '';
                    }
                });
            }
            if (d.intitule_projet) {
                const intituleEl = document.getElementById('dem-intitule');
                if (intituleEl) intituleEl.value = d.intitule_projet;
            }
            if (d.montant_demande !== undefined) {
                const montantEl = document.getElementById('dem-montant');
                if (montantEl) montantEl.value = d.montant_demande;
                this.onDemandeMontantChange();
            }
            if (d.description_projet || d.motivation_demande) {
                const motEl = document.getElementById('dem-motivation');
                if (motEl) motEl.value = d.description_projet || d.motivation_demande;
            }
            const b = d.budget || {};
            if (b.budget_type_choice) {
                this.selectBudgetType(b.budget_type_choice);
            }
            if (b.total_charges || b.action_charges_specifiques) {
                const tc = document.getElementById('simp-total-charges');
                if (tc) tc.value = b.total_charges || b.action_charges_specifiques;
            }
            if (b.action_charges_specifiques) {
                const ac = document.getElementById('simp-action-charges');
                if (ac) ac.value = b.action_charges_specifiques;
            }
            if (b.charges_structure_generales) {
                const sc = document.getElementById('simp-structure-charges');
                if (sc) sc.value = b.charges_structure_generales;
            }
            if (b.subventions_autres) {
                const as = document.getElementById('simp-recette-autres-subv');
                if (as) as.value = b.subventions_autres;
            }
            if (b.cotisations || b.recettes_activites) {
                const rp = document.getElementById('simp-recette-propres');
                if (rp) rp.value = b.cotisations || b.recettes_activites;
            }
            if (b.apport_fonds_propres) {
                const af = document.getElementById('simp-recette-autofin');
                if (af) af.value = b.apport_fonds_propres;
            }
            if (b.tresorerie_banque || b.tresorerie_active) {
                const tr = document.getElementById('simp-treso');
                if (tr) tr.value = b.tresorerie_banque || b.tresorerie_active;
            }
            if (b.fonds_propres_reserves || b.reserves_associatives) {
                const res = document.getElementById('simp-reserves');
                if (res) res.value = b.fonds_propres_reserves || b.reserves_associatives;
            }
            // Restauration du budget analytique (>= 23 000 €)
            if (b.achats_charges_externes) {
                const el = document.getElementById('bud-achats');
                if (el) el.value = b.achats_charges_externes;
            }
            if (b.charges_personnel) {
                const el = document.getElementById('bud-personnel');
                if (el) el.value = b.charges_personnel;
            }
            if (b.subventions_publiques_total) {
                const el = document.getElementById('bud-subv-publiques');
                if (el) el.value = b.subventions_publiques_total;
            }
            if (b.cotisations) {
                const el = document.getElementById('bud-cotisations');
                if (el) el.value = b.cotisations;
            }
            if (b.tresorerie_banque) {
                const el = document.getElementById('bud-treso');
                if (el) el.value = b.tresorerie_banque;
            }
            if (b.fonds_propres_reserves) {
                const el = document.getElementById('bud-fonds-propres');
                if (el) el.value = b.fonds_propres_reserves;
            }
            if (b.actif_circulant) {
                const el = document.getElementById('bud-actif-circulant');
                if (el) el.value = b.actif_circulant;
            }
            if (b.dettes_court_terme) {
                const el = document.getElementById('bud-dettes');
                if (el) el.value = b.dettes_court_terme;
            }
            this.recalcLiveFormRatios();
            this.toast(`Brouillon #${d.code_hex || ''} chargé. Vous pouvez poursuivre et finaliser votre demande.`, 'info');
        }, 50);
    },

    async deleteDraftDemande(dossierId) {
        if (!confirm('Voulez-vous vraiment supprimer ce brouillon de demande ? Cette action est irréversible.')) return;
        try {
            await window.CCMVR.Store.deleteDossierAndRelatedData(dossierId);
            this.toast('Brouillon supprimé avec succès.', 'success');
            this.renderMainView();
        } catch (err) {
            this.toast('Erreur lors de la suppression : ' + err.message, 'error');
        }
    },

    openAddSignataireModal(structureId) {
        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden my-8 animate-scale-in';
        content.innerHTML = `
            <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
                        <i data-lucide="user-check" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">Ajouter un signataire habilité</h3>
                        <p class="text-[11px] text-blue-200">Mandataire pour conventions et CER</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <form onsubmit="CCMVR.App.handleSaveSignataire(event, '${structureId}')" class="p-6 space-y-4 text-xs">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Prénom *</label>
                    <input type="text" id="add-sig-prenom" required placeholder="Ex : Marie" class="input-clean font-semibold"/>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Nom *</label>
                    <input type="text" id="add-sig-nom" required placeholder="Ex : DUPONT" class="input-clean font-semibold uppercase"/>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Qualité / Fonction statutaire *</label>
                    <select id="add-sig-fonction" class="input-clean font-semibold">
                        <option value="Président(e)">Président(e)</option>
                        <option value="Vice-Président(e)">Vice-Président(e)</option>
                        <option value="Trésorier(ère)">Trésorier(ère)</option>
                        <option value="Trésorier(ère) adjoint(e)">Trésorier(ère) adjoint(e)</option>
                        <option value="Secrétaire général(e)">Secrétaire général(e)</option>
                        <option value="Directeur(trice) général(e)">Directeur(trice) général(e)</option>
                        <option value="Mandataire dûment habilité(e)">Mandataire dûment habilité(e)</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">E-mail direct (notification SES)</label>
                    <input type="email" id="add-sig-email" placeholder="signataire@association.fr" class="input-clean"/>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">Téléphone portable</label>
                    <input type="tel" id="add-sig-tel" placeholder="06 12 34 56 78" class="input-clean font-mono-code"/>
                </div>

                <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition">
                        Annuler
                    </button>
                    <button type="submit" class="px-5 py-2 btn-accent font-bold rounded-xl shadow-md">
                        Enregistrer le signataire
                    </button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    handleSaveSignataire(e, structureId) {
        e.preventDefault();
        const prenom = document.getElementById('add-sig-prenom')?.value?.trim();
        const nom = document.getElementById('add-sig-nom')?.value?.trim();
        const fonction = document.getElementById('add-sig-fonction')?.value || 'Mandataire habilité(e)';
        const email = document.getElementById('add-sig-email')?.value?.trim() || '';
        const tel = document.getElementById('add-sig-tel')?.value?.trim() || '';

        if (!prenom || !nom) return;

        const store = window.CCMVR.Store;
        const list = store.getSignatairesHabilites(structureId);
        list.push({
            id: 'sig-' + Date.now(),
            prenom,
            nom,
            fonction,
            email,
            telephone: tel,
            est_defaut: false
        });
        store.saveSignatairesHabilites(structureId, list);
        this.closeModal();
        this.renderMainView();
        this.toast(`Signataire ${prenom} ${nom} enregistré !`, 'success');
    },

    deleteSignataire(structureId, sigId) {
        if (!confirm('Voulez-vous retirer cette personne de la liste des signataires habilités ?')) return;
        const store = window.CCMVR.Store;
        let list = store.getSignatairesHabilites(structureId);
        list = list.filter(x => x.id !== sigId);
        if (list.length > 0 && !list.some(x => x.est_defaut)) {
            list[0].est_defaut = true;
        }
        store.saveSignatairesHabilites(structureId, list);
        this.renderMainView();
        this.toast('Signataire retiré.', 'info');
    },

    setDefaultSignataire(structureId, sigId) {
        const store = window.CCMVR.Store;
        const list = store.getSignatairesHabilites(structureId);
        list.forEach(x => { x.est_defaut = (x.id === sigId); });
        store.saveSignatairesHabilites(structureId, list);
        this.renderMainView();
        this.toast('Signataire principal par défaut mis à jour !', 'success');
    },
};

// Export ES6 si utilisé via bundler/modules natifs
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CCMVR.Modules.Asso;
}
