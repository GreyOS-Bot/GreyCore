const test = require("node:test");
const assert = require("node:assert/strict");
const {
    createIsolatedDatabase,
    withMutedConsole
} = require("./helpers/isolatedDatabase");

function loadService() {
    for (const modulePath of [
        "../src/v2/repositories/DiscordReferenceHealthRepository",
        "../src/v2/core/services/DiscordReferenceHealthService"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }
    return require(
        "../src/v2/core/services/DiscordReferenceHealthService"
    );
}

function reference(overrides = {}) {
    return {
        domain: "scene",
        ownerKey: "scene_channel:123",
        resourceKind: "thread",
        discordId: "123",
        guildId: "guild",
        ...overrides
    };
}

test(
    "le bootstrap ajoute uniquement le registre à une installation existante",
    async context => {
        const isolated = createIsolatedDatabase({
            initializeSchema: true
        });
        context.after(() => isolated.cleanup());
        isolated.database.prepare(`
            INSERT INTO Guilds (id, name, created_at)
            VALUES ('existing', 'Installation existante', '2026-01-01')
        `).run();
        isolated.database.prepare(
            "DROP TABLE DiscordReferenceHealth"
        ).run();
        const before = new Set(
            isolated.database.prepare(`
                SELECT name FROM sqlite_master
                WHERE type = 'table'
            `).all().map(row => row.name)
        );

        await withMutedConsole(() =>
            require("../src/database/schema")
                .initializeDatabase()
        );

        const after = new Set(
            isolated.database.prepare(`
                SELECT name FROM sqlite_master
                WHERE type = 'table'
            `).all().map(row => row.name)
        );
        assert.deepEqual(
            [...after].filter(name => !before.has(name)),
            ["DiscordReferenceHealth"]
        );
        assert.deepEqual(
            isolated.database.prepare(
                "SELECT id, name FROM Guilds WHERE id = 'existing'"
            ).get(),
            {
                id: "existing",
                name: "Installation existante"
            }
        );
    }
);

test(
    "les échecs mettent à jour atomiquement l'incident et son échéance",
    context => {
        const isolated = createIsolatedDatabase({ initializeSchema: true });
        context.after(() => isolated.cleanup());
        const service = loadService();
        const target = reference();
        const firstAt = new Date("2026-08-28T10:00:00.000Z");
        const secondAt = new Date("2026-08-28T10:01:00.000Z");

        const first = service.recordFailure(
            target,
            {
                status: "unknown_channel",
                discordCode: 10003,
                message: "Unknown Channel"
            },
            firstAt
        );
        assert.equal(first.failure_count, 1);
        assert.equal(first.first_failed_at, firstAt.toISOString());
        assert.equal(first.last_failed_at, firstAt.toISOString());
        assert.equal(
            first.next_check_at,
            "2026-08-28T16:00:00.000Z"
        );
        assert.equal(
            service.shouldCheck(target, "2026-08-28T15:59:59.999Z"),
            false
        );
        assert.equal(
            service.shouldCheck(target, "2026-08-28T16:00:00.000Z"),
            true
        );

        const second = service.recordFailure(
            target,
            {
                status: "missing_access",
                discordCode: 50001,
                message: "Missing Access"
            },
            secondAt
        );
        assert.equal(second.failure_count, 2);
        assert.equal(second.first_failed_at, firstAt.toISOString());
        assert.equal(second.last_failed_at, secondAt.toISOString());
        assert.equal(second.last_checked_at, secondAt.toISOString());
        assert.equal(second.status, "missing_access");
        assert.equal(second.discord_code, 50001);
        assert.equal(
            second.next_check_at,
            "2026-08-28T10:31:00.000Z"
        );
    }
);

test(
    "chaque classification conserve son statut et son délai propre",
    context => {
        const isolated = createIsolatedDatabase({ initializeSchema: true });
        context.after(() => isolated.cleanup());
        const service = loadService();
        const checkedAt = new Date("2026-08-28T12:00:00.000Z");
        const cases = [
            ["unknown_channel", 10003, 6 * 60 * 60 * 1000],
            ["missing_access", 50001, 30 * 60 * 1000],
            ["missing_permissions", 50013, 30 * 60 * 1000],
            ["discord_error", null, 5 * 60 * 1000]
        ];

        for (const [status, code, delay] of cases) {
            const current = service.recordFailure(
                reference({
                    ownerKey: `owner:${status}`,
                    discordId: status
                }),
                { status, discordCode: code, message: status },
                checkedAt
            );
            assert.equal(current.status, status);
            assert.equal(current.discord_code, code);
            assert.equal(
                new Date(current.next_check_at).getTime()
                    - checkedAt.getTime(),
                delay
            );
        }

        const generic = service.recordFailure(
            reference({ ownerKey: "owner:generic", discordId: "generic" }),
            new Error("network failure"),
            checkedAt
        );
        assert.equal(generic.status, "discord_error");
    }
);

test(
    "une résolution ferme l'incident et un nouvel échec en ouvre un nouveau",
    context => {
        const isolated = createIsolatedDatabase({ initializeSchema: true });
        context.after(() => isolated.cleanup());
        const service = loadService();
        const target = reference();
        service.recordFailure(
            target,
            { status: "unknown_channel" },
            "2026-08-28T10:00:00.000Z"
        );
        service.recordFailure(
            target,
            { status: "unknown_channel" },
            "2026-08-28T10:05:00.000Z"
        );

        const resolved = service.markResolved(
            target,
            "2026-08-28T11:00:00.000Z"
        );
        assert.equal(resolved.status, "resolved");
        assert.equal(resolved.failure_count, 2);
        assert.equal(resolved.next_check_at, null);
        assert.equal(resolved.resolved_at, "2026-08-28T11:00:00.000Z");
        assert.equal(
            service.shouldCheck(target, "2026-08-28T11:00:01.000Z"),
            true
        );

        const reopened = service.recordFailure(
            target,
            { status: "missing_permissions", discordCode: 50013 },
            "2026-08-28T12:00:00.000Z"
        );
        assert.equal(reopened.status, "missing_permissions");
        assert.equal(reopened.failure_count, 1);
        assert.equal(reopened.first_failed_at, "2026-08-28T12:00:00.000Z");
        assert.equal(reopened.resolved_at, null);
    }
);

test(
    "domaines, propriétaires et références restent indépendants sans doublon",
    context => {
        const isolated = createIsolatedDatabase({ initializeSchema: true });
        context.after(() => isolated.cleanup());
        const service = loadService();
        const targets = [
            reference(),
            reference({ domain: "phone" }),
            reference({ ownerKey: "scene_channel:456" })
        ];

        for (const target of targets) {
            service.recordFailure(
                target,
                { status: "discord_error" },
                "2026-08-28T10:00:00.000Z"
            );
        }
        for (let index = 0; index < 4; index += 1) {
            service.recordFailure(
                targets[0],
                { status: "discord_error" },
                new Date(Date.UTC(2026, 7, 28, 10, index + 1))
            );
        }

        assert.equal(
            isolated.database.prepare(
                "SELECT COUNT(*) count FROM DiscordReferenceHealth"
            ).get().count,
            3
        );
        assert.equal(service.get(targets[0]).failure_count, 5);
        assert.equal(service.get(targets[1]).failure_count, 1);
        assert.equal(service.get(targets[2]).failure_count, 1);
        assert.equal(
            service.shouldCheck(
                reference({ discordId: "never-seen" }),
                "2026-08-28T10:00:00.000Z"
            ),
            true
        );
    }
);

test(
    "le diagnostic est nettoyé et tronqué sans stack ni secrets",
    context => {
        const isolated = createIsolatedDatabase({ initializeSchema: true });
        context.after(() => isolated.cleanup());
        const service = loadService();
        const secret = "super-secret-token";
        const diagnostic = [
            `Authorization: Bearer ${secret}`,
            `https://discord.com/api/v10/webhooks/123/${secret}`,
            `token=${secret}`,
            "x".repeat(700)
        ].join("\n");

        const current = service.recordFailure(
            reference(),
            { status: "discord_error", message: diagnostic },
            "2026-08-28T10:00:00.000Z"
        );

        assert.ok(current.diagnostic.length <= 500);
        assert.doesNotMatch(current.diagnostic, /super-secret-token/);
        assert.doesNotMatch(current.diagnostic, /at .*\.js:\d+/);
        assert.match(current.diagnostic, /\[REDACTED\]/);
    }
);
