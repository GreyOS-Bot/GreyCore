const CharacterPhoneConversationPage =
    require(
        "../../pages/character/CharacterPhoneConversationPage"
    );

const CharacterPhoneCallHistoryDetailPage =
    require(
        "../../pages/character/CharacterPhoneCallHistoryDetailPage"
    );

const phoneSearchSelect =
    require(
        "../../interactions/selectMenus/PhoneSearchSelectV2"
    );

const PhoneGroupCreationPage =
    require(
        "../../pages/character/PhoneGroupCreationPage"
    );

const groupDraftService =
    require(
        "../../services/phone/PhoneGroupDraftService"
    );

module.exports =
    async function phoneSelectRouter(
        interaction
    ) {
        if (
            !interaction
                .isStringSelectMenu()
        ) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_phone_group_remove:"
            )
        ) {
            const characterId =
                customId.split(":")[1];

            groupDraftService.removeMember({
                userId:
                    interaction.user.id,
                characterId,
                phoneId:
                    interaction.values[0]
            });

            await PhoneGroupCreationPage.render(
                interaction,
                characterId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_phone_conversation_select:"
            )
        ) {
            await CharacterPhoneConversationPage
                .execute(
                    interaction,
                    Number(
                        interaction.values[0]
                    ),
                    customId.split(":")[1]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_phone_call_history_select:"
            )
        ) {
            await CharacterPhoneCallHistoryDetailPage
                .execute(
                    interaction,
                    Number(
                        interaction.values[0]
                    ),
                    customId.split(":")[1]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_phone_search_select:"
            )
        ) {
            await phoneSearchSelect(
                interaction
            );

            return true;
        }

        return false;
    };
