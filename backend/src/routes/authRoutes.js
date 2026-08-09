const { Router } = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router();

router.post('/register', upload.single('photo'), authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
