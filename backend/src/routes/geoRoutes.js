const { Router } = require('express');
const geoController = require('../controllers/geoController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/regions', geoController.listRegions);
router.get('/regions/:id/districts', geoController.listDistricts);
router.get('/districts', geoController.listAllDistricts);
router.get('/paroisses', geoController.searchParoisses);
router.get('/communautes', geoController.searchCommunautes);
router.get('/roles', geoController.listRoles);

// Création géo — réservée admin
router.post('/regions', authenticate, requireAdmin, geoController.createRegion);
router.post('/districts', authenticate, requireAdmin, geoController.createDistrict);
router.post('/paroisses', authenticate, requireAdmin, geoController.createParoisse);

module.exports = router;
