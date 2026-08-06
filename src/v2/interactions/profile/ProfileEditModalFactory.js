const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const {
    optionalText
} = require("./ProfileEditUtils");

const characterCreateModal =
    require("../../modals/CharacterCreateModal");

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
        }),
        textRow({
            id:
                "gender",
            label:
                "Genre",
            maxLength:
                80,
            value:
                optionalText(
                    profile.gender
                )
        })
    );

    return modal;
}

function createCreationIdentityModal(
    character,
    profile = {}
) {
    return characterCreateModal
        .buildIdentityEdit(
            character,
            profile
        );
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
        }),
        textRow({
            id:
                "height",
            label:
                "Taille",
            placeholder:
                "Exemple : 1m72",
            maxLength:
                30,
            value:
                optionalText(
                    profile.height
                )
        }),
        textRow({
            id:
                "weight",
            label:
                "Poids",
            placeholder:
                "Exemple : 58 kg",
            maxLength:
                30,
            value:
                optionalText(
                    profile.weight
                )
        })
    );

    return modal;
}

function createAliasModal(
    characterId,
    profile = {}
) {
    return new ModalBuilder()
        .setCustomId(
            `v2_profile_alias_submit:${characterId}`
        )
        .setTitle("Modifier l'alias affiché")
        .addComponents(
            textRow({
                id:
                    "alias",
                label:
                    "Prénom ou alias affiché",
                placeholder:
                    "Exemple : Story",
                maxLength:
                    80,
                value:
                    optionalText(
                        profile.alias
                    )
            })
        );
}

function createStoryModal(
    characterId,
    profile = {}
) {
    const faceclaim =
        new TextInputBuilder()
            .setCustomId("faceclaim")
            .setLabel("Faceclaim (facultatif)")
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(false)
            .setMaxLength(100)
            .setValue(
                optionalText(
                    profile.faceclaim
                ).slice(0, 100)
            );

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
                    faceclaim
                ),
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
    createCreationIdentityModal,
    createAliasModal,
    createInformationModal,
    createStoryModal
};
