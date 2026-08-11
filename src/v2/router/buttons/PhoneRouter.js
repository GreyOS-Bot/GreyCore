const CharacterPhonePage =
    require(
        "../../pages/character/CharacterPhonePage"
    );

const CharacterPhoneConversationsPage =
    require(
        "../../pages/character/CharacterPhoneConversationsPage"
    );

const CharacterPhoneCallHistoryPage =
    require(
        "../../pages/character/CharacterPhoneCallHistoryPage"
    );

const CharacterPhoneCallHistoryDetailPage =
    require(
        "../../pages/character/CharacterPhoneCallHistoryDetailPage"
    );

const PhoneNewConversationPage =
    require(
        "../../pages/character/PhoneNewConversationPage"
    );

const PhoneGroupCreationPage =
    require(
        "../../pages/character/PhoneGroupCreationPage"
    );

const PhoneGroupNameModal =
    require(
        "../../modals/PhoneGroupNameModal"
    );

const PhoneConversationV2Manager =
    require(
        "../../managers/PhoneConversationV2Manager"
    );

const groupDraftService =
    require(
        "../../services/phone/PhoneGroupDraftService"
    );

const PhoneSearchModal =
    require(
        "../../modals/PhoneSearchModal"
    );

const PhoneMessageModal =
    require(
        "../../modals/PhoneMessageModal"
    );

const phoneMmsUploadRequest =
    require(
        "../../interactions/phone/PhoneMmsUploadRequest"
    );

const CharacterPhoneConversationPage =
    require(
        "../../pages/character/CharacterPhoneConversationPage"
    );

const PhoneCallStartPage =
    require(
        "../../pages/character/PhoneCallStartPage"
    );

const PhoneCallActionPage =
    require(
        "../../pages/character/PhoneCallActionPage"
    );

const PhoneCallSpeakModal =
    require(
        "../../modals/PhoneCallSpeakModal"
    );

const PhoneVoicemailModal =
    require(
        "../../modals/PhoneVoicemailModal"
    );

const CharacterPhoneCallPage =
    require(
        "../../pages/character/CharacterPhoneCallPage"
    );

module.exports =
    async function (
        interaction,
        dependencies
    ) {

        const id =
            interaction.customId;

        if (
            id.startsWith(
                "v2_phone_open:"
            )
        ) {

            const characterId =
                id.split(":")[1];

            await CharacterPhonePage.execute(
                interaction,
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_conversations:"
            )
        ) {

            const characterId =
                id.split(":")[1];

            await CharacterPhoneConversationsPage.execute(
                interaction,
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_calls:"
            )
        ) {

            const characterId =
                id.split(":")[1];

            await CharacterPhoneCallHistoryPage.execute(
                interaction,
                characterId
            );

            return true;

        }

                if (
            id.startsWith(
                "v2_phone_call_history_detail:"
            )
        ) {

            const [
                ,
                callId,
                characterId
            ] = id.split(":");

            await CharacterPhoneCallHistoryDetailPage.execute(
                interaction,
                Number(
                    callId
                ),
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_new:"
            )
        ) {

            const characterId =
                id.split(":")[1];

            await PhoneNewConversationPage.render(
                interaction,
                {
                    characterId
                }
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_group_new:"
            )
        ) {
            const characterId =
                id.split(":")[1];

            try {
                const context =
                    PhoneGroupCreationPage.getContext(
                        interaction,
                        characterId
                    );

                groupDraftService.start({
                    userId:
                        interaction.user.id,
                    characterId,
                    ownerPhoneId:
                        context.phone.id
                });
            } catch (error) {
                return PhoneGroupCreationPage.render(
                    interaction,
                    characterId
                );
            }

            await PhoneGroupCreationPage.render(
                interaction,
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_group_add:"
            )
        ) {
            await PhoneSearchModal.show(
                interaction,
                id.split(":")[1],
                "group"
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_group_name:"
            )
        ) {
            await PhoneGroupNameModal.show(
                interaction,
                id.split(":")[1]
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_group_cancel:"
            )
        ) {
            const characterId =
                id.split(":")[1];

            groupDraftService.clear(
                interaction.user.id,
                characterId
            );

            await PhoneNewConversationPage.render(
                interaction,
                {
                    characterId
                }
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_group_create:"
            )
        ) {
            const characterId =
                id.split(":")[1];

            try {
                const context =
                    PhoneGroupCreationPage.getContext(
                        interaction,
                        characterId
                    );

                const draft =
                    groupDraftService.get(
                        interaction.user.id,
                        characterId
                    );

                if (
                    !draft
                    || Number(draft.ownerPhoneId) !==
                        Number(context.phone.id)
                    || draft.phoneIds.length < 2
                ) {
                    return PhoneGroupCreationPage.render(
                        interaction,
                        characterId
                    );
                }

                const conversation =
                    PhoneConversationV2Manager
                        .createGroup({
                            ownerPhoneId:
                                context.phone.id,
                            phoneIds:
                                draft.phoneIds,
                            name:
                                draft.name
                        });

                groupDraftService.clear(
                    interaction.user.id,
                    characterId
                );

                await CharacterPhoneConversationPage.execute(
                    interaction,
                    conversation.id,
                    characterId
                );
            } catch (error) {
                await PhoneGroupCreationPage.render(
                    interaction,
                    characterId
                );
            }

            return true;

        }

        if (
            id.startsWith(
                "phone:new:search:"
            )
        ) {

            const characterId =
                id.split(":")[3];

            await PhoneSearchModal.show(
                interaction,
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_conversation:"
            )
        ) {

            const [
                ,
                conversationId,
                characterId
            ] = id.split(":");

            await CharacterPhoneConversationPage.execute(
                interaction,
                Number(
                    conversationId
                ),
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_message_new:"
            )
        ) {

            const [
                ,
                conversationId,
                characterId
            ] = id.split(":");

            await PhoneMessageModal.show(
                interaction,
                conversationId,
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_mms_new:"
            )
        ) {
            const [
                ,
                conversationId,
                characterId
            ] = id.split(":");

            await phoneMmsUploadRequest.start(
                interaction,
                Number(conversationId),
                characterId
            );

            return true;
        }

        if (id.startsWith("v2_phone_email_new:")) {
            const [, conversationId, characterId] = id.split(":");
            await PhoneMessageModal.show(
                interaction,
                conversationId,
                characterId,
                { source: "email", kind: "email" }
            );
            return true;
        }

        if (
            id.startsWith(
                "v2_phone_quick_reply:"
            )
        ) {

            const [
                ,
                conversationId,
                characterId
            ] = id.split(":");

            await PhoneMessageModal.show(
                interaction,
                conversationId,
                characterId,
                {
                    source:
                        "quick_reply"
                }
            );

            return true;

        }

        if (
    id.startsWith(
        "v2_phone_call_open:"
    )
) {

    const [
        ,
        callId,
        characterId
    ] = id.split(":");

    await CharacterPhoneCallPage.open(
        interaction,
        Number(
            callId
        ),
        characterId
    );

    return true;

}

if (
    id.startsWith(
        "v2_phone_call_new:"
    )
) {

    const characterId =
        id.split(":")[1];

    await PhoneSearchModal.show(
        interaction,
        characterId,
        "call"
    );

    return true;

}

        if (
            id.startsWith(
                "v2_phone_call_start:"
            )
        ) {

            const [
                ,
                conversationId,
                characterId
            ] = id.split(":");

            await PhoneCallStartPage.execute(
                interaction,
                Number(
                    conversationId
                ),
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_call_accept:"
            )
        ) {

            const [
                ,
                callId,
                characterId
            ] = id.split(":");

            await PhoneCallActionPage.accept(
                interaction,
                Number(
                    callId
                ),
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_call_refuse:"
            )
        ) {

            const [
                ,
                callId,
                characterId
            ] = id.split(":");

            await PhoneCallActionPage.refuse(
                interaction,
                Number(
                    callId
                ),
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_call_speak:"
            )
        ) {

            const [
                ,
                callId,
                characterId
            ] = id.split(":");

            await PhoneCallSpeakModal.show(
                interaction,
                Number(
                    callId
                ),
                characterId
            );

            return true;

        }

        if (
            id.startsWith(
                "v2_phone_call_voicemail:"
            )
        ) {
            const [
                ,
                callId,
                characterId
            ] = id.split(":");

            await PhoneVoicemailModal.show(
                interaction,
                Number(callId),
                characterId
            );

            return true;
        }

        if (
            id.startsWith(
                "v2_phone_call_end:"
            )
        ) {

            const [
                ,
                callId,
                characterId
            ] = id.split(":");

            await PhoneCallActionPage.end(
                interaction,
                Number(
                    callId
                ),
                characterId
            );

            return true;

        }

        return false;

    };
