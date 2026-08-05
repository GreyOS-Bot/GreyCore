const pendingActionManager =
    require(
        "../../../v2/managers/PendingActionManager"
    );

const uploadHandlers =
    new Map([
        [
            "character_avatar_upload",
            require(
                "./uploads/CharacterAvatarUploadHandler"
            )
        ],
        [
            "installation_avatar_upload",
            require(
                "./uploads/InstallationAvatarUploadHandler"
            )
        ],
        [
            "outfit_upload",
            require(
                "./uploads/OutfitUploadHandler"
            )
        ],
        [
            "phone_mms_upload",
            require(
                "./uploads/PhoneMmsUploadHandler"
            )
        ]
    ]);

module.exports =
    async function pendingUploadRouter(
        message
    ) {
        pendingActionManager.cleanupExpired();

        const pendingAction =
            pendingActionManager.get(
                message.author.id
            );

        if (!pendingAction) {
            return false;
        }

        const uploadHandler =
            uploadHandlers.get(
                pendingAction.type
            );

        if (!uploadHandler) {
            return false;
        }

        if (
            pendingAction.guildId
                !== message.guild?.id
            ||
            pendingAction.channelId
                !== message.channel.id
        ) {
            /*
             * Une attente d'image ne doit jamais bloquer les autres
             * fonctionnalités du joueur ailleurs sur le serveur.
             * Le message poursuit donc son parcours normal (proxy,
             * assistant de scène, etc.) hors du salon concerné.
             */
            return false;
        }

        await uploadHandler(
            message,
            pendingAction
        );

        return true;
    };
