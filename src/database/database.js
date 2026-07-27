const Database = require("better-sqlite3");
const path = require("path");

// Chemin vers la base de données
const dbPath = path.join(__dirname, "../../data/greycore.sqlite");

// Connexion (créée automatiquement si elle n'existe pas)
const db = new Database(dbPath);

module.exports = db;