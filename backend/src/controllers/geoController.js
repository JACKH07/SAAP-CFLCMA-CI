const prisma = require('../config/prisma');
const lieuAutocompleteService = require('../services/lieuAutocompleteService');
const geoAdminService = require('../services/geoAdminService');
const { asyncHandler } = require('../utils/errors');

exports.listRegions = asyncHandler(async (_req, res) => {
  const regions = await prisma.region.findMany({ orderBy: { nom: 'asc' } });
  res.json({ success: true, data: regions });
});

exports.listDistricts = asyncHandler(async (req, res) => {
  const districts = await prisma.district.findMany({
    where: { regionId: Number(req.params.id) },
    orderBy: { nom: 'asc' },
  });
  res.json({ success: true, data: districts });
});

exports.listAllDistricts = asyncHandler(async (_req, res) => {
  const data = await geoAdminService.listDistrictsAll();
  res.json({ success: true, data });
});

exports.searchParoisses = asyncHandler(async (req, res) => {
  if (req.query.all === 'true' || req.query.all === '1') {
    const data = await geoAdminService.listParoissesAll();
    return res.json({ success: true, data });
  }
  const data = await lieuAutocompleteService.searchParoisses(req.query.search || '', {
    districtId: req.query.districtId,
    limit: req.query.limit ? Number(req.query.limit) : 15,
  });
  res.json({ success: true, data });
});

exports.searchCommunautes = asyncHandler(async (req, res) => {
  if (req.query.all === 'true' || req.query.all === '1') {
    const data = await geoAdminService.listCommunautesAll();
    return res.json({ success: true, data });
  }
  const data = await lieuAutocompleteService.searchCommunautes(req.query.search || '', {
    paroisseId: req.query.paroisseId,
    limit: req.query.limit ? Number(req.query.limit) : 15,
  });
  res.json({ success: true, data });
});

exports.listRoles = asyncHandler(async (req, res) => {
  const excludeAdmin = req.query.fonctions === 'true';
  const roles = await prisma.role.findMany({
    where: excludeAdmin
      ? { NOT: { nom: 'Coordinateur général (C.G.)' } }
      : undefined,
    orderBy: { niveauHierarchique: 'asc' },
  });
  res.json({ success: true, data: roles });
});

exports.createRegion = asyncHandler(async (req, res) => {
  const data = await geoAdminService.createRegion(req.body);
  res.status(201).json({ success: true, data });
});

exports.createDistrict = asyncHandler(async (req, res) => {
  const data = await geoAdminService.createDistrict(req.body);
  res.status(201).json({ success: true, data });
});

exports.createParoisse = asyncHandler(async (req, res) => {
  const data = await geoAdminService.createParoisse(req.body);
  res.status(201).json({ success: true, data });
});

exports.deleteRegion = asyncHandler(async (req, res) => {
  const data = await geoAdminService.deleteRegion(req.params.id);
  res.json({ success: true, data, message: 'Région supprimée' });
});

exports.deleteDistrict = asyncHandler(async (req, res) => {
  const data = await geoAdminService.deleteDistrict(req.params.id);
  res.json({ success: true, data, message: 'District supprimé' });
});

exports.deleteParoisse = asyncHandler(async (req, res) => {
  const data = await geoAdminService.deleteParoisse(req.params.id);
  res.json({ success: true, data, message: 'Paroisse supprimée' });
});

exports.deleteCommunaute = asyncHandler(async (req, res) => {
  const data = await geoAdminService.deleteCommunaute(req.params.id);
  res.json({ success: true, data, message: 'Communauté supprimée' });
});
