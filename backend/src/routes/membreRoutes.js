const { Router } = require('express');
const membreController = require('../controllers/membreController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router();

router.use(authenticate);

router.get('/me', membreController.getMe);
router.get('/', requireAdmin, membreController.list);
router.post('/', requireAdmin, membreController.create);
router.get('/:id', membreController.getById);
router.patch('/:id/photo', upload.single('photo'), membreController.updatePhoto);
router.patch('/:id', membreController.update);
router.delete('/:id', requireAdmin, membreController.remove);

module.exports = router;
