const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("path");

// Chemin vers la base de données
const configuredDatabasePath =
    String(
        process.env.GREYCORE_DATABASE_PATH
        || ""
    ).trim();

const databasePath = configuredDatabasePath
    ? path.resolve(configuredDatabasePath)
    : path.join(
        __dirname,
        "../../data/greycore.sqlite"
    );

// Connexion (créée automatiquement si elle n'existe pas)
fs.mkdirSync(
    path.dirname(databasePath),
    {
        recursive: true
    }
);

const db = new Database(databasePath);

db.databasePath = databasePath;

module.exports = db;
