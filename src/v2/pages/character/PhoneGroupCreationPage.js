const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const CharacterV2Manager =
    require("../../managers/CharacterV2Manager");

const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const groupDraftService =
    require(
        "../../services/phone/PhoneGroupDraftService"
    );

const {
    errorPayload,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

class PhoneGroupCreationPage {

    async sendPayload(
        interaction,
        payload
    ) {
        if (
            interaction.deferred
            || interaction.replied
        ) {
            return interaction.editReply(payload);
        }

        if (
            interaction.isButton?.()
            || interaction.isStringSelectMenu?.()
        ) {
            return interaction.update(payload);
        }

        return replyPrivate(
            interaction,
            payload
        );
    }

    getContext(
        interaction,
        characterId
    ) {
        const dashboardData =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
                            || null
                    }
                );

        if (!dashboardData?.continuity) {
            throw new Error(
                "Ce personnage n’est pas jouable sur ce serveur."
            );
        }

        const {
            character,
            continuity
        } = dashboardData;

        if (
            String(character.discord_user_id) !==
            String(interaction.user.id)
        ) {
            throw new Error(
                "Vous ne pouvez pas utiliser le téléphone de ce personnage."
            );
        }

        let phone =
            PhoneV2Manager.getPhoneByContinuity(
                continuity.id
            );

        if (!phone) {
            phone = PhoneV2Manager.createPhone({
                continuityId:
                    continuity.id
            });
        }

        return {
            character,
            phone
        };
    }

    getMemberName(
        phoneId
    ) {
        const continuity =
            PhoneV2Manager.getContinuityByPhone(
                phoneId
            );

        const character =
            continuity
                ? CharacterV2Manager.getById(
                    continuity.character_id
                )
                : null;

        if (character?.proxy_name) {
            return character.proxy_name;
        }

        return PhoneV2Manager
            .getPhoneById(phoneId)
            ?.phone_number
            || "Contact inconnu";
    }

    async render(
        interaction,
        characterId
    ) {
        let context;

        try {
            context = this.getContext(
                interaction,
                characterId
            );
        } catch (error) {
            return this.sendPayload(
                interaction,
                errorPayload(
                    error.message,
                    {
                        embeds: [],
                        components: []
                    }
                )
            );
        }

        const draft =
            groupDraftService.ensure({
                userId:
                    interaction.user.id,
                characterId,
                ownerPhoneId:
                    context.phone.id
            });

        const members =
            draft.phoneIds.map(
                phoneId => ({
                    phoneId,
                    name:
                        this.getMemberName(phoneId)
                })
            );

        const participantLines = [
            `• **Vous** — ${context.character.proxy_name}`,
            ...members.map(
                member =>
                    `• ${member.name}`
            )
        ];

        const canCreate =
            members.length >= 2;

        const embed =
            UI.embed.create({
                thumbnail:
                    context.character.avatar_url
                    || null,

                description:
                    UI.text.blocks([
                        UI.components
                            .characterHeader
                            .build(context.character),

                        "### 👥 Nouveau groupe",

                        "Ajoutez au moins deux membres, puis créez la conversation.",

                        `**Nom du groupe**\n${draft.name || "Sans nom"}`,

                        `**Participants (${members.length + 1}/25)**\n${participantLines.join("\n")}`,

                        canCreate
                            ? "✅ Le groupe est prêt à être créé."
                            : "🟡 Ajoutez encore au moins deux membres."
                    ])
            });

        const rows = [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.primary({
                        id:
                            `v2_phone_group_add:${characterId}`,
                        label:
                            "Ajouter un membre",
                        emoji:
                            "➕",
                        disabled:
                            members.length >= 24
                    }),

                    UI.button.secondary({
                        id:
                            `v2_phone_group_name:${characterId}`,
                        label:
                            "Nom du groupe",
                        emoji:
                            "✏️"
                    }),

                    UI.button.success({
                        id:
                            `v2_phone_group_create:${characterId}`,
                        label:
                            "Créer le groupe",
                        emoji:
                            "✅",
                        disabled:
                            !canCreate
                    }),

                    UI.button.secondary({
                        id:
                            `v2_phone_group_cancel:${characterId}`,
                        label:
                            "Annuler",
                        emoji:
                            "⬅️"
                    })
                )
        ];

        if (members.length) {
            const removeMenu =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        `v2_phone_group_remove:${characterId}`
                    )
                    .setPlaceholder(
                        "Retirer un membre"
                    )
                    .addOptions(
                        members
                            .slice(0, 25)
                            .map(
                                member =>
                                    new StringSelectMenuOptionBuilder()
                                        .setLabel(
                                            member.name.slice(0, 100)
                                        )
                                        .setValue(
                                            String(member.phoneId)
                                        )
                            )
                    );

            rows.splice(
                1,
                0,
                new ActionRowBuilder()
                    .addComponents(removeMenu)
            );
        }

        return this.sendPayload(
            interaction,
            UI.page.create({
                embed,
                components:
                    rows
            })
        );
    }

}

module.exports =
    new PhoneGroupCreationPage();
