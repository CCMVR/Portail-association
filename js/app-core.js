// ==============================================================================
// MODULE CCMVR: CORE
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

window.CCMVR.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

window.CCMVR.Modules.Core = {
    escapeHtml(str) {
        return window.CCMVR.escapeHtml(str);
    },

    togglePasswordVisibility(inputId) {
        const inp = document.getElementById(inputId);
        if (!inp) return;
        inp.type = inp.type === 'password' ? 'text' : 'password';
    },

    sidebarCollapsed: false,
    sidebarWidth: 310,
    sidebarHidden: false,
    currentTab: 'cdg_dashboard',
    currentPersonaKey: 'admin',
    searchQuery: '',
    pendingGrantDraft: null,

    async init() {
        this.showLoader(true);
        try {
            if (window.CCMVR.Store && typeof window.CCMVR.Store.init === 'function') {
                await window.CCMVR.Store.init();
            }
        } catch (err) {
            console.warn('Initialisation Store avec warning résilient :', err);
        } finally {
            this.showLoader(false);
        }

        if (!this._hasKeyboardInit) {
            this._hasKeyboardInit = true;
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('universal-modal');
                    if (modal && !modal.classList.contains('hidden')) {
                        window.CCMVR.App.closeModal();
                    } else if (
                        window.CCMVR?.CONFIG?.ENABLE_TEMP_PUBLIC_CHECK_ASSO &&
                        this._tempCheckerState?.isOpen &&
                        Date.now() - (this._lastUniversalModalClosedAt || 0) > 100
                    ) {
                        this.closeTempAssoCheckerModal();
                    }
                }
            });
        }

        if (!window.CCMVR.Store.isAuthenticated) {
            this.renderAuthScreen();
            return;
        } else {
            const authEl = document.getElementById('auth-screen');
            if (authEl) authEl.style.display = 'none';
        }

        this.syncDefaultTabForRole();
        this.renderHeader();
        this.renderNavigation();
        this.renderMainView();
    },

    showLoader(visible) {
        const el = document.getElementById('global-loader');
        if (el) el.style.display = visible ? 'flex' : 'none';
    },

    // ==========================================================================
    // PORTAIL D'AUTHENTIFICATION SUPABASE (CONNEXION & INSCRIPTION ASSOCIATION)
    // ==========================================================================,

    renderAuthScreen() {
        const authEl = document.getElementById('auth-screen');
        if (!authEl) return;
        authEl.style.display = 'flex';

        const customAccounts = window.CCMVR.Store.getCustomAssoAccounts ? window.CCMVR.Store.getCustomAssoAccounts() : [];
        // Interrupteur provisoire configuré dans config.js (false = écran d'origine 100 % inchangé)
        const showTempCheckAsso = Boolean(window.CCMVR?.CONFIG?.ENABLE_TEMP_PUBLIC_CHECK_ASSO);
        const tempCheckBannerHtml = showTempCheckAsso ? `
                    <!-- [TEMP_PUBLIC_CHECK_ASSO_START] -->
                    <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white shadow-lg border border-emerald-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="space-y-1">
                            <span class="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
                                Accès provisoire pôles CCMVR
                            </span>
                            <div class="text-sm font-black leading-snug">Vérifier une association sans connexion</div>
                            <p class="text-[11px] text-emerald-50/95 leading-snug">
                                Accès direct par SIRET, SIREN, RNA ou nom aux documents déposés (RNA, Le Compte Asso, Sirene).
                            </p>
                        </div>
                        <button type="button" id="btn-temp-check-asso" onclick="CCMVR.App.openTempAssoCheckerModal()" class="px-4 py-3 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl text-xs font-black uppercase tracking-wide shadow-md hover:shadow-lg transition shrink-0 flex items-center justify-center gap-2 cursor-pointer">
                            <i data-lucide="search-check" class="w-4 h-4 text-emerald-700"></i>
                            <span>Checker une association</span>
                        </button>
                    </div>
                    <!-- [TEMP_PUBLIC_CHECK_ASSO_END] -->
        ` : '';

        authEl.innerHTML = `
            <div class="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-5 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6">
                <!-- Panneau Gauche Institutionnel CCMVR (2/5) -->
                <div class="lg:col-span-2 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-8 flex flex-col justify-between">
                    <div class="space-y-6">
                        <div class="bg-white p-4 rounded-2xl shadow-lg inline-block">
                            <img src="logo-collectivite.png" alt="CCMVR" class="h-20 w-auto object-contain" onerror="this.style.display='none'"/>
                        </div>
                        <div class="space-y-2">
                            <div class="text-xs font-extrabold uppercase tracking-widest text-blue-400">Communauté de Communes</div>
                            <h1 class="text-xl font-black leading-snug text-white">Marches du Velay Rochebaron</h1>
                            <p class="text-xs text-slate-300 leading-relaxed pt-1">
                                Portail unifié de gestion des subventions associatives, du conventionnement pluriannuel et de valorisation des concours en nature.
                            </p>
                        </div>
                    </div>

                    <!-- Raccourcis de sélection des comptes (mode assistance / démonstration replié) -->
                    <details class="pt-6 border-t border-slate-800/80 group">
                        <summary class="cursor-pointer text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-indigo-300 flex items-center justify-between transition list-none">
                            <span>⚙️ Comptes de référence & démonstration</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 group-open:rotate-180 transition">▼</span>
                        </summary>
                        <div class="grid grid-cols-1 gap-1.5 text-[11px] max-h-60 overflow-y-auto pr-1 mt-3">
                            <button type="button" onclick="CCMVR.App.prefillLogin('controle@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 text-white font-bold flex items-center justify-between transition">
                                <span>★ Admin / Contrôle de Gestion</span>
                                <span class="font-mono-code text-[10px] text-indigo-200">controle@ccmvr.fr</span>
                            </button>
                            <button type="button" onclick="CCMVR.App.prefillLogin('sport@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-between transition">
                                <span>Pôle Sport</span>
                                <span class="font-mono-code text-[10px] text-slate-400">sport@ccmvr.fr</span>
                            </button>
                            <button type="button" onclick="CCMVR.App.prefillLogin('enfance@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-between transition">
                                <span>Pôle Enfance-Jeunesse</span>
                                <span class="font-mono-code text-[10px] text-slate-400">enfance@ccmvr.fr</span>
                            </button>
                            <button type="button" onclick="CCMVR.App.prefillLogin('culture@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-between transition">
                                <span>Pôle Culture</span>
                                <span class="font-mono-code text-[10px] text-slate-400">culture@ccmvr.fr</span>
                            </button>
                            <button type="button" onclick="CCMVR.App.prefillLogin('tourisme@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-between transition">
                                <span>Pôle Tourisme</span>
                                <span class="font-mono-code text-[10px] text-slate-400">tourisme@ccmvr.fr</span>
                            </button>
                            <button type="button" onclick="CCMVR.App.prefillLogin('economie@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-between transition">
                                <span>Pôle Économie</span>
                                <span class="font-mono-code text-[10px] text-slate-400">economie@ccmvr.fr</span>
                            </button>
                            <button type="button" onclick="CCMVR.App.prefillLogin('accueil@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-between transition">
                                <span>Service Accueil (Minibus)</span>
                                <span class="font-mono-code text-[10px] text-slate-400">accueil@ccmvr.fr</span>
                            </button>
                            <button type="button" onclick="CCMVR.App.prefillLogin('batiments@ccmvr.fr', 'Ccmvr2026!')" class="text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-between transition">
                                <span>Service Bâtiments & Logistique</span>
                                <span class="font-mono-code text-[10px] text-slate-400">batiments@ccmvr.fr</span>
                            </button>
                            ${customAccounts.map(acc => `
                                <div class="flex items-center gap-1">
                                    <button type="button" onclick="CCMVR.App.prefillLogin('${acc.email}', '${(acc.password || '').replace(/'/g, "\\'")}')" class="flex-1 text-left px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-100 font-bold flex items-center justify-between transition">
                                        <span class="truncate pr-2">● ${acc.nom}</span>
                                        <span class="font-mono-code text-[10px] text-emerald-200 shrink-0">${acc.email}</span>
                                    </button>
                                    <button type="button" onclick="CCMVR.App.deleteCustomTestAsso('${acc.structureId}')" title="Supprimer ce compte test de répétition" class="px-2 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-700 text-rose-200 text-[10px] font-bold transition">✕</button>
                                </div>
                            `).join('')}
                            ${customAccounts.length === 0 ? `
                                <p class="text-[11px] text-slate-400 italic px-2 py-1">
                                    Aucun compte association de test. Cliquez ci-dessous sur « Créer votre compte association » pour démarrer un test sur une base vierge.
                                </p>
                            ` : ''}

                        </div>
                    </details>
                </div>

                <!-- Panneau Droit : Formulaire de Connexion Supabase Auth (3/5) -->
                <div class="lg:col-span-3 p-8 sm:p-10 flex flex-col justify-center space-y-6">
                    ${tempCheckBannerHtml}
                    <div>
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            Authentification Sécurisée
                        </span>
                        <h2 class="text-2xl font-black text-slate-900 mt-2">Connexion à votre espace</h2>
                        <p class="text-xs text-slate-500 mt-1">
                            Saisissez votre adresse e-mail professionnelle ou associative et votre mot de passe.
                        </p>
                    </div>

                    <form onsubmit="CCMVR.App.handleLoginSubmit(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1.5">Adresse e-mail du compte *</label>
                            <input type="email" id="login-email" required value="" placeholder="prenom.nom@ccmvr.fr ou contact@association.fr" class="input-clean font-semibold"/>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="block text-xs font-bold text-slate-700">Mot de passe *</label>
                                <button type="button" onclick="CCMVR.App.openForgotPasswordModal()" class="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition">
                                    Mot de passe oublié ?
                                </button>
                            </div>
                            <input type="password" id="login-password" required value="" placeholder="Votre mot de passe" class="input-clean"/>
                        </div>

                        <div id="login-error-box" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"></div>

                        <button type="submit" class="w-full py-3 btn-accent text-xs font-extrabold uppercase tracking-wider shadow-lg">
                            Se connecter au portail →
                        </button>
                    </form>

                    <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <span class="text-slate-500">Nouvelle association sur le territoire ?</span>
                        <button type="button" onclick="CCMVR.App.handleStartNewAssociationSignup()" class="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl font-extrabold transition shadow-sm">
                            + Créer un compte Association (SIREN / RNA)
                        </button>
                    </div>
                </div>
            </div>
            ${showTempCheckAsso ? '<div id="temp-asso-checker-root"></div>' : ''}
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    prefillLogin(email, optionalPass = '') {
        const emailEl = document.getElementById('login-email');
        const passEl = document.getElementById('login-password');
        const errBox = document.getElementById('login-error-box');
        if (errBox) errBox.classList.add('hidden');
        if (emailEl) emailEl.value = email;
        if (passEl) {
            passEl.value = optionalPass || '';
            passEl.focus();
        }
    },

    async handlePurgeAllTestData() {

        if (!confirm("⚠️ ATTENTION : Voulez-vous réinitialiser complètement l'application et purger TOUTES les données de test (associations créées, dossiers, conventions, etc.) pour repartir sur une base 100% vierge ?")) {

            return;

        }

        this.showLoader(true);

        try {

            await window.CCMVR.Store.purgeAllTestDataAndReset();

            this.toast('Application remise à zéro avec succès. Base de données et registre 100% vierges.', 'success');

            this.renderMainView();

        } catch (err) {

            this.toast('Erreur lors de la remise à zéro : ' + err.message, 'error');

        } finally {

            this.showLoader(false);

        }

    },



    async deleteCustomTestAsso(structId) {
        if (!confirm("Supprimer ce compte association de test ainsi que ses dossiers et conventions d'essai ?")) return;
        this.showLoader(true);
        try {
            await window.CCMVR.Store.deleteStructureAndRelatedData(structId);
            this.toast('Compte association de test et dossiers associés supprimés.', 'info');
            this.renderAuthScreen();
        } finally {
            this.showLoader(false);
        }
    },

    async handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('login-email')?.value;
        const pass = document.getElementById('login-password')?.value;
        const errBox = document.getElementById('login-error-box');
        if (errBox) errBox.classList.add('hidden');

        this.showLoader(true);
        try {
            const { user } = await window.CCMVR.Store.loginWithEmailPassword(email, pass);
            document.getElementById('auth-screen').style.display = 'none';
            this.syncDefaultTabForRole();
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
            this.toast(`Authentification validée — Bienvenue ${user.nom}`, 'success');
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message;
                errBox.classList.remove('hidden');
            }
        } finally {
            this.showLoader(false);
        }
    },

    openForgotPasswordModal() {
        const modal = document.getElementById('universal-modal');
        const content = document.getElementById('universal-modal-content');
        if (!modal || !content) return;

        const currentEmail = document.getElementById('login-email')?.value || '';

        content.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden my-8 animate-scale-in';
        content.innerHTML = `
            <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
                        <i data-lucide="key-round" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">Mot de passe oublié</h3>
                        <p class="text-[11px] text-blue-200">Réinitialisation sécurisée par e-mail</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <div class="p-6 space-y-4 text-xs">
                <p class="text-slate-600 leading-relaxed">
                    Saisissez l'adresse e-mail associée à votre compte. Un <b>code de sécurité temporaire</b> vous sera immédiatement envoyé par e-mail via notre passerelle Brevo.
                </p>

                <form onsubmit="CCMVR.App.handleRequestResetPasswordOtp(event)" class="space-y-4">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Votre adresse e-mail *</label>
                        <input type="email" id="reset-email-input" required value="${currentEmail}" placeholder="contact@association.fr ou prenom.nom@ccmvr.fr" class="input-clean font-semibold"/>
                    </div>

                    <div id="reset-error-box" class="hidden p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

                    <div class="pt-2 flex items-center justify-end gap-2">
                        <button type="button" onclick="CCMVR.App.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 transition">
                            Annuler
                        </button>
                        <button type="submit" id="reset-submit-btn" class="px-5 py-2 btn-accent font-bold rounded-lg shadow-sm">
                            Envoyer le code par e-mail →
                        </button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (window.lucide) window.lucide.createIcons();
    },

    async handleRequestResetPasswordOtp(e) {
        e.preventDefault();
        const emailInput = document.getElementById('reset-email-input')?.value?.trim().toLowerCase();
        const errBox = document.getElementById('reset-error-box');
        const submitBtn = document.getElementById('reset-submit-btn');

        if (!emailInput || !emailInput.includes('@')) {
            if (errBox) {
                errBox.textContent = 'Veuillez saisir une adresse e-mail valide.';
                errBox.classList.remove('hidden');
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Envoi en cours...';
        }

        try {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            sessionStorage.setItem('ccmvr_reset_otp', JSON.stringify({
                email: emailInput,
                code: otpCode,
                expires: Date.now() + 15 * 60 * 1000
            }));

            await window.CCMVR.NotificationService.sendPasswordResetCode({
                email: emailInput,
                code: otpCode,
                expireMinutes: 15
            });

            this.toast(`Code de sécurité envoyé à ${emailInput}`, 'success');
            this.renderResetPasswordStep2(emailInput);
        } catch (err) {
            if (errBox) {
                errBox.textContent = 'Erreur lors de l\'envoi : ' + err.message;
                errBox.classList.remove('hidden');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Envoyer le code par e-mail →';
            }
        }
    },

    renderResetPasswordStep2(email) {
        const content = document.getElementById('universal-modal-content');
        if (!content) return;

        content.innerHTML = `
            <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                        <i data-lucide="shield-check" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-white text-base">Validation du Code</h3>
                        <p class="text-[11px] text-blue-200">E-mail expédié à ${email}</p>
                    </div>
                </div>
                <button type="button" onclick="CCMVR.App.closeModal()" class="text-slate-400 hover:text-white p-1 rounded-md transition">✕</button>
            </div>

            <div class="p-6 space-y-4 text-xs">
                <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
                    Un e-mail contenant un <b>code à 6 chiffres</b> vient de vous être envoyé. Saisissez-le ci-dessous pour choisir votre nouveau mot de passe.
                </div>

                <form onsubmit="CCMVR.App.handleConfirmResetPassword(event)" class="space-y-4">
                    <input type="hidden" id="reset-target-email" value="${email}"/>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Code de sécurité à 6 chiffres *</label>
                        <input type="text" id="reset-code-input" required maxlength="6" placeholder="Ex : 482910" class="input-clean font-mono-code text-center text-lg tracking-widest font-extrabold"/>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Nouveau mot de passe * (6 car. min.)</label>
                        <input type="password" id="reset-new-password" required placeholder="Votre nouveau mot de passe" class="input-clean"/>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Confirmez le nouveau mot de passe *</label>
                        <input type="password" id="reset-confirm-password" required placeholder="Répétez le mot de passe" class="input-clean"/>
                    </div>

                    <div id="reset-error-box-2" class="hidden p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium"></div>

                    <div class="pt-2 flex items-center justify-between">
                        <button type="button" onclick="CCMVR.App.openForgotPasswordModal()" class="text-slate-500 hover:text-slate-800 font-bold">
                            &larr; Renvoyer un code
                        </button>
                        <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-sm transition">
                            Confirmer & Mettre à jour →
                        </button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    async handleConfirmResetPassword(e) {
        e.preventDefault();
        const email = document.getElementById('reset-target-email')?.value?.trim().toLowerCase();
        const codeInput = document.getElementById('reset-code-input')?.value?.trim();
        const newPass = document.getElementById('reset-new-password')?.value || '';
        const confirmPass = document.getElementById('reset-confirm-password')?.value || '';
        const errBox = document.getElementById('reset-error-box-2');

        const showError = (msg) => {
            if (errBox) {
                errBox.textContent = msg;
                errBox.classList.remove('hidden');
            }
        };

        const storedOtpRaw = sessionStorage.getItem('ccmvr_reset_otp');
        if (!storedOtpRaw) {
            showError('Aucune session de réinitialisation active. Veuillez redemander un code.');
            return;
        }

        const storedOtp = JSON.parse(storedOtpRaw);
        if (storedOtp.email !== email) {
            showError('Incohérence d\'adresse e-mail.');
            return;
        }
        if (Date.now() > storedOtp.expires) {
            showError('Le code de sécurité a expiré. Veuillez redemander un nouveau code.');
            return;
        }
        if (storedOtp.code !== codeInput) {
            showError('Code de sécurité incorrect. Vérifiez le code reçu par e-mail.');
            return;
        }
        if (newPass.length < 6) {
            showError('Le mot de passe doit comporter au moins 4 caractères.');
            return;
        }
        if (newPass !== confirmPass) {
            showError('Les deux mots de passe ne correspondent pas.');
            return;
        }

        this.showLoader(true);
        try {
            await window.CCMVR.Store.resetAccountPassword(email, newPass);
            sessionStorage.removeItem('ccmvr_reset_otp');

            window.CCMVR.NotificationService.sendPasswordResetConfirmation({ email }).catch(e => {
                console.warn('Échec notification confirmation mdp :', e);
            });

            this.closeModal();
            this.toast('✓ Votre mot de passe a été mis à jour avec succès !', 'success');
            this.prefillLogin(email, newPass);
        } catch (err) {
            showError('Erreur lors de la mise à jour : ' + err.message);
        } finally {
            this.showLoader(false);
        }
    },

    handleStartNewAssociationSignup() {
        const authEl = document.getElementById('auth-screen');
        if (!authEl) return;
        authEl.style.display = 'flex';

        authEl.innerHTML = `
            <div class="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6">
                <!-- En-tête officiel -->
                <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-8 py-5 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="bg-white p-2 rounded-xl shadow">
                            <img src="logo-collectivite.png" alt="CCMVR" class="h-10 w-auto object-contain" onerror="this.style.display='none'"/>
                        </div>
                        <div>
                            <div class="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">Portail Extranet Associatif CCMVR</div>
                            <h2 class="text-lg font-black text-white">Inscription de l'Association (Loi 1901)</h2>
                        </div>
                    </div>
                    <button type="button" onclick="CCMVR.App.renderAuthScreen()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition">
                        ← Retour à la connexion
                    </button>
                </div>

                <form onsubmit="CCMVR.App.handleSignupSubmit(event)" class="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto">
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

                    <!-- Étape 1 : Saisie unique du SIRET et auto-complétion certifiée -->
                    <div class="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border-2 border-blue-200 space-y-3">
                        <div class="flex items-center justify-between gap-2">
                            <div class="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                                <span>1. Identification Légale par SIRET / SIREN</span>
                                <span class="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">API Recherche d'Entreprises • État / INSEE</span>
                            </div>
                        </div>
                        <p class="text-[11.5px] text-blue-900 leading-relaxed">
                            Saisissez les <strong>14 chiffres du SIRET</strong> (ou les 9 chiffres du SIREN) de votre structure. Les informations officielles du siège et de l'immatriculation préfectorale sont directement récupérées auprès des répertoires nationaux.
                        </p>
                        <div>
                            <label class="block text-xs font-bold text-slate-800 mb-1.5">N° SIRET (14 chiffres) ou SIREN (9 chiffres) *</label>
                            <div class="flex flex-col sm:flex-row gap-2.5">
                                <input type="text" id="signup-siret" required placeholder="Ex: 775 599 079 00024 ou 510 098 205 00018" class="input-clean font-mono-code bg-white text-base py-2.5 font-bold text-slate-900 border-blue-300 focus:border-blue-600" onkeydown="if(event.key==='Enter'){event.preventDefault(); CCMVR.App.triggerSignupApiGouvLookup();}"/>
                                <button type="button" id="btn-signup-apigouv" onclick="CCMVR.App.triggerSignupApiGouvLookup()" class="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold whitespace-nowrap shadow-md flex items-center justify-center gap-2 transition shrink-0">
                                    <span>🔍 Charger la fiche officielle (INSEE / API Gouv)</span>
                                </button>
                            </div>
                        </div>
                        <div id="signup-apigouv-status" class="hidden rounded-xl p-3.5 text-xs font-semibold"></div>
                    </div>

                    <!-- Étape 2 : Données administratives officielles (LECTURE SEULE VERROUILLÉE) -->
                    <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2 text-slate-900 text-xs font-black uppercase tracking-wider">
                                <span class="text-base">🔒</span>
                                <span>2. Données Légales Certifiées (Lecture Seule)</span>
                                <span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">Verrouillage Juridique</span>
                            </div>
                        </div>

                        <!-- Avertissement officiel et pédagogique -->
                        <div class="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed space-y-1">
                            <div class="font-extrabold flex items-center gap-1.5 text-amber-900">
                                <span>ℹ️ Informations issues du répertoire Sirene (INSEE) et du RNA (Ministère de l'Intérieur) :</span>
                            </div>
                            <p>
                                Ces données sont <strong>verrouillées en lecture seule</strong> pour garantir l'exactitude des actes juridiques communautaires et éviter tout blocage ou rejet de mandatement par le comptable public (Trésor Public / DDFiP).
                            </p>
                            <p class="font-semibold text-amber-900 pt-0.5">
                                📢 <em>Si la dénomination officielle ou l'adresse du siège a changé, merci de régulariser la situation de votre association sur <a href="https://lecompteasso.associations.gouv.fr" target="_blank" rel="noopener" class="underline font-bold text-blue-800 hover:text-blue-950">Le Compte Asso / Service-Public.fr</a>.</em>
                            </p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Dénomination officielle (Statuts / JOAFE)</span>
                                    <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifiée</span>
                                </label>
                                <input type="text" id="signup-nom" readonly required placeholder="En attente de saisie du SIRET ci-dessus..." class="input-clean font-bold bg-slate-100 text-slate-900 border-slate-300 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>N° RNA (Préfecture)</span>
                                    <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifié</span>
                                </label>
                                <input type="text" id="signup-rna" readonly placeholder="En attente..." class="input-clean font-mono-code bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Adresse officielle du siège social</span>
                                    <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifiée</span>
                                </label>
                                <input type="text" id="signup-adresse" readonly required placeholder="En attente..." class="input-clean bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>N° SIRET Retenu</span>
                                    <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifié</span>
                                </label>
                                <input type="text" id="signup-siret-display" readonly placeholder="En attente..." class="input-clean font-mono-code bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Code Postal du siège</span>
                                    <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifié</span>
                                </label>
                                <input type="text" id="signup-cp" readonly required placeholder="En attente..." class="input-clean font-mono-code bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Commune du siège</span>
                                    <span class="text-[10px] text-slate-400 font-semibold">🔒 Certifiée</span>
                                </label>
                                <input type="text" id="signup-ville" readonly required placeholder="En attente..." class="input-clean bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed"/>
                            </div>
                        </div>
                    </div>

                    <!-- Champ libre d'usage : Sigle / Nom d'usage (FACULTATIF) -->
                    <div class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                        <label class="block text-xs font-bold text-indigo-950 mb-1">
                            Sigle ou Nom d'usage courant (Optionnel mais recommandé)
                        </label>
                        <input type="text" id="signup-sigle" placeholder="Ex: USM Foot, Planet'Air, MV Natation, ESCV..." class="input-clean bg-white font-semibold"/>
                        <p class="text-[11px] text-indigo-800 mt-1">
                            Ce nom d'usage court sera utilisé pour l'affichage convivial sur l'extranet et vos échanges quotidiens, tout en préservant la dénomination officielle sur les conventions juridiques.
                        </p>
                    </div>

                    <!-- Étape 3 : Représentant légal habilité & Identifiants du compte (CHAMPS LIBRES) -->
                    <div class="space-y-4 pt-2 border-t border-slate-200">
                        <div class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span>3. Représentant Légal & Accès Extranet</span>
                            <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold">À compléter</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Prénom du Représentant *</label>
                                <input type="text" id="signup-rep-prenom" required placeholder="Ex: Claire" class="input-clean bg-white"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Nom du Représentant *</label>
                                <input type="text" id="signup-rep-nom" required placeholder="Ex: DUMONT" class="input-clean bg-white"/>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Qualité / Fonction *</label>
                                <input type="text" id="signup-rep-fonction" required value="Président(e)" class="input-clean bg-white"/>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <div>
                                <label class="block text-xs font-bold text-slate-800 mb-1">Adresse e-mail officielle de contact *</label>
                                <input type="email" id="signup-email" required placeholder="contact@mon-association.fr" class="input-clean bg-white font-semibold"/>
                                <p class="text-[10px] text-slate-500 mt-1">Sert d'identifiant et à la réception du code de validation (OTP) et des alertes de convention.</p>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-800 mb-1">Mot de passe du compte *</label>
                                <div class="relative">
                                    <input type="password" id="signup-password" required value="" placeholder="Définissez un mot de passe (6 car. min)" minlength="6" class="input-clean bg-white pr-10"/>
                                    <button type="button" onclick="CCMVR.App.togglePasswordVisibility('signup-password')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer focus:outline-none" title="Afficher / Masquer le mot de passe">
                                        👁️
                                    </button>
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1">6 caractères minimum requis.</p>
                            </div>
                            <div class="sm:col-span-2 flex items-center gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                                <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">Information RIB / IBAN</span>
                                <span>Aucun IBAN n'est exigé à la création du compte. Votre RIB ne sera demandé qu'ultérieurement, lors du dépôt d'un dossier de subvention financière.</span>
                            </div>
                        </div>
                    </div>

                    <!-- Étape 4 : Contrat d'Engagement Républicain -->
                    <label class="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer">
                        <input type="checkbox" id="signup-cer" required checked class="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600"/>
                        <span class="text-xs text-emerald-950 leading-relaxed">
                            <strong>Souscription au Contrat d'Engagement Républicain (Décret n° 2021-1947) :</strong>
                            J'atteste que l'association s'engage à respecter les principes de liberté, d'égalité, de fraternité et de laïcité conformément à la loi n° 2021-1109 du 24 août 2021.
                        </span>
                    </label>

                    <div id="signup-error-box" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"></div>

                    <div class="flex items-center justify-between pt-2">
                        <button type="button" onclick="CCMVR.App.renderAuthScreen()" class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50">
                            Annuler
                        </button>
                        <button type="submit" class="px-6 py-3 btn-accent text-xs font-extrabold uppercase tracking-wider shadow-lg">
                            Créer le compte & Accéder à l'Extranet Association →
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.signupSirenValidated = false;
        setTimeout(() => {
            const form = authEl.querySelector('form');
            const siretInp = document.getElementById('signup-siret');
            if (form) {
                form.addEventListener('input', () => {
                    if (this.signupSirenValidated) {
                        this.applyFormVisualFeedback(authEl);
                    }
                });
                form.addEventListener('change', () => {
                    if (this.signupSirenValidated) {
                        this.applyFormVisualFeedback(authEl);
                    }
                });
            }
            if (siretInp) {
                siretInp.addEventListener('blur', () => {
                    const val = (siretInp.value || '').replace(/\s+/g, '');
                    if (val.length >= 9 && !this.signupSirenValidated) {
                        this.triggerSignupApiGouvLookup();
                    }
                });
                siretInp.addEventListener('input', () => {
                    const val = (siretInp.value || '').replace(/\s+/g, '');
                    if ((val.length === 9 || val.length === 14) && !this.signupSirenValidated) {
                        this.triggerSignupApiGouvLookup();
                    }
                });
            }
        }, 10);
    },

    async triggerSignupApiGouvLookup() {
        const siretInput = document.getElementById('signup-siret');
        const btn = document.getElementById('btn-signup-apigouv');
        const statusBox = document.getElementById('signup-apigouv-status');
        const query = siretInput ? siretInput.value.trim() : '';

        if (!query || query.replace(/\s+/g, '').length < 9) {
            this.toast('Veuillez saisir au moins les 9 chiffres du SIREN ou les 14 chiffres du SIRET.', 'warning');
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
                <span>Interrogation en direct du répertoire national INSEE / API Recherche d'Entreprises (api.gouv.fr)... Veuillez patienter.</span>
            `;
            statusBox.classList.remove('hidden');
        }
        this.showLoader(true);

        try {
            const res = await window.CCMVR.FinanceEngine.lookupSiretApiGouv(query);
            if (!res || (res.found === false) || (!res.nom_officiel && !res.siren)) {
                if (statusBox) {
                    statusBox.className = 'rounded-xl p-3 text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-900';
                    statusBox.innerHTML = `⚠️ ${res?.error || 'Aucune structure trouvée pour ce numéro.'} Vous pouvez compléter les champs manuellement ci-dessous.`;
                }
                this.toast(res?.error || 'SIRET non trouvé sur API Gouv', 'warning');
                this.signupSirenValidated = true;
                this.applyFormVisualFeedback(document.getElementById('auth-screen'));
                return;
            }

            if (document.getElementById('signup-nom')) document.getElementById('signup-nom').value = res.nom_officiel || '';
            if (document.getElementById('signup-sigle') && !document.getElementById('signup-sigle').value) document.getElementById('signup-sigle').value = res.sigle || '';
            if (document.getElementById('signup-siret')) document.getElementById('signup-siret').value = res.siret || query;
            if (document.getElementById('signup-siret-display')) document.getElementById('signup-siret-display').value = res.siret || query;
            if (document.getElementById('signup-rna')) document.getElementById('signup-rna').value = res.rna || '';
            if (document.getElementById('signup-adresse')) document.getElementById('signup-adresse').value = res.adresse_siege || '';
            if (document.getElementById('signup-cp')) document.getElementById('signup-cp').value = res.code_postal || '';
            if (document.getElementById('signup-ville')) document.getElementById('signup-ville').value = res.ville || '';

            // L'adresse email n'est pas pré-remplie avec une fausse valeur afin d'apparaître en rouge clair (obligatoire et manquante)
            const emailEl = document.getElementById('signup-email');
            if (emailEl && !emailEl.value && res.email) {
                emailEl.value = res.email;
            }

            if (statusBox) {
                statusBox.className = 'rounded-xl p-3 text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-900';
                statusBox.innerHTML = `✓ Données officielles récupérées avec succès via API Gouv : <strong>${res.nom_officiel}</strong> (SIRET : ${res.siret}${res.rna ? ' — RNA : ' + res.rna : ''}).`;
            }
            this.toast(`Données INSEE / API Gouv importées : ${res.nom_officiel}`, 'success');

            // Déclenchement de la coloration dynamique (vert clair / jaune clair / rouge clair)
            this.signupSirenValidated = true;
            this.applyFormVisualFeedback(document.getElementById('auth-screen'));
        } catch (err) {
            console.error('Erreur lookup API Gouv:', err);
            if (statusBox) {
                statusBox.className = 'rounded-xl p-3 text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-900';
                statusBox.innerHTML = `⚠️ ${err.message || 'Impossible d\'interroger l\'API Gouv.'} Vous pouvez compléter les champs manuellement ci-dessous.`;
            }
            this.toast(err.message || 'Erreur API Gouv', 'warning');
            this.signupSirenValidated = true;
            this.applyFormVisualFeedback(document.getElementById('auth-screen'));
        } finally {
            this.showLoader(false);
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-wait');
                btn.innerHTML = originalBtnHtml;
            }
        }
    },

    async handleSignupSubmit(e) {
        e.preventDefault();
        const errBox = document.getElementById('signup-error-box');
        if (errBox) errBox.classList.add('hidden');

        let nom_officiel = document.getElementById('signup-nom')?.value?.trim();
        const rawSiret = document.getElementById('signup-siret')?.value?.trim() || '';

        // Si l'utilisateur a renseigné le SIRET sans cliquer préalablement sur le bouton de recherche, auto-compléter
        if (!nom_officiel && rawSiret && rawSiret.replace(/\s+/g, '').length >= 9) {
            await this.triggerSignupApiGouvLookup();
            nom_officiel = document.getElementById('signup-nom')?.value?.trim();
        }

        if (!nom_officiel) {
            if (errBox) {
                errBox.textContent = "Veuillez saisir votre numéro SIRET officiel (14 chiffres) et charger votre fiche certifiée avant de continuer.";
                errBox.classList.remove('hidden');
            }
            this.toast("Numéro SIRET requis pour charger la fiche officielle.", "warning");
            document.getElementById('signup-siret')?.focus();
            return;
        }
        const nom_dusage = document.getElementById('signup-sigle')?.value?.trim() || nom_officiel;
        const siret = document.getElementById('signup-siret')?.value?.trim();
        const rna = document.getElementById('signup-rna')?.value?.trim();
        const adresse_siege = document.getElementById('signup-adresse')?.value?.trim();
        const code_postal = document.getElementById('signup-cp')?.value?.trim();
        const ville = document.getElementById('signup-ville')?.value?.trim();
        const representant_prenom = document.getElementById('signup-rep-prenom')?.value?.trim();
        const representant_nom = document.getElementById('signup-rep-nom')?.value?.trim();
        const representant_fonction = document.getElementById('signup-rep-fonction')?.value?.trim() || 'Président(e)';
        const email = document.getElementById('signup-email')?.value?.trim();
        const password = document.getElementById('signup-password')?.value?.trim();
        if (!password || password.length < 6) {
            if (errBox) {
                errBox.textContent = "Veuillez choisir un mot de passe d'au moins 6 caractères pour votre compte.";
                errBox.classList.remove('hidden');
            }
            this.toast("Mot de passe requis (6 caractères minimum).", "warning");
            document.getElementById('signup-password')?.focus();
            return;
        }
        const cer_souscrit = document.getElementById('signup-cer')?.checked !== false;

        this.showLoader(true);
        try {
            // Génération d'un code OTP sécurisé à 6 chiffres
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            this.pendingSignup = {
                payload: {
                    nom_officiel,
                    nom_dusage,
                    siret,
                    rna,
                    adresse_siege,
                    code_postal,
                    ville,
                    representant_prenom,
                    representant_nom,
                    representant_fonction,
                    email,
                    password,
                    cer_souscrit
                },
                otp,
                expiresAt: Date.now() + 15 * 60 * 1000
            };

            // Envoi de l'e-mail de confirmation avec le code OTP à l'adresse déclarée
            if (window.CCMVR.NotificationService) {
                await window.CCMVR.NotificationService.sendAccountVerificationOtp({
                    email,
                    nomAsso: nom_officiel,
                    code: otp,
                    expireMinutes: 15
                });
            }

            // Bascule vers l'écran de saisie du code de vérification
            this.renderSignupOtpScreen();
            this.toast(`Code d'activation envoyé par e-mail à ${email} !`, 'info');
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message || 'Erreur lors de l\'envoi du code d\'activation.';
                errBox.classList.remove('hidden');
            }
        } finally {
            this.showLoader(false);
        }
    },

    renderSignupOtpScreen() {
        const authEl = document.getElementById('auth-screen');
        if (!authEl || !this.pendingSignup) return;
        const p = this.pendingSignup.payload;

        authEl.innerHTML = `
            <div class="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6 animate-scale-in">
                <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-8 py-5 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-lg border border-teal-400/30">
                            ✉️
                        </div>
                        <div>
                            <div class="text-[10px] font-extrabold uppercase tracking-widest text-teal-300">Sécurité CCMVR</div>
                            <h2 class="text-base font-black text-white">Vérification de votre adresse e-mail</h2>
                        </div>
                    </div>
                    <button type="button" onclick="CCMVR.App.renderAuthScreen()" class="p-1.5 text-slate-400 hover:text-white rounded-lg">✕</button>
                </div>

                <div class="p-8 space-y-5 text-xs">
                    <div class="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950 space-y-1">
                        <div class="font-extrabold flex items-center gap-1.5 text-teal-900">
                            <i data-lucide="mail-check" class="w-4 h-4 text-teal-600"></i>
                            Code de validation envoyé par e-mail
                        </div>
                        <p class="text-teal-800 text-[11px] leading-relaxed">
                            Un code de confirmation temporaire à 6 chiffres a été envoyé à l'adresse de votre structure :
                            <br><strong class="font-mono-code text-teal-950 text-xs">${p.email}</strong>
                        </p>
                    </div>

                    <form onsubmit="CCMVR.App.handleConfirmSignupOtp(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-800 mb-2 text-center uppercase tracking-wider">
                                Saisissez le code secret à 6 chiffres :
                            </label>
                            <input type="text" id="signup-otp-input" required maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" placeholder="• • • • • •" class="w-full text-center tracking-[12px] font-mono-code font-black text-2xl py-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-600 focus:outline-none bg-slate-50"/>
                            <div id="signup-otp-error" class="hidden mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center"></div>
                        </div>

                        <div class="flex flex-col gap-2 pt-2">
                            <button type="submit" class="w-full py-3 btn-accent text-xs font-black shadow-lg flex items-center justify-center gap-2">
                                ✓ Confirmer l'adresse e-mail & Activer mon compte
                            </button>
                            <button type="button" onclick="CCMVR.App.resendSignupOtp()" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-[11px]">
                                🔄 Renvoyer un nouveau code par e-mail
                            </button>
                            <button type="button" onclick="CCMVR.App.handleStartNewAssociationSignup()" class="w-full py-2 text-slate-500 hover:text-slate-700 text-[11px] font-medium text-center">
                                ← Modifier l'adresse ou les informations d'inscription
                            </button>

                        </div>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    async handleConfirmSignupOtp(e) {
        e.preventDefault();
        const errBox = document.getElementById('signup-otp-error');
        if (errBox) errBox.classList.add('hidden');

        const inputCode = (document.getElementById('signup-otp-input')?.value || '').trim();
        if (!this.pendingSignup) {
            this.toast('Session d\'inscription expirée, veuillez recommencer.', 'error');
            this.handleStartNewAssociationSignup();
            return;
        }

        if (Date.now() > this.pendingSignup.expiresAt) {
            if (errBox) {
                errBox.textContent = 'Ce code a expiré. Veuillez cliquer sur "Renvoyer un nouveau code".';
                errBox.classList.remove('hidden');
            }
            return;
        }

        if (inputCode !== this.pendingSignup.otp) {
            if (errBox) {
                errBox.textContent = 'Code incorrect. Veuillez vérifier votre boîte mail et saisir les 6 chiffres.';
                errBox.classList.remove('hidden');
            }
            return;
        }

        this.showLoader(true);
        try {
            const { structure } = await window.CCMVR.Store.registerNewAssociationAccount(this.pendingSignup.payload);
            const savedEmail = this.pendingSignup.payload.email;
            this.pendingSignup = null;

            document.getElementById('auth-screen').style.display = 'none';
            if (structure && structure.id) {
                window.CCMVR.Store.activeStructureId = structure.id;
            }
            this.currentTab = 'asso_profil';
            this.renderHeader();
            this.renderNavigation();
            this.renderMainView();
            this.toast(`✓ Adresse e-mail vérifiée ! Bienvenue sur l'espace de « ${structure.nom_officiel} ».`, 'success');
        } catch (err) {
            if (errBox) {
                errBox.textContent = err.message || 'Erreur lors de l\'activation du compte.';
                errBox.classList.remove('hidden');
            }
        } finally {
            this.showLoader(false);
        }
    },

    async resendSignupOtp() {
        if (!this.pendingSignup) return;
        this.showLoader(true);
        try {
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            this.pendingSignup.otp = newOtp;
            this.pendingSignup.expiresAt = Date.now() + 15 * 60 * 1000;
            if (window.CCMVR.NotificationService) {
                await window.CCMVR.NotificationService.sendAccountVerificationOtp({
                    email: this.pendingSignup.payload.email,
                    nomAsso: this.pendingSignup.payload.nom_officiel,
                    code: newOtp,
                    expireMinutes: 15
                });
            }
            this.toast('Nouveau code envoyé par e-mail !', 'info');
            const inp = document.getElementById('signup-otp-input');
            if (inp) { inp.value = ''; inp.focus(); }
        } catch (err) {
            this.toast('Erreur réexpédition : ' + err.message, 'error');
        } finally {
            this.showLoader(false);
        }
    },

    async handleLogout() {
        await window.CCMVR.Store.logout();
        this.renderAuthScreen();
        this.toast('Vous êtes déconnecté.', 'info');
    },

    // Contrôle de la largeur et du masquage du volet latéral gauche,

    adjustSidebarWidth(delta) {
        const sidebar = document.getElementById('app-sidebar');
        const edgeBtn = document.getElementById('sidebar-reopen-edge-btn');
        if (!sidebar) return;
        this.sidebarHidden = false;
        sidebar.style.display = 'flex';
        sidebar.classList.remove('hidden');
        if (edgeBtn) edgeBtn.style.display = 'none';
        this.sidebarWidth = Math.max(220, Math.min(460, (this.sidebarWidth || 310) + delta));
        sidebar.style.width = this.sidebarWidth + 'px';
        this.renderHeader();
    },

    toggleSidebarHide() {
        const sidebar = document.getElementById('app-sidebar');
        const resizer = document.getElementById('sidebar-resizer');
        const edgeBtn = document.getElementById('sidebar-reopen-edge-btn');
        if (!sidebar) return;
        this.sidebarHidden = !this.sidebarHidden;
        if (this.sidebarHidden) {
            sidebar.style.display = 'none';
            if (resizer) resizer.style.display = 'none';
            if (edgeBtn) edgeBtn.style.display = 'flex';
        } else {
            sidebar.style.display = 'flex';
            sidebar.style.width = (this.sidebarWidth || 310) + 'px';
            if (resizer) resizer.style.display = '';
            if (edgeBtn) edgeBtn.style.display = 'none';
        }
        this.renderHeader();
    },

    toast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const colors = {
            success: 'bg-slate-900 text-white border-slate-700',
            warning: 'bg-amber-600 text-white border-amber-500',
            error: 'bg-rose-600 text-white border-rose-500',
            info: 'bg-blue-600 text-white border-blue-500'
        };
        const div = document.createElement('div');
        div.className = `toast-enter flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium ${colors[type] || colors.success}`;
        div.innerHTML = `<span>${message}</span>`;
        container.appendChild(div);
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.2s ease';
            setTimeout(() => div.remove(), 250);
        }, 3500);
    },

    syncDefaultTabForRole() {
        const role = window.CCMVR.Store.currentUser.role;
        if (role === 'admin') this.currentTab = 'cdg_dashboard';
        else if (role === 'pole_metier') this.currentTab = 'pole_instruction';
        else if (role === 'pole_accueil') this.currentTab = 'nat_calendrier';
        else if (role === 'pole_batiments') this.currentTab = 'nat_pointage';
        else if (role === 'association') this.currentTab = 'asso_profil';
    },

    switchPersona(personaKey) {
        window.CCMVR.Store.setPersona(personaKey);
        this.syncDefaultTabForRole();
        this.renderHeader();
        this.renderNavigation();
        this.renderMainView();
        const u = window.CCMVR.Store.currentUser;
        this.toast(`Vue active : ${u.nom}`, 'info');
    },

    switchTab(tabId) {
        const store = window.CCMVR.Store;
        if (tabId === 'asso_minibus' && store.currentUser.role === 'association') {
            const tabs = this.getTabsForCurrentRole();
            if (!tabs.some(t => t.id === 'asso_minibus')) {
                this.toast("L'accès au module de réservation du minibus est réservé aux associations disposant d'une convention active signée par les deux parties.", 'warning');
                tabId = 'asso_conventions';
            }
        }
        this.currentTab = tabId;
        this.renderHeader();
        this.renderNavigation();
        this.renderMainView();
    },

    switchMillesime(year) {
        window.CCMVR.Store.activeMillesime = Number(year);
        this.renderHeader();
        this.renderNavigation();
        this.renderMainView();
        this.toast(`Exercice actif : ${year}`, 'info');
    },

    // ==========================================================================
    // RENDU DU VOLET LATÉRAL GAUCHE (SIDEBAR) ET DE LA BARRE SUPÉRIEURE
    // ==========================================================================,

    getTabsForCurrentRole() {
        const store = window.CCMVR.Store;
        const role = store.currentUser.role;
        const counts = store.getActionBadgesCount();

        if (role === 'admin') {
            return [
                { id: 'cdg_dashboard', label: 'Pilotage 360° & Visas', icon: 'shield-check', alertCount: counts.cdg_dashboard },
                { id: 'cdg_associations', label: 'Registre Tableur Associations', icon: 'table-2', alertCount: 0 },
                { id: 'cdg_registre', label: 'Registre des Conventions', icon: 'file-check-2', alertCount: counts.cdg_registre },
                { id: 'cdg_nature', label: 'Aides en Nature & Barèmes', icon: 'calculator', alertCount: 0 },
                { id: 'cdg_socle', label: 'Socles Juridiques par Type', icon: 'shield-check', alertCount: 0 },
                { id: 'pole_annexe', label: 'Modèles Annexes & Hors Cadre', icon: 'file-edit', alertCount: 0 },
                { id: 'cdg_roles', label: 'Administration des Accès & Rôles', icon: 'users', alertCount: 0 },
                { id: 'cdg_import', label: 'Import Historique', icon: 'upload-cloud', alertCount: 0 },
                { id: 'pole_faq', label: 'Mémo & Guide des Services', icon: 'help-circle', alertCount: 0 }
            ];
        }
        if (role === 'pole_metier') {
            const poleCode = store.currentUser.pole_code;
            return [
                { id: 'pole_instruction', label: `Instruction Dossiers (${poleCode})`, icon: 'inbox', alertCount: counts.pole_instruction },
                { id: 'pole_annexe', label: `Annexes & Conventions (${poleCode})`, icon: 'file-edit', alertCount: 0 },
                { id: 'pole_conventions', label: 'Registre & Création Conventions', icon: 'file-text', alertCount: 0 },
                { id: 'pole_criteres', label: `Critères & Barème ${poleCode}`, icon: 'sliders', alertCount: 0 },
                { id: 'cdg_associations', label: 'Registre Tableur Associations', icon: 'table-2', alertCount: 0 },
                { id: 'pole_commission', label: 'Mode Séance Commission', icon: 'projector', alertCount: counts.pole_commission },
                { id: 'pole_faq', label: 'Mémo & FAQ Instruction', icon: 'help-circle', alertCount: 0 }
            ];
        }
        if (role === 'pole_accueil') {
            return [
                { id: 'nat_calendrier', label: 'Calendrier & Flotte Minibus', icon: 'calendar', alertCount: counts.nat_calendrier },
                { id: 'pole_annexe', label: 'Annexes & Conventions (ACCUEIL)', icon: 'file-edit', alertCount: 0 },
                { id: 'pole_conventions', label: 'Suivi & Création Conventions', icon: 'file-text', alertCount: 0 },
                { id: 'nat_attestations', label: 'Attestations Annuelles', icon: 'award', alertCount: 0 },
                { id: 'nat_tarifs', label: 'Barème Kilométrique', icon: 'coins', alertCount: 0 }
            ];
        }
        if (role === 'pole_batiments') {
            return [
                { id: 'nat_pointage', label: 'Pointage Bâtiments & Régie', icon: 'clipboard-list', alertCount: 0 },
                { id: 'pole_annexe', label: 'Annexes & Conventions (BÂT.)', icon: 'file-edit', alertCount: 0 },
                { id: 'pole_conventions', label: 'Suivi & Création Conventions', icon: 'file-text', alertCount: 0 },
                { id: 'nat_tarifs', label: 'Grille Tarifaire Millésimée', icon: 'coins', alertCount: 0 },
                { id: 'nat_attestations', label: 'Attestations Annuelles', icon: 'award', alertCount: 0 },
                { id: 'nat_calendrier', label: 'Planning Minibus', icon: 'truck', alertCount: counts.nat_calendrier }
            ];
        }
        // Association
        const sId = store.activeStructureId;
        const convs = store.getEnrichedConventions().filter(c => c.structure_id === sId);
        const hasSignedMb = convs.some(c => {
            const isMb = (c.normType === 'CONV_MINIBUS') ||
                (c.type_convention || '').toUpperCase().includes('MINIBUS') ||
                (c.intitule || '').toUpperCase().includes('MINIBUS') ||
                (c.customMeta?.nature_categories || []).includes('MINIBUS') ||
                (c.dossier?.categories_nature || []).includes('MINIBUS');
            return isMb && (c.statut_signature === 'VALIDE' || (c.isSignePresidente && c.isSigneAsso) || Boolean(c.scan_signe_nom || localStorage.getItem(`ccmvr_scan_conv_${c.id}`)));
        });
        return [
            { id: 'asso_profil', label: 'Mon Identité SIREN, Statuts & CER', icon: 'building-2', alertCount: 0 },
            { id: 'asso_demande', label: 'Déposer une Demande & Budget', icon: 'file-plus-2', alertCount: 0 },
            { id: 'asso_conventions', label: 'Suivre mes Demandes & Conventions', icon: 'clipboard-list', alertCount: counts.asso_conventions },
            hasSignedMb ? { id: 'asso_minibus', label: 'Réserver Minibus & Aides en Nature', icon: 'truck', alertCount: 0 } : null
        ].filter(Boolean);
    },

    buildSuperAdminPersonaOptionsHtml() {
        const store = window.CCMVR.Store;
        const user = store.currentUser;
        const personas = window.CCMVR.CONFIG.PERSONAS;

        // 1. Comptes internes CCMVR en priorité (5 Pôles Métiers + CDG + Services Techniques)
        const internalKeys = ['admin', 'sport', 'enfance', 'culture', 'tourisme', 'economie', 'accueil', 'batiments'];
        const internalOpts = internalKeys.map(k => {
            const p = personas[k];
            if (!p) return '';
            return `<option value="${p.id}" style="background-color:#ffffff; color:#0f172a; font-weight:700;" ${user.id === p.id ? 'selected' : ''}>
                🏛️ ${p.nom} (${p.email})
            </option>`;
        }).join('');

        // 2. Comptes des associations créées dans la base
        const structOpts = store.state.structures.map(st => {
            const key = 'STRUCT_' + st.id;
            const isSel = (user.id === key);
            return `<option value="${key}" style="background-color:#ffffff; color:#0f172a;" ${isSel ? 'selected' : ''}>
                🤝 ${st.nom_officiel} (SIREN : ${(st.siret || '').slice(0, 9)})
            </option>`;
        }).join('');

        return `
            <optgroup label="1. Services Internes CCMVR" style="background:#f8fafc;color:#1e3a8a;font-weight:800;">
                ${internalOpts}
            </optgroup>
            <optgroup label="2. Comptes Associations Inscrites" style="background:#f8fafc;color:#4f46e5;font-weight:800;">
                ${structOpts}
            </optgroup>
        `;
    },

    renderHeader() {
        const store = window.CCMVR.Store;
        const user = store.currentUser;
        const tabs = this.getTabsForCurrentRole();
        const activeTabObj = tabs.find(t => t.id === this.currentTab) || tabs[0];

        const headerEl = document.getElementById('app-header');
        if (!headerEl) return;

        // Si connecté en Super-Admin (controle@ccmvr.fr), afficher le sélecteur de supervision de tous les comptes
        const adminSwitcherHtml = store.isSuperAdmin ? `
            <div class="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200 px-3 py-1.5 rounded-xl">
                <span class="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-extrabold uppercase">Supervision Admin</span>
                <select onchange="CCMVR.App.switchPersona(this.value)" class="bg-white text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer">
                    ${this.buildSuperAdminPersonaOptionsHtml()}
                </select>
            </div>
        ` : '';

        headerEl.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
                <!-- Bouton d'ouverture/masquage du volet gauche + Fil d'Ariane -->
                <div class="flex items-center gap-3">
                    <button onclick="CCMVR.App.toggleSidebarHide()" title="${this.sidebarHidden ? 'Afficher le volet latéral' : 'Masquer le volet latéral d\'un clic'}"
                        class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition">
                        <i data-lucide="${this.sidebarHidden ? 'panel-left-open' : 'panel-left-close'}" class="w-4 h-4 text-indigo-600"></i>
                        <span class="hidden sm:inline">${this.sidebarHidden ? 'Ouvrir le menu' : 'Masquer le volet'}</span>
                    </button>

                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <i data-lucide="${(activeTabObj?.icon || 'layers').toLowerCase()}" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-extrabold text-slate-900">${activeTabObj?.label || 'Tableau de bord'}</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Exercice ${store.activeMillesime}
                                </span>
                            </div>
                            <div class="text-[11px] text-slate-500 font-semibold">${user.nom}</div>
                        </div>
                    </div>
                </div>

                <!-- Contrôles Droite : Supervision Admin (si controle@ccmvr.fr) + Déconnexion -->
                <div class="flex flex-wrap items-center gap-2.5">
                    ${adminSwitcherHtml}
                    <button onclick="CCMVR.App.handleLogout()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition">
                        <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                        <span>Déconnexion</span>
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    renderNavigation() {
        const sidebarEl = document.getElementById('app-sidebar');
        if (!sidebarEl) return;
        const store = window.CCMVR.Store;
        const tabs = this.getTabsForCurrentRole();
        const user = store.currentUser;

        const tabsHtml = tabs.map(t => {
            const active = this.currentTab === t.id;
            const alertPill = t.alertCount > 0
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-sm animate-pulse" title="${t.alertCount} action(s) requise(s)" aria-label="${t.alertCount} action(s) requise(s)">${t.alertCount}</span>`
                : '';
            return `
                <button role="tab" aria-selected="${active ? 'true' : 'false'}" tabindex="0" onclick="CCMVR.App.switchTab('${t.id}')" class="sidebar-nav-item ${active ? 'active' : ''}">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-blue-400'}" aria-hidden="true">
                        <i data-lucide="${t.icon.toLowerCase()}" class="w-4 h-4"></i>
                    </div>
                    <div class="flex-1 min-w-0 text-left">
                        <div class="truncate text-xs">${t.label}</div>
                    </div>
                    ${alertPill}
                </button>
            `;
        }).join('');

        // Sélecteur de vue dans le volet gauche uniquement pour le compte Admin (controle@ccmvr.fr)
        const adminSidebarSelect = store.isSuperAdmin ? `
            <div class="pt-2 border-t border-indigo-500/20">
                <label class="block text-[10px] uppercase tracking-wider text-indigo-300 font-bold mb-1">Vue active (Admin) :</label>
                <select onchange="CCMVR.App.switchPersona(this.value)" class="w-full bg-white text-slate-900 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-indigo-300 cursor-pointer">
                    ${this.buildSuperAdminPersonaOptionsHtml()}
                </select>
            </div>
        ` : '';

        sidebarEl.innerHTML = `
            <div class="p-5 space-y-5">
                <!-- En-tête Collectivité avec Logo x2 (h-20) + Contrôles de taille du volet -->
                <div class="pb-4 border-b border-slate-800 space-y-3">
                    <div class="flex items-start justify-between gap-2">
                        <div class="bg-white p-2.5 rounded-2xl shadow-lg inline-flex items-center justify-center">
                            <img src="logo-collectivite.png" alt="CCMVR" class="h-20 w-auto object-contain" onerror="this.style.display='none'"/>
                        </div>
                        <!-- Boutons Agrandir / Réduire / Masquer le volet de gauche -->
                        <div class="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
                            <button onclick="CCMVR.App.adjustSidebarWidth(-35)" title="Réduire la largeur du volet" class="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-xs font-bold">−</button>
                            <button onclick="CCMVR.App.adjustSidebarWidth(35)" title="Agrandir la largeur du volet" class="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-xs font-bold">+</button>
                            <button onclick="CCMVR.App.toggleSidebarHide()" title="Masquer le volet d'un clic" class="p-1 text-slate-300 hover:text-rose-400 hover:bg-slate-700 rounded">
                                <i data-lucide="chevrons-left" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <div class="text-xs font-black tracking-tight text-white uppercase">Marches du Velay Rochebaron</div>
                        <div class="text-[11px] font-medium text-blue-300">Gestion des Subventions & Conventions</div>
                    </div>
                </div>

                <!-- Encart Profil Actif -->
                <div class="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800/90 to-indigo-950/90 border border-indigo-500/30 shadow-inner space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${user.badgeColor}">
                            ${user.pole_code || 'ASSOCIATION'}
                        </span>
                        <span class="text-[10px] text-indigo-300 font-mono-code truncate">${user.email}</span>
                    </div>
                    <div>
                        <div class="text-sm font-extrabold text-white leading-snug">${user.nom}</div>
                        <div class="text-[11px] text-slate-300 mt-0.5 leading-snug">${user.titre}</div>
                    </div>
                    ${adminSidebarSelect}
                </div>

                <!-- Modules de Navigation avec Pastilles Rouges d'Action Requise -->
                <nav role="tablist" aria-label="Navigation des modules" class="space-y-1.5">
                    <div class="px-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                        Navigation
                    </div>
                    ${tabsHtml}
                </nav>
            </div>

            <!-- Bas du Volet Latéral : Sélecteur d'Exercice & Déconnexion -->
            <div class="p-5 border-t border-slate-800/80 bg-slate-950/50 space-y-3">
                <div class="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                    <span class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <i data-lucide="calendar" class="w-3.5 h-3.5 text-blue-400"></i>
                        Exercice
                    </span>
                    <select onchange="CCMVR.App.switchMillesime(this.value)" class="bg-white text-slate-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border-0 cursor-pointer">
                        <option value="2026" style="background-color:#ffffff; color:#0f172a;" ${store.activeMillesime === 2026 ? 'selected' : ''}>2026</option>
                        <option value="2027" style="background-color:#ffffff; color:#0f172a;" ${store.activeMillesime === 2027 ? 'selected' : ''}>2027</option>
                        <option value="2028" style="background-color:#ffffff; color:#0f172a;" ${store.activeMillesime === 2028 ? 'selected' : ''}>2028</option>
                    </select>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    },

    // ==========================================================================
    // ROUTEUR DE VUES PRINCIPALES
    // ==========================================================================,

    renderMainView() {
        const container = document.getElementById('app-main');
        if (!container) return;

        switch (this.currentTab) {
            // VUES CONTRÔLEUR DE GESTION / ADMIN
            case 'cdg_dashboard':
                this.renderCdgDashboard(container);
                break;
            case 'cdg_associations':
                this.renderAssociationsRegistrySpreadsheet(container);
                break;
            case 'cdg_registre':
                this.renderCdgRegistre(container);
                break;
            case 'cdg_nature':
                this.renderNatTarifsAndOverview(container, true);
                break;
            case 'cdg_socle':
                this.renderCdgSocleJuridique(container);
                break;
            case 'cdg_roles':
                if (typeof this.renderCdgRolesAdmin === 'function') {
                    this.renderCdgRolesAdmin(container);
                } else if (window.CCMVR.Modules.Cdg && typeof window.CCMVR.Modules.Cdg.renderCdgRolesAdmin === 'function') {
                    window.CCMVR.Modules.Cdg.renderCdgRolesAdmin(container);
                }
                break;
            case 'cdg_import':
                this.renderCdgImportMasse(container);
                break;

            // VUES PÔLE MÉTIER (SPORT, ENFANCE, CULTURE)
            case 'pole_instruction':
                this.renderPoleInstruction(container);
                break;
            case 'pole_annexe':
                this.renderPoleAnnexeEditor(container);
                break;
            case 'pole_criteres':
                this.renderPoleCriteresConfig(container);
                break;
            case 'pole_conventions':
                this.renderCdgRegistre(container, window.CCMVR.Store.currentUser.pole_code);
                break;
            case 'pole_commission':
                this.renderPoleCommissionMode(container);
                break;
            case 'pole_faq':
                this.renderPoleFaqMemo(container);
                break;

            // VUES BÂTIMENTS, ACCUEIL MINIBUS & DSI
            case 'nat_calendrier':
                this.renderNatCalendrierMinibus(container);
                break;
            case 'nat_pointage':
                this.renderNatPointageRegie(container);
                break;
            case 'nat_tarifs':
                this.renderNatTarifsAndOverview(container, false);
                break;
            case 'nat_attestations':
                this.renderNatAttestations(container);
                break;

            // VUES EXTRANET ASSOCIATION
            case 'asso_profil':
                this.renderAssoProfil(container);
                break;
            case 'asso_demande':
                this.renderAssoDemandeForm(container);
                break;
            case 'asso_minibus':
                this.renderAssoMinibusAndNature(container);
                break;
            case 'asso_conventions':
                this.renderAssoConventions(container);
                break;

            default:
                this.renderCdgDashboard(container);
        }
        if (window.lucide) window.lucide.createIcons();
    },

    // ==========================================================================
    // [TEMP_PUBLIC_CHECK_ASSO_START]
    // MODULE PROVISOIRE : VÉRIFICATEUR DIRECT D'ASSOCIATION (PÔLES CCMVR)
    // Actif uniquement lorsque CCMVR.CONFIG.ENABLE_TEMP_PUBLIC_CHECK_ASSO === true.
    // Aucune création de compte ni écriture en base Supabase (lecture seule).
    // ==========================================================================

    _tempCheckerState: null,

    _getTempCheckerState() {
        if (!this._tempCheckerState) {
            this._tempCheckerState = {
                isOpen: false,
                isLoading: false,
                loadingMessage: '',
                query: '',
                error: null,
                candidates: [],
                selectedFromList: false,
                result: null,
                docsRegistry: [],
                docFilterText: '',
                onlyEnteredSiretDac: false,
                requestSeq: 0
            };
        }
        return this._tempCheckerState;
    },

    openTempAssoCheckerModal() {
        if (!window.CCMVR?.CONFIG?.ENABLE_TEMP_PUBLIC_CHECK_ASSO) return;
        const st = this._getTempCheckerState();
        st.isOpen = true;
        this.renderTempAssoCheckerOverlay();
        setTimeout(() => {
            const inp = document.getElementById('temp-checker-search-input');
            if (inp) {
                inp.focus();
                if (inp.value) inp.select();
            }
        }, 30);
    },

    closeTempAssoCheckerModal() {
        const st = this._getTempCheckerState();
        st.isOpen = false;
        st.isLoading = false;
        st.requestSeq += 1;
        const root = document.getElementById('temp-asso-checker-root');
        if (root) root.innerHTML = '';
    },

    resetTempCheckerSearch() {
        const st = this._getTempCheckerState();
        st.requestSeq += 1;
        st.isLoading = false;
        st.query = '';
        st.error = null;
        st.candidates = [];
        st.selectedFromList = false;
        st.result = null;
        st.docsRegistry = [];
        st.docFilterText = '';
        st.onlyEnteredSiretDac = false;
        this.renderTempAssoCheckerOverlay();
        setTimeout(() => document.getElementById('temp-checker-search-input')?.focus(), 20);
    },

    handleTempCheckerSearchSubmit(e) {
        if (e) e.preventDefault();
        const inp = document.getElementById('temp-checker-search-input');
        const query = inp ? inp.value : (this._getTempCheckerState().query || '');
        this.searchTempAssoChecker(query);
    },

    async searchTempAssoChecker(rawQuery) {
        if (!window.CCMVR?.CONFIG?.ENABLE_TEMP_PUBLIC_CHECK_ASSO) return;
        const st = this._getTempCheckerState();
        const query = String(rawQuery || '').trim();
        st.query = query;
        st.error = null;
        st.result = null;
        st.candidates = [];
        st.selectedFromList = false;
        st.docsRegistry = [];
        st.docFilterText = '';
        st.onlyEnteredSiretDac = false;

        if (!query || query.replace(/\s+/g, '').length < 2) {
            st.error = "Veuillez saisir un n° SIRET (14 chiffres), SIREN (9 chiffres), RNA (W...) ou le nom d'une association.";
            this.renderTempAssoCheckerOverlay();
            return;
        }

        const reqSeq = ++st.requestSeq;
        st.isLoading = true;
        st.loadingMessage = 'Recherche dans les répertoires nationaux (INSEE / API Entreprise / RNA)...';
        this.renderTempAssoCheckerOverlay();

        try {
            const searchRes = await window.CCMVR.FinanceEngine.searchAssociationsForChecker(query);
            if (!st.isOpen || st.requestSeq !== reqSeq) return;

            st.candidates = searchRes.candidates || [];
            if (searchRes.mode === 'LIST') {
                st.isLoading = false;
                this.renderTempAssoCheckerOverlay();
                return;
            }

            await this.loadTempCheckedAssociation(searchRes.identifier, searchRes.enteredSiret, reqSeq, false);
        } catch (err) {
            if (!st.isOpen || st.requestSeq !== reqSeq) return;
            st.isLoading = false;
            st.error = err?.message || "Impossible d'interroger les répertoires officiels pour cette recherche.";
            this.renderTempAssoCheckerOverlay();
        }
    },

    async selectTempCheckerCandidate(index) {
        if (!window.CCMVR?.CONFIG?.ENABLE_TEMP_PUBLIC_CHECK_ASSO) return;
        const st = this._getTempCheckerState();
        const cand = st.candidates?.[index];
        if (!cand) return;
        const reqSeq = ++st.requestSeq;
        await this.loadTempCheckedAssociation(cand.siren || cand.rna, cand.siret_siege || '', reqSeq, true);
    },

    backToTempCheckerCandidates() {
        const st = this._getTempCheckerState();
        st.result = null;
        st.error = null;
        st.selectedFromList = false;
        st.docsRegistry = [];
        st.docFilterText = '';
        st.onlyEnteredSiretDac = false;
        this.renderTempAssoCheckerOverlay();
    },

    async loadTempCheckedAssociation(identifier, preferredSiret = '', existingReqSeq = null, fromList = false) {
        if (!window.CCMVR?.CONFIG?.ENABLE_TEMP_PUBLIC_CHECK_ASSO) return;
        const st = this._getTempCheckerState();
        const reqSeq = existingReqSeq !== null ? existingReqSeq : ++st.requestSeq;

        st.isLoading = true;
        st.error = null;
        st.selectedFromList = Boolean(fromList);
        st.loadingMessage = "Récupération en direct de la fiche et des pièces officielles (RNA, Le Compte Asso / DAC, INSEE)...";
        this.renderTempAssoCheckerOverlay();

        try {
            const payload = await window.CCMVR.FinanceEngine.fetchLiveAssociationForChecker(identifier, preferredSiret);
            if (!st.isOpen || st.requestSeq !== reqSeq) return;

            st.result = payload;
            st.isLoading = false;
            st.docFilterText = '';
            st.onlyEnteredSiretDac = false;
            this.renderTempAssoCheckerOverlay();
        } catch (err) {
            if (!st.isOpen || st.requestSeq !== reqSeq) return;
            st.isLoading = false;
            st.error = err?.message || "Erreur lors de la récupération de la fiche association.";
            this.renderTempAssoCheckerOverlay();
        }
    },

    refreshTempCheckedAssociation() {
        const st = this._getTempCheckerState();
        if (!st.result) return;
        const ident = st.result.cleanSiren || st.result.apiInfo?.rna || st.result.cleanSiret;
        if (!ident) return;
        this.loadTempCheckedAssociation(ident, st.result.enteredSiret || '', null, st.selectedFromList);
    },

    updateTempCheckerDocFilter(value) {
        const st = this._getTempCheckerState();
        st.docFilterText = String(value || '');
        this.renderTempCheckerDocsContainer();
    },

    toggleTempCheckerSiretFilter() {
        const st = this._getTempCheckerState();
        st.onlyEnteredSiretDac = !st.onlyEnteredSiretDac;
        this.renderTempCheckerDocsContainer();
    },

    previewTempCheckedDoc(docIndex) {
        const st = this._getTempCheckerState();
        const doc = st.docsRegistry?.[docIndex];
        if (!doc) return;
        this.openDocumentPreviewModal({ ...doc, readOnly: true, ephemeral: true });
    },

    downloadTempCheckedDoc(docIndex) {
        const st = this._getTempCheckerState();
        const doc = st.docsRegistry?.[docIndex];
        if (!doc) return;
        this.downloadDocumentOrAttestation({ ...doc, readOnly: true, ephemeral: true });
    },

    _buildTempCheckerDocsSectionsHtml() {
        const st = this._getTempCheckerState();
        const res = st.result;
        if (!res) return { html: '', rnaVisibleCount: 0, dacVisibleCount: 0, rnaTotal: 0, dacTotal: 0 };

        const esc = this.escapeHtml.bind(this);
        const { apiInfo, ephemeralStructure, enteredSiret, cleanSiret } = res;
        const filter = (st.docFilterText || '').trim().toLowerCase();

        st.docsRegistry = [];

        const allRna = Array.isArray(apiInfo.documents_rna) ? apiInfo.documents_rna : [];
        const allDac = Array.isArray(apiInfo.documents_dac) ? apiInfo.documents_dac : [];

        const filteredRna = allRna.filter(doc => {
            if (!filter) return true;
            const hay = `${doc.code || ''} ${doc.libelle || ''} ${doc.date || ''} ${doc.annee || ''}`.toLowerCase();
            return hay.includes(filter);
        });

        const filteredDac = allDac.filter(dac => {
            if (st.onlyEnteredSiretDac && enteredSiret && dac.siret && dac.siret !== enteredSiret) {
                return false;
            }
            if (!filter) return true;
            const hay = `${dac.nom || ''} ${dac.type || ''} ${dac.siret || ''} ${dac.date_depot || ''} ${dac.annee_validite || ''} ${dac.etat || ''} ${dac.commentaire || ''}`.toLowerCase();
            return hay.includes(filter);
        });

        const rnaRowsHtml = filteredRna.map(doc => {
            const title = doc.libelle || 'Document officiel RNA';
            const date = doc.date || doc.annee || '';
            const idx = st.docsRegistry.length;
            st.docsRegistry.push({
                title,
                url: doc.url || '',
                date: date || 'Enregistré',
                type: `RNA (${doc.code || 'DOC'})`,
                source: "Ministère de l'Intérieur — RNA",
                docId: doc.code || 'STC',
                siret: enteredSiret || cleanSiret,
                structKey: ephemeralStructure.id,
                structure: ephemeralStructure,
                readOnly: true,
                ephemeral: true
            });
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs">
                    <td class="py-2.5 px-3 font-mono-code font-bold text-slate-800 whitespace-nowrap">${esc(date || '—')}</td>
                    <td class="py-2.5 px-3 font-semibold text-slate-900">
                        <span class="inline-flex items-center gap-1.5 flex-wrap">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${doc.code === 'STC' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}">${esc(doc.code || 'DOC')}</span>
                            <span>${esc(title)}</span>
                        </span>
                    </td>
                    <td class="py-2.5 px-3 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5 justify-end">
                            <button type="button" onclick="CCMVR.App.previewTempCheckedDoc(${idx})" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer">
                                <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i> Visualiser
                            </button>
                            <button type="button" onclick="CCMVR.App.downloadTempCheckedDoc(${idx})" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer">
                                <i data-lucide="download" class="w-3.5 h-3.5"></i> Télécharger
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const dacRowsHtml = filteredDac.map(dac => {
            const nom = dac.nom || 'Document administratif complémentaire';
            const isTargetSiret = Boolean(enteredSiret && dac.siret === enteredSiret);
            const isArchived = String(dac.etat || '').toLowerCase().includes('archiv');
            const idx = st.docsRegistry.length;
            st.docsRegistry.push({
                title: nom,
                url: dac.url || '',
                date: dac.date_depot || (dac.annee_validite ? String(dac.annee_validite) : 'Déposé'),
                type: dac.type ? `DAC • ${dac.type}` : `DAC (${dac.annee_validite || 'Le Compte Asso'})`,
                source: 'DJEPVA — Le Compte Asso',
                docId: 'DAC',
                siret: dac.siret || enteredSiret || cleanSiret,
                structKey: ephemeralStructure.id,
                structure: ephemeralStructure,
                readOnly: true,
                ephemeral: true
            });
            return `
                <tr class="border-b border-slate-100 transition text-xs ${isTargetSiret ? 'bg-blue-50/70 hover:bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50/80'}">
                    <td class="py-2.5 px-3 font-mono-code text-[11px] whitespace-nowrap">
                        <div class="font-bold ${isTargetSiret ? 'text-blue-900' : 'text-slate-700'}">${esc(dac.siret || cleanSiret || '—')}</div>
                        ${isTargetSiret ? '<span class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase">🎯 SIRET saisi</span>' : ''}
                    </td>
                    <td class="py-2.5 px-3 font-mono-code font-bold text-slate-800 whitespace-nowrap">${esc(dac.date_depot || '—')}</td>
                    <td class="py-2.5 px-3 whitespace-nowrap">
                        <div class="font-mono-code font-semibold text-emerald-800">${esc(dac.annee_validite || '—')}</div>
                        ${dac.etat ? `
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isArchived ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}">
                                ${esc(dac.etat)}
                            </span>
                        ` : ''}
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">DAC</span>
                            ${dac.type ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${esc(dac.type)}</span>` : ''}
                        </div>
                        <div class="font-bold text-slate-900 mt-1">${esc(nom)}</div>
                        ${dac.commentaire ? `<div class="text-[11px] text-slate-500 mt-0.5 italic">${esc(dac.commentaire)}</div>` : ''}
                    </td>
                    <td class="py-2.5 px-3 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5 justify-end">
                            <button type="button" onclick="CCMVR.App.previewTempCheckedDoc(${idx})" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer">
                                <i data-lucide="eye" class="w-3.5 h-3.5 text-blue-600"></i> Visualiser
                            </button>
                            <button type="button" onclick="CCMVR.App.downloadTempCheckedDoc(${idx})" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer">
                                <i data-lucide="download" class="w-3.5 h-3.5"></i> Télécharger
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const html = `
            <!-- SECTION 1 : ACTES ET STATUTS (DOCUMENTS AU RNA - MINISTÈRE DE L'INTÉRIEUR) -->
            <div class="space-y-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="text-xs font-black uppercase text-indigo-950 tracking-wide flex items-center gap-2">
                        <span>📜 Actes et statuts • Documents au RNA (Ministère de l'Intérieur)</span>
                        <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">${filteredRna.length}${filteredRna.length !== allRna.length ? ' / ' + allRna.length : ''} pièce(s)</span>
                    </div>
                </div>
                <div class="card-minimal overflow-x-auto border border-slate-200">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                <th class="py-2 px-3">Dépôt</th>
                                <th class="py-2 px-3">Type & Description</th>
                                <th class="py-2 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rnaRowsHtml || `<tr><td colspan="3" class="py-6 text-center text-xs text-slate-400">${allRna.length > 0 ? 'Aucun document RNA ne correspond à votre filtre.' : 'Aucun document RNA numérisé retourné pour cette association.'}</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- SECTION 2 : DOCUMENTS ADMINISTRATIFS COMPLÉMENTAIRES (DAC - LE COMPTE ASSO / DJEPVA) -->
            <div class="space-y-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="text-xs font-black uppercase text-amber-950 tracking-wide flex items-center gap-2">
                        <span>📁 Documents Administratifs Complémentaires (DAC — Le Compte Asso / DJEPVA)</span>
                        <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">${filteredDac.length}${filteredDac.length !== allDac.length ? ' / ' + allDac.length : ''} pièce(s)</span>
                    </div>
                </div>
                <div class="card-minimal overflow-x-auto border border-slate-200">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                <th class="py-2 px-3">SIRET</th>
                                <th class="py-2 px-3">Dépôt</th>
                                <th class="py-2 px-3">Validité & État</th>
                                <th class="py-2 px-3">Catégorie & Fichier</th>
                                <th class="py-2 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dacRowsHtml || `<tr><td colspan="5" class="py-6 text-center text-xs text-slate-400">${allDac.length > 0 ? 'Aucun document DAC ne correspond aux filtres sélectionnés.' : 'Aucun document administratif complémentaire (DAC) déposé sur Le Compte Asso pour cette structure.'}</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        return {
            html,
            rnaVisibleCount: filteredRna.length,
            dacVisibleCount: filteredDac.length,
            rnaTotal: allRna.length,
            dacTotal: allDac.length
        };
    },

    renderTempCheckerDocsContainer() {
        const container = document.getElementById('temp-checker-docs-container');
        if (!container) return;
        const built = this._buildTempCheckerDocsSectionsHtml();
        container.innerHTML = built.html;

        const badge = document.getElementById('temp-checker-docs-filtered-badge');
        if (badge) {
            const totalVis = built.rnaVisibleCount + built.dacVisibleCount;
            const totalAll = built.rnaTotal + built.dacTotal;
            badge.textContent = totalVis !== totalAll
                ? `${totalVis} / ${totalAll} pièce(s) affichée(s)`
                : `${totalAll} pièce(s) au total`;
        }

        const siretToggleBtn = document.getElementById('temp-checker-siret-filter-btn');
        if (siretToggleBtn) {
            const active = Boolean(this._getTempCheckerState().onlyEnteredSiretDac);
            siretToggleBtn.className = active
                ? 'px-3 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white border border-blue-700 shadow-2xs transition cursor-pointer shrink-0'
                : 'px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 transition cursor-pointer shrink-0';
        }
        if (window.lucide) window.lucide.createIcons();
    },

    renderTempAssoCheckerOverlay() {
        if (!window.CCMVR?.CONFIG?.ENABLE_TEMP_PUBLIC_CHECK_ASSO) return;
        const root = document.getElementById('temp-asso-checker-root');
        if (!root) return;

        const st = this._getTempCheckerState();
        if (!st.isOpen) {
            root.innerHTML = '';
            return;
        }

        const esc = this.escapeHtml.bind(this);
        const fin = window.CCMVR.FinanceEngine;

        let bodyHtml = '';

        if (st.isLoading) {
            bodyHtml = `
                <div class="py-16 flex flex-col items-center justify-center text-center space-y-4">
                    <div class="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <div class="space-y-1 max-w-md">
                        <div class="text-sm font-black text-slate-900">Interrogation des serveurs de l'État en cours...</div>
                        <p class="text-xs text-slate-500">${esc(st.loadingMessage)}</p>
                    </div>
                </div>
            `;
        } else if (st.error) {
            bodyHtml = `
                <div class="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-3">
                    <div class="font-black text-sm flex items-center gap-2 text-rose-950">
                        <i data-lucide="alert-circle" class="w-5 h-5 text-rose-600"></i>
                        <span>Recherche non aboutie</span>
                    </div>
                    <p class="leading-relaxed">${esc(st.error)}</p>
                    ${st.selectedFromList && st.candidates.length > 1 ? `
                        <button type="button" onclick="CCMVR.App.backToTempCheckerCandidates()" class="px-3.5 py-2 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-xl font-bold transition cursor-pointer">
                            ← Revenir à la liste des résultats
                        </button>
                    ` : ''}
                </div>
            `;
        } else if (!st.result && st.candidates.length > 1) {
            bodyHtml = `
                <div class="space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 class="text-sm font-black text-slate-900">${st.candidates.length} structure(s) trouvée(s) pour « ${esc(st.query)} »</h3>
                            <p class="text-xs text-slate-500">Cliquez sur l'association souhaitée pour charger en direct ses documents officiels (RNA, Le Compte Asso, Sirene).</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 gap-2.5">
                        ${st.candidates.map((c, idx) => `
                            <button type="button" onclick="CCMVR.App.selectTempCheckerCandidate(${idx})" class="w-full text-left p-4 rounded-2xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group">
                                <div class="space-y-1 min-w-0">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.est_association ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}">
                                            ${c.est_association ? 'Association' : 'Structure'}
                                        </span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                                            ${c.active ? 'Active' : 'Fermée / Cessée'}
                                        </span>
                                        ${c.rna ? `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono-code text-[10px] font-bold">RNA : ${esc(c.rna)}</span>` : ''}
                                        <span class="font-mono-code text-[10px] text-slate-500">SIREN : ${esc(c.siren)}</span>
                                        ${c.siret_siege ? `<span class="font-mono-code text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">SIRET siège : ${esc(c.siret_siege)}</span>` : ''}
                                    </div>
                                    <div class="text-sm font-black text-slate-900 group-hover:text-emerald-950 truncate">${esc(c.nom)}</div>
                                    <div class="text-[11px] text-slate-600">
                                        ${esc(c.adresse_siege || [c.code_postal, c.ville].filter(Boolean).join(' ') || 'Adresse non précisée')}
                                        ${c.nb_etablissements > 1 ? ` • <strong>${c.nb_etablissements} établissements</strong>` : ''}
                                    </div>
                                </div>
                                <span class="px-3.5 py-2 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-extrabold shrink-0 text-center transition">
                                    Consulter les pièces →
                                </span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (st.result) {
            const { apiInfo, enteredSiret, cleanSiren, cleanSiret, liveSource } = st.result;
            const docsBuilt = this._buildTempCheckerDocsSectionsHtml();
            const targetInseeSiret = /^\d{14}$/.test(enteredSiret || '')
                ? enteredSiret
                : (/^\d{14}$/.test(apiInfo.siret_siege || '') ? apiInfo.siret_siege : (/^\d{14}$/.test(cleanSiret || '') ? cleanSiret : ''));
            const matchedEnteredEtab = enteredSiret
                ? (apiInfo.etablissements || []).find(e => e.siret === enteredSiret)
                : null;
            const hasMultipleDacSirets = enteredSiret
                && (apiInfo.documents_dac || []).some(d => d.siret && d.siret !== enteredSiret);

            let sourceBannerHtml = '';
            if (liveSource === 'LIVE_DJEPVA') {
                sourceBannerHtml = `
                    <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2 font-bold">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
                            <span>Flux en direct API Entreprise v4 (DJEPVA / RNA / INSEE) — Pièces officielles actualisées, aucune écriture en base.</span>
                        </div>
                        <span class="font-mono-code text-[10px] text-emerald-800">${docsBuilt.rnaTotal} RNA • ${docsBuilt.dacTotal} DAC</span>
                    </div>
                `;
            } else if (liveSource === 'STATIC_CACHE_DJEPVA') {
                sourceBannerHtml = `
                    <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
                        <div class="font-extrabold flex items-center gap-2">
                            <span>⚠️ Flux temps réel momentanément indisponible — affichage des données de référence en cache</span>
                        </div>
                        <p class="text-[11px] text-amber-900">
                            Certains liens directs vers les PDF peuvent avoir expiré. Utilisez « Actualiser en direct » ou consultez Annuaire des Entreprises si un téléchargement échoue.
                        </p>
                    </div>
                `;
            } else {
                sourceBannerHtml = `
                    <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
                        <div class="font-extrabold">ℹ️ Fiche INSEE récupérée — aucun flux documentaire DJEPVA/RNA retourné pour cet identifiant</div>
                        <p class="text-[11px] text-amber-900">
                            ${esc(apiInfo._djepvaError ? 'Détail passerelle État : ' + apiInfo._djepvaError + '.' : "Cette structure n'est peut-être pas référencée dans le flux DJEPVA / Le Compte Asso.")}
                            Aucun document fictif n'est substitué. Vous pouvez consulter l'Avis Sirene INSEE ou Annuaire des Entreprises ci-dessous.
                        </p>
                    </div>
                `;
            }

            // Déduplication propre des représentants légaux (souvent répétés par établissement)
            const uniqueDirs = [];
            const seenDirs = new Set();
            (apiInfo.representants_legaux || []).forEach(r => {
                const key = `${(r.nom || '').toLowerCase()}|${(r.prenom || '').toLowerCase()}|${(r.fonction || '').toLowerCase()}`;
                if (!seenDirs.has(key)) {
                    seenDirs.add(key);
                    uniqueDirs.push(r);
                }
            });

            const dirigeantsHtml = uniqueDirs.map(r => `
                <div class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                        <div class="font-black text-slate-900 text-xs">${esc([r.civilite, r.prenom, r.nom].filter(Boolean).join(' ') || 'Dirigeant déclaré')}</div>
                        <div class="text-[11px] text-indigo-700 font-bold mt-0.5">${esc(r.fonction || 'Dirigeant légal habilité')}</div>
                    </div>
                    <div class="text-right text-[11px] text-slate-600 font-mono-code space-y-0.5">
                        ${r.telephone ? `<div>📞 ${esc(r.telephone)}</div>` : ''}
                        ${r.courriel ? `<div class="text-blue-700 font-semibold">✉️ ${esc(r.courriel)}</div>` : ''}
                    </div>
                </div>
            `).join('');

            const comptesHtml = (apiInfo.comptes || []).map(c => `
                <div class="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider">
                                Comptes Clos Exercice ${esc(c.annee)}
                            </span>
                            <span class="text-xs text-emerald-950 font-semibold">Flux Officiel DJEPVA (Le Compte Asso)</span>
                        </div>
                        ${c.commissaire_aux_comptes ? '<span class="px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-900 text-[10px] font-bold">Certifiés par Commissaire aux Comptes</span>' : ''}
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

            const etabsHtml = (apiInfo.etablissements || []).map(et => {
                const isTarget = Boolean(enteredSiret && et.siret === enteredSiret);
                const hasSiret14 = /^\d{14}$/.test(String(et.siret || '').replace(/\s+/g, ''));
                return `
                    <div class="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${isTarget ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/30' : 'bg-slate-50 border-slate-200'}">
                        <div class="space-y-0.5">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="font-mono-code font-bold text-slate-900">SIRET : ${esc(et.siret || '—')}</span>
                                ${et.siege ? `<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Siège social</span>` : `<span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">Établissement secondaire</span>`}
                                ${isTarget ? `<span class="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-black uppercase">🎯 SIRET saisi</span>` : ''}
                            </div>
                            ${et.nom ? `<div class="text-[11px] font-bold text-slate-800">${esc(et.nom)}</div>` : ''}
                            <div class="text-[11px] text-slate-600">${esc([et.voie, et.code_postal, et.commune].filter(Boolean).join(' ') || 'Adresse non transmise')}</div>
                            ${et.telephone || et.courriel ? `<div class="text-[10px] font-mono-code text-slate-500">${et.telephone ? '📞 ' + esc(et.telephone) : ''} ${et.courriel ? ' • ✉️ ' + esc(et.courriel) : ''}</div>` : ''}
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            ${hasSiret14 ? `
                                <a href="https://api-avis-situation-sirene.insee.fr/identification/pdf/${encodeURIComponent(et.siret)}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold transition" title="Télécharger l'Avis de Situation Sirene INSEE de cet établissement">
                                    Avis Sirene ↗
                                </a>
                            ` : ''}
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${et.actif === false ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}">
                                ${et.actif === false ? 'Fermé' : 'Actif'}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');

            const agrementsBadges = (apiInfo.agrements || []).map(a => `
                <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">
                    Agrément : ${esc(a.type || a.libelle || a.numero || 'Déclaré')}${a.date_attribution ? ' (' + esc(a.date_attribution) + ')' : ''}
                </span>
            `).join('');

            const reseauxBadges = (apiInfo.reseaux_affiliation || []).map(r => `
                <span class="px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-bold">
                    Affiliation : ${esc(r.nom || r.libelle || r)}
                </span>
            `).join('');

            bodyHtml = `
                <div class="space-y-5">
                    ${st.selectedFromList && st.candidates.length > 1 ? `
                        <div>
                            <button type="button" onclick="CCMVR.App.backToTempCheckerCandidates()" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer">
                                ← Revenir aux ${st.candidates.length} résultats pour « ${esc(st.query)} »
                            </button>
                        </div>
                    ` : ''}

                    ${sourceBannerHtml}

                    <!-- En-tête Association (Lecture Seule) -->
                    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                        <div class="space-y-1.5">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${apiInfo.active === false ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}">
                                    ${apiInfo.active === false ? '⚠️ Structure Inactive / Dissoute' : '✓ Association Active'}
                                </span>
                                ${cleanSiren ? `<span class="font-mono-code text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">SIREN : ${esc(cleanSiren)}</span>` : ''}
                                <span class="font-mono-code text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">RNA : ${esc(apiInfo.rna || '—')}</span>
                                ${apiInfo.code_ape ? `<span class="text-xs text-slate-500 font-mono-code">APE : ${esc(apiInfo.code_ape)}</span>` : ''}
                                ${enteredSiret ? `
                                    <span class="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono-code text-[10px] font-black">
                                        🎯 SIRET ciblé : ${esc(enteredSiret)}${matchedEnteredEtab ? (matchedEnteredEtab.siege ? ' (Siège)' : ' (Étab. secondaire)') : ''}
                                    </span>
                                ` : ''}
                            </div>
                            <h3 class="text-xl font-black text-slate-900">${esc(apiInfo.nom || 'Association')}</h3>
                            ${apiInfo.sigle && apiInfo.sigle !== apiInfo.nom ? `<div class="text-xs font-bold text-slate-500">Sigle / Nom d'usage : ${esc(apiInfo.sigle)}</div>` : ''}
                            <div class="text-xs text-slate-600">
                                ${apiInfo.adresse_siege ? `📍 ${esc(apiInfo.adresse_siege)} • ` : ''}
                                Régime : <strong>${esc(apiInfo.regime || 'Loi 1901')}</strong> (${esc(apiInfo.forme_juridique || 'Association déclarée')})
                            </div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            ${targetInseeSiret ? `
                                <a href="https://api-avis-situation-sirene.insee.fr/identification/pdf/${encodeURIComponent(targetInseeSiret)}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                                    <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Avis Sirene INSEE (PDF) ↗
                                </a>
                            ` : ''}
                            ${cleanSiren ? `
                                <a href="https://annuaire-entreprises.data.gouv.fr/documents/${encodeURIComponent(cleanSiren)}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Annuaire Entreprises ↗
                                </a>
                            ` : ''}
                            <button type="button" onclick="CCMVR.App.refreshTempCheckedAssociation()" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer" title="Interroger de nouveau l'API en direct (sans enregistrer en base)">
                                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Actualiser
                            </button>
                        </div>
                    </div>

                    <!-- 4 Indicateurs Clés -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span class="text-[10px] font-bold uppercase text-slate-400 block">Création / JOAFE</span>
                            <strong class="font-mono-code text-slate-900 mt-0.5 block">${esc(apiInfo.date_creation || '—')} (JO : ${esc(apiInfo.date_jo || '—')})</strong>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span class="text-[10px] font-bold uppercase text-slate-400 block">Impôts Commerciaux</span>
                            <strong class="text-slate-900 mt-0.5 block">${apiInfo.impots_commerciaux ? 'Oui (Fiscalisée)' : 'Non (Gestion désintéressée)'}</strong>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span class="text-[10px] font-bold uppercase text-slate-400 block">Éligibilité CEC / RUP</span>
                            <strong class="text-emerald-700 mt-0.5 block">CEC : ${apiInfo.eligibilite_cec ? 'Oui' : 'Non'} | RUP : ${apiInfo.reconnue_utilite_publique ? 'Oui' : 'Non'}</strong>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span class="text-[10px] font-bold uppercase text-slate-400 block">Établissements INSEE</span>
                            <strong class="font-mono-code text-blue-700 mt-0.5 block">${Number(apiInfo.nb_etablissements) || (apiInfo.etablissements || []).length || 1} établissement(s)</strong>
                        </div>
                    </div>

                    ${agrementsBadges || reseauxBadges ? `
                        <div class="flex flex-wrap gap-1.5">${agrementsBadges}${reseauxBadges}</div>
                    ` : ''}

                    <!-- Objet social statutaire -->
                    <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs space-y-1">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="font-black text-blue-950 uppercase text-[10px] tracking-wide">Objet Social Statutaire Déclaré :</span>
                            ${apiInfo.champ_action_territorial ? `<span class="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">Territoire : ${esc(apiInfo.champ_action_territorial)}</span>` : ''}
                        </div>
                        <p class="text-slate-800 leading-relaxed">${esc(apiInfo.objet || 'Non renseigné')}</p>
                        ${apiInfo.domaine1 || apiInfo.libelle_ape ? `<div class="text-[11px] text-blue-900/80 pt-1">Secteur : ${esc([apiInfo.domaine1, apiInfo.libelle_ape].filter(Boolean).join(' • '))}</div>` : ''}
                    </div>

                    <!-- Barre de filtrage rapide des pièces déposées -->
                    <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div class="flex flex-wrap items-center gap-2 text-xs">
                            <span class="font-black text-slate-900">📂 Documents déposés :</span>
                            <span id="temp-checker-docs-filtered-badge" class="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                                ${docsBuilt.rnaTotal + docsBuilt.dacTotal} pièce(s) au total
                            </span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 flex-1 sm:max-w-lg justify-end">
                            ${hasMultipleDacSirets ? `
                                <button type="button" id="temp-checker-siret-filter-btn" onclick="CCMVR.App.toggleTempCheckerSiretFilter()" class="${st.onlyEnteredSiretDac ? 'px-3 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white border border-blue-700 shadow-2xs' : 'px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-blue-800 border border-blue-300'} transition cursor-pointer shrink-0">
                                    🎯 Uniquement SIRET saisi
                                </button>
                            ` : ''}
                            <input type="search" id="temp-checker-doc-filter" value="${esc(st.docFilterText)}" oninput="CCMVR.App.updateTempCheckerDocFilter(this.value)" placeholder="Filtrer (bilan, budget, statuts, 2025)..." class="input-clean text-xs py-1.5 sm:w-72" />
                        </div>
                    </div>

                    <div id="temp-checker-docs-container" class="space-y-6">
                        ${docsBuilt.html}
                    </div>

                    <!-- SECTION 3 : COMPTES ANNUELS & DONNÉES FINANCIÈRES DÉCLARÉES (LECTURE SEULE) -->
                    ${comptesHtml ? `
                        <div class="space-y-2.5 pt-2">
                            <div class="text-xs font-black uppercase text-emerald-950 tracking-wide">
                                💰 Données Financières Déclarées (Comptes Annuels & Règle des Minimis)
                            </div>
                            ${comptesHtml}
                        </div>
                    ` : ''}

                    <!-- SECTION 4 : DIRIGEANTS OFFICIELS -->
                    ${dirigeantsHtml ? `
                        <div class="space-y-2.5 pt-2">
                            <div class="text-xs font-black uppercase text-slate-900 tracking-wide">
                                👥 Dirigeants Déclarés (Gouvernance Officielle au Répertoire)
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${dirigeantsHtml}
                            </div>
                        </div>
                    ` : ''}

                    <!-- SECTION 5 : LOCAUX & ÉTABLISSEMENTS INSEE -->
                    ${etabsHtml ? `
                        <div class="space-y-2.5 pt-2">
                            <div class="text-xs font-black uppercase text-slate-900 tracking-wide">
                                🏢 Établissements & Locaux rattachés${cleanSiren ? ' au SIREN ' + esc(cleanSiren) : ''} :
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${etabsHtml}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            bodyHtml = `
                <div class="py-10 px-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <i data-lucide="file-search" class="w-6 h-6"></i>
                    </div>
                    <div class="max-w-lg mx-auto space-y-1.5">
                        <h3 class="text-sm font-black text-slate-900">Consultez immédiatement le dossier documentaire officiel</h3>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            Saisissez ci-dessus le <strong>SIRET (14 chiffres)</strong>, le <strong>SIREN (9 chiffres)</strong>, le <strong>n° RNA (W...)</strong> ou le <strong>nom de l'association</strong> pour afficher en lecture seule ses actes RNA, pièces déposées sur Le Compte Asso (DAC), Avis Sirene INSEE, dirigeants, comptes et établissements.
                        </p>
                        <p class="text-[11px] text-slate-500">
                            Pour les associations multi-établissements, tous les documents rattachés au SIREN sont affichés et le SIRET saisi est mis en avant.
                        </p>
                    </div>
                </div>
            `;
        }

        root.innerHTML = `
            <div id="temp-asso-checker-overlay" role="dialog" aria-modal="true" aria-label="Checker une association" class="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto" onclick="if(event.target === this) CCMVR.App.closeTempAssoCheckerModal()">
                <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden my-4 flex flex-col max-h-[92vh]">
                    <!-- En-tête fixe -->
                    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
                        <div class="flex items-center gap-3.5 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
                                <i data-lucide="search-check" class="w-5 h-5"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                                    Accès Provisoire Pôles • Lecture Seule Sans Base
                                </div>
                                <h2 class="text-sm sm:text-lg font-black text-white leading-tight">Checker une association</h2>
                            </div>
                        </div>
                        <button type="button" onclick="CCMVR.App.closeTempAssoCheckerModal()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shrink-0 cursor-pointer">
                            ✕ Fermer
                        </button>
                    </div>

                    <!-- Barre de recherche fixe -->
                    <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
                        <form onsubmit="CCMVR.App.handleTempCheckerSearchSubmit(event)" class="flex flex-col sm:flex-row gap-2.5">
                            <div class="relative flex-1">
                                <input type="text" id="temp-checker-search-input" value="${esc(st.query)}" placeholder="Ex: 382 774 214 00045, W432000283, 432773554 ou Nom de l'association..." class="input-clean font-semibold text-sm pr-9 bg-white border-slate-300 focus:border-emerald-600" />
                                ${st.query || st.result || st.candidates.length > 0 ? `
                                    <button type="button" onclick="CCMVR.App.resetTempCheckerSearch()" title="Effacer la recherche" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer">
                                        ✕
                                    </button>
                                ` : ''}
                            </div>
                            <button type="submit" ${st.isLoading ? 'disabled' : ''} class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer shrink-0">
                                <i data-lucide="search" class="w-4 h-4"></i>
                                <span>Rechercher</span>
                            </button>
                        </form>
                        <div class="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                            <span>Identifiants acceptés : <strong>SIRET (14 chiffres)</strong>, <strong>SIREN (9 chiffres)</strong>, <strong>RNA (W...)</strong> ou <strong>nom</strong>.</span>
                            <span class="text-emerald-700 font-semibold">✓ Aucun compte ni dossier créé dans Supabase</span>
                        </div>
                    </div>

                    <!-- Contenu défilant -->
                    <div class="p-5 sm:p-6 overflow-y-auto flex-1">
                        ${bodyHtml}
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }

    // [TEMP_PUBLIC_CHECK_ASSO_END]

};

// Export ES6 si utilisé via bundler/modules natifs
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CCMVR.Modules.Core;
}
