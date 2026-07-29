const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    ApprovedCharacterAutomationService,
    formatWelcomeMessage
} = require(
    "../src/v2/services/automation/ApprovedCharacterAutomationService"
);

test(
    "l’automatisation accueille le membre une seule fois après le seuil de validations",
    async () => {
        const roles = new Set([
            "newcomer"
        ]);
        const sent = [];
        let run = null;

        const service =
            new ApprovedCharacterAutomationService({
                manager: {
                    getConfiguration: () => ({
                        is_enabled: 1,
                        approved_character_count: 2,
                        required_role_id: "newcomer",
                        remove_role_id: "newcomer",
                        add_role_id: "member",
                        welcome_channel_id: "welcome",
                        welcome_message:
                            "Bienvenue {user} sur {server} après {count} personnages !"
                    }),
                    countApprovedCharacters:
                        () => 2,
                    getRun:
                        () => run,
                    claimRun:
                        () => {
                            run = {
                                status: "pending"
                            };

                            return true;
                        },
                    completeRun:
                        () => {
                            run = {
                                status: "completed"
                            };
                        },
                    releaseRun:
                        () => {
                            run = null;
                        }
                },
                errorLogService: {
                    report: async () => false
                },
                log: silentLog()
            });

        const member = createMember(roles);
        const guild = createGuild({
            member,
            send: async payload =>
                sent.push(payload)
        });

        const first =
            await service.runAfterApproval({
                guild,
                playerId: "player",
                characterName: "Reya"
            });

        assert.equal(first.triggered, true);
        assert.equal(roles.has("newcomer"), false);
        assert.equal(roles.has("member"), true);
        assert.equal(sent.length, 1);
        assert.match(sent[0].content, /<@player>/);
        assert.match(sent[0].content, /GreyOS/);
        assert.deepEqual(
            sent[0].allowedMentions.users,
            ["player"]
        );

        const second =
            await service.runAfterApproval({
                guild,
                playerId: "player"
            });

        assert.equal(
            second.reason,
            "already_completed"
        );
        assert.equal(sent.length, 1);
    }
);

test(
    "l’automatisation ne démarre pas avant le nombre de validations configuré",
    async () => {
        let claimed = false;

        const service =
            new ApprovedCharacterAutomationService({
                manager: {
                    getConfiguration: () => ({
                        is_enabled: 1,
                        approved_character_count: 2
                    }),
                    countApprovedCharacters:
                        () => 1,
                    getRun: () => null,
                    claimRun: () => {
                        claimed = true;
                        return true;
                    }
                },
                errorLogService: {
                    report: async () => false
                },
                log: silentLog()
            });

        const result =
            await service.runAfterApproval({
                guild: {
                    id: "guild"
                },
                playerId: "player"
            });

        assert.equal(
            result.reason,
            "threshold_not_reached"
        );
        assert.equal(claimed, false);
    }
);

test(
    "un échec d’envoi restaure les rôles et laisse l’automatisation rejouable",
    async () => {
        const roles = new Set([
            "newcomer"
        ]);
        let released = false;
        let reported = false;

        const service =
            new ApprovedCharacterAutomationService({
                manager: {
                    getConfiguration: () => ({
                        is_enabled: 1,
                        approved_character_count: 2,
                        required_role_id: "newcomer",
                        remove_role_id: "newcomer",
                        add_role_id: "member",
                        welcome_channel_id: "welcome",
                        welcome_message: "Bienvenue {user}"
                    }),
                    countApprovedCharacters:
                        () => 2,
                    getRun: () => null,
                    claimRun: () => true,
                    completeRun: () => {
                        throw new Error(
                            "Ne doit pas être appelé"
                        );
                    },
                    releaseRun: () => {
                        released = true;
                    }
                },
                errorLogService: {
                    report: async () => {
                        reported = true;
                    }
                },
                log: silentLog()
            });

        const result =
            await service.runAfterApproval({
                guild: createGuild({
                    member: createMember(roles),
                    send: async () => {
                        throw new Error(
                            "Salon inaccessible"
                        );
                    }
                }),
                playerId: "player"
            });

        assert.equal(result.reason, "failed");
        assert.equal(roles.has("newcomer"), true);
        assert.equal(roles.has("member"), false);
        assert.equal(released, true);
        assert.equal(reported, true);
    }
);

test(
    "le message de bienvenue remplace les variables prévues",
    () => {
        assert.equal(
            formatWelcomeMessage({
                template:
                    "{user} / {username} / {server} / {count} / {character}",
                playerId: "42",
                playerName: "Fiona",
                guildName: "GreyOS",
                approvedCount: 2,
                characterName: "Reya"
            }),
            "<@42> / Fiona / GreyOS / 2 / Reya"
        );
    }
);

function createGuild({
    member,
    send
}) {
    return {
        id: "guild",
        name: "GreyOS",
        members: {
            cache: new Map([
                ["player", member]
            ])
        },
        channels: {
            cache: new Map([
                [
                    "welcome",
                    {
                        send
                    }
                ]
            ])
        }
    };
}

function createMember(roles) {
    return {
        displayName: "Fiona",
        roles: {
            cache: {
                has: roleId => roles.has(roleId)
            },
            remove: async roleId => {
                roles.delete(roleId);
            },
            add: async roleId => {
                roles.add(roleId);
            }
        }
    };
}

function silentLog() {
    return {
        error: () => null,
        warn: () => null
    };
}
