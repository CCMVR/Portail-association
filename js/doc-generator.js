// ==============================================================================
// GÉNÉRATEUR D'ACTES OFFICIELS (PDF MULTI-PAGES, IMPRESSION A4 & ARCHIVAGE)
// 1. Convention-Cadre Pluriannuelle (Tronc Commun + Annexe 1 Métier + CER + Finances)
// 2. Décision Financière Annuelle Attributive
// 3. Attestation Annuelle Valorisée de Concours en Nature (Art. L. 2313-1 CGCT)
// ==============================================================================

window.CCMVR = window.CCMVR || {};

window.CCMVR.DocGenerator = {

    // 1. Construction HTML officielle de la Convention complète (Socle commun ou Hors Cadre + Annexes par type)
    buildFullConventionHTML({ convention, dossier, structure, pole, valeursCriteres, criteresPole, prestationsNature, annexeMetierTexte, annexePoleModele }) {
        if (convention && (convention.is_avenant || convention.type_convention === 'AVENANT')) {
            return this.buildAvenantHTML({ convention, dossier, structure, pole, prestationsNature });
        }
        const cfg = window.CCMVR.CONFIG;
        const fin = window.CCMVR.FinanceEngine;
        const store = window.CCMVR.Store;
        const normType = store.normalizeConventionTypeCode(convention?.type_convention);
        const typeInfo = (cfg.TYPES_CONVENTIONS && cfg.TYPES_CONVENTIONS[normType]) || {
            code: 'COM_OBJECTIFS',
            label: "Convention d'Objectifs et de Moyens (COM)",
            hasTroncCommun: true
        };
        const isHorsCadre = normType === 'HORS_CADRE' || typeInfo.hasTroncCommun === false;
        const customMeta = (convention && store.getConventionCustomMeta(convention)) || {};

        const poleCode = pole?.code || 'SPORT';
        const customPoleAnnexe = annexePoleModele || store.getPoleAnnexeTemplate(poleCode, normType);

        const articles = isHorsCadre
            ? ((Array.isArray(customMeta.articles_corps) && customMeta.articles_corps.length > 0)
                ? customMeta.articles_corps
                : (Array.isArray(customPoleAnnexe.articles_corps) && customPoleAnnexe.articles_corps.length > 0
                    ? customPoleAnnexe.articles_corps
                    : (store.getSocleCommunArticles ? store.getSocleCommunArticles('HORS_CADRE') : (cfg.ANNEXES_PAR_TYPE_DEFAUT?.HORS_CADRE?.articles_corps || []))))
            : ((Array.isArray(customMeta.articles_corps) && customMeta.articles_corps.length > 0)
                ? customMeta.articles_corps
                : (store.getSocleCommunArticles ? store.getSocleCommunArticles(normType) : store.getTroncCommunArticles()));

        const codeHex = (convention && convention.code_hex) || (dossier && dossier.code_hex) || fin.generateHexId();
        const annee = (dossier && dossier.annee) || cfg.ANNEE_PAR_DEFAUT;
        const dateDebut = (convention && convention.date_debut) || `${annee}-01-01`;
        const dateFin = (convention && convention.date_fin) || `${annee + 2}-12-31`;
        const montantRetenu = (dossier && (dossier.montant_vote || dossier.montant_propose_pole || dossier.montant_demande)) || 0;
        const siren = (structure?.siret || '').replace(/\s+/g, '').slice(0, 9) || 'Non renseigné';

        const totalNature = (prestationsNature || []).reduce((acc, p) => acc + (parseFloat(p.montant_total_valorise) || (parseFloat(p.quantite || 0) * parseFloat(p.tarif_unitaire_applique || 0))), 0);

        const articlesHtml = articles.map((a, idx) => `
            <div style="margin-bottom: 14px; page-break-inside: avoid;">
                <h4 style="font-size: 10.5pt; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; text-transform: uppercase;">
                    Article ${a.num || (idx + 1)} — ${a.titre}
                </h4>
                <p style="font-size: 9.8pt; line-height: 1.5; color: #1e293b; margin: 0; text-align: justify;">
                    ${a.contenu}
                </p>
            </div>
        `).join('');

        // Tableau des critères métiers de l'Annexe 1
        const criteresRowsHtml = (criteresPole || []).map(c => {
            const valObj = (valeursCriteres || []).find(v => v.critere_id === c.id);
            let displayVal = 'Non renseigné';
            if (valObj) {
                if (c.type_donnee === 'boolean') displayVal = valObj.valeur_booleenne ? 'OUI' : 'NON';
                else if (c.type_donnee === 'currency') displayVal = fin.formatCurrency(valObj.valeur_numerique);
                else if (c.type_donnee === 'number') displayVal = (valObj.valeur_numerique ?? 0).toString();
                else displayVal = valObj.valeur_texte || '—';
            }
            return `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9.5pt;">${c.libelle}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9.5pt; font-weight: 700; text-align: right;">${displayVal}</td>
                </tr>
            `;
        }).join('');

        // Tableau des prestations en nature de l'Annexe 3
        const natureRowsHtml = (prestationsNature || []).map(p => {
            const totalLigne = parseFloat(p.montant_total_valorise) || (parseFloat(p.quantite || 0) * parseFloat(p.tarif_unitaire_applique || 0));
            return `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt;">${fin.formatDate(p.date_debut)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt;">${p.type_libelle || p.observations || 'Prestation communautaire'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt; text-align: center;">${p.quantite} ${p.unite || ''}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt; text-align: right;">${fin.formatCurrency(p.tarif_unitaire_applique)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt; font-weight: 700; text-align: right;">${fin.formatCurrency(totalLigne)}</td>
                </tr>
            `;
        }).join('');

        const cerHtml = cfg.CER_ENGAGEMENTS.map(e => `
            <div style="margin-bottom: 6px;">
                <strong style="font-size: 9pt; color: #0f172a;">Engagement n°${e.numero} — ${e.titre} :</strong>
                <span style="font-size: 8.5pt; color: #334155;">${e.texte}</span>
            </div>
        `).join('');

        // Clauses métiers de l'Annexe 1 (personnalisées pour cette convention ou modèle du Pôle pour ce type)
        const activeAnnexeClauses = (Array.isArray(customMeta.annexe_clauses) && customMeta.annexe_clauses.length > 0)
            ? customMeta.annexe_clauses
            : (customPoleAnnexe.clauses || []);
        const activePrescriptions = customMeta.prescriptions_specifiques || '';
        const activeIntituleObjet = customMeta.intitule || convention?.intitule_specifique || convention?.nom_fichier_docx || dossier?.intitule_projet || typeInfo.label;

        const clausesPoleHtml = activeAnnexeClauses.map((cl, idx) => `
            <div style="margin-bottom: 10px;">
                <div style="font-size: 9.5pt; font-weight: 700; color: #1e3a8a;">${idx + 1}. ${cl.titre}</div>
                <div style="font-size: 9pt; color: #334155; line-height: 1.45; text-align: justify;">${cl.texte}</div>
            </div>
        `).join('');

        const typeBannerTitle = normType === 'COM_OBJECTIFS'
            ? (montantRetenu >= 23000 ? "Convention Pluriannuelle d'Objectifs et de Moyens (CPO)" : "Convention d'Objectifs et de Moyens (COM)")
            : typeInfo.label;

        const horsCadreVisaBanner = isHorsCadre
            ? ((customMeta.visa_cdg_valide || convention?.visa_cdg_valide || (convention?.statut_signature && convention.statut_signature !== 'ATTENTE_VISA_CDG'))
                ? `<div style="background:#f0fdf4; border:1px solid #16a34a; color:#166534; padding:10px 14px; border-radius:6px; font-size:8.5pt; margin-bottom:16px;">
                     <strong>✓ CONVENTION DÉROGATOIRE HORS SOCLE COMMUN — VISÉE PAR LE CONTRÔLE DE GESTION</strong><br/>
                     Conformité juridique et financière validée le ${fin.formatDate(customMeta.date_visa_cdg || new Date())}.
                   </div>`
                : `<div style="background:#fff1f2; border:1px solid #e11d48; color:#9f1239; padding:10px 14px; border-radius:6px; font-size:8.5pt; margin-bottom:16px;">
                     <strong>⏳ CONVENTION DÉROGATOIRE HORS SOCLE COMMUN — EN ATTENTE DU VISA DU CONTRÔLE DE GESTION</strong><br/>
                     Cette convention ponctuelle déroge au socle commun intercommunal et requiert le visa préalable du Contrôle de Gestion avant mise en signature.
                   </div>`)
            : '';

        // Gestion de la signature (Manuscrite scannée Présidente, Électronique Asso SES, ou Cadre d'attente)
        const scanInfo = convention && (convention.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${convention.id}`));
        const scanData = convention && (convention.scan_signe_data || localStorage.getItem(`ccmvr_scan_data_${convention.id}`));
        const isScanImage = scanData && (scanData.startsWith('data:image/') || (scanInfo && (scanInfo.toLowerCase().endsWith('.png') || scanInfo.toLowerCase().endsWith('.jpg') || scanInfo.toLowerCase().endsWith('.jpeg'))));
        const sealAssoHash = `eIDAS-CCMVR-${annee}-${codeHex}-ASSO-${(structure?.siret || '43').slice(-4)}`;
        const sealCcmvrHash = `eIDAS-CCMVR-${annee}-${codeHex}-PRES-${delibRefCode(cfg.DELIBERATION_CADRE)}`;

        function delibRefCode(str) {
            return (str || '2026').replace(/[^A-Z0-9]/gi, '').slice(0, 12).toUpperCase();
        }

        const isAssoSigned = Boolean(convention && (convention.date_signature_asso || convention.audit_signature_asso || convention.statut_signature === 'SIGNE_ASSO' || (convention.statut_signature === 'VALIDE' && convention.date_signature_asso)));

        const sigAssoStatus = isAssoSigned
            ? `<div style="margin-top:8px; padding:10px; background:#ecfdf5; border:1px solid #10b981; border-radius:6px; font-size:8.5pt; color:#065f46; break-inside:avoid; page-break-inside:avoid;">
                 <strong>✓ SIGNÉ ÉLECTRONIQUEMENT PAR L'ASSOCIATION (SES)</strong><br/>
                 Signataire : ${convention.audit_signature_asso?.signataire_nom || `${structure?.representant_prenom || ''} ${structure?.representant_nom || ''}`} (${structure?.representant_fonction || 'Président(e)'})<br/>
                 Date & Horodatage : ${fin.formatDate(convention.date_signature_asso || new Date())}<br/>
                 ${convention.audit_signature_asso?.email ? `Courriel de validation : ${convention.audit_signature_asso.email}<br/>` : ''}
                 <span style="font-family:monospace; font-size:7.5pt; color:#047857;">Empreinte certifiée : ${convention.audit_signature_asso?.hash || sealAssoHash}</span>
               </div>`
            : `<div style="margin-top:10px; min-height:85px; border:1px dashed #94a3b8; border-radius:6px; padding:8px; font-size:8pt; color:#475569; break-inside:avoid; page-break-inside:avoid;">
                 Signature manuscrite et cachet de l'Association :<br/>
                 <em>(Précédée de la mention « Lu et approuvé »)</em>
                 <div style="margin-top:6px; font-size:7.5pt; font-weight:bold; color:${convention?.isTransmisAsso ? '#059669' : '#d97706'};">
                     ${convention?.isTransmisAsso ? '🔔 En attente de signature par l\'association (Code OTP sur l\'extranet)' : '⏳ En attente de validation préalable et transmission par le pôle'}
                 </div>
               </div>`;

        const isPresSigned = Boolean(convention && (convention.date_signature_ccmvr || scanInfo || convention.statut_signature === 'SIGNE_CCMVR' || convention.isSignePresidente));

        const sigCcmvrStatus = scanInfo
            ? `<div style="margin-top:8px; padding:10px; background:#eff6ff; border:2px solid #2563eb; border-radius:6px; font-size:8.5pt; color:#1e40af; break-inside:avoid; page-break-inside:avoid;">
                 <div style="font-weight:800; color:#1e3a8a; text-transform:uppercase; font-size:8pt; letter-spacing:0.03em;">✓ Acte original paraphé & signé par Madame la Présidente</div>
                 <div style="margin-top:2px; font-size:9pt; font-weight:700; color:#0f172a;">${cfg.COLLECTIVITE_PRESIDENTE}</div>
                 <div style="font-size:7.5pt; color:#475569;">Présidente de la Communauté de Communes Marches du Velay Rochebaron</div>
                 ${isScanImage ? `
                     <div style="margin:8px 0; text-align:center; padding:6px; background:#ffffff; border:1px solid #93c5fd; border-radius:6px;">
                         <img src="${scanData}" alt="Signature Présidente" style="max-height:160px; max-width:100%; object-fit:contain; display:inline-block;" />
                     </div>
                 ` : scanData ? `
                     <div style="margin:8px 0; background:#ffffff; border:1px solid #93c5fd; border-radius:6px; overflow:hidden;">
                         <div style="padding:4px 8px; background:#dbeafe; font-size:7.5pt; font-weight:bold; color:#1e40af; display:flex; justify-content:space-between; align-items:center;">
                             <span>📄 Feuille de signature originale scannée :</span>
                             <button type="button" onclick="CCMVR.App.openArchivedSignedScan('${convention.id}')" style="background:#1d4ed8; color:#fff; border:none; border-radius:3px; padding:2px 6px; font-size:7pt; cursor:pointer;">Plein écran ↗</button>
                         </div>
                         <iframe src="${scanData}#toolbar=0" style="width:100%; height:320px; border:none;"></iframe>
                     </div>
                 ` : `
                     <div style="margin-top:4px; font-size:7.5pt; color:#2563eb; font-family:monospace;">Acte scanné archivé : ${scanInfo}</div>
                 `}
                 <div style="margin-top:4px; font-size:7.5pt; color:#3b82f6; border-top:1px solid #bfdbfe; padding-top:3px;">
                     Délibération-cadre : ${cfg.DELIBERATION_CADRE} • Le ${fin.formatDate(convention.date_signature_ccmvr || new Date())}
                 </div>
               </div>`
            : isPresSigned
            ? `<div style="margin-top:8px; padding:10px; background:#eff6ff; border:1px solid #3b82f6; border-radius:6px; font-size:8.5pt; color:#1e40af; break-inside:avoid; page-break-inside:avoid;">
                 <strong>✓ SIGNÉ NUMÉRIQUEMENT PAR LA COLLECTIVITÉ</strong><br/>
                 Signataire : ${cfg.COLLECTIVITE_PRESIDENTE}, Présidente de la CCMVR<br/>
                 Habilitation : Délibération ${cfg.DELIBERATION_CADRE}<br/>
                 Date & Horodatage : ${fin.formatDate(convention.date_signature_ccmvr || new Date())}<br/>
                 <span style="font-family:monospace; font-size:7.5pt; color:#1d4ed8;">Empreinte : ${sealCcmvrHash}</span>
               </div>`
            : `<div style="margin-top:10px; height:85px; border:1px dashed #94a3b8; border-radius:6px; padding:8px; font-size:8pt; color:#475569; break-inside:avoid; page-break-inside:avoid;">
                 Signature manuscrite de la Présidente de la CCMVR et cachet :
               </div>`;

        return `
        <div id="official-doc-wrapper" style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 24px; background: #ffffff;">
            <!-- EN-TÊTE INSTITUTIONNEL -->
            <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
                <tr>
                    <td style="width: 72%; vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <img src="logo-collectivite.png" alt="Logo CCMVR" style="height: 76px; width: auto; object-fit: contain;" onerror="this.style.display='none'"/>
                            <div>
                                <div style="font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e3a8a;">République Française — Département de la Haute-Loire</div>
                                <div style="font-size: 13pt; font-weight: 800; color: #0f172a;">${cfg.COLLECTIVITE_NOM}</div>
                                <div style="font-size: 9pt; color: #475569;">${pole ? pole.libelle : 'Direction Générale des Services'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="width: 28%; text-align: right; vertical-align: top;">
                        <div style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; text-align: right;">
                            <div style="font-size: 8pt; color: #475569; font-weight: 600;">Convention n° ${annee}-${codeHex}</div>
                            <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">Exercice ${annee}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- TITRE DE LA CONVENTION -->
            <div style="background: #0f172a; color: #ffffff; padding: 16px 20px; border-radius: 8px; text-align: center; margin-bottom: 22px;">
                <div style="font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; color: #93c5fd; font-weight: 600;">
                    ${typeBannerTitle}
                </div>
                <h1 style="font-size: 15pt; font-weight: 800; margin: 6px 0;">
                    ${structure ? structure.nom_officiel : 'ASSOCIATION PARTENAIRE'}
                </h1>
                <div style="font-size: 9.5pt; color: #e2e8f0; margin-bottom: 4px; font-weight: 600;">
                    Objet : ${activeIntituleObjet}
                </div>
                <div style="font-size: 9pt; color: #cbd5e1;">
                    Période d'exécution : du ${fin.formatDate(dateDebut)} au ${fin.formatDate(dateFin)}
                </div>
            </div>

            ${horsCadreVisaBanner}

            <!-- COMPARUTION DES PARTIES -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 9.5pt; line-height: 1.5;">
                <p style="margin: 0 0 10px 0;"><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
                <p style="margin: 0 0 10px 0;">
                    <strong>La ${cfg.COLLECTIVITE_NOM} (${cfg.COLLECTIVITE_SIGLE})</strong>, établissement public de coopération intercommunale, dont le siège est situé ${cfg.COLLECTIVITE_ADRESSE}, représentée par sa Présidente en exercice, <strong>${cfg.COLLECTIVITE_PRESIDENTE}</strong>, dûment habilitée par délibération du Conseil Communautaire n° ${cfg.DELIBERATION_CADRE},<br/>
                    <em>Ci-après dénommée « la CCMVR », d'une part,</em>
                </p>
                <p style="margin: 0 0 6px 0;"><strong>ET :</strong></p>
                <p style="margin: 0;">
                    L'Association <strong>« ${structure?.nom_officiel || 'À COMPLÉTER'} »</strong>, association régie par la loi du 1er juillet 1901,<br/>
                    <strong>N° SIREN :</strong> <span style="font-family:monospace;">${siren}</span> &nbsp;|&nbsp; <strong>SIRET Siège :</strong> <span style="font-family:monospace;">${structure?.siret || 'Non renseigné'}</span> &nbsp;|&nbsp; <strong>N° RNA :</strong> <span style="font-family:monospace;">${structure?.rna || 'Non renseigné'}</span><br/>
                    <strong>Siège social :</strong> ${structure?.adresse_siege || ''}, ${structure?.code_postal || ''} ${structure?.ville || ''}<br/>
                    Représentée par <strong>${structure?.representant_prenom || ''} ${structure?.representant_nom || 'À compléter'}</strong>, agissant en qualité de <strong>${structure?.representant_fonction || 'Président(e) / Personne dûment habilitée'}</strong>,<br/>
                    <em>Ci-après dénommée « l'Association », d'autre part.</em>
                </p>
            </div>

            <!-- CORPS DE LA CONVENTION (SOCLE COMMUN 12 ARTICLES OU CORPS SPÉCIFIQUE HORS CADRE) -->
            <div style="margin-bottom: 24px;">
                <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 14px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size: 10.5pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase;">
                        ${isHorsCadre ? 'Titre I — Dispositions Contractuelles Spécifiques (Convention Ponctuelle Hors Socle Commun)' : 'Titre I — Socle Commun Intercommunal (Dispositions Générales)'}
                    </span>
                    <span style="font-size: 8pt; color: #64748b; font-weight: 600;">
                        ${isHorsCadre ? 'Rédaction spécifique Pôle + Visa CdG' : 'Socle Commun CCMVR (12 articles)'}
                    </span>
                </div>
                ${articlesHtml}
            </div>

            <!-- ANNEXE 1 : DISPOSITIONS SPÉCIFIQUES MÉTIERS DU PÔLE SELON LE TYPE DE CONVENTION -->
            <div style="page-break-before: always; margin-top: 28px; margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px;">
                <div style="font-size: 11pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 6px;">
                    Annexe 1 — ${customPoleAnnexe.intitule || `Dispositions Spécifiques (${typeInfo.shortLabel || typeInfo.label})`} — ${pole ? pole.libelle : 'Pôle Métier'}
                </div>
                <p style="font-size: 9.5pt; color: #334155; margin-bottom: 12px;">
                    <strong>Objet opérationnel :</strong> ${activeIntituleObjet}
                </p>

                <!-- Clauses spécifiques rédigées par le Pôle Métier -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 14px;">
                    <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                        Clauses et modalités techniques de l'Annexe (${pole ? pole.libelle : 'Service instructeur'})
                    </div>
                    ${clausesPoleHtml || '<div style="font-size:9pt; color:#64748b;">Aucune clause additionnelle renseignée.</div>'}
                </div>

                ${activePrescriptions ? `
                    <div style="background:#eff6ff; padding:12px; border-left:4px solid #2563eb; border-radius:4px; font-size:9.5pt; margin-bottom:14px;">
                        <strong>Prescriptions particulières applicables à l'Association :</strong><br/>
                        ${activePrescriptions}
                    </div>
                ` : ''}

                ${normType === 'COM_OBJECTIFS' ? `
                <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Indicateurs annuels de réalisation et de suivi :</div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 9pt;">Indicateur / Critère d'activité du Pôle</th>
                            <th style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; font-size: 9pt;">Valeur de référence (${annee})</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${criteresRowsHtml || '<tr><td colspan="2" style="padding:8px; font-size:9pt; text-align:center;">Indicateurs annuels du pôle</td></tr>'}
                    </tbody>
                </table>
                ` : ''}
            </div>

            <!-- ANNEXE 2 : CONTRAT D'ENGAGEMENT RÉPUBLICAIN -->
            <div style="page-break-inside: avoid; margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; background: #fafafa;">
                <div style="font-size: 11pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 8px;">
                    Annexe 2 — Contrat d'Engagement Républicain (Décret n° 2021-1947 du 31 décembre 2021)
                </div>
                <p style="font-size: 8.5pt; color: #475569; margin-bottom: 10px;">
                    Conformément à l'article 10-1 de la loi n° 2000-321 du 12 avril 2000, l'Association s'engage à respecter les sept engagements républicains suivants :
                </p>
                ${cerHtml}
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8.5pt; font-weight: 600; color: #059669;">
                    ✓ Contrat d'Engagement Républicain souscrit par ${structure?.signataire_cer_nom || structure?.representant_nom || 'le représentant habilité'} le ${fin.formatDate(structure?.date_signature_cer || new Date())}.
                </div>
            </div>

            <!-- ANNEXE 3 : FICHE FINANCIÈRE ANNUELLE & CONCOURS EN NATURE -->
            <div style="page-break-before: always; margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px;">
                <div style="font-size: 11pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 10px;">
                    Annexe 3 — Fiche Financière Annuelle (${annee}) & Valorisation des Concours en Nature
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                    <tr style="background: #f8fafc;">
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 9.5pt;"><strong>Subvention financière directe attribuée (Exercice ${annee})</strong></td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 11pt; font-weight: 800; text-align: right; color: #0f172a;">${fin.formatCurrency(montantRetenu)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 9.5pt;"><strong>Valorisation cumulée des concours en nature (Art. L. 2313-1 CGCT)</strong></td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10.5pt; font-weight: 700; text-align: right; color: #059669;">${fin.formatCurrency(totalNature)}</td>
                    </tr>
                    <tr style="background: #eff6ff;">
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10pt; font-weight: 800; color: #1e3a8a;">TOTAL DU SOUTIEN COMMUNAUTAIRE CCMVR (${annee})</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12pt; font-weight: 800; text-align: right; color: #1e3a8a;">${fin.formatCurrency(parseFloat(montantRetenu) + totalNature)}</td>
                    </tr>
                </table>

                <div style="font-size: 9pt; font-weight: 700; color: #334155; margin-bottom: 6px;">Détail des mises à disposition et concours en nature enregistrés :</div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 8.5pt;">Date</th>
                            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 8.5pt;">Nature de la mise à disposition</th>
                            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 8.5pt;">Volume</th>
                            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-size: 8.5pt;">Coût unitaire</th>
                            <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-size: 8.5pt;">Valorisation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${natureRowsHtml || '<tr><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; font-size: 8.5pt; text-align: center;">Aucune prestation en nature enregistrée à ce jour pour l\'exercice</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- BLOC DE SIGNATURES : ISOLÉ SUR SA PROPRE PAGE AVEC RAPPEL DU DOSSIER -->
            <div style="page-break-before: always; break-before: page; margin-top: 24px; padding-top: 14px;">
                <div style="margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 8.5pt; color: #475569;">
                    <div style="font-weight: 800; color: #0f172a; font-size: 9.5pt; text-transform: uppercase; margin-bottom: 4px;">
                        Feuille de Clôture & Signatures Officielles
                    </div>
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <span>Dossier / Acte N° : <strong style="color: #0f172a; font-family: monospace;">#${codeHex}</strong></span>
                        <span>Millésime : <strong style="color: #0f172a;">${annee}</strong></span>
                        <span>Structure : <strong style="color: #0f172a;">${structure?.nom_officiel || structure?.nom_dusage || 'Association'}</strong> (SIREN : ${siren})</span>
                    </div>
                    <div style="margin-top: 4px; font-style: italic; color: #64748b; font-size: 8pt;">
                        Objet : ${activeIntituleObjet} — Montant voté : ${fin.formatCurrency(montantRetenu)}
                    </div>
                </div>
                <p style="font-size: 9.5pt; margin-bottom: 14px;">
                    Fait à Monistrol-sur-Loire, le ${fin.formatDate(new Date())}
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 48%; vertical-align: top; padding-right: 12px;">
                            <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a;">Pour l'Association « ${structure?.nom_dusage || structure?.nom_officiel || ''} »</div>
                            <div style="font-size: 8.5pt; color: #475569;">${structure?.representant_fonction || 'La personne dûment habilitée'} : ${structure?.representant_prenom || ''} ${structure?.representant_nom || ''}</div>
                            ${sigAssoStatus}
                        </td>
                        <td style="width: 4%;"></td>
                        <td style="width: 48%; vertical-align: top; padding-left: 12px;">
                            <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a;">Pour la ${cfg.COLLECTIVITE_NOM}</div>
                            <div style="font-size: 8.5pt; color: #475569;">La Présidente : ${cfg.COLLECTIVITE_PRESIDENTE}</div>
                            ${sigCcmvrStatus}
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        `;
    },

    // 2. Construction HTML de l'Attestation Annuelle d'Aide en Nature (Art. L. 2313-1 CGCT)
    buildAttestationNatureHTML({ structure, annee, prestationsNature }) {
        const cfg = window.CCMVR.CONFIG;
        const fin = window.CCMVR.FinanceEngine;
        const codeCert = fin.generateHexId();
        const siren = (structure?.siret || '').replace(/\s+/g, '').slice(0, 9) || '';
        const totalNature = (prestationsNature || []).reduce((acc, p) => acc + (parseFloat(p.montant_total_valorise) || (parseFloat(p.quantite || 0) * parseFloat(p.tarif_unitaire_applique || 0))), 0);

        const rowsHtml = (prestationsNature || []).map(p => {
            const totalLigne = parseFloat(p.montant_total_valorise) || (parseFloat(p.quantite || 0) * parseFloat(p.tarif_unitaire_applique || 0));
            return `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9.5pt;">${fin.formatDate(p.date_debut)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9.5pt;"><strong>${p.type_libelle || 'Mise à disposition'}</strong><br/><span style="font-size:8.5pt; color:#64748b;">${p.observations || ''}</span></td>
                    <td style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9.5pt; text-align: center;">${p.quantite} ${p.unite || ''}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9.5pt; text-align: right;">${fin.formatCurrency(p.tarif_unitaire_applique)}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9.5pt; font-weight: 700; text-align: right;">${fin.formatCurrency(totalLigne)}</td>
                </tr>
            `;
        }).join('');

        return `
        <div id="official-doc-wrapper" style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 28px; background: #ffffff;">
            <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 24px;">
                <tr>
                    <td style="width: 72%;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <img src="logo-collectivite.png" alt="Logo CCMVR" style="height: 72px; width: auto;" onerror="this.style.display='none'"/>
                            <div>
                                <div style="font-size: 8.5pt; font-weight: 700; text-transform: uppercase; color: #059669;">République Française — Département de la Haute-Loire</div>
                                <div style="font-size: 13pt; font-weight: 800; color: #0f172a;">${cfg.COLLECTIVITE_NOM}</div>
                                <div style="font-size: 8.5pt; color: #475569;">Services Accueil, Bâtiments, Logistique & Systèmes d'Information</div>
                            </div>
                        </div>
                    </td>
                    <td style="width: 28%; text-align: right;">
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                            <div style="font-size: 8pt; color: #0f172a; font-weight: 700;">Attestation ${annee}-${codeCert}</div>
                            <div style="font-size: 7.5pt; color: #64748b;">Exercice ${annee}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 15pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0 0 6px 0;">
                    Attestation Annuelle Valorisée de Concours en Nature
                </h1>
                <div style="font-size: 9.5pt; color: #475569;">
                    Article L. 2313-1 du Code Général des Collectivités Territoriales — Exercice civil ${annee}
                </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 9.5pt; line-height: 1.5;">
                La Présidente de la <strong>${cfg.COLLECTIVITE_NOM}</strong> certifie que l'association ci-après désignée :<br/><br/>
                <strong>Dénomination :</strong> ${structure?.nom_officiel || ''}<br/>
                <strong>N° SIREN :</strong> <span style="font-family:monospace;">${siren}</span> &nbsp;|&nbsp; <strong>SIRET :</strong> <span style="font-family:monospace;">${structure?.siret || ''}</span> &nbsp;|&nbsp; <strong>N° RNA :</strong> <span style="font-family:monospace;">${structure?.rna || ''}</span><br/>
                <strong>Siège social :</strong> ${structure?.adresse_siege || ''}, ${structure?.code_postal || ''} ${structure?.ville || ''}<br/><br/>
                a bénéficié, au cours de l'exercice civil <strong>${annee}</strong>, des mises à disposition gracieuses et prestations techniques communautaires suivantes, valorisées selon le barème en vigueur pour l'exercice ${annee} :
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #0f172a; color: #ffffff;">
                        <th style="border: 1px solid #0f172a; padding: 8px 10px; text-align: left; font-size: 9pt;">Date</th>
                        <th style="border: 1px solid #0f172a; padding: 8px 10px; text-align: left; font-size: 9pt;">Prestation / Équipement / Véhicule</th>
                        <th style="border: 1px solid #0f172a; padding: 8px 10px; text-align: center; font-size: 9pt;">Quantité</th>
                        <th style="border: 1px solid #0f172a; padding: 8px 10px; text-align: right; font-size: 9pt;">Tarif Unitaire (${annee})</th>
                        <th style="border: 1px solid #0f172a; padding: 8px 10px; text-align: right; font-size: 9pt;">Montant Valorisé</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || '<tr><td colspan="5" style="border:1px solid #cbd5e1; padding:12px; text-align:center;">Aucune consommation enregistrée sur l\'exercice</td></tr>'}
                </tbody>
                <tfoot>
                    <tr style="background: #ecfdf5;">
                        <td colspan="4" style="border: 1px solid #10b981; padding: 10px 12px; font-size: 10.5pt; font-weight: 800; color: #065f46; text-align: right;">
                            TOTAL VALORISÉ DES AIDES EN NATURE (${annee}) :
                        </td>
                        <td style="border: 1px solid #10b981; padding: 10px 12px; font-size: 12pt; font-weight: 800; color: #065f46; text-align: right;">
                            ${fin.formatCurrency(totalNature)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div style="font-size: 8.5pt; color: #475569; line-height: 1.5; margin-bottom: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;">
                <strong>Comptabilisation associative :</strong> La présente attestation est délivrée à l'association pour l'enregistrement de ses contributions volontaires en nature (comptes 86 / 87 du plan comptable associatif ANC n° 2018-06) et pour valoir justificatif auprès de ses partenaires institutionnels.
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 24px;">
                <div style="font-size: 9pt; color: #475569;">
                    Fait à Monistrol-sur-Loire, le ${fin.formatDate(new Date())}
                </div>
                <div style="padding: 12px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; text-align: right;">
                    <div style="font-size: 9pt; font-weight: 700; color: #0f172a;">Pour la Présidente de la CCMVR</div>
                    <div style="font-size: 8.5pt; color: #475569; margin-top: 4px;">${cfg.COLLECTIVITE_PRESIDENTE}</div>
                </div>
            </div>
        </div>
        `;
    },

    // 3. Impression / Export PDF Intégral Multi-Pages A4 (Cadrage A4 avec marges garanties et sans coupure)
    wrapOfficialDocumentHTML(htmlContent, documentTitle = 'Convention_CCMVR', isStandalone = false, subventionCode = '') {
        const codeMatch = documentTitle.match(/#?([A-F0-9]{4,8}(?:-AV\d+)?)/i) || htmlContent.match(/#([A-F0-9]{4,8}(?:-AV\d+)?)/i);
        const resolvedCode = subventionCode || (codeMatch ? `#${codeMatch[1].toUpperCase()}` : '');
        const baseHref = (typeof window !== 'undefined' && window.location && window.location.href)
            ? window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1)
            : '';
        return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    ${baseHref ? `<base href="${baseHref}" />` : ''}
    <title>${documentTitle}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 18mm 16mm 24mm 16mm;
            @top-right {
                content: "CC Marches du Velay-Rochebaron • Direction Générale des Services";
                font-family: 'Inter', Calibri, Arial, sans-serif;
                font-size: 7.5pt;
                color: #64748b;
            }
            @bottom-left {
                content: "Convention CCMVR ${resolvedCode ? '• Dossier ' + resolvedCode : ''} — Réf. Contrôle de Gestion";
                font-family: 'Inter', Calibri, Arial, sans-serif;
                font-size: 8pt;
                color: #475569;
            }
            @bottom-right {
                content: "Page " counter(page) " sur " counter(pages);
                font-family: 'Inter', Calibri, Arial, sans-serif;
                font-size: 8pt;
                font-weight: 700;
                color: #0f172a;
            }
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .a4-print-sheet {
            width: 100%;
            padding: 6mm 10mm;
            margin: 0 auto;
        }
        #official-doc-wrapper {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        div, tr, p, h1, h2, h3, h4 {
            orphans: 3;
            widows: 3;
        }
        div[style*="page-break-inside: avoid"], tr, .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        .force-break {
            break-before: page !important;
            page-break-before: always !important;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        thead.print-header {
            display: table-header-group;
        }
        tfoot.print-footer {
            display: table-footer-group;
        }
        @media print {
            .no-print-bar {
                display: none !important;
            }
            body {
                background: #ffffff !important;
            }
            .a4-print-sheet {
                padding: 2mm 6mm !important;
            }
        }
        @media screen {
            ${isStandalone ? `
            body {
                background: #f8fafc;
                padding: 24px;
            }
            .a4-print-sheet {
                max-width: 210mm !important;
                background: #ffffff;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                border-radius: 8px;
                padding: 20mm !important;
                margin: 0 auto !important;
            }
            ` : `
            body {
                background: #334155;
                padding: 68px 24px 40px 24px;
            }
            .no-print-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 54px;
                background: #0f172a;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 24px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                z-index: 9999;
                font-size: 13px;
            }
            .a4-print-sheet {
                max-width: 210mm !important;
                min-height: 297mm;
                margin: 0 auto !important;
                padding: 18mm 18mm !important;
                background: #ffffff;
                box-shadow: 0 16px 40px rgba(0,0,0,0.35);
                border-radius: 6px;
            }
            `}
        }
    </style>
</head>
<body>
    ${isStandalone ? '' : `
    <div class="no-print-bar">
        <div>
            <strong style="color:#93c5fd;">Aperçu Officiel A4 Multi-Pages :</strong>
            <span style="margin-left:8px; font-family:monospace; font-size:12px;">${documentTitle}.pdf</span>
        </div>
        <div style="display:flex; gap:10px;">
            <button onclick="window.print()" style="background:#2563eb; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer; font-size:12px;">
                🖨️ Imprimer / Enregistrer en PDF
            </button>
            <button onclick="window.close()" style="background:#334155; color:#fff; border:1px solid #475569; padding:8px 14px; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px;">
                ✕ Fermer l'aperçu
            </button>
        </div>
    </div>
    `}
    <div class="a4-print-sheet">
        ${htmlContent}
    </div>
    ${isStandalone ? '' : `
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.focus();
                window.print();
            }, 400);
        };
    <\/script>
    `}
</body>
</html>`;
    },


    // 1 bis. Construction HTML officielle de l'Avenant Modificateur (Acte bilatéral rattaché à la convention mère)
    buildAvenantHTML({ convention, dossier, structure, pole, prestationsNature }) {
        const cfg = window.CCMVR.CONFIG;
        const fin = window.CCMVR.FinanceEngine;
        const store = window.CCMVR.Store;

        const numAv = convention.numero_avenant || 1;
        const parentConv = convention.parentConvention || (convention.parent_convention_id ? store.state.conventions.find(c => c.id === convention.parent_convention_id) : null);
        const parentCodeHex = parentConv?.code_hex || (convention.code_hex ? convention.code_hex.split('-AV')[0] : 'ACTE');
        const codeHex = convention.code_hex || `${parentCodeHex}-AV${numAv}`;
        const annee = convention.annee || parentConv?.annee || cfg.ANNEE_PAR_DEFAUT;
        const siren = (structure?.siret || '').replace(/\s+/g, '').slice(0, 9) || 'Non renseigné';

        const montantInitial = parseFloat(convention.montant_initial !== undefined ? convention.montant_initial : (parentConv?.montant || parentConv?.montant_vote || 0)) || 0;
        const montantDelta = parseFloat(convention.montant_delta || 0);
        const montantNouveau = parseFloat(convention.montant_nouveau !== undefined ? convention.montant_nouveau : (montantInitial + montantDelta)) || 0;
        const cumulAnnuel = store.getCumulAnnuelStructure(structure?.id, annee);

        const isSoumisCdg = Boolean(convention.soumis_visa_cdg);
        const isViseCdg = convention.statut_visa_cdg === 'VISE_CDG';

        const scanInfo = convention && (convention.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${convention.id}`));
        const scanData = convention && (convention.scan_signe_data || localStorage.getItem(`ccmvr_scan_data_${convention.id}`));
        const isScanImage = scanData && (scanData.startsWith('data:image/') || (scanInfo && (scanInfo.toLowerCase().endsWith('.png') || scanInfo.toLowerCase().endsWith('.jpg') || scanInfo.toLowerCase().endsWith('.jpeg'))));

        const isAssoSigned = Boolean(convention && (convention.date_signature_asso || convention.audit_signature_asso || convention.statut_signature === 'SIGNE_ASSO' || (convention.statut_signature === 'VALIDE' && convention.date_signature_asso)));
        const isPresSigned = Boolean(convention && (convention.date_signature_ccmvr || scanInfo || convention.statut_signature === 'SIGNE_CCMVR' || convention.isSignePresidente));

        const visaBanner = isSoumisCdg
            ? (isViseCdg
                ? `<div style="background:#f0fdf4; border:1px solid #16a34a; color:#166534; padding:10px 14px; border-radius:6px; font-size:8.5pt; margin-bottom:16px;">
                     <strong>✓ AVENANT SOUMIS AU CONTRÔLE DE GESTION (SEUIL 23 000 €) — VISÉ LE ${fin.formatDate(convention.date_visa_cdg || new Date())}</strong><br/>
                     Conformité juridique et financière validée par le Contrôle de Gestion de la CCMVR (${convention.vise_par || 'Visa accordé'}).
                   </div>`
                : `<div style="background:#fff1f2; border:1px solid #e11d48; color:#9f1239; padding:10px 14px; border-radius:6px; font-size:8.5pt; margin-bottom:16px;">
                     <strong>⚠️ AVENANT SOUMIS AU CONTRÔLE DE GESTION (SEUIL 23 000 €) — EN ATTENTE DU VISA CDG</strong><br/>
                     Cet avenant porte le cumul annuel des subventions attribuées à l'association à ${fin.formatCurrency(cumulAnnuel)} (seuil légal de 23 000 € dépassé). Il doit être visé préalablement par le Contrôle de Gestion avant toute signature officielle.
                   </div>`)
            : '';

        const articles = Array.isArray(convention.articles) && convention.articles.length > 0
            ? convention.articles
            : (cfg.AVENANT_MODELE_DEFAUT?.articles || []);

        const articlesHtml = articles.map((a, idx) => `
            <div style="margin-bottom: 16px; page-break-inside: avoid;">
                <h4 style="font-size: 10.5pt; font-weight: 700; color: #1e3a8a; margin: 0 0 6px 0; text-transform: uppercase;">
                    ${a.titre || `Article ${idx + 1}`}
                </h4>
                <p style="font-size: 9.8pt; line-height: 1.55; color: #1e293b; margin: 0; text-align: justify;">
                    ${a.contenu}
                </p>
            </div>
        `).join('');

        const sigAssoStatus = isAssoSigned
            ? `<div style="margin-top:8px; padding:10px; background:#ecfdf5; border:1px solid #10b981; border-radius:6px; font-size:8.5pt; color:#065f46; break-inside:avoid; page-break-inside:avoid;">
                 <strong>✓ SIGNÉ ÉLECTRONIQUEMENT PAR L'ASSOCIATION (SES)</strong><br/>
                 Signataire : ${convention.audit_signature_asso?.signataire_nom || `${structure?.representant_prenom || ''} ${structure?.representant_nom || ''}`} (${structure?.representant_fonction || 'Président(e)'})<br/>
                 Date & Horodatage : ${fin.formatDate(convention.date_signature_asso || new Date())}<br/>
                 ${convention.audit_signature_asso?.email ? `Courriel de validation : ${convention.audit_signature_asso.email}<br/>` : ''}
                 <span style="font-family:monospace; font-size:7.5pt; color:#047857;">Empreinte certifiée : ${convention.audit_signature_asso?.hash || `eIDAS-CCMVR-${annee}-${codeHex}-ASSO`}</span>
               </div>`
            : `<div style="margin-top:10px; min-height:85px; border:1px dashed #94a3b8; border-radius:6px; padding:8px; font-size:8pt; color:#475569; break-inside:avoid; page-break-inside:avoid;">
                 Signature manuscrite et cachet de l'Association :<br/>
                 <em>(Précédée de la mention « Lu et approuvé »)</em>
                 <div style="margin-top:6px; font-size:7.5pt; font-weight:bold; color:${convention?.isTransmisAsso ? '#059669' : '#d97706'};">
                     ${convention?.isTransmisAsso ? '📲 Prêt pour signature électronique de l\'association' : '⏳ En attente de validation préalable et transmission par le pôle'}
                 </div>
               </div>`;

        const sigCcmvrStatus = scanInfo
            ? `<div style="margin-top:8px; padding:10px; background:#eff6ff; border:2px solid #2563eb; border-radius:6px; font-size:8.5pt; color:#1e40af; break-inside:avoid; page-break-inside:avoid;">
                 <div style="font-weight:800; color:#1e3a8a; text-transform:uppercase; font-size:8pt; letter-spacing:0.03em;">✓ Acte original paraphé & signé par Madame la Présidente</div>
                 <div style="margin-top:2px; font-size:9pt; font-weight:700; color:#0f172a;">${cfg.COLLECTIVITE_PRESIDENTE}</div>
                 <div style="font-size:7.5pt; color:#475569;">Présidente de la Communauté de Communes Marches du Velay Rochebaron</div>
                 ${isScanImage ? `
                     <div style="margin:8px 0; text-align:center; padding:6px; background:#ffffff; border:1px solid #93c5fd; border-radius:6px;">
                         <img src="${scanData}" alt="Signature Présidente" style="max-height:160px; max-width:100%; object-fit:contain; display:inline-block;" />
                     </div>
                 ` : scanData ? `
                     <div style="margin:8px 0; background:#ffffff; border:1px solid #93c5fd; border-radius:6px; overflow:hidden;">
                         <div style="padding:4px 8px; background:#dbeafe; font-size:7.5pt; font-weight:bold; color:#1e40af; display:flex; justify-content:space-between; align-items:center;">
                             <span>📄 Feuille de signature originale scannée :</span>
                             <button type="button" onclick="CCMVR.App.openArchivedSignedScan('${convention.id}')" style="background:#1d4ed8; color:#fff; border:none; border-radius:3px; padding:2px 6px; font-size:7pt; cursor:pointer;">Plein écran ↗</button>
                         </div>
                         <iframe src="${scanData}#toolbar=0" style="width:100%; height:320px; border:none;"></iframe>
                     </div>
                 ` : `
                     <div style="margin-top:4px; font-size:7.5pt; color:#2563eb; font-family:monospace;">Acte scanné archivé : ${scanInfo}</div>
                 `}
                 <div style="margin-top:4px; font-size:7.5pt; color:#3b82f6; border-top:1px solid #bfdbfe; padding-top:3px;">
                     Délibération-cadre : ${cfg.DELIBERATION_CADRE} • Le ${fin.formatDate(convention.date_signature_ccmvr || new Date())}
                 </div>
               </div>`
            : isPresSigned
            ? `<div style="margin-top:8px; padding:10px; background:#eff6ff; border:1px solid #3b82f6; border-radius:6px; font-size:8.5pt; color:#1e40af; break-inside:avoid; page-break-inside:avoid;">
                 <strong>✓ SIGNÉ NUMÉRIQUEMENT PAR LA COLLECTIVITÉ</strong><br/>
                 Signataire : ${cfg.COLLECTIVITE_PRESIDENTE}, Présidente de la CCMVR<br/>
                 Habilitation : Délibération ${cfg.DELIBERATION_CADRE}<br/>
                 Date & Horodatage : ${fin.formatDate(convention.date_signature_ccmvr || new Date())}<br/>
                 <span style="font-family:monospace; font-size:7.5pt; color:#1d4ed8;">Empreinte : eIDAS-CCMVR-${annee}-${codeHex}-PRES</span>
               </div>`
            : `<div style="margin-top:10px; height:85px; border:1px dashed #94a3b8; border-radius:6px; padding:8px; font-size:8pt; color:#475569; break-inside:avoid; page-break-inside:avoid;">
                 Signature manuscrite de la Présidente de la CCMVR et cachet :
               </div>`;

        return `
        <div id="official-doc-wrapper" style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 24px; background: #ffffff;">
            <!-- EN-TÊTE INSTITUTIONNEL -->
            <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
                <tr>
                    <td style="width: 72%; vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <img src="logo-collectivite.png" alt="Logo CCMVR" style="height: 76px; width: auto; object-fit: contain;" onerror="this.style.display='none'"/>
                            <div>
                                <div style="font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e3a8a;">République Française — Département de la Haute-Loire</div>
                                <div style="font-size: 13pt; font-weight: 800; color: #0f172a;">${cfg.COLLECTIVITE_NOM}</div>
                                <div style="font-size: 9pt; color: #475569;">${pole ? pole.libelle : 'Direction Générale des Services'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="width: 28%; text-align: right; vertical-align: top;">
                        <div style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; text-align: right;">
                            <div style="font-size: 8pt; color: #1e3a8a; font-weight: 800;">AVENANT N° ${numAv}</div>
                            <div style="font-size: 7.5pt; color: #475569; font-weight: 600;">Convention mère : #${parentCodeHex}</div>
                            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Exercice ${annee}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- TITRE DE L'AVENANT -->
            <div style="background: #1e1b4b; color: #ffffff; padding: 18px 20px; border-radius: 8px; text-align: center; margin-bottom: 22px;">
                <div style="font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.08em; color: #c7d2fe; font-weight: 700;">
                    AVENANT N° ${numAv} MODIFICATIF À LA CONVENTION N° ${annee}-${parentCodeHex}
                </div>
                <h1 style="font-size: 15pt; font-weight: 800; margin: 8px 0;">
                    ${structure ? structure.nom_officiel : 'ASSOCIATION PARTENAIRE'}
                </h1>
                <div style="font-size: 9.5pt; color: #e2e8f0; margin-bottom: 4px; font-weight: 600;">
                    Objet : ${convention.objet_avenant || 'Modification des conditions d\'accompagnement et des dispositions financières'}
                </div>
                <div style="font-size: 9pt; color: #cbd5e1;">
                    Période d'effet : Année budgétaire ${annee}
                </div>
            </div>

            ${visaBanner}

            <!-- COMPARUTION DES PARTIES -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 9.5pt; line-height: 1.5;">
                <p style="margin: 0 0 10px 0;"><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
                <p style="margin: 0 0 10px 0;">
                    <strong>La ${cfg.COLLECTIVITE_NOM} (${cfg.COLLECTIVITE_SIGLE})</strong>, établissement public de coopération intercommunale, dont le siège est situé ${cfg.COLLECTIVITE_ADRESSE}, représentée par sa Présidente en exercice, <strong>${cfg.COLLECTIVITE_PRESIDENTE}</strong>, habilitée par délibération du Conseil Communautaire n° ${cfg.DELIBERATION_CADRE},<br/>
                    <em>Ci-après dénommée « la CCMVR », d'une part,</em>
                </p>
                <p style="margin: 0 0 6px 0;"><strong>ET :</strong></p>
                <p style="margin: 0;">
                    L'Association <strong>« ${structure?.nom_officiel || 'À COMPLÉTER'} »</strong>, association régie par la loi du 1er juillet 1901,<br/>
                    <strong>N° SIREN :</strong> <span style="font-family:monospace;">${siren}</span> &nbsp;|&nbsp; <strong>SIRET Siège :</strong> <span style="font-family:monospace;">${structure?.siret || 'Non renseigné'}</span><br/>
                    <strong>Siège social :</strong> ${structure?.adresse_siege || ''}, ${structure?.code_postal || ''} ${structure?.ville || ''}<br/>
                    Représentée par <strong>${structure?.representant_prenom || ''} ${structure?.representant_nom || 'À compléter'}</strong>, agissant en qualité de <strong>${structure?.representant_fonction || 'Président(e) / Personne dûment habilitée'}</strong>,<br/>
                    <em>Ci-après dénommée « l'Association », d'autre part.</em>
                </p>
            </div>

            <!-- EXPOSÉ PRÉALABLE -->
            <div style="margin-bottom: 20px; font-size: 9.5pt; line-height: 1.55; color: #334155; padding: 12px 16px; background: #fafafa; border-left: 3px solid #6366f1; border-radius: 4px;">
                <strong>EXPOSÉ DES MOTIFS :</strong><br/>
                Par convention initiale enregistrée sous le n° <strong>${parentCodeHex}</strong>, la CCMVR et l'Association ont défini le cadre de leur partenariat pour l'accomplissement des missions associatives d'intérêt intercommunal.
                Les parties ont convenu d'adapter les modalités contractuelles pour tenir compte des nouveaux besoins et des ajustements validés. En conséquence, il est arrêté et convenu ce qui suit :
            </div>

            <!-- SYNTHÈSE FINANCIÈRE DE L'AVENANT -->
            <div style="margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                <div style="background: #f1f5f9; padding: 10px 14px; font-size: 10pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase;">
                    Tableau Récapitulatif des Incidences Financières de l'Avenant N° ${numAv}
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px 14px; color: #475569;">Montant initial de la subvention (Convention #${parentCodeHex})</td>
                        <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #0f172a;">${fin.formatCurrency(montantInitial)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0; background: #faf5ff;">
                        <td style="padding: 10px 14px; color: #6b21a8; font-weight: 600;">Complément / Variation financière apportée par le présent Avenant</td>
                        <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #6b21a8;">${montantDelta >= 0 ? '+' : ''}${fin.formatCurrency(montantDelta)}</td>
                    </tr>
                    <tr style="background: #f0fdf4; border-bottom: 1px solid #cbd5e1;">
                        <td style="padding: 10px 14px; color: #166534; font-weight: 800;">Nouveau montant consolidé alloué au titre de l'exercice ${annee}</td>
                        <td style="padding: 10px 14px; text-align: right; font-weight: 900; font-size: 11pt; color: #166534;">${fin.formatCurrency(montantNouveau)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 14px; font-size: 8.5pt; color: #64748b;">Cumul annuel consolidé des concours CCMVR attribués à l'Association sur ${annee}</td>
                        <td style="padding: 8px 14px; text-align: right; font-size: 8.5pt; font-weight: 700; color: #475569;">${fin.formatCurrency(cumulAnnuel)} ${isSoumisCdg ? '(Seuil légal 23 000 € atteint)' : ''}</td>
                    </tr>
                </table>
            </div>

            <!-- ARTICLES DE L'AVENANT -->
            <div style="margin-bottom: 24px;">
                <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 14px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size: 10.5pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase;">
                        Dispositions Contractuelles Modificatives
                    </span>
                    <span style="font-size: 8pt; color: #64748b; font-weight: 600;">
                        Articles spécifiques de l'Avenant n° ${numAv}
                    </span>
                </div>
                ${articlesHtml}
            </div>

            <!-- FEUILLE DE CLÔTURE & SIGNATURES : SUR SA PROPRE PAGE AVEC RAPPEL DU DOSSIER -->
            <div style="page-break-before: always; break-before: page; margin-top: 24px; padding-top: 14px;">
                <div style="margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 8.5pt; color: #475569;">
                    <div style="font-weight: 800; color: #0f172a; font-size: 9.5pt; text-transform: uppercase; margin-bottom: 4px;">
                        Feuille de Clôture & Signatures de l'Avenant N° ${numAv}
                    </div>
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <span>Acte N° : <strong style="color: #0f172a; font-family: monospace;">#${codeHex}</strong></span>
                        <span>Convention d'origine : <strong style="color: #0f172a; font-family: monospace;">#${parentCodeHex}</strong></span>
                        <span>Structure : <strong style="color: #0f172a;">${structure?.nom_officiel || structure?.nom_dusage || 'Association'}</strong> (SIREN : ${siren})</span>
                    </div>
                    <div style="margin-top: 4px; font-style: italic; color: #64748b; font-size: 8pt;">
                        Objet : ${convention.objet_avenant || 'Avenant modificateur'} — Montant consolidé : ${fin.formatCurrency(montantNouveau)}
                    </div>
                </div>
                <p style="font-size: 9.5pt; margin-bottom: 14px;">
                    Fait à Monistrol-sur-Loire, en deux exemplaires originaux, le ${fin.formatDate(new Date())}
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                            <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                                Pour la ${cfg.COLLECTIVITE_NOM}
                            </div>
                            <div style="font-size: 8pt; color: #475569; margin-bottom: 6px;">
                                La Présidente, ${cfg.COLLECTIVITE_PRESIDENTE}
                            </div>
                            ${sigCcmvrStatus}
                        </td>
                        <td style="width: 50%; vertical-align: top; padding-left: 12px;">
                            <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                                Pour l'Association Partenaire
                            </div>
                            <div style="font-size: 8pt; color: #475569; margin-bottom: 6px;">
                                Le / La Représentant(e) légal(e) habilité(e)
                            </div>
                            ${sigAssoStatus}
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        `;
    },

    printOfficialDocument(htmlContent, documentTitle = 'Convention_CCMVR') {
        const printWin = window.open('', '_blank', 'width=1020,height=920');
        if (!printWin) {
            window.print();
            return;
        }
        printWin.document.open();
        printWin.document.write(this.wrapOfficialDocumentHTML(htmlContent, documentTitle, false));
        printWin.document.close();
    },

    // 4. Exportation en fichier Microsoft Word (.doc) réservée aux brouillons si autorisée
    exportToWord(htmlContent, filenameBase) {
        const cleanName = (filenameBase || 'Convention_CCMVR').replace(/[^a-zA-Z0-9_\-]/g, '_') + '.doc';
        const wordDoc = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                  xmlns:w='urn:schemas-microsoft-com:office:word' 
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${cleanName}</title>
                <style>
                    @page { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 2cm; }
                    body { font-family: Calibri, Arial, sans-serif; font-size: 10.5pt; color: #0f172a; }
                    table { border-collapse: collapse; width: 100%; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
