require("dotenv").config();

require("./src/database/schema");

const migration =
    require(
        "./src/v2/migrations/MigrationV1ToV2"
    );

try {
    console.log("");
    console.log(
        "======================================"
    );
    console.log(
        "🚀 MIGRATION GREYCORE V1 → V2"
    );
    console.log(
        "======================================"
    );

    const result =
        migration.run();

    console.log("");
    console.log(
        `✅ Personnages V1 traités : ${result.stats.processed}`
    );

    console.log(
        `✅ Profils transférés : ${result.stats.profilesFound}`
    );

    console.log(
        `⚪ Profils absents : ${result.stats.profilesMissing}`
    );

    console.log("");
    console.log("📊 Avant migration");
    console.table(
        result.before
    );

    console.log("📊 Après migration");
    console.table(
        result.after
    );

    if (
        result.stats.errors.length > 0
    ) {
        console.log("");
        console.log(
            "❌ Erreurs rencontrées :"
        );

        console.table(
            result.stats.errors
        );
    }

    console.log("");
    console.log(
        "ℹ️ Les tables V1 n’ont pas été supprimées."
    );

    console.log(
        "======================================"
    );
} catch (error) {
    console.error("");
    console.error(
        "❌ La migration a été annulée."
    );

    console.error(
        error
    );

    process.exitCode = 1;
}