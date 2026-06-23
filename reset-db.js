const Database = require("better-sqlite3");
const db = new Database("prisma/dev.db");
db.pragma("foreign_keys = OFF");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
tables.forEach(t => {
  db.prepare(`DELETE FROM "${t.name}"`).run();
  console.log("Vidé:", t.name);
});
db.prepare("DELETE FROM sqlite_sequence").run();
db.pragma("foreign_keys = ON");
db.close();
console.log("Base de données réinitialisée !");
