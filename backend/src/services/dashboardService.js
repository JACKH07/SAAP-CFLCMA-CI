const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { absolutizePhotoUrl } = require('../utils/uploads');

/** Cache court (évite de recalculer à chaque focus / navigation) */
const STATS_CACHE_TTL_MS = 20_000;
const statsCache = new Map();

function cacheKey(filters = {}) {
  return `${filters.regionId || ''}:${filters.activiteId || ''}`;
}

class DashboardService {
  invalidateStatsCache() {
    statsCache.clear();
  }

  async getStats(filters = {}) {
    const key = cacheKey(filters);
    const hit = statsCache.get(key);
    if (hit && Date.now() - hit.at < STATS_CACHE_TTL_MS) {
      return hit.data;
    }
    const data = await this.computeStats(filters);
    statsCache.set(key, { at: Date.now(), data });
    return data;
  }

  /**
   * Agrégations groupBy (peu de requêtes) au lieu de boucles N×count.
   */
  async computeStats({ regionId, activiteId } = {}) {
    const rid = regionId ? Number(regionId) : null;
    const aid = activiteId ? Number(activiteId) : null;

    const membreValideWhere = {
      statut: 'VALIDE',
      ...(rid ? { regionId: rid } : {}),
    };
    const cotisationWhere = {
      ...(rid ? { regionId: rid } : {}),
      ...(aid ? { activiteId: aid } : {}),
    };
    const membreStatutWhere = rid ? { regionId: rid } : {};

    const [
      membresBranche,
      membresStatut,
      bureauCount,
      cotStatut,
      regions,
      membresParRegionBranche,
      cotParRegion,
      activites,
      cotParActivite,
      districts,
      membresParDistrictBranche,
      cotParDistrict,
      derniersMembres,
    ] = await Promise.all([
      prisma.membre.groupBy({
        by: ['branche'],
        where: membreValideWhere,
        _count: { _all: true },
      }),
      prisma.membre.groupBy({
        by: ['statut'],
        where: membreStatutWhere,
        _count: { _all: true },
      }),
      prisma.membre.count({
        where: {
          ...membreValideWhere,
          responsabiliteBureau: { not: null },
        },
      }),
      prisma.cotisation.groupBy({
        by: ['statut'],
        where: cotisationWhere,
        _count: { _all: true },
        _sum: { montant: true, montantPaye: true },
      }),
      prisma.region.findMany({
        orderBy: { nom: 'asc' },
        select: { id: true, nom: true, code: true },
      }),
      prisma.membre.groupBy({
        by: ['regionId', 'branche'],
        where: { statut: 'VALIDE', regionId: { not: null }, ...(rid ? { regionId: rid } : {}) },
        _count: { _all: true },
      }),
      prisma.cotisation.groupBy({
        by: ['regionId', 'statut'],
        where: {
          regionId: { not: null },
          ...(rid ? { regionId: rid } : {}),
          ...(aid ? { activiteId: aid } : {}),
        },
        _count: { _all: true },
        _sum: { montant: true, montantPaye: true },
      }),
      prisma.activite.findMany({
        where: { active: true },
        select: { id: true, nom: true, prefixeIdPaiement: true },
        orderBy: { nom: 'asc' },
      }),
      prisma.cotisation.groupBy({
        by: ['activiteId', 'statut'],
        where: {
          ...(rid ? { regionId: rid } : {}),
          ...(aid ? { activiteId: aid } : {}),
        },
        _count: { _all: true },
        _sum: { montant: true, montantPaye: true },
      }),
      rid
        ? prisma.district.findMany({
            where: { regionId: rid },
            orderBy: { nom: 'asc' },
            select: { id: true, nom: true },
          })
        : Promise.resolve([]),
      rid
        ? prisma.membre.groupBy({
            by: ['districtId', 'branche'],
            where: { statut: 'VALIDE', regionId: rid, districtId: { not: null } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      rid
        ? prisma.cotisation.groupBy({
            by: ['districtId', 'statut'],
            where: {
              regionId: rid,
              districtId: { not: null },
              ...(aid ? { activiteId: aid } : {}),
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      prisma.membre.findMany({
        where: rid ? { regionId: rid } : {},
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          nom: true,
          prenom: true,
          idMembre: true,
          branche: true,
          statut: true,
          photoUrl: true,
          isAdmin: true,
          isSuperAdmin: true,
          role: { select: { nom: true, niveauHierarchique: true } },
          region: { select: { nom: true } },
          district: { select: { nom: true } },
          paroisse: { select: { nom: true } },
          communaute: { select: { nom: true } },
        },
      }),
    ]);

    const brancheMap = Object.fromEntries(
      membresBranche.map((r) => [r.branche, r._count._all])
    );
    const statutMap = Object.fromEntries(
      membresStatut.map((r) => [r.statut, r._count._all])
    );

    let totalCotisations = 0;
    let payees = 0;
    let partielles = 0;
    let enAttente = 0;
    let montantAttendu = 0;
    let montantPercu = 0;
    for (const row of cotStatut) {
      const n = row._count._all;
      totalCotisations += n;
      if (row.statut === 'PAYE') payees = n;
      else if (row.statut === 'PARTIEL') partielles = n;
      else if (row.statut === 'EN_ATTENTE') enAttente = n;
      montantAttendu += Number(row._sum.montant || 0);
      montantPercu += Number(row._sum.montantPaye || 0);
    }

    const flambeaux = brancheMap.FLAMBEAUX || 0;
    const lumieres = brancheMap.LUMIERES || 0;
    const totalMembres = flambeaux + lumieres;

    // --- par région ---
    const memReg = new Map(); // regionId -> { flambeaux, lumieres }
    for (const row of membresParRegionBranche) {
      if (row.regionId == null) continue;
      const cur = memReg.get(row.regionId) || { flambeaux: 0, lumieres: 0 };
      if (row.branche === 'FLAMBEAUX') cur.flambeaux = row._count._all;
      if (row.branche === 'LUMIERES') cur.lumieres = row._count._all;
      memReg.set(row.regionId, cur);
    }
    const cotReg = new Map(); // regionId -> { total, payees, montantAttendu, montantPercu }
    for (const row of cotParRegion) {
      if (row.regionId == null) continue;
      const cur = cotReg.get(row.regionId) || {
        total: 0,
        payees: 0,
        montantAttendu: 0,
        montantPercu: 0,
      };
      cur.total += row._count._all;
      if (row.statut === 'PAYE') cur.payees += row._count._all;
      cur.montantAttendu += Number(row._sum.montant || 0);
      cur.montantPercu += Number(row._sum.montantPaye || 0);
      cotReg.set(row.regionId, cur);
    }

    const parRegion = (rid ? regions.filter((r) => r.id === rid) : regions).map((region) => {
      const m = memReg.get(region.id) || { flambeaux: 0, lumieres: 0 };
      const c = cotReg.get(region.id) || {
        total: 0,
        payees: 0,
        montantAttendu: 0,
        montantPercu: 0,
      };
      return {
        regionId: region.id,
        nom: region.nom,
        code: region.code,
        membres: m.flambeaux + m.lumieres,
        flambeaux: m.flambeaux,
        lumieres: m.lumieres,
        cotisations: c.total,
        payees: c.payees,
        taux: c.total > 0 ? Math.round((c.payees / c.total) * 1000) / 10 : 0,
        montantAttendu: c.montantAttendu,
        montantPercu: c.montantPercu,
      };
    });

    // --- par activité ---
    const cotAct = new Map();
    for (const row of cotParActivite) {
      const cur = cotAct.get(row.activiteId) || {
        total: 0,
        payees: 0,
        montantAttendu: 0,
        montantPercu: 0,
      };
      cur.total += row._count._all;
      if (row.statut === 'PAYE') cur.payees += row._count._all;
      cur.montantAttendu += Number(row._sum.montant || 0);
      cur.montantPercu += Number(row._sum.montantPaye || 0);
      cotAct.set(row.activiteId, cur);
    }
    const parActivite = activites.map((a) => {
      const c = cotAct.get(a.id) || {
        total: 0,
        payees: 0,
        montantAttendu: 0,
        montantPercu: 0,
      };
      return {
        activiteId: a.id,
        nom: a.nom,
        prefixe: a.prefixeIdPaiement,
        total: c.total,
        payees: c.payees,
        taux: c.total > 0 ? Math.round((c.payees / c.total) * 1000) / 10 : 0,
        montantAttendu: c.montantAttendu,
        montantPercu: c.montantPercu,
      };
    });

    // --- par district (si filtre région) ---
    let parDistrict = [];
    if (rid && districts.length) {
      const memDist = new Map();
      for (const row of membresParDistrictBranche) {
        if (row.districtId == null) continue;
        const cur = memDist.get(row.districtId) || { flambeaux: 0, lumieres: 0 };
        if (row.branche === 'FLAMBEAUX') cur.flambeaux = row._count._all;
        if (row.branche === 'LUMIERES') cur.lumieres = row._count._all;
        memDist.set(row.districtId, cur);
      }
      const cotDist = new Map();
      for (const row of cotParDistrict) {
        if (row.districtId == null) continue;
        const cur = cotDist.get(row.districtId) || { total: 0, payees: 0 };
        cur.total += row._count._all;
        if (row.statut === 'PAYE') cur.payees += row._count._all;
        cotDist.set(row.districtId, cur);
      }
      parDistrict = districts.map((d) => {
        const m = memDist.get(d.id) || { flambeaux: 0, lumieres: 0 };
        const c = cotDist.get(d.id) || { total: 0, payees: 0 };
        return {
          districtId: d.id,
          nom: d.nom,
          membres: m.flambeaux + m.lumieres,
          flambeaux: m.flambeaux,
          lumieres: m.lumieres,
          total: c.total,
          payees: c.payees,
          taux: c.total > 0 ? Math.round((c.payees / c.total) * 1000) / 10 : 0,
        };
      });
    }

    const tauxPaiement =
      totalCotisations > 0 ? Math.round((payees / totalCotisations) * 1000) / 10 : 0;

    return {
      membres: {
        total: totalMembres,
        flambeaux,
        lumieres,
        bureau: bureauCount,
        enAttente: statutMap.EN_ATTENTE || 0,
        rejetes: statutMap.REJETE || 0,
        suspendus: statutMap.SUSPENDU || 0,
      },
      cotisations: {
        total: totalCotisations,
        payees,
        partielles,
        enAttente,
        tauxPaiement,
        montantAttendu,
        montantPercu,
      },
      parRegion,
      parDistrict,
      parActivite,
      regionId: rid,
      regions, // pour le filtre UI sans second appel
      derniersMembres: (derniersMembres || []).map((m) => ({
        ...m,
        photoUrl: m.isSuperAdmin ? null : absolutizePhotoUrl(m.photoUrl),
      })),
      // Dernières cotisations : chargées à la demande (endpoint secondaire) — omises ici pour accélérer
      dernieresCotisations: [],
    };
  }

  // Conservé pour compatibilité éventuelle
  async statsByRegion(activiteId, regionId) {
    const stats = await this.getStats({ activiteId, regionId });
    return stats.parRegion;
  }

  async statsByActivite(regionId) {
    const stats = await this.getStats({ regionId });
    return stats.parActivite;
  }

  async statsByDistrict(regionId, activiteId) {
    const stats = await this.getStats({ regionId, activiteId });
    return stats.parDistrict;
  }

  async exportExcel(filters = {}) {
    const stats = await this.computeStats(filters);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SAAP CFLCMA-CI';

    const summary = workbook.addWorksheet('Synthèse');
    summary.addRow(['Indicateur', 'Valeur']);
    summary.addRow(['Flambeaux (Hommes)', stats.membres.flambeaux ?? 0]);
    summary.addRow(['Lumières (Femmes)', stats.membres.lumieres ?? 0]);
    summary.addRow(['Membres validés (total)', stats.membres.total]);
    summary.addRow(['Inscriptions en attente', stats.membres.enAttente]);
    summary.addRow(['Cotisations totales', stats.cotisations.total]);
    summary.addRow(['Payées', stats.cotisations.payees]);
    summary.addRow(['Partielles', stats.cotisations.partielles]);
    summary.addRow(['En attente', stats.cotisations.enAttente]);
    summary.addRow(['Taux de paiement (%)', stats.cotisations.tauxPaiement]);
    summary.addRow(['Montant attendu', stats.cotisations.montantAttendu]);
    summary.addRow(['Montant perçu', stats.cotisations.montantPercu]);

    const regionSheet = workbook.addWorksheet('Par région');
    regionSheet.addRow(['Région', 'Code', 'Membres', 'Cotisations', 'Payées', 'Taux %']);
    for (const r of stats.parRegion) {
      regionSheet.addRow([r.nom, r.code, r.membres, r.cotisations, r.payees, r.taux]);
    }

    const activiteSheet = workbook.addWorksheet('Par activité');
    activiteSheet.addRow(['Activité', 'Préfixe', 'Total', 'Payées', 'Taux %', 'Attendu', 'Perçu']);
    for (const a of stats.parActivite) {
      activiteSheet.addRow([
        a.nom, a.prefixe, a.total, a.payees, a.taux, a.montantAttendu, a.montantPercu,
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportPdf(filters = {}) {
    const stats = await this.computeStats(filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('SAAP CFLCMA-CI — Rapport', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Généré le ${new Date().toLocaleString('fr-FR')}`);
      doc.moveDown();

      doc.fontSize(14).text('Synthèse');
      doc.fontSize(11);
      doc.text(`Flambeaux (Hommes) : ${stats.membres.flambeaux ?? 0}`);
      doc.text(`Lumières (Femmes) : ${stats.membres.lumieres ?? 0}`);
      doc.text(`Membres validés (total) : ${stats.membres.total}`);
      doc.text(`Inscriptions en attente : ${stats.membres.enAttente}`);
      doc.text(`Taux de paiement : ${stats.cotisations.tauxPaiement} %`);
      doc.text(`Montant perçu : ${stats.cotisations.montantPercu} / ${stats.cotisations.montantAttendu}`);
      doc.moveDown();

      doc.fontSize(14).text('Par région');
      doc.fontSize(10);
      for (const r of stats.parRegion) {
        doc.text(`${r.nom} (${r.code}) — ${r.payees}/${r.cotisations} (${r.taux}%)`);
      }
      doc.moveDown();

      doc.fontSize(14).text('Par activité');
      doc.fontSize(10);
      for (const a of stats.parActivite) {
        doc.text(`${a.nom} [${a.prefixe}] — ${a.payees}/${a.total} (${a.taux}%)`);
      }

      doc.end();
    });
  }
}

module.exports = new DashboardService();
