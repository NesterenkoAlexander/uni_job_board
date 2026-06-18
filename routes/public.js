import { Router } from 'express';
import { getVacancies, getVacancyById } from '../db.js';

const router = Router();

const EMPLOYMENT_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'Полная занятость', label: 'Полная занятость' },
  { value: 'Частичная занятость', label: 'Частичная занятость' },
  { value: 'Стажировка', label: 'Стажировка' },
  { value: 'Удалённая работа', label: 'Удалённая работа' },
];

router.get('/', (req, res) => {
  const { search, employment_type, location } = req.query;
  const filters = {};
  if (search) filters.search = search;
  if (employment_type) filters.employment_type = employment_type;
  if (location) filters.location = location;

  const vacancies = getVacancies(filters);

  res.render('index', {
    vacancies,
    filters: { search: search || '', employment_type: employment_type || '', location: location || '' },
    employmentTypes: EMPLOYMENT_TYPES,
  });
});

router.get('/vacancy/:id', (req, res) => {
  const vacancy = getVacancyById(req.params.id);
  if (!vacancy) {
    return res.status(404).render('404');
  }
  res.render('vacancy', { vacancy });
});

export default router;
