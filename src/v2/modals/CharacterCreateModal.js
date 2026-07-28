const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const TYPE_LABELS = {
    personnage_joue:
        "Personnage jou\u00e9",
    pnj:
        "PNJ",
    random:
        "Random",
    pnj_reserve:
        "PNJ r\u00e9serv\u00e9",
    reserve_staff:
        "R\u00e9serv\u00e9 staff"
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
                    `Cr\u00e9er \u00b7 ${TYPE_LABELS[type]}`
                        .slice(0, 45)
                );

        const proxyNameInput =
            new TextInputBuilder()
                .setCustomId(
                    "character_proxy_name"
                )
                .setLabel(
                    "Proxy \u00e0 taper (ex. Ino)"
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

        const fullNameInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_fullname"
                )
                .setLabel(
                    "Pr\u00e9nom affich\u00e9 (nom facultatif)"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(160)
                .setPlaceholder(
                    "Exemple : I\u00f1o Alvarez"
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

        const organizationInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_gang"
                )
                .setLabel(
                    "Organisation ou gang (\u00e9cris Sans si aucun)"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100)
                .setPlaceholder(
                    "Exemple : La Mano de Dios ou Sans"
                );

        const birthdayInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_birthday"
                )
                .setLabel(
                    "Date anniversaire (facultatif)"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setMaxLength(50)
                .setPlaceholder(
                    "Ex. 27 juillet ou 27/07/2026"
                );

        const storyIsRequired =
            type === "personnage_joue";

        const storyInput =
            new TextInputBuilder()
                .setCustomId(
                    "profile_story"
                )
                .setLabel(
                    storyIsRequired
                        ? "Histoire"
                        : "Histoire (facultatif)"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(storyIsRequired)
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
                    organizationInput
                ),
            new ActionRowBuilder()
                .addComponents(
                    birthdayInput
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
