const { EmbedBuilder } = require("discord.js");

const documentationUrl = process.env.GREYCORE_HELP_URL
    || process.env.GREYCORE_DOCUMENTATION_URL
    || null;

const TOPICS = {
    demarrage: {
        title: "🧭 Bien démarrer avec GreyCore",
        description: [
            "GreyCore se pense comme une **application Discord complète**.",
            "Le bot permet d’accéder aux fonctions via des boutons, menus et formulaires interactifs, avec très peu de commandes."
        ].join("\n"),
        fields: [
            {
                name: "🚀 3 commandes d’entrée",
                value: [
                    "`/greycore` → ouvre ton espace personnel et tes actions du joueur.",
                    "`/personnage` → gestion rapide de tes personnages et de leur bibliothèque.",
                    "`/staff` → ouvre l’administration du serveur."
                ].join("\n"),
                inline: false
            },
            {
                name: "⚙️ Mise en route",
                value: [
                    "Pointe les modules actifs en staff, définis les salons/rôles de validation.",
                    "Active les modules (relations, états, scènes, téléphone, banque, etc.) côté serveur.",
                    "Régule les permissions staff selon l’organisation de ton équipe."
                ].join("\n"),
                inline: false
            },
            {
                name: "❓ Aide disponible",
                value: [
                    documentationLine(),
                    "",
                    "Tu peux ouvrir `/aide rubrique:...` avec la rubrique qui t’intéresse."
                ].join("\n"),
                inline: false
            }
        ]
    },

    player: {
        title: "👤 Aide — Joueurs",
        description: "Accès rapide aux principales fonctions côté joueur.",
        fields: [
            {
                name: "📂 Fiches de personnage",
                value: "Créer, améliorer, lire l’histoire et gérer son profil via les panneaux dédiés.",
                inline: false
            },
            {
                name: "🏠 Gestion serveur",
                value: "Installer tes personnages, suivre continuité, gérer les modules actifs et la configuration par serveur.",
                inline: false
            },
            {
                name: "📱 Téléphone",
                value: "SMS / MMS / appels / conversations de groupe, accessible depuis la fiche personnage.",
                inline: false
            },
            {
                name: "🎬 Scènes",
                value: "Lancer, reprendre et suivre les cycles de scènes directement pendant le RP, sans forcer un système en ligne de mire.",
                inline: false
            },
            {
                name: "🔐 Aide personnelle",
                value: "Depuis `Personnage → Fiche`, des boutons `❓` donnent des explications contextuelles selon la section."
            }
        ]
    },

    player_character: {
        title: "👤 Gestion de personnage",
        description: "Crée, complète et administre une fiche de personnage sans sortir de Discord.",
        fields: [
            { name: "Création", value: "Passe par `/personnage creer` puis complète identité, alias, histoire et photo." , inline: false },
            { name: "Validation", value: "La validation et la publication de la fiche se font selon votre flux staff local." , inline: false },
            { name: "Installation", value: "Depuis la fiche, installe le personnage sur un serveur actif. Tu peux ensuite le gérer depuis le même espace." , inline: false }
        ]
    },

    player_relations: {
        title: "🤝 Relations et généalogie",
        description: "Ajoute, organise et consulte les liens sociaux de ton personnage.",
        fields: [
            { name: "Création de lien", value: "Utilise la section **Relations** de la fiche pour proposer des liens vers d’autres personnages.", inline: false },
            { name: "Validation", value: "Certaines demandes peuvent être soumises au staff selon les règles du serveur.", inline: false },
            { name: "Arbre", value: "Explore les liens existants pour vérifier les parentés et contraintes de continuité." , inline: false }
        ]
    },

    player_states: {
        title: "🩹 États et informations",
        description: "Pilote les états RP (blessé, recherché, en cavale, etc.) et les détails non-obligatoires du profil.",
        fields: [
            { name: "États", value: "Ajoute des états prédéfinis ou personnalisés pour enrichir l’expérience RP.", inline: false },
            { name: "Informations", value: "Complète les sections additionnelles depuis le bloc **Ajouter des détails**.", inline: false }
        ]
    },

    player_phone: {
        title: "📱 Téléphone",
        description: "Communication asynchrone entre personnages.",
        fields: [
            { name: "Nouveau message", value: "Envoyer SMS/MMS, créer une conversation privée ou de groupe selon le module activé.", inline: false },
            { name: "Historique", value: "Accède aux conversations et aux appels passés sans quitter le personnage.", inline: false },
            { name: "Notifications", value: "Chaque interaction téléphonique reste liée au contexte Discord du RP.", inline: false }
        ]
    },

    player_bank: {
        title: "🎒 Banque / Biens",
        description: "Utilise les catégories de biens et la gestion de patrimoine par continuité.",
        fields: [
            { name: "Biens", value: "Ajoute et gère biens, documents et effets liés au personnage." },
            { name: "Inventaire", value: "Chaque objet peut être transféré selon les permissions serveur." }
        ]
    },

    player_scenes: {
        title: "🎬 Cycles de scènes",
        description: "Aide au rythme du RP tout en laissant la liberté aux joueurs.",
        fields: [
            { name: "Détection d’une scène", value: "Les scènes peuvent être lancées depuis la continuité des personnages, sans commandes répétées." , inline: false},
            { name: "Rattrapage", value: "Quand la continuité change de salon, le suivi peut suivre la scène et garder le compteur." , inline: false},
            { name: "Clôture", value: "Le système conseille quand une scène devient longue (défini par serveur), sans bloquer le jeu." , inline: false}
        ]
    },

    staff: {
        title: "🛠️ Aide — Administration (Staff)",
        description: "Le centre d’administration ` /staff ` devient le point d’entrée unique.",
        fields: [
            { name: "⚙️ Modules", value: "Active/désactive les outils visibles pour vos joueurs selon votre style de serveur." },
            { name: "👥 Permissions", value: "Gère rôles/utilisateurs ayant accès aux actions staff." },
            { name: "🎭 Entités", value: "Configure les messages immersifs et déclencheurs automatiques." },
            { name: "📦 Banque et actifs", value: "Gère types, transferts et statistiques de biens." }
        ]
    },

    staff_setup: {
        title: "🧭 Paramétrage staff",
        description: "Prépare le fonctionnement GreyCore côté serveur.",
        fields: [
            { name: "Salon validation", value: "Configure qui valide, reçoit les alertes et suit les demandes en attente." , inline:false},
            { name: "Configuration générale", value: "Définis visibilité des modules, logs, maintenances et règles de base." , inline:false}
        ]
    },

    staff_modules: {
        title: "🧩 Gestion des modules",
        description: "Décide quels outils sont visibles pour votre communauté.",
        fields: [
            { name: "Activation", value: "Un module actif rend la fonctionnalité disponible côté joueur, selon permissions." , inline:false},
            { name: "Désactivation", value: "Tu peux désactiver temporairement ou définitivement un module sans perdre les données." , inline:false}
        ]
    },

    staff_entities: {
        title: "✨ Entités narratives",
        description: "Crée des entités immersives pour personnaliser les actions automatiques.",
        fields: [
            { name: "Création", value: "Nom, avatar, couleur, messages et déclencheurs.", inline: false },
            { name: "Déclencheurs", value: "Associe à des événements (scène, rattrapage, validation, etc.).", inline: false },
            { name: "Planification", value: "Ajoute des programmations pour contrôler les interventions." , inline: false}
        ]
    },

    staff_automations: {
        title: "🔁 Automatisations staff",
        description: "Automatise les tâches répétitives sans imposer de règles de rôle.",
        fields: [
            { name: "Onboarding", value: "Messages et rôles automatiques après validation de personnages." , inline: false},
            { name: "Limites", value: "Paramètre limites de création par fenêtre de temps pour garder de la qualité." , inline: false},
            { name: "Rappels", value: "Alerte ou relance propre aux flux qui traînent." , inline: false}
        ]
    },

    staff_scenes: {
        title: "🎬 Administration des cycles de scènes",
        description: "Surveille la cohérence narrative sans interrompre le RP.",
        fields: [
            { name: "Zones suivies", value: "Choisis les salons/répertoires où l’assistant de scène doit observer la continuité." , inline: false},
            { name: "Expressions", value: "Définis les mots-clés qui déclenchent la proposition de rattrapage." , inline: false},
            { name: "Seuils", value: "Ajuste durée/jours, messages, inactivité pour proposer la clôture." , inline: false}
        ]
    },

    staff_permissions: {
        title: "🔐 Permissions",
        description: "Contrôle fin des droits staff par rôle et utilisateur.",
        fields: [
            { name: "Rôles", value: "Attribue les droits par rôle directement dans l’interface." , inline:false},
            { name: "Utilisateurs", value: "Ajoute des accès individuels si besoin." , inline:false},
            { name: "Lecture seule", value: "Les actions sensibles restent bloquées quand le droit est insuffisant." , inline:false}
        ]
    },

    staff_phone: {
        title: "📱 Téléphone — Administration",
        description: "Paramètres serveurs du module téléphonie.",
        fields: [
            { name: "Canaux", value: "Définis où les conversations automatiques apparaissent et le mode de log." , inline:false},
            { name: "Conformité", value: "Vérifie les droits d’accès aux SMS, MMS, appels et e-mails par rôle." , inline:false},
            { name: "Supervision", value: "Suivi des erreurs, quotas et réglages anti-abus." , inline:false}
        ]
    },

    staff_greybot: {
        title: "🤖 Intégration Greybot",
        description: "Synchronisation et complément des modules liés aux personnages installés.",
        fields: [
            { name: "Synchronisation", value: "Les personnages validés et installés peuvent être exposés à Greybot selon la configuration serveur." , inline:false},
            { name: "Séparation des rôles", value: "GreyCore reste la source de vérité des profils RP." , inline:false}
        ]
    },

    staff_bank: {
        title: "🏦 Banque et patrimoine — Administration",
        description: "Gestion centrale des actifs côté serveur.",
        fields: [
            { name: "Configuration", value: "Active le module Biens et paramètre types, catégories et rôles de gestion." , inline:false},
            { name: "Données", value: "Consulte la répartition, les transferts et les journaux d’utilisation via le module banque." , inline:false},
            { name: "Maintenance", value: "Tu peux purger/ajuster les catégories quand l’univers évolue." , inline:false}
        ]
    },

    documentation: {
        title: "📖 Documentation GreyCore",
        description: "Ressources de lecture et nouveautés.",
        fields: [
            {
                name: "FAQ",
                value: "Consulte les réponses rapides aux questions courantes d’installation et d’utilisation."
            },
            {
                name: "Guides",
                value: "Procédures détaillées par thème : personnages, RP, staff, entités, scènes."
            },
            {
                name: "Mises à jour",
                value: "Historique des nouvelles fonctionnalités et changements visibles en priorité."
            }
        ]
    },

    docs_faq: {
        title: "📖 FAQ",
        description: "Questions fréquentes",
        fields: [
            {
                name: "Quand réinstaller un module ?",
                value: "Quand un flux dépend de données externes ou après migration de serveur."
            }
        ]
    },

    docs_guides: {
        title: "📚 Guides",
        description: "Guides détaillés par parcours utilisateur.",
        fields: [
            {
                name: "Parcours joueur",
                value: "Création, installation, communication, gestion de continuité."
            }
        ]
    },

    docs_changelog: {
        title: "🗒️ Notes de version",
        description: "Nouveautés et évolutions",
        fields: [
            { name: "Version actuelle", value: "Consulte le changelog du projet pour les dernières améliorations." }
        ]
    },

    docs_privacy: {
        title: "🔐 Confidentialité",
        description: "Protection des données et obligations légales applicables.",
        fields: [
            { name: "Mes données", value: "Consulte ton résumé personnel depuis `/personnage` puis la section confidentialité." },
            { name: "Demande d’oubli", value: "Action disponible pour dissocier identités Discord et données RP."}
        ]
    }
};

const LEGACY_ALIASES = {
    personnages: "player_character",
    relations: "player_relations",
    etats: "player_states",
    telephone: "player_phone",
    biens: "player_bank",
    scenes: "player_scenes",
    "staff:bank": "staff_bank",
    "staff:entities": "staff_entities",
    "staff:scenes": "staff_scenes",
    "staff:phone": "staff_phone",
    "player:character": "player_character",
    "player:relations": "player_relations",
    "player:states": "player_states",
    "player:phone": "player_phone",
    "player:bank": "player_bank",
    "player:scenes": "player_scenes",
    confidentialite: "docs_privacy"
};

function normalizeTopic(topic) {
    const direct = String(topic || "demarrage")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/:/g, "_");

    return TOPICS[direct] ? direct : (LEGACY_ALIASES[direct] || "demarrage");
}

function build(topic = "demarrage") {
    const guide = TOPICS[normalizeTopic(topic)] || TOPICS.demarrage;
    return {
        embeds: [
            new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(guide.title)
                .setDescription(guide.description)
                .addFields(guide.fields)
                .setFooter({
                    text:
                        "Moins de commandes, plus d’interface : `/aide` reste le point d’entrée documentaire."
                })
        ]
    };
}

function documentationLine() {
    return documentationUrl
        ? `📎 Documentation : ${documentationUrl}`
        : "📎 Documentation : en attente de publication, consulte ta page d’accueil staff pour les notes du moment.";
}

module.exports = {
    build
};
