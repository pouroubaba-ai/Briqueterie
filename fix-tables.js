const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'prisma', 'dev.db'));

db.exec('DROP TABLE IF EXISTS VersementGroupeLigne');
db.exec('DROP TABLE IF EXISTS VersementGroupe');

db.exec(`CREATE TABLE VersementGroupe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  montantTotal REAL NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  annule INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE VersementGroupeLigne (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  versementGroupeId INTEGER NOT NULL,
  productionJourId INTEGER NOT NULL,
  montant REAL NOT NULL,
  FOREIGN KEY (versementGroupeId) REFERENCES VersementGroupe(id) ON DELETE CASCADE,
  FOREIGN KEY (productionJourId) REFERENCES ProductionJour(id)
)`);

const cols1 = db.prepare('PRAGMA table_info(VersementGroupe)').all();
const cols2 = db.prepare('PRAGMA table_info(VersementGroupeLigne)').all();
console.log('VersementGroupe:', cols1.map(c => c.name).join(', '));
console.log('VersementGroupeLigne:', cols2.map(c => c.name).join(', '));
db.close();
console.log('Done.');
