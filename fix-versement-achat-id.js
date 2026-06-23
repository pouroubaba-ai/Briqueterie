const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "prisma", "dev.db"));

try {
  db.exec("ALTER TABLE VersementFournisseur ADD COLUMN achatId INTEGER REFERENCES AchatFournisseur(id) ON DELETE SET NULL");
  console.log("✅ Colonne achatId ajoutée à VersementFournisseur");
} catch (e) {
  if (e.message.includes("duplicate column")) {
    console.log("ℹ️  Colonne déjà existante, rien à faire.");
  } else {
    throw e;
  }
}
