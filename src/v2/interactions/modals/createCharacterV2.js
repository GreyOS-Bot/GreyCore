const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "createCharacterV2"
    );

const characterCreationService =
    require(
        "../../services/character/CharacterCreationV2Service"
    );

const characterTypeCatalog =
    require(
        "../../core/character/CharacterTypeCatalog"
    );

const characterCreateModal =
    require(
        "../../modals/CharacterCreateModal"
    );

const characterAvatarRequiredView =
    require(
        "../../views/character/CharacterAvatarRequiredView"
    );

const pendingActionManager =
    require(
        "../../managers/PendingActionManager"
    );

const staffTrackingService =
    require(
        "../../services/validation/InstallationStaffTrackingService"
    );

const {
    replyError,
    replyPrivate,
    editOrReplyError,
    deferPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

async function startCharacterCreation(
    interaction
) {
    try {
        ensureGuild(interaction);

        const type = getType(interaction);

        if (
            characterTypeCatalog
                .usesSimpleCreation(type)
        ) {
            pendingActionManager.create({
                userId: interaction.user.id,
                type: "character_creation_gender",
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                channelId: interaction.channelId,
                characterType: type,
                data: {
                    type,
                    proxyName:
                        readField(
                            interaction,
                            "character_proxy_name"
                        ),
                    fullName:
                        readField(
                            interaction,
                            "profile_fullname"
                        )
                }
            });
            return replyPrivate(interaction, buildGenderPrompt(type));
        }

        pendingActionManager.create({
            userId:
                interaction.user.id,
            type:
                "character_creation_details",
            guildId:
                interaction.guild.id,
            guildName:
                interaction.guild.name,
            channelId:
                interaction.channelId,
            characterType:
                type,
            data: {
                proxyName:
                    readField(
                        interaction,
                        "character_proxy_name"
                    ),
                alias:
                    readField(
                        interaction,
                        "profile_alias"
                    ),
                firstname:
                    readField(
                        interaction,
                        "profile_firstname"
                    ),
                lastname:
                    readField(
                        interaction,
                        "profile_lastname"
                    ),
                age:
                    readField(
                        interaction,
                        "profile_age"
                    )
            }
        });

        return replyPrivate(
            interaction,
            buildDetailsPrompt(type)
        );
    } catch (error) {
        logger.error(
            "Erreur cr\u00e9ation personnage V2 :",
            error
        );

        return editOrReplyError(
            interaction,
            error.message
            || "Impossible de cr\u00e9er le personnage."
        );
    }
}

async function completeCharacterCreation(
    interaction
) {
    try {
        ensureGuild(interaction);

        const type = getType(interaction);
        const pending =
            getPendingDetails(
                interaction,
                type
            );

        pendingActionManager.create({
            userId: interaction.user.id,
            type: "character_creation_gender",
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            channelId: interaction.channelId,
            characterType: type,
            data: {
                ...pending.data,
                type,
                gang:
                    readField(
                        interaction,
                        "profile_gang"
                    ),
                occupation:
                    readField(
                        interaction,
                        "profile_occupation"
                    ),
                birthday:
                    readField(
                        interaction,
                        "profile_birthday"
                    ),
                creationDate:
                    readField(
                        interaction,
                        "profile_creation_date"
                    ),
                story:
                    readField(
                        interaction,
                        "profile_story"
                    )
            }
        });

        return replyPrivate(interaction, buildGenderPrompt(type));
    } catch (error) {
        logger.error(
            "Erreur cr\u00e9ation personnage V2 :",
            error
        );

        return editOrReplyError(
            interaction,
            error.message
            || "Impossible de cr\u00e9er le personnage."
        );
    }
}

async function selectCharacterGender(interaction, type, selectedGender) {
    try {
        ensureGuild(interaction);
        const pending = pendingActionManager.get(interaction.user.id);
        if (
            !pending
            || pending.type !== "character_creation_gender"
            || pending.characterType !== type
            || String(pending.guildId) !== String(interaction.guild.id)
        ) {
            throw new Error("La création a expiré. Recommence simplement la création du personnage.");
        }
        const genders = {
            female: "Femme",
            male: "Homme",
            neutral: "Non genré"
        };
        if (!genders[selectedGender]) {
            throw new Error("Ce choix de genre est invalide.");
        }
        return await createCharacter(interaction, {
            ...pending.data,
            type,
            gender: genders[selectedGender]
        });
    } catch (error) {
        logger.error("Erreur choix du genre à la création V2 :", error);
        return editOrReplyError(interaction, error.message || "Impossible de terminer la création.");
    }
}

async function openCharacterCreationDetails(
    interaction,
    type
) {
    try {
        ensureGuild(interaction);
        getPendingDetails(
            interaction,
            type
        );

        return interaction.showModal(
            characterCreateModal.buildDetails(type)
        );
    } catch (error) {
        logger.error(
            "Erreur ouverture seconde \u00e9tape cr\u00e9ation V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible de poursuivre la cr\u00e9ation."
        );
    }
}

async function createCharacter(
    interaction,
    data
) {
    await acknowledgeCreation(
        interaction
    );

    const result =
        characterCreationService.create({
            discordUserId:
                interaction.user.id,
            guildId:
                interaction.guild.id,
            guildName:
                interaction.guild.name,
            ...data
        });

    pendingActionManager.create({
        userId:
            interaction.user.id,
        type:
            "character_avatar_upload",
        guildId:
            interaction.guild.id,
        channelId:
            interaction.channelId,
        characterId:
            result.character.id,
        continuityId:
            result.continuity.id,
        installationId:
            result.installation.id
    });

    await staffTrackingService
        .sync({
            client:
                interaction.client,
            guild:
                interaction.guild,
            installationId:
                result.installation.id,
            requesterId:
                interaction.user.id
        });

    const view =
        characterAvatarRequiredView.build(
            result.character,
            result.continuity,
            result.installation,
            interaction.guild
        );

    if (
        (
            interaction.deferred
            || interaction.replied
        )
        && typeof interaction.editReply ===
            "function"
    ) {
        return interaction.editReply(view);
    }

    if (
        interaction.message
        && typeof interaction.update ===
            "function"
    ) {
        return interaction.update(view);
    }

    return replyPrivate(
        interaction,
        view
    );
}

async function acknowledgeCreation(
    interaction
) {
    if (
        interaction.deferred
        || interaction.replied
    ) {
        return;
    }

    if (
        interaction.message
        && typeof interaction.deferUpdate ===
            "function"
    ) {
        await interaction.deferUpdate();
        return;
    }

    if (
        typeof interaction.deferReply ===
        "function"
    ) {
        await deferPrivate(interaction);
    }
}

function ensureGuild(interaction) {
    if (!interaction.guild) {
        throw new Error(
            "La cr\u00e9ation doit \u00eatre effectu\u00e9e depuis un serveur."
        );
    }
}

function getPendingDetails(
    interaction,
    type
) {
    const pending =
        pendingActionManager.get(
            interaction.user.id
        );

    if (
        !pending
        || pending.type !==
            "character_creation_details"
        || pending.characterType !== type
        || String(pending.guildId) !==
            String(interaction.guild.id)
    ) {
        throw new Error(
            "La premi\u00e8re \u00e9tape de cr\u00e9ation a expir\u00e9. Recommence simplement la cr\u00e9ation du personnage."
        );
    }

    return pending;
}

function buildDetailsPrompt(type) {
    return {
        content: [
            "Premi\u00e8re \u00e9tape enregistr\u00e9e.",
            "Compl\u00e8te maintenant l'organisation, l'histoire et les dates avant de pr\u00e9parer l'avatar."
        ].join("\n"),
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_character_create_details_open:${type}`
                        )
                        .setLabel(
                            "Continuer la cr\u00e9ation (2/2)"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                )
        ]
    };
}

function buildGenderPrompt(type) {
    return {
        content: [
            "Dernière étape avant la création du personnage.",
            "Choisis le genre utilisé sur sa fiche et dans les statistiques du serveur."
        ].join("\n"),
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`v2_character_create_gender:${type}:female`)
                .setLabel("Femme")
                .setEmoji("♀️")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`v2_character_create_gender:${type}:male`)
                .setLabel("Homme")
                .setEmoji("♂️")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`v2_character_create_gender:${type}:neutral`)
                .setLabel("Non genré")
                .setEmoji("⚪")
                .setStyle(ButtonStyle.Secondary)
        )]
    };
}

function getType(interaction) {
    return interaction.customId
        .split(":")[1];
}

function readField(
    interaction,
    fieldId
) {
    try {
        return interaction.fields
            .getTextInputValue(fieldId);
    } catch (error) {
        return "";
    }
}

module.exports =
    startCharacterCreation;

module.exports.complete =
    completeCharacterCreation;

module.exports.openDetails =
    openCharacterCreationDetails;

module.exports.selectGender =
    selectCharacterGender;
