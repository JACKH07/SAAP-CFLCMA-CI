const { Router } = require('express');
const membreController = require('../controllers/membreController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/me', membreController.getMe);
router.get('/', requireAdmin, membreController.list);
router.post('/', requireAdmin, membreController.create);
router.get('/:id', membreController.getById);
router.patch('/:id', requireAdmin, membreController.update);

module.exports = router;
