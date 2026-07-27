const db =
    require("./database");

function safeCount(tableName) {
    try {
        const row = db.prepare(`
            SELECT COUNT(*) AS count
            FROM ${tableName}
        `).get();

        return row?.count || 0;
    } catch {
        return null;
    }
}

function runAuditV1() {
    const tables = [
        "Guilds",
        "Characters",
        "CharacterProfiles",
        "CharacterAliases",
        "ProxyMessages",
        "RelationshipTypes",
        "CharacterRelationships",
        "PendingRelationships",
        "StateTypes",
        "CharacterStates",
        "CharacterEncounters",
        "Phones",
        "PhoneConversations",
        "PhoneMessages",
        "CharacterOutfits",
        "CharacterInstallationMessages"
    ];

    console.log("");
    console.log("======================================");
    console.log("📊 AUDIT GREYCORE V1");
    console.log("======================================");

    for (const tableName of tables) {
        const count =
            safeCount(tableName);

        if (count === null) {
            console.log(
                `⚪ ${tableName} : table absente`
            );

            continue;
        }

        console.log(
            `✅ ${tableName} : ${count}`
        );
    }

    console.log("======================================");
    console.log(
        "ℹ️ Audit terminé — aucune donnée modifiée."
    );
    console.log("");
}

module.exports = runAuditV1;