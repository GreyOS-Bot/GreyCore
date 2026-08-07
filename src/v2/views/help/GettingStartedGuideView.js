const {
    EmbedBuilder
} = require("discord.js");

const TOPICS = {
    demarrage: {
        title:
            "📘 Bien démarrer avec GreyCore",
        description:
            "GreyCore permet de créer des personnages, de les installer sur un ou plusieurs serveurs et de jouer avec leurs données RP.",
        fields: [
            {
                name:
                    "1. Préparer le suivi staff",
                value: [
                    "Crée un salon réservé au staff pour les demandes de validation.",
                    "Utilise `/config validation` puis choisis ce salon, ou sélectionne `creer:Oui` et un rôle staff pour que GreyCore crée un salon privé.",
                    "Les membres qui ont accès à ce salon sont automatiquement considérés comme staff pour les commandes d’états et de relations.",
                    "Ouvre ensuite `/config modules` pour choisir les outils RP actifs sur ce serveur.",
                    "Pour suivre les erreurs importantes pendant la bêta, choisis un salon staff avec `/config journaux salon:#ton-salon`.",
                    "Le staff peut retrouver ses demandes en attente à tout moment avec `/validations attente`."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "2. Activer les outils RP",
                value: [
                    "**Relations :** utilise `/installer-relations` une seule fois pour ajouter les types par défaut.",
                    "**États :** utilise `/installer-etats` une seule fois pour ajouter les états par défaut.",
                    "Ajoute ensuite des états propres à ton univers avec `/etattype creer` (ex. Blessé, Recherché, Hospitalisé).",
                    "Tu peux ajouter tes propres relations avec `/relationtype creer` ou tes propres états avec `/etattype creer`."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "3. Côté joueurs",
                value: [
                    "Les joueurs ouvrent `/mes personnages`, puis choisissent **Nouveau personnage**.",
                    "Après validation, ils peuvent installer leur personnage sur un autre serveur depuis **Configuration**.",
                    "Les relations, états, tenues, biens et téléphone se gèrent depuis la fiche du personnage."
                ].join("\n"),
                inline: false
            }
        ]
    },
    personnages: {
        title:
            "👤 Personnages — Guide GreyCore",
        description:
            "Chaque personnage possède une fiche, un proxy et une continuité propre à chaque serveur où il est installé.",
        fields: [
            {
                name:
                    "Créer et valider",
                value: [
                    "Ouvre `/mes personnages` puis **Nouveau personnage**.",
                    "Avant de choisir un prénom, consulte `/personnages liste` : elle montre les personnages installés et leur propriétaire. Tu peux filtrer avec `lettre:A` si besoin.",
                    "Renseigne le proxy, l’identité, l’avatar et l’histoire.",
                    "La demande est ensuite envoyée dans le salon configuré avec `/config validation`.",
                    "Après validation, toute modification de fiche ou d’avatar est également soumise au staff : les informations actuelles restent visibles jusqu’à sa décision."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "Installer sur un autre serveur",
                value: [
                    "Depuis le serveur de destination, ouvre la fiche du personnage.",
                    "Va dans **Configuration**, puis **Installer sur ce serveur**.",
                    "Choisis une continuité existante ou une nouvelle continuité, puis attends la validation du staff local."
                ].join("\n"),
                inline: false
            }
        ]
    },
    relations: {
        title:
            "🤝 Relations — Guide GreyCore",
        description:
            "Les relations sont propres à chaque serveur et utilisent les types définis par son staff.",
        fields: [
            {
                name:
                    "À faire une seule fois par serveur",
                value: [
                    "Utilise `/installer-relations` pour installer les types de relation par défaut.",
                    "Si aucun type n’est installé, les joueurs ne peuvent pas créer de relation."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "Personnaliser et jouer",
                value: [
                    "Ajoute un type sur mesure avec `/relationtype creer`.",
                    "Les joueurs ajoutent une relation depuis la section **Relations** de leur fiche.",
                    "Une demande est envoyée au propriétaire de l’autre personnage, sauf si les deux personnages appartiennent au même joueur."
                ].join("\n"),
                inline: false
            }
        ]
    },
    etats: {
        title:
            "🩹 États — Guide GreyCore",
        description:
            "Les états permettent de suivre ce qui affecte un personnage sur le serveur courant.",
        fields: [
            {
                name:
                    "Configuration staff",
                value: [
                    "Utilise `/installer-etats` une seule fois pour ajouter les états par défaut.",
                    "Crée ensuite un type sur mesure avec `/etattype creer`.",
                    "Indique son nom, et ajoute si besoin un emoji et une couleur.",
                    "Exemples : Blessé, Recherché, Hospitalisé, En cavale."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "Côté joueurs",
                value: [
                    "Depuis la fiche du personnage, ouvre **États** puis ajoute l’état adapté.",
                    "La note et la date de début sont facultatives."
                ].join("\n"),
                inline: false
            }
        ]
    },
    telephone: {
        title:
            "📱 Téléphone — Guide GreyCore",
        description:
            "Le téléphone est disponible depuis la fiche d’un personnage validé et installé sur le serveur.",
        fields: [
            {
                name:
                    "Fonctions disponibles",
                value: [
                    "SMS, MMS (images et GIF) et conversations de groupe.",
                    "Contacts, appels et historique des appels.",
                    "Lorsqu’une conversation privée est ouverte, les deux personnages sont ajoutés automatiquement à leurs répertoires et leurs informations GreyCore restent synchronisées.",
                    "Les notifications contiennent un accès direct au message RP lorsqu’il existe."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "Règle importante",
                value:
                    "Seul le propriétaire d’un personnage peut agir depuis son téléphone.",
                inline: false
            }
        ]
    },
    biens: {
        title:
            "🎒 Biens — Guide GreyCore",
        description:
            "Les biens sont propres à la continuité du personnage et au serveur actuel.",
        fields: [
            {
                name:
                    "Côté joueurs",
                value: [
                    "Depuis la fiche, ouvre **Biens**, puis **Gérer les biens**.",
                    "Choisis **Ajouter un bien**, sa catégorie, puis renseigne son nom. La description, les caractéristiques et l’image jointe sont facultatives.",
                    "Un bien peut être modifié, supprimé ou transféré vers un autre personnage jouable du même serveur."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "Côté staff",
                value: [
                    "Les catégories de base sont créées automatiquement : véhicule, propriété, entreprise, animal et autre bien.",
                    "Les membres ayant accès au salon de validation peuvent créer des catégories supplémentaires depuis **Types de biens**.",
                    "Les biens restent visibles en lecture seule sur la fiche des autres joueurs."
                ].join("\n"),
                inline: false
            }
        ]
    },
    scenes: {
        title: "🎬 Cycles de scènes — Guide GreyCore",
        description: "Une scène est indépendante de son salon et son utilisation reste entièrement facultative.",
        fields: [
            {
                name: "Commencer ou reprendre",
                value: [
                    "Au premier message d'un personnage, GreyCore ajoute une unique réaction 🎬.",
                    "Cliquer dessus démarre la scène ; l'ignorer n'empêche jamais de RP.",
                    "La réaction disparaît dès que la scène commence."
                ].join("\n"),
                inline: false
            },
            {
                name: "Déplacer une scène",
                value: [
                    "Écris une expression comme **Rattrapage ?** : GreyCore proposera alors le déplacement.",
                    "Sans lien, GreyCore reprend automatiquement le dernier échange exploitable.",
                    "Les jours, messages et participants restent attachés à la même scène."
                ].join("\n"),
                inline: false
            },
            {
                name: "Clôturer une scène",
                value: "Après la durée d'inactivité choisie par le serveur, GreyCore propose discrètement la clôture. Deux participants différents doivent confirmer.",
                inline: false
            },
            {
                name: "Cohérence de timeline",
                value: "Si un personnage joue dans deux scènes actives, GreyCore avertit le joueur et le staff sans bloquer le RP.",
                inline: false
            }
        ]
    },
    confidentialite: {
        title:
            "🔐 Confidentialité — Guide GreyCore",
        description:
            "GreyCore te permet de comprendre et de maîtriser les données liées à ton compte Discord.",
        fields: [
            {
                name:
                    "S’informer",
                value: [
                    "Lis la politique avec `/confidentialite politique`.",
                    "Lis les règles d’utilisation avec `/confidentialite charte`.",
                    "Affiche un résumé privé avec `/confidentialite mes-donnees`."
                ].join("\n"),
                inline: false
            },
            {
                name:
                    "Demander l’oubli",
                value: [
                    "Utilise `/confidentialite oublier confirmation:OUBLIER`.",
                    "Cette action anonymise ton identité Discord. Tes personnages et leurs contenus RP restent conservés, mais ne sont plus liés à ton compte.",
                    "Les copies présentes dans les sauvegardes tournantes disparaissent ensuite automatiquement à leur expiration."
                ].join("\n"),
                inline: false
            }
        ]
    }
};

function build(topic = "demarrage") {
    const guide =
        TOPICS[topic]
        || TOPICS.demarrage;

    return {
        embeds: [
            new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(guide.title)
                .setDescription(guide.description)
                .addFields(guide.fields)
                .setFooter({
                    text:
                        "Utilise /aide pour retrouver ce guide à tout moment."
                })
        ]
    };
}

module.exports = {
    build
};
