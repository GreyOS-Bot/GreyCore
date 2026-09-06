const PERMISSIONS = [
    ["characters", "Personnages", "👥"],
    ["scenes", "Cycles de scènes", "🎬"],
    ["phone", "Téléphone", "📱"],
    ["bank", "Banque", "🏦"],
    ["assets", "Biens", "🎒"],
    ["relationships", "Relations", "🎭"],
    ["universe", "Univers", "🌍"],
    ["entities", "Entités", "✨"],
    ["automations", "Automatisations", "🤖"],
    ["modules", "Modules", "🧩"],
    ["logs", "Logs", "📜"],
    ["settings", "Paramètres", "⚙️"],
    ["read_only", "Lecture seule", "👁️"]
].map(([key, label, emoji]) => ({ key, label, emoji }));

const KEYS = new Set(PERMISSIONS.map(permission => permission.key));

module.exports = {
    all: () => PERMISSIONS.map(permission => ({ ...permission })),
    keys: () => PERMISSIONS.map(permission => permission.key),
    has: key => KEYS.has(key),
    get: key => PERMISSIONS.find(permission => permission.key === key) || null
};
