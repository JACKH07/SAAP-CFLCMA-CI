const { Router } = require('express');
const cotisationController = require('../controllers/cotisationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router();

// Webhooks publics (sécurisés via secret côté provider en prod)
router.post('/webhooks/orange', cotisationController.webhookOrange);
router.post('/webhooks/wave', cotisationController.webhookWave);
router.post('/webhooks/mtn', cotisationController.webhookMtn);

router.use(authenticate);

router.get('/me', cotisationController.listMine);
router.get('/', requireAdmin, cotisationController.list);
router.get('/search/:idPaiement', requireAdmin, cotisationController.findByPaymentId);
router.post('/', upload.single('justificatif'), cotisationController.create);

module.exports = router;
