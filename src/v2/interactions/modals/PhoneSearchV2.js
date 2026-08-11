const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const CharacterV2Manager =
    require("../../managers/CharacterV2Manager");

const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const PhoneSearchV2Manager =
    require("../../managers/PhoneSearchV2Manager");

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function PhoneSearchV2(
        interaction
    ) {
        const [
            ,
            characterId,
            modeValue
        ] = interaction.customId.split(":");

        const mode =
            [
                "call",
                "group",
                "email"
            ].includes(modeValue)
                ? modeValue
                : "sms";

        const query =
            interaction.fields
                .getTextInputValue("query")
                .trim();

        const character =
            CharacterV2Manager.getById(
                characterId
            );

        if (!character) {
            return replyError(
                interaction,
                "Personnage introuvable."
            );
        }

        if (
            String(
                character.discord_user_id
            )
            !==
            String(
                interaction.user.id
            )
        ) {
            return replyError(
                interaction,
                "Ce personnage ne vous appartient pas."
            );
        }

        let dashboardData =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
                            || null
                    }
                );

        if (!dashboardData) {
            dashboardData =
                CharacterDashboardManager
                    .getPlayableDashboardData(
                        characterId,
                        {
                            guildId: null
                        }
                    );
        }

        const continuity =
            dashboardData
                ?.continuity
            || null;

        if (!continuity) {
            return replyError(
                interaction,
                "Ce personnage ne possède aucune continuité sur ce serveur."
            );
        }

        const phone =
            PhoneV2Manager
                .getPhoneByContinuity(
                    continuity.id
                );

        if (!phone) {
            return replyError(
                interaction,
                "Aucun téléphone n’est configuré pour cette continuité."
            );
        }

        const results =
            PhoneSearchV2Manager.search({
                viewerPhoneId:
                    phone.id,
                guildId:
                    interaction.guildId
                    || null,
                query,
                limit: 25
            });

        if (results.length === 0) {
            return replyError(
                interaction,
                `Aucun résultat trouvé pour **${query}**.`
            );
        }

        const selectableResults =
            results.filter(
                result =>
                    result.phoneId
                    || (
                        mode !== "group"
                        && result.conversationId
                    )
            );

        if (
            selectableResults.length === 0
        ) {
            return replyError(
                interaction,
                `Aucun contact utilisable trouvé pour **${query}**.`
            );
        }

        const menu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    `v2_phone_search_select:${characterId}:${phone.id}:${mode}`
                )
                .setPlaceholder(
                    mode === "call"
                        ? "Choisir le personnage à appeler"
                        : mode === "group"
                            ? "Choisir le membre à ajouter"
                        : mode === "email"
                            ? "Choisir le destinataire de l’e-mail"
                        : selectableResults.length === 1
                            ? "Sélectionner le résultat"
                            : "Choisir parmi les résultats"
                )
                .addOptions(
                    selectableResults
                        .slice(0, 25)
                        .map(
                            (
                                result,
                                index
                            ) => {
                                const value =
                                    mode === "group"
                                        ? `phone:${result.phoneId}`
                                        : result.conversationId
                                            ? `conversation:${result.conversationId}`
                                            : `phone:${result.phoneId}`;

                                const description =
                                    String(
                                        result.subtitle
                                        || result.phoneNumber
                                        || "Personnage Greycore"
                                    ).slice(
                                        0,
                                        100
                                    );

                                return {
                                    label:
                                        String(
                                            result.title
                                            || `Résultat ${index + 1}`
                                        ).slice(
                                            0,
                                            100
                                        ),
                                    description,
                                    value,
                                    emoji:
                                        mode === "call"
                                            ? "📞"
                                            : mode === "group"
                                                ? "👥"
                                                : mode === "email"
                                                    ? "📧"
                                                : "💬"
                                };
                            }
                        )
                );

        return replyPrivate(
            interaction,
            {
                content:
                    selectableResults.length === 1
                        ? `🔎 **1 résultat trouvé pour “${query}”**`
                        : `🔎 **${selectableResults.length} résultats trouvés pour “${query}”**`,
                components: [
                    new ActionRowBuilder()
                        .addComponents(menu)
                ]
            }
        );
    };
