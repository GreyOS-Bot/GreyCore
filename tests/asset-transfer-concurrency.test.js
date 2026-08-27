const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "un transfert devenu obsolète ne notifie personne et ne confirme aucun succès",
    async () => {
        let notificationCount = 0;
        let replyCount = 0;
        let receivedData = null;

        stubModule(
            "src/v2/managers/AssetV2Manager.js",
            {
                transfer: (
                    assetId,
                    data
                ) => {
                    assert.equal(
                        assetId,
                        "asset"
                    );
                    receivedData = data;

                    throw new Error(
                        "Ce bien a été modifié ou transféré entre-temps. Actualisez la fiche avant de réessayer."
                    );
                }
            }
        );

        stubModule(
            "src/v2/interactions/assets/AssetAccessService.js",
            {
                getAssetContext:
                    async () => ({
                        asset: {
                            continuity_id:
                                "continuity-a"
                        },
                        character: {
                            proxy_name:
                                "Alba"
                        }
                    })
            }
        );

        stubModule(
            "src/v2/services/assets/AssetTransferNotificationService.js",
            {
                shouldNotify: () => true,
                notify: async () => {
                    notificationCount += 1;
                    return true;
                }
            }
        );

        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async () => {},
                replyPrivate: async () => {
                    replyCount += 1;
                }
            }
        );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/assets/AssetHandler"
            );
        delete require.cache[
            handlerPath
        ];

        const handler =
            require(
                "../src/v2/interactions/assets/AssetHandler"
            );

        await assert.rejects(
            handler.transfer(
                {
                    guildId: "guild",
                    channelId: "channel",
                    user: {
                        id: "discord-a"
                    },
                    client: {}
                },
                "asset",
                "continuity-b"
            ),
            /modifié ou transféré entre-temps/
        );

        assert.deepEqual(
            receivedData,
            {
                toContinuityId:
                    "continuity-b",
                expectedContinuityId:
                    "continuity-a",
                transferredBy:
                    "discord-a"
            }
        );
        assert.equal(
            notificationCount,
            0
        );
        assert.equal(
            replyCount,
            0
        );
    }
);
