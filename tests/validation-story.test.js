const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la carte staff donne acc\u00e8s \u00e0 l'histoire compl\u00e8te et pagin\u00e9e",
    async () => {
        const builder =
            require(
                "../src/v2/builders/ValidationCardBuilder"
            );

        const card =
            builder.build({
                installation: {
                    id: "installation",
                    status: "pending",
                    proxy_name: "Reya",
                    character_type: "personnage_joue",
                    firstname: "Reya",
                    story: "Une histoire compl\u00e8te.",
                    gender: "Femme",
                    birthday: "12 avril",
                    origin: "Los Santos",
                    proxy_enabled: 1
                }
            });

        const componentIds =
            card.components[0]
                .toJSON()
                .components
                .map(
                    component => component.custom_id
                );

        assert.ok(
            componentIds.includes(
                "v2_validation_story:installation"
            )
        );

        const detailField =
            card.embeds[0]
                .toJSON()
                .fields
                .find(
                    field =>
                        field.name.includes(
                            "Détails de la fiche"
                        )
                );

        assert.match(detailField.value, /Femme/);
        assert.match(detailField.value, /Los Santos/);

        const story =
            `${"A".repeat(3_800)} ${"B".repeat(100)}`;

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        getInstallationContext:
                            () => ({
                                id: "installation",
                                guild_id: "guild",
                                proxy_name: "Reya",
                                story
                            })
                    }
                }
            }
        );
        stubModule(
            "src/v2/core/services/ValidationPermissionAccessService.js",
            {
                canRead: () => true,
                canWrite: () => true
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyPrivate: async (
                    interaction,
                    payload
                ) => {
                    interaction.payload = payload;
                },
                replyError: async (
                    interaction,
                    message
                ) => {
                    interaction.error = message;
                }
            }
        );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/buttons/openValidationStory"
            );

        delete require.cache[handlerPath];

        const openValidationStory =
            require(
                "../src/v2/interactions/buttons/openValidationStory"
            );

        const interaction = {
            customId:
                "v2_validation_story:installation",
            guildId: "guild"
        };

        await openValidationStory.execute(
            interaction
        );

        assert.match(
            interaction.payload.embeds[0]
                .toJSON().description,
            /^A/
        );

        assert.equal(
            interaction.payload.components.length,
            1
        );

        const nextInteraction = {
            customId:
                "v2_validation_story:installation:1",
            guildId: "guild",
            update: async payload => {
                nextInteraction.payload = payload;
            }
        };

        await openValidationStory.execute(
            nextInteraction
        );

        assert.match(
            nextInteraction.payload.embeds[0]
                .toJSON().description,
            /^B/
        );
    }
);
