const prisma = require('../config/prisma');
const lieuAutocompleteService = require('../services/lieuAutocompleteService');
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

exports.searchParoisses = asyncHandler(async (req, res) => {
  const data = await lieuAutocompleteService.searchParoisses(req.query.search || '', {
    districtId: req.query.districtId,
    limit: req.query.limit ? Number(req.query.limit) : 15,
  });
  res.json({ success: true, data });
});

exports.searchCommunautes = asyncHandler(async (req, res) => {
  const data = await lieuAutocompleteService.searchCommunautes(req.query.search || '', {
    paroisseId: req.query.paroisseId,
    limit: req.query.limit ? Number(req.query.limit) : 15,
  });
  res.json({ success: true, data });
});

exports.listRoles = asyncHandler(async (req, res) => {
  // À l'inscription : exclure uniquement le Coordinateur général (réservé)
  const excludeAdmin = req.query.fonctions === 'true';
  const roles = await prisma.role.findMany({
    where: excludeAdmin
      ? { NOT: { nom: 'Coordinateur général (C.G.)' } }
      : undefined,
    orderBy: { niveauHierarchique: 'asc' },
  });
  res.json({ success: true, data: roles });
});

exports.listActivites = asyncHandler(async (_req, res) => {
  const activites = await prisma.activite.findMany({
    where: { active: true },
    orderBy: { nom: 'asc' },
  });
  res.json({ success: true, data: activites });
});
