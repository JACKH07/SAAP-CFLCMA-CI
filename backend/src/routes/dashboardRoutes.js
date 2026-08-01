const { Router } = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', dashboardController.stats);
router.get('/stats/districts', dashboardController.statsDistricts);
router.get('/export/excel', dashboardController.exportExcel);
router.get('/export/pdf', dashboardController.exportPdf);
router.get('/audit', dashboardController.auditLogs);

module.exports = router;
