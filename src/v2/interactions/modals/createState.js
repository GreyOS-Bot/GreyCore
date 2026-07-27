const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "createState"
    );

const stateV2Manager =
    require(
        "../../managers/StateV2Manager"
    );

const characterStatesPage =
    require(
        "../../pages/character/CharacterStatesPage"
    );

const {
    getContinuityId,
    getGuildStateType,
    getManageableDashboard
} = require(
    "../states/StateAccessService"
);

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function createState(
        interaction
    ) {
        const [
            ,
            characterId,
            stateTypeId
        ] = interaction.customId
            .split(":");

        const dashboardData =
            await getManageableDashboard(
                interaction,
                characterId,
                "Vous ne pouvez pas ajouter un état à ce personnage."
            );

        if (!dashboardData) {
            return;
        }

        const stateType =
            await getGuildStateType(
                interaction,
                stateTypeId
            );

        if (!stateType) {
            return;
        }

        const note =
            interaction.fields
                .getTextInputValue(
                    "note"
                )
                .trim();

        const startedAt =
            interaction.fields
                .getTextInputValue(
                    "started_at"
                )
                .trim();

        try {
            stateV2Manager.create({
                continuityId:
                    getContinuityId(
                        dashboardData
                    ),
                stateTypeId:
                    Number(
                        stateType.id
                    ),
                guildId:
                    interaction.guildId,
                note:
                    note || null,
                startedAt:
                    startedAt || null,
                createdBy:
                    interaction.user.id
            });

            return characterStatesPage
                .execute(
                    interaction,
                    characterId
                );
        } catch (error) {
            logger.error(
                "❌ Création état V2 :",
                error
            );

            return replyError(
                interaction,
                error
            );
        }
    };
