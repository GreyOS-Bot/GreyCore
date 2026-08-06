const test = require("node:test");
const assert = require("node:assert/strict");

const service = require(
    "../src/v2/core/services/DiscordUserDisplayService"
);

test(
    "les recherches affichent aussi les membres Discord absents du cache",
    async () => {
        const fetched = [];
        const displays = await service.resolveMany(
            {
                guild: {
                    members: {
                        cache: new Map([
                            [
                                "cached",
                                {
                                    displayName: "Morgane"
                                }
                            ]
                        ]),
                        fetch: async discordUserId => {
                            fetched.push(discordUserId);

                            return {
                                displayName: "Nelyne"
                            };
                        }
                    }
                }
            },
            [
                "cached",
                "missing"
            ]
        );

        assert.equal(
            displays.get("cached"),
            "Morgane"
        );
        assert.equal(
            displays.get("missing"),
            "Nelyne"
        );
        assert.deepEqual(
            fetched,
            ["missing"]
        );
    }
);
