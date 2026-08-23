const { Router } = require('express');
const cotisationController = require('../controllers/cotisationController');

const router = Router();

/** Alias e-commerce Orange Money WebPay (notif officielle). */
router.post('/orange-money/notif', cotisationController.webhookOrange);

module.exports = router;
