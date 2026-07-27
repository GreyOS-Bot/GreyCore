const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const {
    optionalText
} = require("./ProfileEditUtils");

function createIdentityModal(
    characterId,
    profile = {}
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_profile_identity_submit:${characterId}`
            )
        .setTitle(
                "Demander une modification d’identité"
            );

    modal.addComponents(
        textRow({
            id:
                "firstname",
            label:
                "Prénom",
            maxLength:
                80,
            value:
                optionalText(
                    profile.firstname
                )
        }),
        textRow({
            id:
                "lastname",
            label:
                "Nom",
            maxLength:
                80,
            value:
                optionalText(
                    profile.lastname
                )
        }),
        textRow({
            id:
                "age",
            label:
                "Âge",
            maxLength:
                20,
            value:
                optionalText(
                    profile.age
                )
        }),
        textRow({
            id:
                "birthday",
            label:
                "Date de naissance",
            placeholder:
                "Exemple : 12 avril 2004",
            maxLength:
                50,
            value:
                optionalText(
                    profile.birthday
                )
        })
    );

    return modal;
}

function createInformationModal(
    characterId,
    profile = {}
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_profile_information_submit:${characterId}`
            )
        .setTitle(
                "Demander une modification d’informations"
            );

    modal.addComponents(
        textRow({
            id:
                "origin",
            label:
                "Origine",
            maxLength:
                100,
            value:
                optionalText(
                    profile.origin
                )
        }),
        textRow({
            id:
                "occupation",
            label:
                "Métier",
            maxLength:
                100,
            value:
                optionalText(
                    profile.occupation
                )
        }),
        textRow({
            id:
                "gang",
            label:
                "Organisation",
            maxLength:
                100,
            value:
                optionalText(
                    profile.gang
                )
        })
    );

    return modal;
}

function createStoryModal(
    characterId,
    profile = {}
) {
    const story =
        new TextInputBuilder()
            .setCustomId("story")
            .setLabel("Histoire (facultatif)")
            .setPlaceholder(
                "Racontez l’histoire du personnage…"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(false)
            .setMaxLength(4000)
            .setValue(
                optionalText(
                    profile.story
                ).slice(0, 4000)
            );

    return new ModalBuilder()
        .setCustomId(
            `v2_profile_story_submit:${characterId}`
        )
        .setTitle(
            "Demander une modification d’histoire"
        )
        .addComponents(
            new ActionRowBuilder()
                .addComponents(
                    story
                )
        );
}

function textRow({
    id,
    label,
    placeholder = null,
    maxLength,
    value
}) {
    const input =
        new TextInputBuilder()
            .setCustomId(id)
            .setLabel(
                `${label} (facultatif)`
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(false)
            .setMaxLength(maxLength)
            .setValue(value);

    if (placeholder) {
        input.setPlaceholder(
            placeholder
        );
    }

    return new ActionRowBuilder()
        .addComponents(
            input
        );
}

module.exports = {
    createIdentityModal,
    createInformationModal,
    createStoryModal
};
