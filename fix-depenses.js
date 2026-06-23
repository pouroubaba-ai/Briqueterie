const Database = require("better-sqlite3");
const db = new Database("prisma/dev.db");

db.exec(`
DROP TABLE IF EXISTS Depense;
CREATE TABLE Depense (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  montant     REAL NOT NULL,
  categorie   TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const cols = db.prepare("PRAGMA table_info(Depense)").all();
console.log("Depense:", cols.map(c => c.name).join(", "));
db.close();
console.log("Done.");
