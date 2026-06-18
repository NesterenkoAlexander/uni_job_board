import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getAdminByUsername } from '../db.js';

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

router.use(isAuthenticated);
router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

export { isAuthenticated };
export default router;
