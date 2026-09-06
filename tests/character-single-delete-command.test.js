const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le staff supprime un seul personnage sélectionné sans toucher aux autres",
    async () => {
        const deleted = [];

        stubModule(
            "src/v2/managers/CharacterRosterV2Manager.js",
            {
                deleteCharacter: characterId => {
                    deleted.push(characterId);

                    return {
                        continuityCount: 2,
                        installationCount: 1
                    };
                }
            }
        );
        stubModule(
            "src/v2/services/character/CharacterTypeCorrectionService.js",
            {
                getForStaff: data => ({
                    id: data.characterId,
                    firstname: "Reya",
                    proxy_name: "Proxy Reya",
                    discord_user_id: "owner"
                })
            }
        );
        stubModule(
            "src/v2/services/deployment/DeploymentV2Service.js",
            {
                deployAllExisting: () => ({
                    total: 0
                })
            }
        );
        stubModule(
            "src/v2/core/services/StaffPermissionDecisionService.js",
            {
                decide:
                    () => ({ allowed: true })
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
                }
            }
        );

        const commandPath = require.resolve(
            "../src/commands/personnages"
        );
        delete require.cache[commandPath];
        const command = require(
            "../src/commands/personnages"
        );
        const interaction = {
            guildId: "guild",
            options: {
                getSubcommand:
                    () => "supprimer-personnage",
                getBoolean:
                    () => true,
                getString:
                    () => "character-reya"
            }
        };

        await command.execute(interaction);

        assert.deepEqual(
            deleted,
            ["character-reya"]
        );
        assert.match(
            interaction.payload,
            /Reya a été supprimé définitivement/
        );
        assert.match(
            interaction.payload,
            /<@owner>/
        );
        assert.match(
            interaction.payload,
            /2 continuité\(s\)/
        );
    }
);
