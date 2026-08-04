const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class RejectedProfileView {

    modal({
        installation,
        character,
        profile
    }) {
        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_rejected_profile_submit:${installation.id}`
                )
                .setTitle(
                    `Modifier ${character.proxy_name}`
                );

        const fields = [
            this.textField({
                id:
                    "firstname",
                label:
                    "Prénom (facultatif)",
                maximumLength:
                    100,
                value:
                    profile?.firstname
            }),
            this.textField({
                id:
                    "lastname",
                label:
                    "Nom (facultatif)",
                maximumLength:
                    100,
                value:
                    profile?.lastname
            }),
            this.textField({
                id:
                    "age",
                label:
                    "Âge (facultatif)",
                maximumLength:
                    3,
                value:
                    profile?.age
            }),
            this.textField({
                id:
                    "gang",
                label:
                    "Gang ou organisation (facultatif)",
                maximumLength:
                    100,
                value:
                    profile?.gang
            }),
            this.textField({
                id:
                    "story",
                label:
                    "Histoire (facultatif)",
                maximumLength:
                    4000,
                value:
                    profile?.story,
                style:
                    TextInputStyle.Paragraph
            })
        ];

        modal.addComponents(
            fields.map(
                field =>
                    new ActionRowBuilder()
                        .addComponents(
                            field
                        )
            )
        );

        return modal;
    }

    textField({
        id,
        label,
        maximumLength,
        value,
        style =
            TextInputStyle.Short
    }) {
        const field =
            new TextInputBuilder()
                .setCustomId(id)
                .setLabel(label)
                .setStyle(style)
                .setRequired(false)
                .setMaxLength(
                    maximumLength
                );

        if (
            value !== null
            && value !== undefined
            && String(value)
        ) {
            field.setValue(
                String(value)
            );
        }

        return field;
    }

    updated(
        character,
        installationId,
        wasSuspended = false
    ) {
        return {
            embeds: [
                {
                    color:
                        0x57F287,
                    title:
                        "✅ Fiche modifiée",
                    description: [
                        `La fiche de **${character.proxy_name}** a été enregistrée.`,
                        "",
                        wasSuspended
                            ? "Le personnage reste bloqué. Relance maintenant la validation pour que le staff contrôle la correction."
                            : "Tu peux maintenant relancer directement la demande de validation."
                    ].join("\n")
                }
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_rejection_edit:${installationId}`
                            )
                            .setLabel(
                                "Modifier à nouveau"
                            )
                            .setEmoji("✏️")
                            .setStyle(
                                ButtonStyle.Secondary
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_install_submit:${installationId}`
                            )
                            .setLabel(
                                "Relancer la validation"
                            )
                            .setEmoji("📨")
                            .setStyle(
                                ButtonStyle.Success
                            )
                    )
            ]
        };
    }

}

module.exports =
    new RejectedProfileView();
