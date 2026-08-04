const { Router } = require('express');
const activiteController = require('../controllers/activiteController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = Router();

/** Public : activités actives (inscription / paiements) */
router.get('/', (req, res, next) => {
  if (req.query.all === 'true') {
    return authenticate(req, res, (err) => {
      if (err) return next(err);
      return requireAdmin(req, res, (err2) => {
        if (err2) return next(err2);
        return activiteController.list(req, res, next);
      });
    });
  }
  return activiteController.list(req, res, next);
});

router.get('/:id', authenticate, requireAdmin, activiteController.getById);
router.post('/', authenticate, requireAdmin, activiteController.create);
router.patch('/:id', authenticate, requireAdmin, activiteController.update);

module.exports = router;
