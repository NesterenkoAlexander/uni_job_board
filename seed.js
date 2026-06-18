import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getAdminByUsername } from './db.js';
import db from './db.js';

const username = process.env.ADMIN_USERNAME;
const passwordHash = process.env.ADMIN_PASSWORD_HASH;

if (!username || !passwordHash) {
  console.error('ADMIN_USERNAME и ADMIN_PASSWORD_HASH должны быть заданы в .env');
  process.exit(1);
}

const existing = getAdminByUsername(username);
if (existing) {
  console.log(`Админ "${username}" уже существует, пропускаем.`);
} else {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  console.log(`Админ "${username}" создан.`);
}
