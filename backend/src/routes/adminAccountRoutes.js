const { Router } = require('express');
const adminAccountController = require('../controllers/adminAccountController');
const { authenticate, requireSuperAdmin } = require('../middlewares/auth');

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/', adminAccountController.list);
router.post('/', adminAccountController.create);
router.patch('/:id', adminAccountController.update);

module.exports = router;
