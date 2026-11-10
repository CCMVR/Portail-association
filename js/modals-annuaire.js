// ==============================================================================
// MODULE CCMVR: MODALES ANNUAIRE, API ENTREPRISE, VISIONNEUSE PDF & RECTIFICATION CDG
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.Modules.ModalsAnnuaire = {

    openDocumentPreviewModal(doc) {
        if (!doc) return;
        if (typeof doc === 'string') {
            try { doc = JSON.parse(decodeURIComponent(doc)); } catch (_) { doc = { url: doc, title: 'Document officiel' }; }
        }
        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        const esc = window.CCMVR?.escapeHtml || ((v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
        const isReadOnly = Boolean(doc.readOnly);
        const isEphemeral = Boolean(doc.ephemeral || isReadOnly);

        const title = doc.title || doc.nom || doc.libelle || 'Document officiel';
        const url = doc.url || '';
        const date = doc.date || doc.date_depot || doc.annee || doc.annee_validite || 'Enregistré';
        const type = doc.type || doc.code || 'DOC';
        const source = doc.source || 'Flux API Entreprise v4 (Gouv.fr)';
        const store = window.CCMVR.Store;
        const structKey = doc.structKey || store?.currentUser?.structure_id || store?.activeStructureId || 'default';
        const s = doc.structure
            || (store?.state?.structures || []).find(x => x.id === structKey || x.siret === structKey || x.id === store?.activeStructureId)
            || (isEphemeral ? {} : (store?.state?.structures?.[0] || {}));
        const siren = (s.siren || (s.siret || '').replace(/\s+/g, '').slice(0, 9)) || (isEphemeral ? '' : '382774214');
        const docId = doc.docId || doc.id || window.CCMVR.FinanceEngine?.detectDocIdFromTitle(title) || 'STATUTS';
        const extMatch = String(title).toLowerCase().match(/\.([a-z0-9]{2,5})$/);
        const fileExtLabel = extMatch ? extMatch[1].toUpperCase().slice(0, 4) : 'PDF';
        const isOfficeDoc = /^(DOC|DOCX|XLS|XLSX|PPT|PPTX|ODT|ODS|ODP)$/.test(fileExtLabel);

        const isProxyUrl = typeof url === 'string' && url.includes('entreprise.api.gouv.fr/proxy/files');
        const fileUuid = isProxyUrl ? url.split('/').pop().split('?')[0] : (doc.uuid || doc.file_uuid || '');

        const safeDocJson = encodeURIComponent(JSON.stringify({ ...doc, title, url, date, type, source, docId, structKey, structure: s, file_uuid: fileUuid })).replace(/'/g, '%27');

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden my-4';

        content.innerHTML = `
            <div class="flex flex-col h-[85vh] max-h-[850px]">
                <!-- En-tête de la visionneuse PDF -->
                <div class="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="w-9 h-9 rounded-xl shrink-0 ${isOfficeDoc ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'} flex items-center justify-center font-black text-[11px] border">
                            ${esc(fileExtLabel)}
                        </span>
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 class="text-sm font-extrabold text-white truncate max-w-md">${esc(title)}</h2>
                                <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold uppercase">${esc(type)}</span>
                                <span id="doc-preview-status-badge" class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold">Vérification du document...</span>
                            </div>
                            <p class="text-[11px] text-slate-300 mt-0.5">Source : <strong>${esc(source)}</strong> • Dépôt officiel : ${esc(date)}</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        ${siren ? `
                            <a href="https://annuaire-entreprises.data.gouv.fr/documents/${encodeURIComponent(siren)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition" title="Consulter la fiche officielle sur Annuaire des Entreprises (Gouv.fr)">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Annuaire Entreprises ↗
                            </a>
                        ` : ''}
                        <button type="button" id="doc-preview-header-dl-btn" onclick="CCMVR.App.downloadDocumentOrAttestation(decodeURIComponent('${safeDocJson}'))" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm" title="Télécharger le fichier officiel">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Télécharger
                        </button>
                        ${isReadOnly ? '' : `
                            <label class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer" title="Remplacer par un nouveau fichier PDF">
                                <i data-lucide="upload" class="w-3.5 h-3.5"></i> Téléverser un PDF
                                <input type="file" accept="application/pdf" class="hidden" onchange="CCMVR.App.handleModalDocUpload(this, decodeURIComponent('${safeDocJson}'))"/>
                            </label>
                        `}
                        <button type="button" onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-white rounded-lg transition ml-2">✕</button>
                    </div>
                </div>

                <!-- Corps de la visionneuse -->
                <div id="doc-preview-modal-body" class="flex-1 min-h-0 bg-slate-100 p-3 sm:p-4 overflow-y-auto flex flex-col relative">
                    <div class="w-full h-full rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <div>
                            <h3 class="text-sm font-extrabold text-slate-900">Chargement sécurisé du document officiel...</h3>
                            <p class="text-xs text-slate-500 mt-1">Interrogation des serveurs de la Préfecture (DJEPVA / DINUM / Passerelle CCMVR)</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();

        // Chargement asynchrone du vrai document
        setTimeout(async () => {
            const bodyEl = document.getElementById('doc-preview-modal-body');
            if (!bodyEl) return;

            try {
                const res = await window.CCMVR.FinanceEngine.fetchDocumentBlob({
                    ...doc,
                    title,
                    url,
                    docId,
                    structKey,
                    structure: s,
                    file_uuid: fileUuid
                });

                if (res && res.success && res.blob) {
                    const statusBadge = document.getElementById('doc-preview-status-badge');
                    if (statusBadge) {
                        statusBadge.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold';
                        statusBadge.textContent = 'Document Officiel Récupéré';
                    }
                    const blobUrl = res.url || URL.createObjectURL(res.blob);
                    const dlFilename = res.filename || title.replace(/\s+/g, '_');

                    if (res.isImage) {
                        bodyEl.innerHTML = `
                            <div class="w-full h-full rounded-xl overflow-auto bg-slate-900 border border-slate-300 p-4 flex items-center justify-center">
                                <img src="${blobUrl}" alt="${esc(title)}" class="max-h-full max-w-full object-contain rounded shadow-lg" />
                            </div>
                        `;
                    } else if (res.isPdf === false) {
                        bodyEl.innerHTML = `
                            <div class="w-full h-full rounded-xl bg-white border border-blue-200 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                                <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black text-lg">
                                    ${esc(fileExtLabel)}
                                </div>
                                <div class="max-w-lg space-y-1.5">
                                    <h3 class="text-base font-black text-slate-900">Document bureautique récupéré et prêt au téléchargement</h3>
                                    <p class="text-xs text-slate-600 leading-relaxed">
                                        La pièce <strong>${esc(dlFilename)}</strong> est au format <strong>.${esc(fileExtLabel.toLowerCase())}</strong> (${Math.max(1, Math.round((res.size || 0) / 1024))} Ko). Les navigateurs ne peuvent pas l'afficher directement en PDF intégré, mais vous pouvez l'enregistrer immédiatement.
                                    </p>
                                </div>
                                <button type="button" id="doc-office-direct-dl-btn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-md transition cursor-pointer">
                                    <i data-lucide="download" class="w-4 h-4"></i> Télécharger « ${esc(dlFilename)} »
                                </button>
                            </div>
                        `;
                        const officeBtn = document.getElementById('doc-office-direct-dl-btn');
                        if (officeBtn) {
                            officeBtn.onclick = () => {
                                const a = document.createElement('a');
                                a.href = blobUrl;
                                a.download = dlFilename;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            };
                        }
                    } else {
                        bodyEl.innerHTML = `
                            <div class="w-full h-full rounded-xl overflow-hidden bg-slate-900 border border-slate-300 relative shadow-inner flex flex-col">
                                <iframe src="${blobUrl}#toolbar=1&navpanes=1" class="w-full flex-1 border-0" title="${esc(title)}"></iframe>
                            </div>
                        `;
                    }

                    // Met à jour le bouton de téléchargement pour télécharger directement ce blob
                    const dlBtn = document.getElementById('doc-preview-header-dl-btn');
                    if (dlBtn) {
                        dlBtn.onclick = () => {
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = dlFilename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        };
                    }
                } else {
                    const isInseeLink = res?.error === 'INSEE_DIRECT_LINK' && res?.directExternalUrl;
                    const statusBadge = document.getElementById('doc-preview-status-badge');
                    if (statusBadge) {
                        statusBadge.className = isInseeLink
                            ? 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold'
                            : 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-bold';
                        statusBadge.textContent = isInseeLink ? 'Ouverture directe INSEE requise' : '⚠️ Document non accessible';
                    }
                    const dlBtn = document.getElementById('doc-preview-header-dl-btn');
                    if (dlBtn) {
                        if (isInseeLink) {
                            dlBtn.onclick = () => window.open(res.directExternalUrl, '_blank', 'noopener,noreferrer');
                        } else {
                            dlBtn.classList.add('opacity-40', 'cursor-not-allowed');
                            dlBtn.onclick = () => {
                                window.CCMVR.App.toast(res?.message || "Téléchargement impossible : l'API de l'État n'a pas retourné le fichier original.", 'error');
                            };
                        }
                    }

                    const meta = res?.docMetadata || {
                        structure_nom: s.nom_officiel || s.nom || 'Association',
                        siren: siren,
                        siret: s.siret || (siren ? siren + '00018' : ''),
                        rna: s.rna || '',
                        code: docId,
                        date_depot: date,
                        annee: date,
                        file_uuid: fileUuid
                    };

                    bodyEl.innerHTML = `
                        <div class="w-full h-full rounded-xl bg-white border ${isInseeLink ? 'border-blue-200' : 'border-rose-200'} p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-inner">
                            <div class="space-y-6">
                                <!-- En-tête statut -->
                                <div class="p-5 rounded-2xl ${isInseeLink ? 'bg-blue-50 border-blue-200' : 'bg-rose-50 border-rose-200'} border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div class="flex items-center gap-3.5">
                                        <div class="w-12 h-12 rounded-2xl ${isInseeLink ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-rose-100 text-rose-700 border-rose-300'} border flex items-center justify-center shrink-0">
                                            <i data-lucide="${isInseeLink ? 'external-link' : 'alert-octagon'}" class="w-7 h-7"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-base font-black ${isInseeLink ? 'text-blue-950' : 'text-rose-950'}">
                                                ${isInseeLink ? "Avis de Situation Sirene INSEE disponible en ouverture directe" : "Document non disponible via l'API de l'État"}
                                            </h3>
                                            <p class="text-xs ${isInseeLink ? 'text-blue-800' : 'text-rose-800'} mt-0.5">
                                                ${esc(res?.message || "Le serveur national n'a pas délivré le fichier original de cette pièce. Aucun document fictif n'est substitué.")}
                                            </p>
                                        </div>
                                    </div>
                                    <span class="px-3 py-1 rounded-full text-xs font-black ${isInseeLink ? 'bg-blue-200/80 text-blue-900 border-blue-300' : 'bg-rose-200/80 text-rose-900 border-rose-300'} border inline-flex items-center gap-1.5 shrink-0">
                                        <span class="w-2 h-2 rounded-full ${isInseeLink ? 'bg-blue-600' : 'bg-rose-600'}"></span>
                                        ${isInseeLink ? 'Lien officiel INSEE' : 'Fichier non transmis'}
                                    </span>
                                </div>

                                <!-- Fiche d'identification légale et traçabilité -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                                        <div class="font-extrabold uppercase text-[10px] tracking-wider text-slate-700">1. Identification de l'Association</div>
                                        <div class="flex justify-between py-1 border-b border-slate-200/60 gap-2"><span class="text-slate-500">Association :</span><strong class="text-slate-900 font-bold text-right">${esc(meta.structure_nom)}</strong></div>
                                        <div class="flex justify-between py-1 border-b border-slate-200/60 gap-2"><span class="text-slate-500">N° SIREN / SIRET :</span><strong class="text-slate-900 font-mono-code">${esc(meta.siren || '—')} / ${esc(meta.siret || '—')}</strong></div>
                                        <div class="flex justify-between py-1 gap-2"><span class="text-slate-500">N° d'enregistrement RNA :</span><strong class="text-indigo-900 font-mono-code font-bold">${esc(meta.rna || 'Non renseigné')}</strong></div>
                                    </div>

                                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                                        <div class="font-extrabold uppercase text-[10px] tracking-wider text-slate-700">2. Enregistrement Déclaré au Greffe</div>
                                        <div class="flex justify-between py-1 border-b border-slate-200/60 gap-2"><span class="text-slate-500">Intitulé de la pièce :</span><strong class="text-slate-900 font-bold text-right">${esc(title)}</strong></div>
                                        <div class="flex justify-between py-1 border-b border-slate-200/60 gap-2"><span class="text-slate-500">Date de dépôt déclarée :</span><strong class="text-slate-900 font-bold">${esc(meta.date_depot)}</strong></div>
                                        <div class="flex justify-between py-1 gap-2"><span class="text-slate-500">Identifiant technique :</span><span class="text-slate-600 font-mono-code text-[11px] truncate max-w-[180px]" title="${esc(meta.file_uuid)}">${esc(meta.file_uuid || 'Non transmis')}</span></div>
                                    </div>
                                </div>

                                <!-- Notice explicative transparente -->
                                <div class="p-4 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-700 space-y-2">
                                    <div class="font-bold flex items-center gap-2 text-slate-900">
                                        <i data-lucide="info" class="w-4 h-4 text-slate-600"></i>
                                        <span>Explication technique :</span>
                                    </div>
                                    <p class="leading-relaxed">
                                        ${isInseeLink
                                            ? "Le serveur officiel de l'INSEE interdit l'intégration en iframe/CORS dans un portail tiers, mais permet l'ouverture et le téléchargement direct du PDF officiel dans un nouvel onglet."
                                            : "L'API Entreprise (DINUM) signale l'existence de ce document, mais le fichier binaire n'a pas pu être récupéré à cet instant (lien temporaire expiré, document papier non numérisé ou indisponibilité DINUM). Aucun document factice n'est substitué."}
                                    </p>
                                </div>
                            </div>

                            <!-- Actions alternatives -->
                            <div class="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                <span class="text-xs text-slate-500">Actions disponibles :</span>
                                <div class="flex flex-wrap items-center gap-2.5">
                                    ${isInseeLink ? `
                                        <a href="${esc(res.directExternalUrl)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-sm transition">
                                            <i data-lucide="file-text" class="w-4 h-4"></i> Ouvrir l'Avis Sirene INSEE (PDF) ↗
                                        </a>
                                    ` : ''}
                                    ${meta.siren ? `
                                        <a href="https://annuaire-entreprises.data.gouv.fr/documents/${encodeURIComponent(meta.siren)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shadow-sm transition">
                                            <i data-lucide="external-link" class="w-4 h-4"></i> Consulter sur Annuaire Entreprises (Gouv.fr) ↗
                                        </a>
                                    ` : ''}
                                    ${isReadOnly ? '' : `
                                        <label class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                                            <i data-lucide="upload" class="w-4 h-4"></i> Téléverser le vrai PDF original
                                            <input type="file" accept="application/pdf" class="hidden" onchange="CCMVR.App.handleModalDocUpload(this, decodeURIComponent('${safeDocJson}'))"/>
                                        </label>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                }
            } catch (err) {
                console.error('Erreur chargement PDF:', err);
            }
            if (window.lucide) window.lucide.createIcons();
        }, 30);
    },

    printDocumentAttestation(doc) {
        if (!doc) return;
        if (typeof doc === 'string') {
            try { doc = JSON.parse(doc); } catch (_) { doc = { title: doc }; }
        }
        const title = doc.title || doc.nom || 'Document Administratif Officiel';
        const date = doc.date || doc.date_depot || 'Date non précisée';
        const type = doc.type || 'Pièce officielle';
        const source = doc.source || 'Ministère de l\'Intérieur / DJEPVA (API Entreprise v4)';
        const uuid = (doc.url && doc.url.includes('proxy/files')) ? doc.url.split('/').pop() : ('CERT-CCMVR-' + Date.now().toString(16).toUpperCase());
        const nowStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #0f172a; max-width: 800px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px;">
                    <div>
                        <div style="font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #1e3a8a; text-transform: uppercase;">RÉPUBLIQUE FRANÇAISE</div>
                        <div style="font-size: 12px; font-weight: 700; color: #475569; margin-top: 3px;">COMMUNAUTÉ DE COMMUNES MARCHES DU VELAY ROCHEBARON</div>
                        <div style="font-size: 10px; color: #64748b;">SIRET : 20007342700011 • Département de la Haute-Loire (43)</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 4px; font-size: 11px; font-weight: 800;">
                            ✓ CERTIFIÉ CONFORME
                        </span>
                        <div style="font-size: 9px; color: #64748b; font-family: monospace; margin-top: 4px;">Réf : ${uuid.slice(0, 16)}</div>
                    </div>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                    <div style="font-size: 11px; font-weight: 800; color: #2563eb; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">Plateforme Intercommunale des Subventions & Conventions</div>
                    <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase;">ATTESTATION OFFICIELLE DE DÉPÔT ADMINISTRATIF</h1>
                    <div style="font-size: 12px; font-weight: 600; color: #047857; margin-top: 6px;">Application du principe légal « Dites-le-nous une fois » (Art. L. 114-8 du CRPA)</div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Intitulé du document :</td>
                            <td style="padding: 6px 0; font-weight: 800; color: #0f172a;">${title}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Nature / Typologie :</td>
                            <td style="padding: 6px 0; font-weight: 700; color: #1e3a8a;">${type}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Source certifiée d'État :</td>
                            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${source}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date d'enregistrement officiel :</td>
                            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Identifiant technique DINUM :</td>
                            <td style="padding: 6px 0; font-family: monospace; font-size: 11px; color: #334155;">${uuid}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Horodatage de certification CCMVR :</td>
                            <td style="padding: 6px 0; font-weight: 600; color: #047857;">${nowStr}</td>
                        </tr>
                    </table>
                </div>

                <div style="font-size: 11px; color: #334155; line-height: 1.6; margin-bottom: 25px; padding: 12px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                    <strong>Dispense légale de production physique :</strong><br/>
                    En application des articles L. 114-8 et L. 114-9 du Code des relations entre le public et l'administration (CRPA), les usagers ne sont plus tenus de fournir les pièces justificatives que l'administration peut obtenir directement auprès d'autres autorités publiques. 
                    La présente pièce a été régulièrement transmise et certifiée conforme par l'interconnexion sécurisée API Entreprise mise en œuvre par la Communauté de Communes Marches du Velay Rochebaron.
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b;">
                    <div>
                        Certificat d'intégrité généré automatiquement par le Système d'Information CCMVR.<br/>
                        Document faisant foi pour toute instruction de subvention publique ou conventionnement.
                    </div>
                    <div style="text-align: right; font-weight: bold; color: #0f172a;">
                        Pour la Communauté de Communes<br/>
                        Le Service Contrôle de Gestion
                    </div>
                </div>
            </div>
        `;
        window.CCMVR.DocGenerator.printOfficialDocument(html, `Attestation_CCMVR_${title.replace(/[^a-zA-Z0-9]/g, '_')}`);
    },

    async downloadDocumentOrAttestation(doc) {
        if (!doc) return;
        if (typeof doc === 'string') {
            try { doc = JSON.parse(decodeURIComponent(doc)); } catch (_) { doc = { url: doc, title: 'Document' }; }
        }
        const esc = window.CCMVR?.escapeHtml || ((v) => String(v ?? ''));
        const isEphemeral = Boolean(doc.ephemeral || doc.readOnly);
        const title = doc.title || doc.nom || doc.libelle || 'Document_Officiel';
        const store = window.CCMVR.Store;
        const structKey = doc.structKey || store?.currentUser?.structure_id || store?.activeStructureId || 'default';
        const s = doc.structure
            || (store?.state?.structures || []).find(x => x.id === structKey || x.siret === structKey || x.id === store?.activeStructureId)
            || (isEphemeral ? {} : (store?.state?.structures?.[0] || {}));
        const docId = doc.docId || doc.id || window.CCMVR.FinanceEngine?.detectDocIdFromTitle(title) || 'STATUTS';

        try {
            this.toast('📥 Récupération sécurisée du document officiel...', 'info');
            const res = await window.CCMVR.FinanceEngine.fetchDocumentBlob({
                ...doc,
                title,
                docId,
                structKey,
                structure: s
            });
            if (res && res.success && res.blob) {
                const blobUrl = res.url || URL.createObjectURL(res.blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = res.filename || `${title.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                this.toast(`✓ Téléchargement du fichier « ${esc(a.download)} » terminé !`, 'success');
                return;
            }
            if (res && res.error === 'INSEE_DIRECT_LINK' && res.directExternalUrl) {
                window.open(res.directExternalUrl, '_blank', 'noopener,noreferrer');
                return;
            }
        } catch (err) {
            console.warn('Erreur téléchargement direct du document:', err);
        }

        this.toast("❌ Impossible de télécharger : l'API de l'État n'a pas retourné le fichier original pour ce document.", 'error');
        this.openDocumentPreviewModal({ ...doc, title, docId, structKey, structure: s });
    },

    handleModalDocUpload(inputEl, doc) {
        const file = inputEl.files && inputEl.files[0];
        if (!file) return;
        if (typeof doc === 'string') {
            try { doc = JSON.parse(doc); } catch (_) { doc = {}; }
        }
        const structKey = doc.structKey || window.CCMVR.Store.currentUser?.structure_id || 'default';
        const docId = doc.docId || doc.id || 'STATUTS';
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
            } catch (_) {}

            this.toast(`✓ Copie locale "${file.name}" chargée avec succès !`, 'success');
            // Réouverture immédiate de la modale avec le fichier chargé
            this.openDocumentPreviewModal({
                ...doc,
                title: file.name,
                url: dataUrl,
                date: new Date().toLocaleDateString('fr-FR'),
                source: 'Document local téléversé'
            });
        };
        reader.readAsDataURL(file);
    },

    openApiEntrepriseDetailModal(structId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const s = store.state.structures.find(x => x.id === structId) || store.state.structures[0];
        if (!s) return;
        const apiInfo = fin.getEnrichedApiEntrepriseData(s);

        const etabsHtml = (apiInfo.etablissements || []).map(et => `
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                    <span class="font-mono-code font-bold text-slate-900">SIRET : ${et.siret}</span>
                    ${et.siege ? `<span class="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Siège social</span>` : `<span class="ml-2 px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">Établissement secondaire</span>`}
                    <div class="text-[11px] text-slate-600 mt-0.5">${et.voie || ''} — ${et.code_postal || ''} ${et.commune || ''}</div>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${et.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">
                    ${et.actif ? 'Actif' : 'Fermé'}
                </span>
            </div>
        `).join('');

        // 1. Actes et statuts (Documents au RNA — Ministère de l'Intérieur)
        const rnaRowsHtml = (apiInfo.documents_rna || []).map((doc) => {
            const safeTitle = (doc.libelle || 'Document RNA').replace(/'/g, "\\'");
            return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs">
                <td class="py-2.5 px-3 font-mono-code font-bold text-slate-800 whitespace-nowrap">${doc.date || doc.annee || '—'}</td>
                <td class="py-2.5 px-3 font-semibold text-slate-900">
                    <span class="inline-flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${doc.code === 'STC' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}">${doc.code || 'DOC'}</span>
                        ${doc.libelle || 'Document officiel RNA'}
                    </span>
                </td>
                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5 justify-end">
                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeTitle}', url: '${doc.url}', date: '${doc.date || doc.annee || ''}', type: 'RNA (${doc.code || 'STC'})', source: 'RNA', docId: '${doc.code || 'STC'}', structKey: '${s.id || s.siret}' })" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs">
                            <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i> Visualiser
                        </button>
                        <button type="button" onclick="CCMVR.App.downloadDocumentOrAttestation({ title: '${safeTitle}', url: '${doc.url}', date: '${doc.date || doc.annee || ''}', type: 'RNA', docId: '${doc.code || 'STC'}', structKey: '${s.id || s.siret}' })" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Télécharger
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        // 2. Documents Administratifs Complémentaires (DAC — Déposés sur Le Compte Asso / DJEPVA)
        const dacRowsHtml = (apiInfo.documents_dac || []).map((dac) => {
            const safeNom = (dac.nom || 'Document DAC').replace(/'/g, "\\'");
            return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs">
                <td class="py-2.5 px-3 font-mono-code text-[11px] text-blue-900 whitespace-nowrap">${dac.siret || s.siret || '—'}</td>
                <td class="py-2.5 px-3 font-mono-code font-bold text-slate-800 whitespace-nowrap">${dac.date_depot || '—'}</td>
                <td class="py-2.5 px-3 font-mono-code font-semibold text-emerald-800 whitespace-nowrap">${dac.annee_validite || '—'}</td>
                <td class="py-2.5 px-3 font-bold text-slate-900">
                    <span class="inline-flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">DAC</span>
                        ${dac.nom || 'Document administratif complémentaire'}
                    </span>
                </td>
                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5 justify-end">
                        <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeNom}', url: '${dac.url}', date: '${dac.date_depot || ''}', type: 'DAC (${dac.annee_validite || 'Validé'})', source: 'DJEPVA — Le Compte Asso', docId: 'DAC', structKey: '${s.id || s.siret}' })" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs">
                            <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i> Visualiser
                        </button>
                        <button type="button" onclick="CCMVR.App.downloadDocumentOrAttestation({ title: '${safeNom}', url: '${dac.url}', date: '${dac.date_depot || ''}', type: 'DAC', docId: 'DAC', structKey: '${s.id || s.siret}' })" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Télécharger
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        // 3. Comptes annuels clos déclarés (DJEPVA)
        const comptesHtml = (apiInfo.comptes || []).map(c => `
            <div class="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider">
                            Comptes Clos Exercice ${c.annee}
                        </span>
                        <span class="text-xs text-emerald-950 font-semibold">Flux Officiel DJEPVA (Le Compte Asso)</span>
                    </div>
                    <button type="button" onclick="CCMVR.App.importOfficialComptesIntoStructure('${s.id}')" class="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i> Importer ces comptes dans les ratios
                    </button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div class="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Total Produits</span>
                        <strong class="font-mono-code text-slate-900 text-sm mt-0.5 block">${fin.formatCurrency(c.total_produits)}</strong>
                    </div>
                    <div class="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Total Charges</span>
                        <strong class="font-mono-code text-slate-900 text-sm mt-0.5 block">${fin.formatCurrency(c.total_charges)}</strong>
                    </div>
                    <div class="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Résultat Net</span>
                        <strong class="font-mono-code ${c.total_resultat >= 0 ? 'text-emerald-700' : 'text-rose-700'} text-sm mt-0.5 block">${c.total_resultat >= 0 ? '+' : ''}${fin.formatCurrency(c.total_resultat)}</strong>
                    </div>
                    <div class="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Subventions Déclarées</span>
                        <strong class="font-mono-code text-blue-700 text-sm mt-0.5 block">${fin.formatCurrency(c.montant_subventions)}</strong>
                    </div>
                    <div class="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Aides 3 ans (Minimis)</span>
                        <strong class="font-mono-code text-purple-700 text-sm mt-0.5 block">${fin.formatCurrency(c.montant_aides_sur_3ans)}</strong>
                    </div>
                </div>
            </div>
        `).join('');

        // 4. Dirigeants et représentants légaux
        let gov = {};
        try {
            gov = JSON.parse(localStorage.getItem('ccmvr_governance_' + s.id) || '{}');
        } catch (e) { gov = {}; }
        const dirigeantsHtml = (apiInfo.representants_legaux || []).map(r => `
            <div class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                    <div class="font-black text-slate-900 text-xs">${r.civilite || ''} ${r.prenom} ${r.nom}</div>
                    <div class="text-[11px] text-indigo-700 font-bold mt-0.5">${r.fonction || 'Dirigeant légal habilité'}</div>
                </div>
                <div class="text-right text-[11px] text-slate-600 font-mono-code space-y-0.5">
                    ${r.telephone ? `<div>📞 ${r.telephone}</div>` : ''}
                    ${r.courriel ? `<div class="text-blue-700 font-semibold">✉️ ${r.courriel}</div>` : ''}
                </div>
            </div>
        `).join('');

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="p-6 sm:p-8 space-y-6 max-h-[88vh] overflow-y-auto">
                <!-- En-tête officiel Agent Public -->
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                                ✓ Réservé aux agents publics • API Entreprise v4
                            </span>
                            <span class="font-mono-code text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">SIREN : ${apiInfo.siren} • RNA : ${apiInfo.rna || '—'}</span>
                            <span class="text-xs text-slate-500 font-mono-code">APE : ${apiInfo.code_ape}</span>
                        </div>
                        <h2 class="text-xl font-black text-slate-900 mt-2">${s.nom_officiel}</h2>
                        <div class="text-xs text-slate-600 mt-0.5">
                            Source : <strong>${apiInfo.source_api}</strong> • Régime : <strong>${apiInfo.regime}</strong> (${apiInfo.forme_juridique})
                            ${apiInfo.synced_at ? `<span class="text-slate-400 ml-2">• Synchronisé le ${apiInfo.synced_at.slice(0, 10)}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button type="button" onclick="CCMVR.App.openLeCompteAssoChecklistModal('${s.id}')" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                            <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> Checklist (10 pièces)
                        </button>
                        <button type="button" onclick="CCMVR.App.refreshApiEntrepriseForStructure('${s.id}')" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Actualiser en direct via API
                        </button>
                        <button type="button" onclick="CCMVR.App.closeModal()" class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 text-base font-bold">✕</button>
                    </div>
                </div>

                <!-- 4 Indicateurs Clés -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Création / JOAFE</span>
                        <strong class="font-mono-code text-slate-900 mt-0.5 block">${apiInfo.date_creation || '—'} (JO : ${apiInfo.date_jo || '—'})</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Impôts Commerciaux</span>
                        <strong class="text-slate-900 mt-0.5 block">${apiInfo.impots_commerciaux ? 'Oui (Fiscalisée)' : 'Non (Gestion désintéressée)'}</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Éligibilité CEC / Utilité Pub.</span>
                        <strong class="text-emerald-700 mt-0.5 block">CEC : ${apiInfo.eligibilite_cec ? 'Oui' : 'Non'} | RUP : ${apiInfo.reconnue_utilite_publique ? 'Oui' : 'Non'}</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span class="text-[10px] font-bold uppercase text-slate-400 block">Locaux & Établissements</span>
                        <strong class="font-mono-code text-blue-700 mt-0.5 block">${apiInfo.nb_etablissements} établissement(s) INSEE</strong>
                    </div>
                </div>

                <!-- Objet social statutaire -->
                <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs space-y-1">
                    <div class="font-black text-blue-950 uppercase text-[10px] tracking-wide">Objet Social Statutaire Déclaré en Préfecture (DJEPVA) :</div>
                    <p class="text-slate-800 leading-relaxed">${apiInfo.objet}</p>
                </div>

                <!-- SECTION 1 : ACTES ET STATUTS (DOCUMENTS AU RNA - MINISTÈRE DE L'INTÉRIEUR) -->
                <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                        <div class="text-xs font-black uppercase text-indigo-950 tracking-wide flex items-center gap-1.5">
                            <span>📜 Actes et statuts • Documents au RNA (Ministère de l'Intérieur)</span>
                            <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">${(apiInfo.documents_rna || []).length} pièce(s)</span>
                        </div>
                    </div>
                    <div class="card-minimal overflow-hidden border border-slate-200">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                    <th class="py-2 px-3">Dépôt</th>
                                    <th class="py-2 px-3">Description</th>
                                    <th class="py-2 px-3 text-right">Lien officiel</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rnaRowsHtml || `<tr><td colspan="3" class="py-6 text-center text-xs text-slate-400">Aucun document RNA numérisé dans ce flux.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECTION 2 : DOCUMENTS ADMINISTRATIFS COMPLÉMENTAIRES (DAC - LE COMPTE ASSO / DJEPVA) -->
                <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                        <div class="text-xs font-black uppercase text-amber-950 tracking-wide flex items-center gap-1.5">
                            <span>📁 Documents Administratifs Complémentaires (DAC — Le Compte Asso / DJEPVA)</span>
                            <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">${(apiInfo.documents_dac || []).length} pièce(s)</span>
                        </div>
                    </div>
                    <div class="card-minimal overflow-hidden border border-slate-200">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                    <th class="py-2 px-3">SIRET</th>
                                    <th class="py-2 px-3">Dépôt</th>
                                    <th class="py-2 px-3">Validité</th>
                                    <th class="py-2 px-3">Description</th>
                                    <th class="py-2 px-3 text-right">Lien officiel</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dacRowsHtml || `<tr><td colspan="5" class="py-6 text-center text-xs text-slate-400">Aucun document administratif complémentaire (DAC) déposé pour cette structure.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SECTION 3 : COMPTES ANNUELS & DONNÉES FINANCIÈRES DÉCLARÉES -->
                ${comptesHtml ? `
                    <div class="space-y-2.5">
                        <div class="text-xs font-black uppercase text-emerald-950 tracking-wide">
                            💰 Données Financières Déclarées (Comptes Annuels & Règle des Minimis)
                        </div>
                        ${comptesHtml}
                    </div>
                ` : ''}

                <!-- SECTION 4 : GOUVERNANCE & DIRIGEANTS OFFICIELS -->
                ${dirigeantsHtml ? `
                    <div class="space-y-2.5">
                        <div class="text-xs font-black uppercase text-slate-900 tracking-wide">
                            👥 Dirigeants Déclarés (Gouvernance Officielle au Répertoire)
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${dirigeantsHtml}
                        </div>
                    </div>
                ` : ''}

                <!-- SECTION 4 BIS : GOUVERNANCE DÉCLARÉE -->
                ${gov.gov_type ? `
                    <div class="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div class="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center justify-between">
                            <span>🏛️ Gouvernance & Contacts Déclarés</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">${gov.gov_type}</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                                <strong class="text-slate-700 block text-[11px]">Membres / Bureau :</strong>
                                <p class="text-slate-900 font-semibold mt-0.5">${gov.gov_membres || 'Non spécifié'}</p>
                            </div>
                            <div>
                                <strong class="text-slate-700 block text-[11px]">Coordonnées Gouvernance (Directes) :</strong>
                                <p class="text-slate-900 font-mono-code mt-0.5">${gov.gov_email || '—'} ${gov.gov_tel ? '• ' + gov.gov_tel : ''}</p>
                                <div class="text-[11px] text-slate-500 mt-1">Contact Structure : ${s.email_contact || '—'} ${s.telephone_contact ? '• ' + s.telephone_contact : ''}</div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- SECTION 5 : LOCAUX & ÉTABLISSEMENTS INSEE -->
                <div class="space-y-2.5">
                    <div class="text-xs font-black uppercase text-slate-900 tracking-wide">
                        🏢 Établissements & Locaux rattachés au SIREN ${apiInfo.siren} :
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        ${etabsHtml}
                    </div>
                </div>

                <!-- Pied de page avec action de suppression Contrôleur de Gestion -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    <button type="button" onclick="CCMVR.App.handleCdgDeleteStructure('${s.id}')" class="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> Supprimer définitivement cette association
                    </button>
                    <button type="button" onclick="CCMVR.App.closeModal()" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition">
                        Fermer la fiche
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    async refreshApiEntrepriseForStructure(structId) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const s = store.state.structures.find(x => x.id === structId);
        if (!s) return;
        this.showLoader(true);
        try {
            const query = s.siret || s.rna || s.nom_officiel;
            const fresh = await fin.fetchLiveApiEntrepriseData(query);
            s.api_entreprise_data = fresh;
            await store.saveStructure(s);
            this.toast(`Pièces officielles (RNA & DAC) et comptes actualisés pour ${s.nom_officiel} !`, 'success');
            this.openApiEntrepriseDetailModal(structId);
        } catch (err) {
            this.toast(`Erreur synchronisation API Entreprise : ${err.message}`, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    openLeCompteAssoChecklistModal(structId = null) {
        const store = window.CCMVR.Store;
        const fin = window.CCMVR.FinanceEngine;
        const s = store.state.structures.find(x => x.id === (structId || store.activeStructureId)) || store.state.structures[0] || {};
        const structKey = s.id || s.siret || 'default';

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        const docs = fin.getLeCompteAssoChecklist(s);

        const rows = docs.map(d => {
            const safeNom = (d.nomFichier || d.nom).replace(/'/g, "\\'");
            const safeDocType = d.nom.replace(/'/g, "\\'");

            let rowClass = 'border-b border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 border-l-4 border-l-emerald-500 transition text-xs';
            let validiteHtml = '';
            let actionsHtml = '';

            if (d.status === 'RED') {
                rowClass = 'border-b border-rose-200 bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-rose-500 transition text-xs';
                validiteHtml = `
                    <div class="space-y-0.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            🔴 Manquant
                        </span>
                        <div class="text-[9px] font-bold text-rose-700 leading-tight">${d.statusReason}</div>
                    </div>
                `;
                actionsHtml = `
                    <label class="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                        <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                        <span>Téléverser</span>
                        <input type="file" accept=".pdf,.doc,.docx" class="hidden" onchange="CCMVR.App.handleDocFileUpload(this, '${d.id}', '${structKey}')"/>
                    </label>
                `;
            } else if (d.status === 'YELLOW') {
                rowClass = 'border-b border-amber-200 bg-amber-50/70 hover:bg-amber-100/60 border-l-4 border-l-amber-500 transition text-xs';
                validiteHtml = `
                    <div class="space-y-0.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                            🟡 Retard (${d.validite})
                        </span>
                        <div class="text-[9px] font-bold text-amber-800 leading-tight">${d.statusReason}</div>
                    </div>
                `;
                actionsHtml = `
                    <div class="inline-flex items-center gap-1.5 justify-end">
                        <button type="button" onclick="CCMVR.App.confirmDocUnchanged('${d.id}', '${structKey}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs" title="Confirmer que ce document reste inchangé et valable cette année">
                            ✓ Toujours valable
                        </button>
                        <label class="px-2 py-1 bg-white hover:bg-slate-100 text-amber-900 border border-amber-300 rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                            <i data-lucide="upload" class="w-3 h-3 text-amber-700"></i>
                            <span>Téléverser</span>
                            <input type="file" accept=".pdf,.doc,.docx" class="hidden" onchange="CCMVR.App.handleDocFileUpload(this, '${d.id}', '${structKey}')"/>
                        </label>
                        ${d.url ? `
                            <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeNom}', url: '${d.url}', date: '${d.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso', docId: '${d.id}', structKey: '${structKey}' })" class="px-1.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium" title="Visualiser">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                            </button>
                        ` : ''}
                    </div>
                `;
            } else {
                // GREEN
                validiteHtml = `
                    <div class="space-y-0.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs font-mono-code">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            🟢 À jour (${d.validite})
                        </span>
                        <div class="text-[9px] text-emerald-700 font-bold leading-tight">${d.isOverridden ? 'Certifié inchangé' : (d.statusReason || 'Conforme')}</div>
                    </div>
                `;
                actionsHtml = `
                    <div class="inline-flex items-center gap-1.5 justify-end">
                        ${d.url ? `
                            <button type="button" onclick="CCMVR.App.openDocumentPreviewModal({ title: '${safeNom}', url: '${d.url}', date: '${d.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso', docId: '${d.id}', structKey: '${structKey}' })" class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                                <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i> Visualiser
                            </button>
                            <button type="button" onclick="CCMVR.App.downloadDocumentOrAttestation({ title: '${safeNom}', url: '${d.url}', date: '${d.dateCharge}', type: '${safeDocType}', source: 'Le Compte Asso', docId: '${d.id}', structKey: '${structKey}' })" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                                <i data-lucide="download" class="w-3 h-3"></i> Télécharger
                            </button>
                        ` : `
                            <label class="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                                <i data-lucide="upload" class="w-3 h-3 text-slate-600"></i>
                                <span>Remplacer</span>
                                <input type="file" accept=".pdf,.doc,.docx" class="hidden" onchange="CCMVR.App.handleDocFileUpload(this, '${d.id}', '${structKey}')"/>
                            </label>
                        `}
                    </div>
                `;
            }

            return `
            <tr class="${rowClass}">
                <td class="py-2 px-3 font-bold text-slate-900">
                    <div class="flex items-center gap-1.5">
                        <span>${d.nom}</span>
                        ${d.isMandatoryAnnual ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 shrink-0" title="Pièce annuelle obligatoire">Annuel</span>' : ''}
                    </div>
                </td>
                <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.origine === 'RNA' ? 'bg-indigo-100 text-indigo-800' : (d.origine === 'INSEE' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700')}">${d.origine}</span></td>
                <td class="py-2 px-3 font-mono-code text-[11px] ${d.nomFichier === 'Non défini' ? 'text-rose-600 font-bold italic' : 'text-slate-700'}">${d.nomFichier}</td>
                <td class="py-2 px-3 text-slate-500 whitespace-nowrap">${d.dateCharge}</td>
                <td class="py-2 px-3">${validiteHtml}</td>
                <td class="py-2 px-3 text-right whitespace-nowrap">${actionsHtml}</td>
            </tr>
            `;
        }).join('');

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-6';
        content.innerHTML = `
            <div class="p-6 space-y-4">
                <div class="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">DJEPVA • Gouv.fr</span>
                            <span class="text-xs text-slate-500 font-mono-code font-bold">SIREN : ${(s.siret || '').replace(/\s+/g, '').slice(0, 9)}</span>
                            <span class="text-xs text-slate-700 font-bold">• ${s.nom_officiel || 'Association'}</span>
                        </div>
                        <h2 class="text-base font-extrabold text-slate-900 mt-1">Conformité des Pièces — Le Compte Asso & RNA</h2>
                        <p class="text-xs text-slate-500">Vue d'ensemble de la régularité juridique et financière (Loi 2000-321 & CGCT)</p>
                    </div>
                    <button onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
                </div>

                <!-- Légende épurée 3 couleurs -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                    <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                        <div>
                            <strong class="font-extrabold text-emerald-950 text-[11px] block">Vert clair : À jour (100 %)</strong>
                            <p class="text-[10px] text-emerald-800">Pièce conforme ou validée inchangée.</p>
                        </div>
                    </div>
                    <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-amber-600 shrink-0"></span>
                        <div>
                            <strong class="font-extrabold text-amber-950 text-[11px] block">Jaune clair : Retard / N-2</strong>
                            <p class="text-[10px] text-amber-800">Mettre à jour ou cliquer "Toujours valable".</p>
                        </div>
                    </div>
                    <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-rose-600 shrink-0"></span>
                        <div>
                            <strong class="font-extrabold text-rose-950 text-[11px] block">Rouge clair : Manquant</strong>
                            <p class="text-[10px] text-rose-800">Pièce annuelle obligatoire requise.</p>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto max-h-[450px] border border-slate-200 rounded-xl">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase bg-slate-50">
                                <th class="py-2.5 px-3">Modèle / Type</th>
                                <th class="py-2.5 px-3">Origine</th>
                                <th class="py-2.5 px-3">Nom du fichier</th>
                                <th class="py-2.5 px-3">Chargé le</th>
                                <th class="py-2.5 px-3">Validité</th>
                                <th class="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                    <a href="https://lecompteasso.associations.gouv.fr/" target="_blank" rel="noopener" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition">
                        <i data-lucide="external-link" class="w-4 h-4"></i> Aller sur Le Compte Asso pour téléverser ↗
                    </a>
                    <button onclick="CCMVR.App.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">Fermer</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    openCerModal() {
        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;
        const engagements = window.CCMVR.CONFIG.CER_ENGAGEMENTS || [];
        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6 max-h-[90vh] overflow-y-auto';
        content.innerHTML = `
            <div class="p-6 space-y-4">
                <div class="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div class="flex items-center gap-3">
                        <span class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">⚖️</span>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-base font-extrabold text-slate-900">Contrat d'Engagement Républicain (CER)</h2>
                                <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">Décret 2021-1947</span>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5">Souscrit de plein droit par toute association sollicitant une subvention ou un concours en nature.</p>
                        </div>
                    </div>
                    <button onclick="CCMVR.App.closeModal()" class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">✕</button>
                </div>

                <div class="space-y-2.5 text-xs">
                    ${engagements.map(e => `
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div class="font-extrabold text-slate-900 flex items-center gap-2">
                                <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">${e.numero}</span>
                                <span>${e.titre}</span>
                            </div>
                            <div class="text-[11px] text-slate-600 mt-1 pl-7 leading-relaxed">${e.texte}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div class="font-bold flex items-center gap-1.5 text-emerald-900">
                            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                            Engagement souscrit et certifié pour toute demande CCMVR
                        </div>
                        <div class="text-[11px] text-emerald-700 mt-0.5">Application stricte de la Loi n° 2021-1109 du 24 août 2021</div>
                    </div>
                    <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shrink-0 transition shadow-2xs">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },


    openEditStructureModal(structId) {
        const store = window.CCMVR.Store;
        const s = store.state.structures.find(x => x.id === structId);
        if (!s) {
            this.toast('Structure introuvable.', 'error');
            return;
        }

        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        const safeStr = (v) => (v || '').replace(/"/g, '&quot;');

        content.innerHTML = `
            <div class="space-y-6">
                <!-- En-tête -->
                <div class="flex items-start justify-between pb-4 border-b border-slate-200">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase">
                                Contrôle de Gestion • Dérogation Administrative
                            </span>
                            <span class="text-xs font-mono-code text-slate-500">ID : ${s.id}</span>
                        </div>
                        <h2 class="text-lg font-black text-slate-900">✏️ Rectification de la Fiche Association</h2>
                        <p class="text-xs text-slate-500">Structure : <strong class="text-slate-800">${safeStr(s.nom_officiel)}</strong></p>
                    </div>
                    <button type="button" onclick="CCMVR.App.closeModal()" class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 text-base font-bold">✕</button>
                </div>

                <!-- Avertissement dérogation -->
                <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5 leading-relaxed">
                    <div class="font-extrabold flex items-center gap-1.5 text-amber-900">
                        <span>⚠️ Droit de rectification réservé au Contrôle de Gestion (CdG) :</span>
                    </div>
                    <p>
                        Les modifications enregistrées ici mettent directement à jour la base de données communautaire et s'appliqueront à toutes les conventions et mandats futurs.
                    </p>
                    <p class="text-[11px] text-amber-800">
                        Pour toute modification statutaire pérenne, rappelez à l'association de procéder également à sa mise à jour officielle sur <strong>Le Compte Asso / Service-Public.fr</strong>.
                    </p>
                </div>

                <!-- Formulaire de modification -->
                <form onsubmit="CCMVR.App.handleSaveStructureEdit(event, '${s.id}')" novalidate class="space-y-5">
                    <!-- Section 1 : Dénomination et Immatriculation -->
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Dénomination & Identifiants Officiels</div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Dénomination Officielle (JOAFE / Statuts) *</label>
                                <input type="text" id="edit-nom-officiel" required value="${safeStr(s.nom_officiel)}" class="input-clean font-bold text-slate-900"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Sigle ou Nom d'usage courant</label>
                                <input type="text" id="edit-nom-dusage" value="${safeStr(s.nom_dusage || s.nom_officiel)}" class="input-clean"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">N° SIRET (14 chiffres) *</label>
                                <input type="text" id="edit-siret" required value="${safeStr(s.siret)}" class="input-clean font-mono-code font-bold text-blue-900"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">N° RNA (Préfecture - W...)</label>
                                <input type="text" id="edit-rna" value="${safeStr(s.rna)}" placeholder="Ex: W433001234" class="input-clean font-mono-code"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Code APE / NAF</label>
                                <input type="text" id="edit-code-ape" value="${safeStr(s.code_ape)}" placeholder="Ex: 93.12Z" class="input-clean font-mono-code"/>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2 : Adresse du Siège Social -->
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Adresse Officielle du Siège</div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="sm:col-span-3">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Adresse (Numéro, Voie, Lieu-dit) *</label>
                                <input type="text" id="edit-adresse-siege" required value="${safeStr(s.adresse_siege)}" class="input-clean"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Code Postal *</label>
                                <input type="text" id="edit-code-postal" required value="${safeStr(s.code_postal)}" class="input-clean font-mono-code"/>
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Commune du siège *</label>
                                <input type="text" id="edit-ville" required value="${safeStr(s.ville)}" class="input-clean"/>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3 : Représentant Légal & Contact -->
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">3. Représentant Légal & Contact Extranet</div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Prénom du Représentant *</label>
                                <input type="text" id="edit-rep-prenom" required value="${safeStr(s.representant_prenom)}" class="input-clean"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Nom du Représentant *</label>
                                <input type="text" id="edit-rep-nom" required value="${safeStr(s.representant_nom)}" class="input-clean font-bold"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Qualité / Fonction *</label>
                                <input type="text" id="edit-rep-fonction" required value="${safeStr(s.representant_fonction || 'Président(e)')}" class="input-clean"/>
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">E-mail officiel de contact *</label>
                                <input type="email" id="edit-email-contact" required value="${safeStr(s.email_contact)}" class="input-clean font-mono-code"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Téléphone</label>
                                <input type="text" id="edit-telephone" value="${safeStr(s.telephone)}" placeholder="Ex: 04 71 66 ..." class="input-clean font-mono-code"/>
                            </div>
                        </div>
                    </div>

                    <!-- Section 4 : Coordonnées Bancaires (IBAN / BIC) -->
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">4. Coordonnées Bancaires (DDFiP / Mandatement)</div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">IBAN</label>
                                <input type="text" id="edit-iban" value="${safeStr(s.iban)}" placeholder="FR76 ..." class="input-clean font-mono-code"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Code BIC</label>
                                <input type="text" id="edit-bic" value="${safeStr(s.bic)}" placeholder="BNPAFRPP..." class="input-clean font-mono-code"/>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition">
                            Annuler
                        </button>
                        <button type="submit" class="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition">
                            <span>💾 Enregistrer les rectifications</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    async handleSaveStructureEdit(e, structId) {
        e.preventDefault();
        const store = window.CCMVR.Store;
        const s = store.state.structures.find(x => x.id === structId);
        if (!s) return;

        const updated = {
            id: structId,
            nom_officiel: document.getElementById('edit-nom-officiel')?.value?.trim() || s.nom_officiel,
            nom_dusage: document.getElementById('edit-nom-dusage')?.value?.trim() || document.getElementById('edit-nom-officiel')?.value?.trim() || s.nom_dusage,
            siret: (document.getElementById('edit-siret')?.value || '').replace(/\s+/g, ''),
            rna: document.getElementById('edit-rna')?.value?.trim() || null,
            code_ape: document.getElementById('edit-code-ape')?.value?.trim() || null,
            adresse_siege: document.getElementById('edit-adresse-siege')?.value?.trim() || '',
            code_postal: document.getElementById('edit-code-postal')?.value?.trim() || '',
            ville: document.getElementById('edit-ville')?.value?.trim() || '',
            representant_prenom: document.getElementById('edit-rep-prenom')?.value?.trim() || '',
            representant_nom: document.getElementById('edit-rep-nom')?.value?.trim() || '',
            representant_fonction: document.getElementById('edit-rep-fonction')?.value?.trim() || 'Président(e)',
            email_contact: document.getElementById('edit-email-contact')?.value?.trim() || '',
            telephone: document.getElementById('edit-telephone')?.value?.trim() || '',
            iban: (document.getElementById('edit-iban')?.value || '').replace(/\s+/g, ''),
            bic: document.getElementById('edit-bic')?.value?.trim() || '',
            signataire_cer_nom: `${document.getElementById('edit-rep-prenom')?.value?.trim() || ''} ${document.getElementById('edit-rep-nom')?.value?.trim() || ''}`.trim()
        };

        this.showLoader(true);
        try {
            await store.saveStructure(updated);
            this.closeModal();
            this.renderMainView();
            this.toast(`Fiche de l'association « ${updated.nom_officiel} » rectifiée avec succès !`, 'success');
        } catch (err) {
            console.error('Erreur enregistrement structure:', err);
            this.toast(`Erreur lors de l'enregistrement : ${err.message}`, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    closeModal() {
        const modal = document.getElementById('universal-modal');
        if (modal) {
            if (!modal.classList.contains('hidden')) {
                this._lastUniversalModalClosedAt = Date.now();
            }
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
        const content = document.getElementById('universal-modal-content');
        if (content) {
            content.innerHTML = '';
        }
    },

    getWorkflowBadge(statut, montantOrDossier = 0) {
        let isHigh = false;
        let dossierObj = null;
        if (typeof montantOrDossier === 'object' && montantOrDossier !== null) {
            dossierObj = montantOrDossier;
            isHigh = window.CCMVR.Store.isDossierSoumisCdg ? window.CCMVR.Store.isDossierSoumisCdg(montantOrDossier) : (parseFloat(montantOrDossier.montant_demande || 0) >= 23000);
        } else if (typeof montantOrDossier === 'boolean') {
            isHigh = montantOrDossier;
        } else {
            isHigh = parseFloat(montantOrDossier) >= 23000;
        }

        // Si le dossier a une convention rattachée ou est voté en conseil, afficher le détail fin de signature
        if (dossierObj && dossierObj.id && (statut === 'VOTE_CONSEIL' || statut === 'ACTE')) {
            const store = window.CCMVR.Store;
            const conv = store.getEnrichedConventions ? store.getEnrichedConventions().find(c => c.dossier_id === dossierObj.id) : null;
            if (conv) {
                const isDouble = conv.statut_signature === 'VALIDE' || (conv.isSignePresidente && conv.isSigneAsso) || conv.scan_signe_nom;
                if (isDouble) {
                    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap bg-emerald-100 text-emerald-900 border border-emerald-300">🟢 2/2 Convention Validée</span>`;
                }
                if (conv.isSigneAsso && !conv.isSignePresidente) {
                    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-blue-100 text-blue-900 border border-blue-300">✍️ 1/2 Signé Asso (Attente Présidente)</span>`;
                }
                if (conv.isSignePresidente && !conv.isSigneAsso) {
                    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-indigo-100 text-indigo-900 border border-indigo-300">✍️ 1/2 Signé Présidente (Attente Asso)</span>`;
                }
                return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-amber-100 text-amber-900 border border-amber-300">⏳ 0/2 En attente signatures</span>`;
            }
        }
        const map = {
            BROUILLON: ['Brouillon', 'bg-slate-100 text-slate-600 border border-slate-200'],
            DEPOSE: isHigh
                ? ['⏳ 1. Déposé (Attente Visa CdG)', 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold']
                : ['⏳ 1. Déposé (Attente avis Pôle)', 'bg-slate-100 text-slate-700 border border-slate-300 font-bold'],
            EN_INSTRUCTION: isHigh
                ? ['⏳ 1. En instruction CdG', 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold']
                : ['⏳ 1. En instruction Pôle', 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'],
            VISE_CDG: ['✓ 1. Visé CdG → Attente Pôle', 'bg-blue-100 text-blue-900 border border-blue-300 font-extrabold'],
            AVIS_POLE_FAVORABLE: isHigh
                ? ['✓ 2. Avis Pôle OK (Prêt Commission)', 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold']
                : ['✓ 2. Avis Pôle Favorable (Circuit allégé)', 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'],
            INCOMPLET: ['⚠️ Incomplet (Pièces demandées)', 'bg-amber-50 text-amber-800 border border-amber-300 font-bold'],
            RETOUR_CDG_POLE: ['⚠️ Réserves CdG (Retour Pôle)', 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse'],
            RETOUR_INCOMPLET_SOUMIS: ['⏳ Compléments reçus', 'bg-blue-50 text-blue-800 border border-blue-300 font-bold'],
            VALIDE_COMMISSION: ['🏛️ 3. Validé en Commission', 'bg-purple-100 text-purple-900 border border-purple-300 font-bold'],
            VOTE_CONSEIL: ['★ 4. Voté en Conseil', 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold'],
            REJETE: ['✕ Demande Refusée', 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'],
            REFUSE: ['✕ Demande Refusée', 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'],
            ARCHIVE: ['🗑️ Annulé / Archivé', 'bg-slate-100 text-slate-500 border border-slate-300 font-medium']
        };
        const [label, cls] = map[statut] || [statut, 'bg-slate-100 text-slate-700'];
        return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${cls}">${label}</span>`;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CCMVR.Modules.ModalsAnnuaire;
}
