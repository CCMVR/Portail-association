// ==============================================================================
// ORCHESTRATEUR PRINCIPAL DES MODULES CCMVR
// Communauté de Communes Marches du Velay Rochebaron
// ==============================================================================

window.CCMVR = window.CCMVR || {};
window.CCMVR.Modules = window.CCMVR.Modules || {};

// Fusion réactive de tous les modules ES6 dans l'objet global CCMVR.App
window.CCMVR.App = Object.assign(
    window.CCMVR.App || {},
    window.CCMVR.Modules.Core || {},
    window.CCMVR.Modules.Cdg || {},
    window.CCMVR.Modules.Pole || {},
    window.CCMVR.Modules.Regie || {},
    window.CCMVR.Modules.Asso || {},
    window.CCMVR.Modules.ModalsDossier || {},
    window.CCMVR.Modules.ModalsConvention || {},
    window.CCMVR.Modules.ModalsAnnuaire || {}
);

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    window.CCMVR.App.init();
});

// Support ES6 / CommonJS si utilisé dans un environnement de build
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CCMVR.App;
}
