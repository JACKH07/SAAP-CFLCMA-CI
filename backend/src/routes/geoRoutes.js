const { Router } = require('express');
const geoController = require('../controllers/geoController');

const router = Router();

router.get('/regions', geoController.listRegions);
router.get('/regions/:id/districts', geoController.listDistricts);
router.get('/paroisses', geoController.searchParoisses);
router.get('/communautes', geoController.searchCommunautes);
router.get('/roles', geoController.listRoles);

module.exports = router;
