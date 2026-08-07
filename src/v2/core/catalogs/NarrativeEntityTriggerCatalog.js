const TRIGGERS = [
    ["scene_created", "Création d’une scène", "🎬"],
    ["scene_moved", "Déplacement d’une scène", "🔄"],
    ["scene_closed", "Clôture d’une scène", "🏁"],
    ["scene_nsfw", "Arrivée dans un salon NSFW", "🔞"],
    ["hospitalization", "Hospitalisation", "🏥"],
    ["death", "Décès", "💀"],
    ["trial", "Procès", "⚖️"],
    ["marriage", "Mariage", "🎉"],
    ["birth", "Naissance", "👶"],
    ["bank_account_opened", "Ouverture d’un compte bancaire", "🏦"],
    ["phone_assigned", "Attribution d’un téléphone", "📱"],
    ["character_approved", "Validation d’un personnage", "✅"]
].map(([key, label, emoji]) => ({ key, label, emoji }));

const KEYS = new Set(TRIGGERS.map(trigger => trigger.key));

module.exports = {
    all: () => TRIGGERS.map(trigger => ({ ...trigger })),
    has: key => KEYS.has(key),
    get: key => TRIGGERS.find(trigger => trigger.key === key) || null
};
