const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class DashboardService {
  async getStats({ regionId, activiteId } = {}) {
    const membreWhere = { statut: 'VALIDE' };
    if (regionId) membreWhere.regionId = Number(regionId);

    const cotisationWhere = {};
    if (regionId) cotisationWhere.regionId = Number(regionId);
    if (activiteId) cotisationWhere.activiteId = Number(activiteId);

    const [
      totalMembres,
      flambeaux,
      lumieres,
      membresEnAttente,
      totalCotisations,
      payees,
      partielles,
      enAttente,
      montantAgg,
      parRegion,
      parActivite,
    ] = await Promise.all([
      prisma.membre.count({ where: membreWhere }),
      prisma.membre.count({ where: { ...membreWhere, branche: 'FLAMBEAUX' } }),
      prisma.membre.count({ where: { ...membreWhere, branche: 'LUMIERES' } }),
      prisma.membre.count({ where: { statut: 'EN_ATTENTE', ...(regionId ? { regionId: Number(regionId) } : {}) } }),
      prisma.cotisation.count({ where: cotisationWhere }),
      prisma.cotisation.count({ where: { ...cotisationWhere, statut: 'PAYE' } }),
      prisma.cotisation.count({ where: { ...cotisationWhere, statut: 'PARTIEL' } }),
      prisma.cotisation.count({ where: { ...cotisationWhere, statut: 'EN_ATTENTE' } }),
      prisma.cotisation.aggregate({
        where: cotisationWhere,
        _sum: { montant: true, montantPaye: true },
      }),
      this.statsByRegion(activiteId),
      this.statsByActivite(regionId),
    ]);

    const tauxPaiement =
      totalCotisations > 0 ? Math.round((payees / totalCotisations) * 1000) / 10 : 0;

    return {
      membres: {
        total: totalMembres,
        flambeaux,
        lumieres,
        enAttente: membresEnAttente,
      },
      cotisations: {
        total: totalCotisations,
        payees,
        partielles,
        enAttente,
        tauxPaiement,
        montantAttendu: Number(montantAgg._sum.montant || 0),
        montantPercu: Number(montantAgg._sum.montantPaye || 0),
      },
      parRegion,
      parActivite,
    };
  }

  async statsByRegion(activiteId) {
    const regions = await prisma.region.findMany({ orderBy: { nom: 'asc' } });
    const results = [];

    for (const region of regions) {
      const where = { regionId: region.id };
      if (activiteId) where.activiteId = Number(activiteId);

      const [total, payees, membres] = await Promise.all([
        prisma.cotisation.count({ where }),
        prisma.cotisation.count({ where: { ...where, statut: 'PAYE' } }),
        prisma.membre.count({ where: { regionId: region.id, statut: 'VALIDE' } }),
      ]);

      results.push({
        regionId: region.id,
        nom: region.nom,
        code: region.code,
        membres,
        cotisations: total,
        payees,
        taux: total > 0 ? Math.round((payees / total) * 1000) / 10 : 0,
      });
    }

    return results;
  }

  async statsByActivite(regionId) {
    const activites = await prisma.activite.findMany({ where: { active: true } });
    const results = [];

    for (const activite of activites) {
      const where = { activiteId: activite.id };
      if (regionId) where.regionId = Number(regionId);

      const [total, payees, agg] = await Promise.all([
        prisma.cotisation.count({ where }),
        prisma.cotisation.count({ where: { ...where, statut: 'PAYE' } }),
        prisma.cotisation.aggregate({
          where,
          _sum: { montant: true, montantPaye: true },
        }),
      ]);

      results.push({
        activiteId: activite.id,
        nom: activite.nom,
        prefixe: activite.prefixeIdPaiement,
        total,
        payees,
        taux: total > 0 ? Math.round((payees / total) * 1000) / 10 : 0,
        montantAttendu: Number(agg._sum.montant || 0),
        montantPercu: Number(agg._sum.montantPaye || 0),
      });
    }

    return results;
  }

  async statsByDistrict(regionId, activiteId) {
    if (!regionId) return [];
    const districts = await prisma.district.findMany({
      where: { regionId: Number(regionId) },
      orderBy: { nom: 'asc' },
    });

    const results = [];
    for (const d of districts) {
      const where = { districtId: d.id };
      if (activiteId) where.activiteId = Number(activiteId);
      const [total, payees] = await Promise.all([
        prisma.cotisation.count({ where }),
        prisma.cotisation.count({ where: { ...where, statut: 'PAYE' } }),
      ]);
      results.push({
        districtId: d.id,
        nom: d.nom,
        total,
        payees,
        taux: total > 0 ? Math.round((payees / total) * 1000) / 10 : 0,
      });
    }
    return results;
  }

  async exportExcel(filters = {}) {
    const stats = await this.getStats(filters);
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
    const stats = await this.getStats(filters);

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
