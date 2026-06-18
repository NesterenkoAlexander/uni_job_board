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
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vacancy_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vacancy_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE
  );
`);

try { db.exec(`ALTER TABLE vacancies ADD COLUMN image TEXT`); } catch {}

// Migrate existing single images to the new table
const migrateStmt = db.prepare(`SELECT id, image FROM vacancies WHERE image IS NOT NULL AND image != ''`);
const insertImage = db.prepare(`INSERT INTO vacancy_images (vacancy_id, image_path, sort_order) VALUES (?, ?, ?)`);
const checkExisting = db.prepare(`SELECT COUNT(*) as cnt FROM vacancy_images WHERE vacancy_id = ?`);
const oldRows = migrateStmt.all();
for (const row of oldRows) {
  const existing = checkExisting.get(row.id);
  if (existing.cnt === 0) {
    insertImage.run(row.id, row.image, 0);
  }
}

export function getVacancies({ search, employment_type, location } = {}) {
  let sql = 'SELECT v.*, (SELECT image_path FROM vacancy_images WHERE vacancy_id = v.id ORDER BY sort_order ASC LIMIT 1) as primary_image FROM vacancies v WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (v.title LIKE ? OR v.company LIKE ? OR v.description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  if (employment_type) {
    sql += ' AND v.employment_type = ?';
    params.push(employment_type);
  }

  if (location) {
    sql += ' AND v.location LIKE ?';
    params.push(`%${location}%`);
  }

  sql += ' ORDER BY v.created_at DESC';

  return db.prepare(sql).all(...params);
}

export function getVacancyById(id) {
  const vacancy = db.prepare('SELECT * FROM vacancies WHERE id = ?').get(id);
  if (vacancy) {
    vacancy.images = db.prepare('SELECT * FROM vacancy_images WHERE vacancy_id = ? ORDER BY sort_order ASC').all(id);
  }
  return vacancy;
}

export function createVacancy(data) {
  const stmt = db.prepare(`
    INSERT INTO vacancies (title, company, location, employment_type, description, requirements, contact_info, application_url, image)
    VALUES (@title, @company, @location, @employment_type, @description, @requirements, @contact_info, @application_url, @image)
  `);
  return stmt.run(data);
}

export function addVacancyImage(vacancyId, imagePath, sortOrder = 0) {
  return db.prepare('INSERT INTO vacancy_images (vacancy_id, image_path, sort_order) VALUES (?, ?, ?)').run(vacancyId, imagePath, sortOrder);
}

export function getVacancyImages(vacancyId) {
  return db.prepare('SELECT * FROM vacancy_images WHERE vacancy_id = ? ORDER BY sort_order ASC').all(vacancyId);
}

export function deleteVacancyImage(imageId) {
  return db.prepare('DELETE FROM vacancy_images WHERE id = ?').run(imageId);
}

export function updateVacancy(id, data) {
  const stmt = db.prepare(`
    UPDATE vacancies
    SET title = @title, company = @company, location = @location, employment_type = @employment_type,
        description = @description, requirements = @requirements, contact_info = @contact_info, application_url = @application_url, image = @image
    WHERE id = @id
  `);
  return stmt.run({ ...data, id });
}

export function deleteVacancy(id) {
  db.prepare('DELETE FROM vacancy_images WHERE vacancy_id = ?').run(id);
  db.prepare('DELETE FROM vacancies WHERE id = ?').run(id);
}

export function getAdminByUsername(username) {
  return db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

export default db;
