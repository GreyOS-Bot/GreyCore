const {
    EmbedBuilder
} = require("discord.js");

const POLICY_UPDATED_AT =
    "4 août 2026";

function buildPolicy() {
    const operator = legalValue(
        "GREYCORE_LEGAL_OPERATOR",
        "Greyline Chapter"
    );
    const email = legalValue(
        "GREYCORE_PRIVACY_EMAIL",
        "contact@greyline.fr"
    );

    return {
        embeds: [
            new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(
                    "🔐 Politique de confidentialité"
                )
                .setDescription(
                    `Dernière mise à jour : ${POLICY_UPDATED_AT}`
                )
                .addFields(
                    {
                        name:
                            "Responsable et contact",
                        value:
                            `${operator}\nContact : ${email}`
                    },
                    {
                        name:
                            "Données utilisées",
                        value: [
                            "Identifiant Discord, serveurs où GreyCore est utilisé et données nécessaires au fonctionnement.",
                            "Personnages, avatars, fiches RP, relations, états, biens, tenues, téléphones, SMS/MMS et historiques créés volontairement dans GreyCore.",
                            "Identifiants techniques de salons, messages, webhooks et journaux d’erreur nécessaires au service et à sa sécurité."
                        ].join("\n")
                    },
                    {
                        name:
                            "Pourquoi et sur quelle base",
                        value: [
                            "Fournir les fonctions demandées par l’utilisateur et administrer GreyCore.",
                            "Assurer la sécurité, diagnostiquer les erreurs et prévenir les abus.",
                            "Le traitement repose sur l’utilisation volontaire du service et, pour la sécurité, sur l’intérêt légitime de son exploitant."
                        ].join("\n")
                    },
                    {
                        name:
                            "Accès, conservation et hébergement",
                        value: [
                            "Les données RP visibles sont accessibles selon les réglages du serveur ; les données techniques sont limitées aux personnes chargées de GreyCore.",
                            "La base est hébergée sur le VPS GreyOS. Discord traite également les contenus et identifiants transitant par sa plateforme selon ses propres règles.",
                            "Les données actives sont conservées tant que le service est utilisé. Les sauvegardes tournantes sont supprimées automatiquement après 14 sauvegardes par défaut (environ 84 heures avec une sauvegarde toutes les 6 heures)."
                        ].join("\n")
                    },
                    {
                        name:
                            "Tes droits",
                        value: [
                            "Tu peux demander l’accès, la rectification, la limitation, l’opposition ou l’effacement de tes données.",
                            "Utilise `/confidentialite mes-donnees` pour voir un résumé et `/confidentialite oublier` pour supprimer définitivement les données liées à ton compte.",
                            "Tu peux aussi contacter le responsable ci-dessus et déposer une réclamation auprès de la CNIL."
                        ].join("\n")
                    }
                )
                .setFooter({
                    text:
                        "Cette information ne remplace pas les règles propres à Discord ni celles du serveur où tu joues."
                })
        ]
    };
}

function buildCharter() {
    return {
        embeds: [
            new EmbedBuilder()
                .setColor("#57F287")
                .setTitle(
                    "📜 Charte d’utilisation GreyCore"
                )
                .setDescription(
                    `Version du ${POLICY_UPDATED_AT}`
                )
                .addFields(
                    {
                        name:
                            "Utilisation responsable",
                        value:
                            "Utilise GreyCore pour le jeu de rôle dans le respect des règles de Discord, de la loi et du serveur concerné. Ne détourne pas le bot pour harceler, usurper une personne réelle ou publier un contenu illégal."
                    },
                    {
                        name:
                            "Contenus et avatars",
                        value:
                            "Tu restes responsable des textes et images que tu ajoutes. N’envoie pas de données sensibles, de mots de passe, ni de contenu que tu n’as pas le droit d’utiliser."
                    },
                    {
                        name:
                            "Modération",
                        value:
                            "Le staff du serveur gère les validations et règles RP locales. L’équipe GreyCore peut limiter l’accès au service en cas d’abus, de risque de sécurité ou d’usage contraire à cette charte."
                    },
                    {
                        name:
                            "Disponibilité",
                        value:
                            "GreyCore est fourni en l’état. Des maintenances, corrections ou interruptions peuvent survenir ; aucune disponibilité permanente n’est garantie."
                    },
                    {
                        name:
                            "Vie privée et départ",
                        value:
                            "Consulte `/confidentialite politique`. Tu peux arrêter d’utiliser GreyCore et demander son oubli avec `/confidentialite oublier`. Cette action est irréversible."
                    }
                )
        ]
    };
}

function buildSummary(summary) {
    const totalCharacters =
        summary.globalCharacters
        + summary.legacyCharacters;

    return {
        embeds: [
            new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(
                    "🧾 Résumé de tes données GreyCore"
                )
                .setDescription(
                    "Ce résumé est privé. Il indique les principales données directement rattachées à ton identifiant Discord."
                )
                .addFields(
                    {
                        name:
                            "Personnages",
                        value:
                            `${totalCharacters} personnage(s) (${summary.globalCharacters} V2, ${summary.legacyCharacters} ancien format)`,
                        inline: false
                    },
                    {
                        name:
                            "Traces de proxy",
                        value:
                            `${summary.proxyMessages} message(s) technique(s) encore référencé(s)`,
                        inline: false
                    },
                    {
                        name:
                            "Automatisations serveur",
                        value:
                            `${summary.automationRuns} déclenchement(s) mémorisé(s)`,
                        inline: false
                    },
                    {
                        name:
                            "Pour tout effacer",
                        value:
                            "Utilise `/confidentialite oublier confirmation:OUBLIER`. Les personnages et toutes leurs données liées seront définitivement supprimés."
                    }
                )
        ]
    };
}

function legalValue(name, fallback) {
    return String(
        process.env[name]
        || fallback
    ).trim();
}

module.exports = {
    buildPolicy,
    buildCharter,
    buildSummary
};
