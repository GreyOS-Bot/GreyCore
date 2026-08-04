const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const service = require(
    "../../services/character/CharacterTypeCorrectionService"
);
const view = require(
    "../../views/character/StaffCharacterCorrectionView"
);
const staffPolicy = require(
    "../../core/policies/ValidationStaffPolicy"
);
const { replyError } = require(
    "../../core/services/InteractionResponseService"
);

function assertStaff(interaction) {
    if (!staffPolicy.canManageServerTools(interaction)) {
        throw new Error(
            "Cette correction est réservée au staff du serveur."
        );
    }
}

function field({ id, label, value, maxLength = 100 }) {
    const input = new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(maxLength);

    if (value !== null && value !== undefined) {
        input.setValue(String(value));
    }

    return new ActionRowBuilder().addComponents(input);
}

async function openIdentity(interaction) {
    try {
        assertStaff(interaction);
        const characterId = interaction.customId.split(":")[1];
        const character = service.getForStaff({
            guildId: interaction.guildId,
            characterId
        });
        const modal = new ModalBuilder()
            .setCustomId(
                `v2_staff_character_identity_submit:${characterId}`
            )
            .setTitle("Corriger l’identité")
            .addComponents(
                field({
                    id: "proxy",
                    label: "Proxy à taper",
                    value: character.proxy_name
                }),
                field({
                    id: "alias",
                    label: "Prénom ou alias affiché",
                    value: character.alias
                }),
                field({
                    id: "firstname",
                    label: "Vrai prénom (facultatif)",
                    value: character.firstname
                }),
                field({
                    id: "lastname",
                    label: "Nom (facultatif)",
                    value: character.lastname
                }),
                field({
                    id: "age",
                    label: "Âge (facultatif)",
                    value: character.age,
                    maxLength: 3
                })
            );

        return interaction.showModal(modal);
    } catch (error) {
        return replyError(interaction, error);
    }
}

async function openInformation(interaction) {
    try {
        assertStaff(interaction);
        const characterId = interaction.customId.split(":")[1];
        const character = service.getForStaff({
            guildId: interaction.guildId,
            characterId
        });
        const modal = new ModalBuilder()
            .setCustomId(
                `v2_staff_character_info_submit:${characterId}`
            )
            .setTitle("Corriger les informations")
            .addComponents(
                field({
                    id: "gang",
                    label: "Gang ou organisation",
                    value: character.gang
                }),
                field({
                    id: "occupation",
                    label: "Métier",
                    value: character.occupation
                })
            );

        return interaction.showModal(modal);
    } catch (error) {
        return replyError(interaction, error);
    }
}

async function submitIdentity(interaction) {
    try {
        assertStaff(interaction);
        const characterId = interaction.customId.split(":")[1];
        const ageText = interaction.fields
            .getTextInputValue("age").trim();
        const age = ageText ? Number(ageText) : null;

        if (
            ageText
            && (!Number.isInteger(age) || age < 0 || age > 999)
        ) {
            throw new Error("L’âge doit être un nombre valide.");
        }

        service.correctForStaff({
            guildId: interaction.guildId,
            characterId,
            changes: {
                proxyName: interaction.fields
                    .getTextInputValue("proxy"),
                alias: interaction.fields
                    .getTextInputValue("alias"),
                firstname: interaction.fields
                    .getTextInputValue("firstname"),
                lastname: interaction.fields
                    .getTextInputValue("lastname"),
                age
            }
        });

        return interaction.update(
            view.build(service.getForStaff({
                guildId: interaction.guildId,
                characterId
            }))
        );
    } catch (error) {
        return replyError(interaction, error);
    }
}

async function submitInformation(interaction) {
    try {
        assertStaff(interaction);
        const characterId = interaction.customId.split(":")[1];
        service.correctForStaff({
            guildId: interaction.guildId,
            characterId,
            changes: {
                gang: interaction.fields
                    .getTextInputValue("gang"),
                occupation: interaction.fields
                    .getTextInputValue("occupation")
            }
        });

        return interaction.update(
            view.build(service.getForStaff({
                guildId: interaction.guildId,
                characterId
            }))
        );
    } catch (error) {
        return replyError(interaction, error);
    }
}

async function selectType(interaction) {
    try {
        assertStaff(interaction);
        const characterId = interaction.customId.split(":")[1];
        service.correctForStaff({
            guildId: interaction.guildId,
            characterId,
            changes: {
                characterType: interaction.values[0]
            }
        });

        return interaction.update(
            view.build(service.getForStaff({
                guildId: interaction.guildId,
                characterId
            }))
        );
    } catch (error) {
        return replyError(interaction, error);
    }
}

module.exports = {
    openIdentity,
    openInformation,
    submitIdentity,
    submitInformation,
    selectType
};
