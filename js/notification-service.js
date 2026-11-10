// ==============================================================================
// SERVICE DE NOTIFICATIONS & E-MAILS TRANSACTIONNELS CCMVR
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================
// Gère l'envoi des avis officiels, confirmations d'instruction, notifications de
// vote au Conseil Communautaire, invitations à signature et réinitialisation de mdp.
// Passerelle : Supabase Edge Function "send-email" -> Relais SMTP Brevo
// ==============================================================================

window.CCMVR = window.CCMVR || {};

window.CCMVR.NotificationService = {

    /**
     * Envoi bas-niveau vers l'Edge Function Supabase
     */
    async sendEmail({ to, recipientName, subject, htmlContent, textContent }) {
        const config = window.CCMVR.CONFIG;
        if (!config || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            console.warn('[NotificationService] Configuration Supabase manquante.');
            return { success: false, error: 'Configuration Supabase manquante' };
        }

        const cleanTo = (to || '').trim();
        if (!cleanTo || !cleanTo.includes('@')) {
            console.warn('[NotificationService] Adresse destinataire invalide :', to);
            return { success: false, error: 'Adresse e-mail destinataire invalide' };
        }

        const endpoint = `${config.SUPABASE_URL}/functions/v1/send-email`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'apikey': config.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    to: cleanTo,
                    recipientName: recipientName || cleanTo,
                    subject: subject,
                    htmlContent: htmlContent,
                    textContent: textContent || undefined
                })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                console.log(`[NotificationService] ✓ E-mail envoyé avec succès à ${cleanTo} (ID: ${data.messageId})`);
                return { success: true, messageId: data.messageId };
            } else {
                console.warn(`[NotificationService] ⚠️ Échec d'envoi à ${cleanTo} :`, data);
                return { success: false, error: data.error || 'Erreur inconnue' };
            }
        } catch (err) {
            console.error('[NotificationService] Exception réseau lors de l\'envoi :', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Matrice HTML institutionnelle CCMVR aux couleurs de la collectivité
     */
    buildEmailTemplate({ badgeText, title, subtitle, contentHtml, ctaText, ctaUrl, noticeText }) {
        const primaryColor = '#0f766e'; // Vert sarcelle officiel CCMVR
        const darkColor = '#0f172a';
        const lightBg = '#f8fafc';

        return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: ${lightBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center">
                <table width="620" border="0" cellspacing="0" cellpadding="0" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <!-- Entête Institutionnelle -->
                    <tr>
                        <td style="background: ${primaryColor}; padding: 24px 30px; color: #ffffff;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #99f6e4; margin-bottom: 4px;">
                                            Communauté de Communes Marches du Velay Rochebaron
                                        </div>
                                        <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                                            ${title}
                                        </h1>
                                        ${subtitle ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #ccfbf1;">${subtitle}</p>` : ''}
                                    </td>
                                    ${badgeText ? `
                                    <td align="right" valign="top">
                                        <span style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.3);">
                                            ${badgeText}
                                        </span>
                                    </td>` : ''}
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Corps du message -->
                    <tr>
                        <td style="padding: 28px 30px;">
                            ${contentHtml}

                            ${ctaText && ctaUrl ? `
                            <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                                <tr>
                                    <td align="center" style="border-radius: 8px; background: ${primaryColor};">
                                        <a href="${ctaUrl}" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 26px; display: inline-block;">
                                            ${ctaText} &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>` : ''}

                            <!-- Signature officielle -->
                            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.6;">
                                <strong style="color: ${darkColor};">Pôle Contrôle de Gestion & Vie Associative</strong><br>
                                Communauté de Communes Marches du Velay Rochebaron<br>
                                ZA La Borie 1, 9 rue de l'Épée, BP 7060, 43120 Monistrol-sur-Loire<br>
                                Tél. : 04 71 61 74 34 &bull; Courriel : contact@marchesduvelayrochebaron.fr
                            </div>
                        </td>
                    </tr>

                    <!-- Pied de page mentions légales & RGPD -->
                    <tr>
                        <td style="background: #f8fafc; padding: 14px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                            ${noticeText || 'Cet avis est une notification officielle automatisée émise par la CCMVR dans le cadre de l\'instruction des conventions de subventions. Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d\'un droit d\'accès et de rectification auprès de la collectivité.'}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    },

    // =========================================================================
    // 1. NOTIFICATION DE CRÉATION DE NOUVEAU COMPTE ASSOCIATION
    // =========================================================================
    async notifyNewAccountCreated(accountData) {
        const recipientEmail = accountData.email || accountData.email_contact;
        const nomAsso = accountData.nom_officiel || accountData.nom_dusage || 'Association';
        const repName = `${accountData.representant_prenom || ''} ${accountData.representant_nom || ''}`.trim() || 'Madame, Monsieur le Président';

        const subject = `[CCMVR] Confirmation de création de votre compte association — ${nomAsso}`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Bonjour <b>${repName}</b>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Nous vous confirmons la création réussie de votre espace association sur le 
                <b>Portail Intercommunal des Subventions & Conventions</b> de la Communauté de Communes Marches du Velay Rochebaron.
            </p>

            <div style="background: #f0fdfa; border-left: 4px solid #0f766e; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0f766e;">Récapitulatif de votre profil :</p>
                <ul style="margin: 8px 0 0 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.7;">
                    <li><b>Association :</b> ${nomAsso}</li>
                    <li><b>SIRET :</b> ${accountData.siret || 'En cours'}</li>
                    ${accountData.rna ? `<li><b>Numéro RNA :</b> ${accountData.rna}</li>` : ''}
                    <li><b>Identifiant de connexion :</b> ${recipientEmail}</li>
                    <li><b>Contrat d'Engagement Républicain (CER) :</b> Signé & rattaché</li>
                </ul>
            </div>

            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Vous pouvez dès à présent déposer vos demandes de subventions pour l'exercice 2026/2027, solliciter des prêts de véhicules communautaires (minibus) ou réserver des équipements.
            </p>
        `;

        const html = this.buildEmailTemplate({
            badgeText: 'Compte Activé',
            title: 'Bienvenue sur le Portail CCMVR',
            subtitle: 'Création de compte association & accès extranet',
            contentHtml
        });

        return await this.sendEmail({
            to: recipientEmail,
            recipientName: nomAsso,
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 2. VALIDATION AU FIL DE L'EAU : AVIS PÔLE MÉTIER (< 23 000 € vs >= 23 000 €)
    // =========================================================================
    async notifyDossierAvisPole({ dossier, structure, montant, isHigh, notes }) {
        const recipientEmail = structure?.email_contact || dossier?.email_demandeur || 'contact@marchesduvelayrochebaron.fr';
        const nomAsso = structure?.nom_officiel || 'Association';
        const formattedMontant = window.CCMVR.FinanceEngine.formatCurrency(montant);
        const codeDossier = dossier.code_hex || dossier.id?.substring(0, 8);

        const subject = isHigh
            ? `[CCMVR] Avis Pôle Favorable (${formattedMontant}) — Dossier #${codeDossier} en transmission CDG`
            : `[CCMVR] Avis Pôle Favorable (${formattedMontant}) — Dossier #${codeDossier} validé`;

        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Madame, Monsieur le Président,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Le service instructeur thématique a examiné avec bienveillance votre demande de concours public pour le projet <b>${dossier.intitule_projet || 'Subvention d\'exploitation'}</b>.
            </p>

            <div style="background: #f0fdfa; border-left: 4px solid #0f766e; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0f766e;">Décision du Pôle Métier :</p>
                <ul style="margin: 8px 0 0 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.7;">
                    <li><b>Dossier :</b> #${codeDossier} — ${nomAsso}</li>
                    <li><b>Avis instructeur :</b> Favorable</li>
                    <li><b>Montant proposé :</b> <span style="font-size: 15px; font-weight: 800; color: #0f766e;">${formattedMontant}</span></li>
                    <li><b>Circuit réglementaire :</b> ${isHigh ? 'Procédure renforcée (≥ 23 000 €) — Transmis au Contrôle de Gestion pour visa' : 'Procédure allégée (< 23 000 €) — Transmis pour arbitrage en commission'}</li>
                </ul>
            </div>

            ${notes ? `
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #475569;">
                <b>Remarques du pôle instructeur :</b><br>${notes}
            </div>` : ''}

            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
                ${isHigh 
                    ? 'Conformément au Décret n° 2001-495 du 6 juin 2001, ce dossier fait l\'objet d\'un examen de conformité financière par le Contrôleur de Gestion avant son arbitrage définitif.'
                    : 'Votre dossier sera soumis à la prochaine commission d\'arbitrage avant présentation au Conseil Communautaire.'}
            </p>
        `;

        const html = this.buildEmailTemplate({
            badgeText: isHigh ? 'Avis Pôle ≥ 23 k€' : 'Avis Pôle Favorable',
            title: 'Instruction de votre Dossier',
            subtitle: `Dossier #${codeDossier} — ${nomAsso}`,
            contentHtml
        });

        return await this.sendEmail({
            to: recipientEmail,
            recipientName: nomAsso,
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 3. VISA DU CONTRÔLE DE GESTION APPOSÉ (Dossiers >= 23 000 €)
    // =========================================================================
    async notifyDossierVisaCdg({ dossier, structure, montant, notes }) {
        const recipientEmail = structure?.email_contact || dossier?.email_demandeur || 'contact@marchesduvelayrochebaron.fr';
        const nomAsso = structure?.nom_officiel || 'Association';
        const formattedMontant = window.CCMVR.FinanceEngine.formatCurrency(montant);
        const codeDossier = dossier.code_hex || dossier.id?.substring(0, 8);

        const subject = `[CCMVR] Visa Contrôle de Gestion apposé — Dossier #${codeDossier} (${formattedMontant})`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Madame, Monsieur le Président,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Nous vous informons que le <b>Contrôle de Gestion de la CCMVR</b> a vérifié et validé la conformité financière et juridique de votre dossier de conventionnement de subvention (seuil supérieur à 23 000 €).
            </p>

            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #1e40af;">Visa Réglementaire CDG :</p>
                <ul style="margin: 8px 0 0 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.7;">
                    <li><b>Dossier :</b> #${codeDossier} — ${nomAsso}</li>
                    <li><b>Visa budgétaire :</b> Conforme sans réserve (Loi du 12 avril 2000 & Décret 2001-495)</li>
                    <li><b>Montant visé :</b> <span style="font-size: 15px; font-weight: 800; color: #1e40af;">${formattedMontant}</span></li>
                    <li><b>Prochaine étape :</b> Passage en Commission d'Arbitrage des subventions</li>
                </ul>
            </div>

            ${notes ? `
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #475569;">
                <b>Avis du Contrôleur de Gestion :</b><br>${notes}
            </div>` : ''}
        `;

        const html = this.buildEmailTemplate({
            badgeText: 'Visa CdG Validé',
            title: 'Visa Réglementaire Contrôle de Gestion',
            subtitle: `Dossier #${codeDossier} — Seuil légal 23 000 € validé`,
            contentHtml
        });

        return await this.sendEmail({
            to: recipientEmail,
            recipientName: nomAsso,
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 4. VOTE EN CONSEIL COMMUNAUTAIRE & CONVENTION PRÊTE POUR SIGNATURE
    // =========================================================================
    async notifyDossierVotedCouncil({ dossier, structure, convention, montant, delibRef }) {
        const recipientEmail = structure?.email_contact || dossier?.email_demandeur || 'contact@marchesduvelayrochebaron.fr';
        const nomAsso = structure?.nom_officiel || 'Association';
        const formattedMontant = window.CCMVR.FinanceEngine.formatCurrency(montant);
        const codeDossier = dossier.code_hex || dossier.id?.substring(0, 8);
        const refDelib = delibRef || window.CCMVR.CONFIG.DELIBERATION_CADRE || 'Délibération du Conseil Communautaire 2026';

        const subject = `[CCMVR] Subvention adoptée en Conseil Communautaire — ${nomAsso} (${formattedMontant})`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Madame, Monsieur le Président,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Nous avons le plaisir de vous informer que le <b>Conseil Communautaire de la Communauté de Communes Marches du Velay Rochebaron</b> 
                a officiellement adopté l'attribution de votre concours public pour l'exercice <b>2026/2027</b>.
            </p>

            <div style="background: #f0fdfa; border-left: 4px solid #0f766e; padding: 18px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f766e;">Décision officielle du Conseil Communautaire :</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
                    <li><b>Association bénéficiaire :</b> ${nomAsso}</li>
                    <li><b>Montant définitif voté :</b> <span style="font-size: 16px; font-weight: 800; color: #0f766e;">${formattedMontant}</span></li>
                    <li><b>Référence de délibération :</b> ${refDelib}</li>
                    <li><b>Acte contractuel :</b> Convention d'objectifs et de moyens ou avenant annuel</li>
                </ul>
            </div>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                ℹ️ <b>Prochaine étape — Finalisation et signature de la convention :</b><br>
                Votre convention est actuellement en cours de formalisation par le Pôle Métier compétent et de signature par Madame la Présidente de la CCMVR.<br>
                <b>Dès que les services auront validé son envoi officiel</b>, vous recevrez un courriel vous invitant à vous connecter pour procéder à sa signature électronique sécurisée (code OTP).
            </div>
        `;

        const html = this.buildEmailTemplate({
            badgeText: 'Voté en Conseil',
            title: 'Subvention Adoptée en Conseil',
            subtitle: `Délibération officielle de la CCMVR — ${nomAsso}`,
            contentHtml
        });

        return await this.sendEmail({
            to: recipientEmail,
            recipientName: nomAsso,
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 5. MOT DE PASSE OUBLIÉ & CODE DE SÉCURITÉ DE RÉINITIALISATION
    // =========================================================================
    async sendPasswordResetCode({ email, code, expireMinutes = 15 }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const subject = `[CCMVR] Votre code de réinitialisation de mot de passe : ${code}`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Bonjour,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Une demande de réinitialisation de mot de passe a été initiée pour le compte associé à l'adresse <b>${cleanEmail}</b> 
                sur le Portail des Subventions & Conventions de la CCMVR.
            </p>

            <div style="background: #f8fafc; border: 2px dashed #0f766e; padding: 20px; text-align: center; border-radius: 8px; margin: 24px 0;">
                <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">
                    Votre code de sécurité temporaire :
                </span>
                <span style="font-family: monospace, Courier; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f766e; background: #ffffff; padding: 8px 18px; border-radius: 6px; border: 1px solid #cbd5e1; display: inline-block;">
                    ${code}
                </span>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
                    Ce code est valable pendant <b>${expireMinutes} minutes</b>.
                </p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel reste inchangé.
            </p>
        `;

        const html = this.buildEmailTemplate({
            badgeText: 'Sécurité Authentification',
            title: 'Réinitialisation de Mot de Passe',
            subtitle: 'Code de vérification temporaire',
            contentHtml,
            noticeText: 'Pour votre sécurité, ne transmettez jamais ce code de vérification à un tiers.'
        });

        return await this.sendEmail({
            to: cleanEmail,
            recipientName: cleanEmail,
            subject,
            htmlContent: html
        });
    },

    async sendPasswordResetConfirmation({ email }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const subject = `[CCMVR] Votre mot de passe a été modifié avec succès`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Bonjour,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Nous vous confirmons que le mot de passe de votre compte (<b>${cleanEmail}</b>) a été modifié avec succès.
            </p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Vous pouvez désormais vous connecter au portail avec vos nouveaux identifiants.
            </p>
        `;

        const html = this.buildEmailTemplate({
            badgeText: 'Mot de passe mis à jour',
            title: 'Sécurité de votre Compte',
            subtitle: 'Confirmation de changement de mot de passe',
            contentHtml
        });

        return await this.sendEmail({
            to: cleanEmail,
            recipientName: cleanEmail,
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 6. SIGNATURE ÉLECTRONIQUE SIMPLE (SES) DE L'ASSOCIATION PAR E-MAIL (OTP)
    // =========================================================================
    async sendSignatureOtpCode({ email, nomAsso, code, conventionCode, signataireNom, montant, expireMinutes = 15 }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const formattedMontant = montant ? window.CCMVR.FinanceEngine.formatCurrency(montant) : '';

        const subject = `[CCMVR] Code de signature électronique — Convention #${conventionCode}`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Bonjour <b>${signataireNom || 'Madame, Monsieur le Président'}</b>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Vous avez initié la procédure de <b>Signature Électronique Simple (SES)</b> pour la <b>Convention d'objectifs et de moyens #${conventionCode}</b> 
                liant votre association (<b>${nomAsso}</b>) à la Communauté de Communes Marches du Velay Rochebaron${formattedMontant ? ` pour un montant de <b>${formattedMontant}</b>` : ''}.
            </p>

            <div style="background: #f0fdfa; border: 2px dashed #0f766e; padding: 22px; text-align: center; border-radius: 8px; margin: 24px 0;">
                <span style="font-size: 12px; font-weight: bold; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">
                    Votre code secret de signature :
                </span>
                <span style="font-family: monospace, Courier; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f766e; background: #ffffff; padding: 8px 20px; border-radius: 6px; border: 1px solid #99f6e4; display: inline-block;">
                    ${code}
                </span>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">
                    Ce code à usage unique expire dans <b>${expireMinutes} minutes</b>.
                </p>
            </div>

            <div style="background: #f8fafc; border-left: 4px solid #cbd5e1; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #64748b; line-height: 1.5;">
                <b>Valeur probante & Traçabilité légale :</b><br>
                Conformément à l'article 1367 du Code civil et au règlement européen eIDAS, la validation de ce code personnel reçu sur votre boîte officielle vaut consentement exprès et irrévocable aux clauses de la convention.
            </div>
        `;

        const html = this.buildEmailTemplate({
            badgeText: 'Signature Électronique',
            title: 'Validation de Signature Contractuelle',
            subtitle: `Convention #${conventionCode} — Code de sécurité`,
            contentHtml,
            noticeText: 'Ce code de validation a valeur de signature contractuelle. Ne le communiquez à aucun tiers.'
        });

        return await this.sendEmail({
            to: cleanEmail,
            recipientName: signataireNom || nomAsso,
            subject,
            htmlContent: html
        });
    },

    async sendSignatureReceipt({ email, nomAsso, conventionCode, signataireNom, horodatage, sealHash, montant }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const formattedMontant = montant ? window.CCMVR.FinanceEngine.formatCurrency(montant) : '';

        const subject = `[CCMVR] Récépissé officiel d'émargement — Convention #${conventionCode} signée`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Bonjour <b>${signataireNom || 'Madame, Monsieur le Président'}</b>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Nous vous confirmons que votre <b>signature électronique a été apposée avec succès</b> sur la <b>Convention #${conventionCode}</b> pour le compte de <b>${nomAsso}</b>.
            </p>

            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 18px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #166534;">Dossier de preuve électronique (Audit Trail) :</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
                    <li><b>Convention :</b> #${conventionCode}</li>
                    ${formattedMontant ? `<li><b>Concours public validé :</b> ${formattedMontant}</li>` : ''}
                    <li><b>Signataire habilité(e) :</b> ${signataireNom}</li>
                    <li><b>Adresse de vérification :</b> ${cleanEmail}</li>
                    <li><b>Date et horodatage certifié :</b> ${horodatage}</li>
                    <li><b>Empreinte numérique :</b> <code style="font-size: 11px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${sealHash}</code></li>
                    <li><b>Statut contractuel :</b> Acte paraphé et transmis au Service Financier pour liquidation</li>
                </ul>
            </div>

            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                L'exemplaire original comportant l'ensemble des signatures certifiées est téléchargeable et consultable à tout moment depuis votre extranet associatif.
            </p>
        `;

        const html = this.buildEmailTemplate({
            badgeText: '✓ Acte Paraphé',
            title: 'Récépissé de Signature Électronique',
            subtitle: `Convention #${conventionCode} validée et scellée`,
            contentHtml
        });

        return await this.sendEmail({
            to: cleanEmail,
            recipientName: signataireNom || nomAsso,
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 7. VÉRIFICATION D'E-MAIL PAR OTP (INSCRIPTION ASSOCIATION)
    // =========================================================================
    async sendAccountVerificationOtp({ email, nomAsso, code, expireMinutes = 15 }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const subject = `[CCMVR] Validation de votre compte associatif — Code de confirmation : ${code}`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Bonjour,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Vous venez d'initier la création de votre compte extranet sur le <b>Portail des Subventions & Conventions</b> de la 
                <b>Communauté de Communes Marches du Velay Rochebaron</b> pour l'association <b>${nomAsso || 'votre association'}</b>.
            </p>

            <div style="background: #f0fdfa; border: 2px dashed #0f766e; padding: 22px; text-align: center; border-radius: 8px; margin: 24px 0;">
                <span style="font-size: 12px; font-weight: bold; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">
                    Votre code d'activation temporaire :
                </span>
                <span style="font-family: monospace, Courier; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f766e; background: #ffffff; padding: 8px 20px; border-radius: 6px; border: 1px solid #99f6e4; display: inline-block;">
                    ${code}
                </span>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">
                    Ce code à usage unique expire dans <b>${expireMinutes} minutes</b>.
                </p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Saisissez ce code sur la page d'inscription pour valider définitivement votre adresse e-mail et activer l'accès aux démarches de subventions intercommunales.
            </p>
        `;

        const html = this.buildEmailTemplate({
            badgeText: 'Activation de Compte',
            title: 'Vérification de votre Adresse E-mail',
            subtitle: 'Code de sécurité pour finaliser votre inscription',
            contentHtml,
            noticeText: 'Si vous n\'avez pas sollicité la création de ce compte, veuillez ignorer ce message.'
        });

        return await this.sendEmail({
            to: cleanEmail,
            recipientName: nomAsso || cleanEmail,
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 8. NOTIFICATION DE RETOUR DU CDG VERS LE PÔLE MÉTIER (RÉSERVES / RÉGULARISATION)
    // =========================================================================
    async notifyCdgReturnToPole({ dossier, pole, structure, montant, notes }) {
        const poleEmail = pole?.email_referent || `${(pole?.code || 'pole').toLowerCase()}@ccmvr.fr`;
        const codeHex = dossier.code_hex || 'ACTE';
        const formattedMontant = montant ? window.CCMVR.FinanceEngine.formatCurrency(montant) : '';
        const nomAsso = structure.nom_officiel || structure.nom || 'Association';

        const subject = `[CCMVR] Réserves Contrôle de Gestion — Dossier #${codeHex} (${nomAsso})`;
        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Bonjour à l'équipe du <b>${pole?.libelle || 'Pôle Métier'}</b>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Le Contrôle de Gestion a examiné la demande de subvention <b>#${codeHex}</b> de l'association <b>${nomAsso}</b>${formattedMontant ? ` (${formattedMontant})` : ''} 
                et a émis des <b>réserves d'instruction</b> nécessitant une régularisation de votre part et/ou un retour vers l'association.
            </p>

            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #92400e;">Observations & Réserves du Contrôle de Gestion :</p>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #78350f; font-style: italic; white-space: pre-line;">« ${notes || 'Veuillez réexaminer les pièces du dossier avec l\'association.'} »</p>
            </div>

            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Le dossier est de nouveau disponible dans votre console d'instruction avec le statut <b>Réserves CDG</b>. Vous pouvez contacter l'association pour demander des compléments ou ajuster votre proposition.
            </p>
        `;

        const html = this.buildEmailTemplate({
            badgeText: '⚠️ Réserves CDG',
            title: 'Retour d\'Instruction du Contrôle de Gestion',
            subtitle: `Dossier #${codeHex} — ${nomAsso}`,
            contentHtml
        });

        return await this.sendEmail({
            to: poleEmail,
            recipientName: pole?.libelle || 'Pôle Métier',
            subject,
            htmlContent: html
        });
    },

    // =========================================================================
    // 9. CONVENTION VALIDÉE PAR LE PÔLE & OUVERTE À LA SIGNATURE ÉLECTRONIQUE
    // =========================================================================
    async notifyConventionReadyForSignature({ convention, structure, pole, montant }) {
        const recipientEmail = structure?.email_contact || 'contact@marchesduvelayrochebaron.fr';
        const nomAsso = structure?.nom_officiel || 'Association';
        const codeHex = convention?.code_hex || 'ACTE';
        const formattedMontant = montant ? window.CCMVR.FinanceEngine.formatCurrency(montant) : '';
        const subject = `[CCMVR] Votre convention est validée & prête pour signature électronique — ${nomAsso}`;

        const contentHtml = `
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Madame, Monsieur le Président,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Nous avons le plaisir de vous informer que votre convention de concours public <b>#${codeHex}</b> 
                a été formellement validée par le <b>Pôle ${pole?.libelle || 'Instructeur'}</b> 
                et la <b>Présidence de la Communauté de Communes Marches du Velay Rochebaron</b> suite au vote du Conseil Communautaire.
            </p>

            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 18px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #166534;">Détails de l'acte juridique validé :</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
                    <li><b>Association bénéficiaire :</b> ${nomAsso}</li>
                    <li><b>Référence de l'acte :</b> #${codeHex}</li>
                    ${formattedMontant ? `<li><b>Montant du concours public :</b> <span style="font-size: 15px; font-weight: 800; color: #166534;">${formattedMontant}</span></li>` : ''}
                    <li><b>Statut :</b> Validé par le Pôle Métier & ouvert à votre signature électronique sécurisée (SES)</li>
                </ul>
            </div>

            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Vous pouvez dès à présent vous connecter à votre espace extranet associatif pour consulter l'acte et apposer votre signature électronique en validant le code secret à 6 chiffres envoyé par e-mail.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${window.CCMVR.CONFIG.APP_BASE_URL || window.location.origin}" style="background: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                    ✍️ Signer ma Convention en ligne →
                </a>
            </div>
        `;

        const html = this.buildEmailTemplate({
            badgeText: '✍️ Signature Électronique Requise',
            title: 'Convention Validée & Prête pour Signature',
            subtitle: `Convention #${codeHex} — ${nomAsso}`,
            contentHtml
        });

        return await this.sendEmail({
            to: recipientEmail,
            recipientName: nomAsso,
            subject,
            htmlContent: html
        });
    }
};
