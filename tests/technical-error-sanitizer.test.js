const test = require("node:test");
const assert = require("node:assert/strict");

const {
    sanitizeText,
    sanitizeError
} = require(
    "../src/v2/core/services/TechnicalErrorSanitizer"
);
const {
    buildErrorEmbed
} = require(
    "../src/v2/services/StaffErrorLogService"
);

test(
    "le sanitizer masque secrets et chemins tout en conservant le diagnostic utile",
    () => {
        process.env.GREYFATE_SHARED_SECRET =
            "KNOWN_SECRET";

        try {
            const input = [
                "Authorization: Bearer HEADER_SECRET",
                "Bearer DIRECT_SECRET",
                "https://discord.com/api/webhooks/123456/WEBHOOK_SECRET",
                "KNOWN_SECRET",
                "C:\\Greycore\\src\\v2\\service.js:10:2",
                "/home/greyos/apps/GreyCore/src/index.js:4:1",
                "```danger```"
            ].join("\n");

            const output = sanitizeText(input);

            for (const secret of [
                "HEADER_SECRET",
                "DIRECT_SECRET",
                "WEBHOOK_SECRET",
                "KNOWN_SECRET"
            ]) {
                assert.doesNotMatch(
                    output,
                    new RegExp(secret)
                );
            }

            assert.match(
                output,
                /webhooks\/123456\/\[REDACTED\]/
            );
            assert.match(output, /<project>\/src/);
            assert.doesNotMatch(output, /C:\\Greycore/);
            assert.doesNotMatch(output, /\/home\/greyos/);
            assert.doesNotMatch(output, /```/);
            assert.match(output, /src\/v2\/service\.js/);
        } finally {
            delete process.env.GREYFATE_SHARED_SECRET;
        }
    }
);

test(
    "le sanitizer conserve le texte normal, tronque et gère les valeurs non Error",
    () => {
        assert.equal(
            sanitizeText("Diagnostic normal"),
            "Diagnostic normal"
        );
        assert.equal(sanitizeText(null), "");
        assert.equal(
            sanitizeText("abcdefgh", {
                maximum: 5
            }),
            "abcd…"
        );

        const sanitized = sanitizeError(
            "échec simple"
        );
        assert.equal(sanitized.name, "Error");
        assert.equal(
            sanitized.message,
            "échec simple"
        );
    }
);

test(
    "le rapport staff garde le contexte sans secret ni chemin absolu",
    () => {
        const error = new Error(
            "SQLite C:\\Greycore\\data\\db.sqlite Bearer SECRET"
        );
        error.code = "SQLITE_BUSY";
        error.stack = [
            error.toString(),
            "at run (C:\\Greycore\\src\\v2\\repository.js:12:3)"
        ].join("\n");

        const embed = buildErrorEmbed({
            scope: "commandRouter",
            error,
            interaction: {
                commandName: "personnage",
                customId: null,
                guildId: "guild-1",
                guild: {
                    id: "guild-1",
                    name: "Serveur"
                },
                channelId: "channel-1",
                channel: {
                    id: "channel-1",
                    name: "staff"
                },
                user: {
                    id: "user-1",
                    tag: "User#0001"
                }
            }
        }).toJSON();

        const serialized = JSON.stringify(embed);

        assert.doesNotMatch(serialized, /SECRET/);
        assert.doesNotMatch(serialized, /C:\\\\Greycore/);
        assert.match(serialized, /<project>\/src/);
        assert.match(serialized, /SQLITE_BUSY/);
        assert.match(serialized, /guild-1/);
        assert.match(serialized, /channel-1/);
        assert.match(serialized, /user-1/);
        assert.match(serialized, /personnage/);
        assert.ok(
            embed.fields.every(
                field => field.value.length <= 1_024
            )
        );
    }
);
