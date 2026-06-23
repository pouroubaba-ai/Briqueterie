const Database = require("better-sqlite3");
const db = new Database("prisma/dev.db");

db.exec(`
DROP TABLE IF EXISTS LigneAchat;
DROP TABLE IF EXISTS VersementFournisseur;
DROP TABLE IF EXISTS AchatFournisseur;
DROP TABLE IF EXISTS Fournisseur;

CREATE TABLE Fournisseur (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nom       TEXT NOT NULL,
  telephone TEXT NOT NULL DEFAULT '',
  adresse   TEXT NOT NULL DEFAULT '',
  notes     TEXT NOT NULL DEFAULT '',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE AchatFournisseur (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fournisseurId INTEGER NOT NULL REFERENCES Fournisseur(id) ON DELETE CASCADE,
  date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes         TEXT NOT NULL DEFAULT '',
  montantTotal  REAL NOT NULL,
  montantVerse  REAL NOT NULL DEFAULT 0,
  statut        TEXT NOT NULL DEFAULT 'impaye',
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE LigneAchat (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  achatId  INTEGER NOT NULL REFERENCES AchatFournisseur(id) ON DELETE CASCADE,
  briqueId INTEGER NOT NULL REFERENCES Brique(id),
  quantite INTEGER NOT NULL,
  prixUnit REAL NOT NULL
);

CREATE TABLE VersementFournisseur (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fournisseurId INTEGER NOT NULL REFERENCES Fournisseur(id) ON DELETE CASCADE,
  date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  montant       REAL NOT NULL,
  notes         TEXT NOT NULL DEFAULT '',
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Verify
["Fournisseur","AchatFournisseur","LigneAchat","VersementFournisseur"].forEach(t => {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  console.log(t + ":", cols.map(c => c.name).join(", "));
});

db.close();
console.log("Done.");
