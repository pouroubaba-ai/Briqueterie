const Database = require("better-sqlite3");
const db = new Database("prisma/dev.db");
try {
  db.exec("ALTER TABLE Brique ADD COLUMN estCiment INTEGER NOT NULL DEFAULT 0");
  console.log("✓ Colonne estCiment ajoutée");
} catch (e) {
  if (e.message.includes("duplicate column")) console.log("✓ Colonne déjà présente");
  else throw e;
}
db.close();
