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
                    "Proxy à taper (ex. Ino)"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(32)
                .setPlaceholder(
                    "Exemple : Ino"
                );

        if (proxyName) {
            proxyNameInput.setValue(
                String(proxyName)
                    .slice(0, 32)
            );
        }

        const simpleFirstNameInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_fullname"
                )
                .setLabel(
                    "Prénom affiché avec l'avatar"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(80)
                .setPlaceholder(
                    "Exemple : Iño"
                );

        if (isSimpleCreation) {
            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        proxyNameInput
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        simpleFirstNameInput
                    )
            );

            return modal;
        }

        const firstNameInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_firstname"
                )
                .setLabel(
                    "Prénom affiché avec l'avatar"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(80)
                .setPlaceholder(
                    "Exemple : Iño"
                );

        const lastNameInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_lastname"
                )
                .setLabel(
                    "Nom de famille (facultatif)"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setMaxLength(80)
                .setPlaceholder(
                    "Exemple : Alvarez"
                );

        const ageInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_age"
                )
                .setLabel("Âge (facultatif)")
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setMaxLength(3);

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
                    firstNameInput
                ),
            new ActionRowBuilder()
                .addComponents(
                    lastNameInput
                ),
            new ActionRowBuilder()
                .addComponents(
                    ageInput
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
