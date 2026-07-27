const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

function createExternal(
    continuityAId
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_enc_ext:${continuityAId}`
            )
            .setTitle(
                "Ajouter une rencontre"
            );

    modal.addComponents(
        row(
            textInput({
                id:
                    "external_name",
                label:
                    "Nom du personnage rencontré",
                required:
                    true,
                maxLength:
                    100,
                placeholder:
                    "Exemple : Sergueï"
            })
        ),
        row(
            textInput({
                id:
                    "location",
                label:
                    "Lieu de la rencontre (facultatif)",
                maxLength:
                    100,
                placeholder:
                    "Exemple : Le Steel"
            })
        ),
        row(
            dateInput()
        ),
        row(
            noteInput()
        )
    );

    return modal;
}

function createInternal(
    continuityAId,
    continuityBId
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_enc_int:${continuityAId}:${continuityBId}`
            )
            .setTitle(
                "Ajouter une rencontre"
            );

    modal.addComponents(
        row(
            textInput({
                id:
                    "location",
                label:
                    "Lieu de la rencontre (facultatif)",
                maxLength:
                    100,
                placeholder:
                    "Exemple : Le Steel"
            })
        ),
        row(
            dateInput()
        ),
        row(
            noteInput()
        )
    );

    return modal;
}

function edit(
    characterId,
    encounter
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_encounter_edit_submit:${characterId}:${encounter.id}`
            )
            .setTitle(
                "Modifier la rencontre"
            );

    if (encounter.external_name) {
        modal.addComponents(
            row(
                textInput({
                    id:
                        "external_name",
                    label:
                        "Nom du personnage rencontré",
                    required:
                        true,
                    maxLength:
                        100,
                    value:
                        encounter
                            .external_name
                })
            )
        );
    }

    modal.addComponents(
        row(
            textInput({
                id:
                    "location",
                label:
                    "Lieu de la rencontre (facultatif)",
                maxLength:
                    100,
                value:
                    encounter.location
                    ||
                    ""
            })
        ),
        row(
            dateInput(
                encounter.occurred_at
                ||
                ""
            )
        ),
        row(
            noteInput(
                encounter.note
                ||
                ""
            )
        )
    );

    return modal;
}

function dateInput(value) {
    return textInput({
        id:
            "occurred_at",
        label:
            "Date de la rencontre (facultatif)",
        maxLength:
            10,
        placeholder:
            "AAAA-MM-JJ",
        value:
            value === undefined
                ? undefined
                : String(value)
                    .slice(0, 10)
    });
}

function noteInput(value) {
    return textInput({
        id:
            "note",
        label:
            "Résumé ou contexte (facultatif)",
        style:
            TextInputStyle.Paragraph,
        maxLength:
            1000,
        placeholder:
            "Exemple : Première rencontre tendue au bar.",
        value
    });
}

function textInput({
    id,
    label,
    style =
        TextInputStyle.Short,
    required = false,
    maxLength,
    placeholder,
    value
}) {
    const input =
        new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
            .setRequired(required);

    if (maxLength) {
        input.setMaxLength(
            maxLength
        );
    }

    if (placeholder) {
        input.setPlaceholder(
            placeholder
        );
    }

    if (
        value !== undefined
        &&
        value !== null
    ) {
        input.setValue(
            String(value).slice(
                0,
                maxLength
                ||
                4000
            )
        );
    }

    return input;
}

function row(input) {
    return new ActionRowBuilder()
        .addComponents(input);
}

module.exports = {
    createExternal,
    createInternal,
    edit
};
