import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { getAdminByUsername, getVacancies, getVacancyById, createVacancy, updateVacancy, deleteVacancy, addVacancyImage, getVacancyImages, deleteVacancyImage } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения (jpeg, jpg, png, gif, webp)'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = Router();

function isAuthenticated(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin/vacancies');
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = getAdminByUsername(username);

  if (!admin) {
    return res.render('admin/login', { error: 'Неверный логин или пароль' });
  }

  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) {
    return res.render('admin/login', { error: 'Неверный логин или пароль' });
  }

  req.session.admin = true;
  req.session.adminUsername = username;
  res.redirect('/admin/vacancies');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

router.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('admin/dashboard', { adminUsername: req.session.adminUsername });
});

router.get('/vacancies', isAuthenticated, (req, res) => {
  const vacancies = getVacancies();
  res.render('admin/vacancies', { vacancies, adminUsername: req.session.adminUsername });
});

router.get('/vacancies/add', isAuthenticated, (req, res) => {
  res.render('admin/vacancy_form', { vacancy: null, adminUsername: req.session.adminUsername, error: null });
});

router.post('/vacancies/add', isAuthenticated, upload.array('images', 10), (req, res) => {
  const { title, company, location, employment_type, description, requirements, contact_info, application_url } = req.body;

  if (!title?.trim() || !company?.trim()) {
    return res.status(400).render('admin/vacancy_form', {
      vacancy: { title, company, location, employment_type, description, requirements, contact_info, application_url },
      adminUsername: req.session.adminUsername,
      error: 'Название и компания обязательны для заполнения',
    });
  }

  const image = req.files && req.files.length > 0 ? '/uploads/' + req.files[0].filename : null;
  const result = createVacancy({ title: title.trim(), company: company.trim(), location, employment_type, description, requirements, contact_info, application_url, image });

  if (req.files && req.files.length > 0) {
    const vacancyId = result.lastInsertRowid;
    req.files.forEach((file, index) => {
      addVacancyImage(vacancyId, '/uploads/' + file.filename, index);
    });
  }

  res.redirect('/admin/vacancies');
});

router.get('/vacancies/edit/:id', isAuthenticated, (req, res) => {
  const vacancy = getVacancyById(req.params.id);
  if (!vacancy) return res.redirect('/admin/vacancies');
  res.render('admin/vacancy_form', { vacancy, adminUsername: req.session.adminUsername, error: null });
});

router.post('/vacancies/edit/:id', isAuthenticated, upload.array('images', 10), (req, res) => {
  const { title, company, location, employment_type, description, requirements, application_url } = req.body;

  if (!title?.trim() || !company?.trim()) {
    return res.status(400).render('admin/vacancy_form', {
      vacancy: { id: req.params.id, title, company, location, employment_type, description, requirements, application_url },
      adminUsername: req.session.adminUsername,
      error: 'Название и компания обязательны для заполнения',
    });
  }

  const existing = getVacancyById(req.params.id);
  const image = req.files && req.files.length > 0 ? '/uploads/' + req.files[0].filename : (existing ? existing.image : null);
  updateVacancy(req.params.id, { title: title.trim(), company: company.trim(), location, employment_type, description, requirements, application_url: req.body.application_url, image });

  if (req.files && req.files.length > 0) {
    const images = getVacancyImages(req.params.id);
    const nextOrder = images.length > 0 ? Math.max(...images.map(i => i.sort_order)) + 1 : 0;
    req.files.forEach((file, index) => {
      addVacancyImage(req.params.id, '/uploads/' + file.filename, nextOrder + index);
    });
  }

  if (req.body.delete_images) {
    const deleteIds = Array.isArray(req.body.delete_images) ? req.body.delete_images : [req.body.delete_images];
    deleteIds.forEach(imageId => {
      const img = db.prepare('SELECT image_path FROM vacancy_images WHERE id = ?').get(imageId);
      if (img) {
        const fullPath = path.join(__dirname, '..', 'public', img.image_path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        deleteVacancyImage(imageId);
      }
    });
  }

  res.redirect('/admin/vacancies');
});

router.post('/vacancies/delete/:id', isAuthenticated, (req, res) => {
  const images = getVacancyImages(req.params.id);
  images.forEach(img => {
    const fullPath = path.join(__dirname, '..', 'public', img.image_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  });
  deleteVacancy(req.params.id);
  res.redirect('/admin/vacancies');
});

router.get('/', isAuthenticated, (req, res) => {
  res.redirect('/admin/vacancies');
});

export { isAuthenticated };
export default router;
