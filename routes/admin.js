import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getAdminByUsername, getVacancies, getVacancyById, createVacancy, updateVacancy, deleteVacancy } from '../db.js';

const router = Router();

function isAuthenticated(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin/dashboard');
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
  res.redirect('/admin/dashboard');
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
  res.render('admin/vacancy_form', { vacancy: null, adminUsername: req.session.adminUsername });
});

router.post('/vacancies/add', isAuthenticated, (req, res) => {
  const { title, company, location, employment_type, description, requirements, contact_info, application_url } = req.body;
  createVacancy({ title, company, location, employment_type, description, requirements, contact_info, application_url });
  res.redirect('/admin/vacancies');
});

router.get('/vacancies/edit/:id', isAuthenticated, (req, res) => {
  const vacancy = getVacancyById(req.params.id);
  if (!vacancy) return res.redirect('/admin/vacancies');
  res.render('admin/vacancy_form', { vacancy, adminUsername: req.session.adminUsername });
});

router.post('/vacancies/edit/:id', isAuthenticated, (req, res) => {
  const { title, company, location, employment_type, description, requirements, contact_info, application_url } = req.body;
  updateVacancy(req.params.id, { title, company, location, employment_type, description, requirements, contact_info, application_url });
  res.redirect('/admin/vacancies');
});

router.post('/vacancies/delete/:id', isAuthenticated, (req, res) => {
  deleteVacancy(req.params.id);
  res.redirect('/admin/vacancies');
});

router.get('/', isAuthenticated, (req, res) => {
  res.redirect('/admin/dashboard');
});

export { isAuthenticated };
export default router;
