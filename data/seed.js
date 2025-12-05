import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import { nanoid } from 'nanoid';

const dbPath = path.resolve('db', 'rsvp.db');
fs.mkdirSync('db', { recursive: true });
const db = new sqlite3.Database(dbPath);

const sql = `
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  family_label TEXT,
  email TEXT,
  party_size INTEGER,
  rsvp_status TEXT,
  rsvp_count INTEGER,
  rsvp_notes TEXT,
  responded_at TEXT
);
`;

await new Promise((res, rej) => db.run(sql, (e) => e ? rej(e) : res()));

const csvRaw = fs.readFileSync(path.resolve('data', 'guests.csv'), 'utf-8');
const records = parse(csvRaw, { columns: true, skip_empty_lines: true });

for (const rec of records) {
  const token = nanoid(12);
  await new Promise((res, rej) => db.run(
    `INSERT INTO guests (token, first_name, last_name, family_label, email, party_size)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [token, rec.first_name, rec.last_name, rec.family_label, rec.email, Number(rec.party_size || 1)],
    (e) => e ? rej(e) : res()
  ));
}

console.log('Seeded guests and tokens.');
process.exit(0);
