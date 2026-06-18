import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.sqlite'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS vacancies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    employment_type TEXT,
    description TEXT,
    requirements TEXT,
    contact_info TEXT,
    application_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

export function getVacancies({ search, employment_type, location } = {}) {
  let sql = 'SELECT * FROM vacancies WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  if (employment_type) {
    sql += ' AND employment_type = ?';
    params.push(employment_type);
  }

  if (location) {
    sql += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }

  sql += ' ORDER BY created_at DESC';

  return db.prepare(sql).all(...params);
}

export function getVacancyById(id) {
  return db.prepare('SELECT * FROM vacancies WHERE id = ?').get(id);
}

export function createVacancy(data) {
  const stmt = db.prepare(`
    INSERT INTO vacancies (title, company, location, employment_type, description, requirements, contact_info, application_url)
    VALUES (@title, @company, @location, @employment_type, @description, @requirements, @contact_info, @application_url)
  `);
  return stmt.run(data);
}

export function updateVacancy(id, data) {
  const stmt = db.prepare(`
    UPDATE vacancies
    SET title = @title, company = @company, location = @location, employment_type = @employment_type,
        description = @description, requirements = @requirements, contact_info = @contact_info, application_url = @application_url
    WHERE id = @id
  `);
  return stmt.run({ ...data, id });
}

export function deleteVacancy(id) {
  return db.prepare('DELETE FROM vacancies WHERE id = ?').run(id);
}

export function getAdminByUsername(username) {
  return db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

export default db;
