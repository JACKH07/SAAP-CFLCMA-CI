const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const { normalizeText } = require('../utils/text');
const dashboardService = require('./dashboardService');

function slugCode(nom, max = 20) {
  const base = normalizeText(String(nom || ''))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, max);
  return base || 'REG';
}

class GeoAdminService {
  async createRegion({ nom, code }) {
    const name = String(nom || '').trim();
    if (!name) throw new AppError('Nom de la région requis', 400);

    let regionCode = String(code || '').trim().toUpperCase() || slugCode(name);
    const existingCode = await prisma.region.findUnique({ where: { code: regionCode } });
    if (existingCode) {
      regionCode = `${regionCode.slice(0, 16)}-${Date.now().toString(36).slice(-3)}`.toUpperCase();
    }

    const dup = await prisma.region.findFirst({
      where: { nom: name },
    });
    if (dup) throw new AppError('Cette région existe déjà', 409);

    const region = await prisma.region.create({
      data: { nom: name, code: regionCode },
    });
    dashboardService.invalidateStatsCache();
    return region;
  }

  async createDistrict({ nom, regionId }) {
    const name = String(nom || '').trim();
    const rid = Number(regionId);
    if (!name) throw new AppError('Nom du district requis', 400);
    if (!rid) throw new AppError('Région requise', 400);

    const region = await prisma.region.findUnique({ where: { id: rid } });
    if (!region) throw new AppError('Région introuvable', 404);

    const dup = await prisma.district.findFirst({
      where: { regionId: rid, nom: name },
    });
    if (dup) throw new AppError('Ce district existe déjà dans cette région', 409);

    const district = await prisma.district.create({
      data: { nom: name, regionId: rid },
    });
    dashboardService.invalidateStatsCache();
    return district;
  }

  async createParoisse({ nom, districtId }) {
    const name = String(nom || '').trim();
    const did = Number(districtId);
    if (!name) throw new AppError('Nom de la paroisse requis', 400);
    if (!did) throw new AppError('District requis', 400);

    const district = await prisma.district.findUnique({ where: { id: did } });
    if (!district) throw new AppError('District introuvable', 404);

    const nomNormalise = normalizeText(name);
    const dup = await prisma.paroisse.findFirst({
      where: { districtId: did, nomNormalise },
    });
    if (dup) throw new AppError('Cette paroisse existe déjà dans ce district', 409);

    const paroisse = await prisma.paroisse.create({
      data: {
        nom: name,
        nomNormalise,
        districtId: did,
      },
      include: {
        district: { select: { id: true, nom: true, regionId: true } },
      },
    });
    dashboardService.invalidateStatsCache();
    return paroisse;
  }

  async listDistrictsAll() {
    return prisma.district.findMany({
      orderBy: [{ regionId: 'asc' }, { nom: 'asc' }],
      include: { region: { select: { id: true, nom: true, code: true } } },
    });
  }

  async listParoissesAll() {
    return prisma.paroisse.findMany({
      orderBy: [{ districtId: 'asc' }, { nom: 'asc' }],
      include: {
        district: {
          select: {
            id: true,
            nom: true,
            regionId: true,
            region: { select: { id: true, nom: true, code: true } },
          },
        },
      },
    });
  }

  async listCommunautesAll() {
    return prisma.communaute.findMany({
      orderBy: [{ paroisseId: 'asc' }, { nom: 'asc' }],
      include: {
        paroisse: {
          select: {
            id: true,
            nom: true,
            districtId: true,
            district: {
              select: {
                id: true,
                nom: true,
                regionId: true,
                region: { select: { id: true, nom: true, code: true } },
              },
            },
          },
        },
      },
    });
  }

  async _unlinkCommunaute(tx, cid) {
    await tx.membre.updateMany({ where: { communauteId: cid }, data: { communauteId: null } });
    await tx.cotisation.updateMany({ where: { communauteId: cid }, data: { communauteId: null } });
  }

  async _deleteCommunauteTx(tx, cid) {
    await this._unlinkCommunaute(tx, cid);
    await tx.communaute.delete({ where: { id: cid } });
  }

  async _deleteParoisseTx(tx, pid) {
    const communautes = await tx.communaute.findMany({
      where: { paroisseId: pid },
      select: { id: true },
    });
    for (const c of communautes) {
      await this._deleteCommunauteTx(tx, c.id);
    }
    await tx.membre.updateMany({
      where: { paroisseId: pid },
      data: { paroisseId: null, communauteId: null },
    });
    await tx.cotisation.updateMany({
      where: { paroisseId: pid },
      data: { paroisseId: null, communauteId: null },
    });
    await tx.paroisse.delete({ where: { id: pid } });
  }

  async _deleteDistrictTx(tx, did) {
    const paroisses = await tx.paroisse.findMany({
      where: { districtId: did },
      select: { id: true },
    });
    for (const p of paroisses) {
      await this._deleteParoisseTx(tx, p.id);
    }
    await tx.membre.updateMany({
      where: { districtId: did },
      data: { districtId: null, paroisseId: null, communauteId: null },
    });
    await tx.cotisation.updateMany({
      where: { districtId: did },
      data: { districtId: null, paroisseId: null, communauteId: null },
    });
    await tx.district.delete({ where: { id: did } });
  }

  async deleteRegion(id) {
    const rid = Number(id);
    const region = await prisma.region.findUnique({ where: { id: rid } });
    if (!region) throw new AppError('Région introuvable', 404);

    await prisma.$transaction(async (tx) => {
      const districts = await tx.district.findMany({
        where: { regionId: rid },
        select: { id: true },
      });
      for (const d of districts) {
        await this._deleteDistrictTx(tx, d.id);
      }
      await tx.membre.updateMany({
        where: { regionId: rid },
        data: { regionId: null, districtId: null, paroisseId: null, communauteId: null },
      });
      await tx.cotisation.updateMany({
        where: { regionId: rid },
        data: { regionId: null, districtId: null, paroisseId: null, communauteId: null },
      });
      await tx.region.delete({ where: { id: rid } });
    });

    dashboardService.invalidateStatsCache();
    return { id: rid, nom: region.nom };
  }

  async deleteDistrict(id) {
    const did = Number(id);
    const district = await prisma.district.findUnique({ where: { id: did } });
    if (!district) throw new AppError('District introuvable', 404);

    await prisma.$transaction(async (tx) => {
      await this._deleteDistrictTx(tx, did);
    });

    dashboardService.invalidateStatsCache();
    return { id: did, nom: district.nom };
  }

  async deleteParoisse(id) {
    const pid = Number(id);
    const paroisse = await prisma.paroisse.findUnique({ where: { id: pid } });
    if (!paroisse) throw new AppError('Paroisse introuvable', 404);

    await prisma.$transaction(async (tx) => {
      await this._deleteParoisseTx(tx, pid);
    });

    dashboardService.invalidateStatsCache();
    return { id: pid, nom: paroisse.nom };
  }

  async deleteCommunaute(id) {
    const cid = Number(id);
    const communaute = await prisma.communaute.findUnique({ where: { id: cid } });
    if (!communaute) throw new AppError('Communauté introuvable', 404);

    await prisma.$transaction(async (tx) => {
      await this._deleteCommunauteTx(tx, cid);
    });

    dashboardService.invalidateStatsCache();
    return { id: cid, nom: communaute.nom };
  }
}

module.exports = new GeoAdminService();
