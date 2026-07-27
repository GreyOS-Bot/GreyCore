const db =
    require("../../database/database");

const TABLE_NAME =
    "CharacterGuildInstallationsV2";

const columnsToAdd = [
    {
        name: "submitted_at",
        definition: "TEXT"
    },
    {
        name: "submitted_by",
        definition: "TEXT"
    },
    {
        name: "approved_at",
        definition: "TEXT"
    },
    {
        name: "approved_by",
        definition: "TEXT"
    },
    {
        name: "rejected_at",
        definition: "TEXT"
    },
    {
        name: "rejected_by",
        definition: "TEXT"
    },
    {
        name: "suspended_at",
        definition: "TEXT"
    },
    {
        name: "suspended_by",
        definition: "TEXT"
    },
    {
        name: "suspension_reason",
        definition: "TEXT"
    },
    {
        name: "validation_channel_id",
        definition: "TEXT"
    },
    {
        name: "validation_message_id",
        definition: "TEXT"
    },
    {
        name: "last_status_change_at",
        definition: "TEXT"
    }
];

function tableExists(tableName) {
    const result =
        db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            AND name = ?
        `).get(tableName);

    return Boolean(result);
}

function getExistingColumns() {
    return db
        .prepare(`
            PRAGMA table_info(
                ${TABLE_NAME}
            )
        `)
        .all()
        .map(column => column.name);
}

function addMissingColumns() {
    if (!tableExists(TABLE_NAME)) {
        throw new Error(
            `La table ${TABLE_NAME} est introuvable.`
        );
    }

    const existingColumns =
        getExistingColumns();

    const addedColumns = [];

    for (const column of columnsToAdd) {
        if (
            existingColumns.includes(
                column.name
            )
        ) {
            console.log(
                `ℹ️ Colonne déjà présente : ${column.name}`
            );

            continue;
        }

        db.prepare(`
            ALTER TABLE ${TABLE_NAME}
            ADD COLUMN ${column.name}
            ${column.definition}
        `).run();

        addedColumns.push(
            column.name
        );

        console.log(
            `✅ Colonne ajoutée : ${column.name}`
        );
    }

    return addedColumns;
}

function backfillExistingData() {
    /*
     * Les anciennes installations validées
     * utilisaient validated_at et validated_by.
     *
     * On copie ces valeurs dans les nouvelles
     * colonnes approved_at et approved_by.
     */
    db.prepare(`
        UPDATE ${TABLE_NAME}
        SET
            approved_at =
                COALESCE(
                    approved_at,
                    validated_at
                ),

            approved_by =
                COALESCE(
                    approved_by,
                    validated_by
                )

        WHERE status = 'approved'
    `).run();

    /*
     * On initialise la date du dernier changement
     * avec la meilleure date disponible.
     */
    db.prepare(`
        UPDATE ${TABLE_NAME}
        SET
            last_status_change_at =
                COALESCE(
                    last_status_change_at,
                    updated_at,
                    installed_at
                )
    `).run();
}

function displayFinalColumns() {
    const columns =
        getExistingColumns();

    console.log("");
    console.log(
        `📋 Colonnes de ${TABLE_NAME} :`
    );

    for (const column of columns) {
        console.log(
            `   - ${column}`
        );
    }
}

function runMigration() {
    console.log("");
    console.log(
        "🚀 Migration du cycle de validation..."
    );
    console.log("");

    const migration =
        db.transaction(() => {
            const addedColumns =
                addMissingColumns();

            backfillExistingData();

            return addedColumns;
        });

    const addedColumns =
        migration();

    console.log("");

    if (addedColumns.length === 0) {
        console.log(
            "ℹ️ Aucune nouvelle colonne à ajouter."
        );
    } else {
        console.log(
            `✅ ${addedColumns.length} colonne(s) ajoutée(s).`
        );
    }

    displayFinalColumns();

    console.log("");
    console.log(
        "✅ Migration Validation Lifecycle terminée."
    );
    console.log("");
}

try {
    runMigration();
} catch (error) {
    console.error("");
    console.error(
        "❌ Échec de la migration :"
    );
    console.error(error);
    console.error("");

    process.exitCode = 1;
} finally {
    db.close();
}