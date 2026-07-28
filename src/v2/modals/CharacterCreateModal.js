const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const TYPE_LABELS = {
    personnage_joue:
        "Personnage joué",
    pnj:
        "PNJ",
    random:
        "Random",
    pnj_reserve:
        "PNJ réservé",
    reserve_staff:
        "Réservé staff"
};

class CharacterCreateModal {

    build(
        type,
        proxyName = ""
    ) {

        if (!TYPE_LABELS[type]) {
            throw new Error(
                "Type de personnage invalide."
            );
        }

        const isSimpleCreation =
            [
                "random",
                "pnj_reserve",
                "reserve_staff"
            ].includes(type);

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_character_create_submit:${type}`
                )
                .setTitle(
                    `Créer · ${TYPE_LABELS[type]}`
                        .slice(0, 45)
                );

        const proxyNameInput =
            new TextInputBuilder()
                .setCustomId(
                    "character_proxy_name"
                )
                .setLabel(
                    "Nom du proxy"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(32)
                .setPlaceholder(
                    "Nom affiché lors des messages RP"
                );

        if (proxyName) {
            proxyNameInput.setValue(
                String(proxyName)
                    .slice(0, 32)
            );
        }

        const fullNameInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_fullname"
                )
                .setLabel(
                    isSimpleCreation
                        ? "Prénom"
                        : "Nom complet"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(
                    isSimpleCreation
                        ? 80
                        : 150
                )
                .setPlaceholder(
                    isSimpleCreation
                        ? "Exemple : Gars 1"
                        : "Exemple : Alba Alvarez"
                );

        if (isSimpleCreation) {
            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        proxyNameInput
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        fullNameInput
                    )
            );

            return modal;
        }

        const ageInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_age"
                )
                .setLabel("Âge")
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setMaxLength(3);

        const gangInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_gang"
                )
                .setLabel(
                    "Gang ou organisation (facultatif)"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setMaxLength(100)
                .setPlaceholder(
                    "Laisser vide si aucun"
                );

        const storyInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_story"
                )
                .setLabel(
                    "Histoire (facultatif)"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(false)
                .setMaxLength(4000);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    proxyNameInput
                ),
            new ActionRowBuilder()
                .addComponents(
                    fullNameInput
                ),
            new ActionRowBuilder()
                .addComponents(
                    ageInput
                ),
            new ActionRowBuilder()
                .addComponents(
                    gangInput
                ),
            new ActionRowBuilder()
                .addComponents(
                    storyInput
                )
        );

        return modal;

    }

}

module.exports =
    new CharacterCreateModal();
