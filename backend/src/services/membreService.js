const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const config = require('../config');
const { AppError } = require('../utils/errors');
const { membrePublicSelect, withAdminFlag } = require('./authService');
const { hasAdminAccess } = require('../utils/roles');
const { resolveMembreRoles } = require('../utils/membreRoles');
const membreIdService = require('./membreIdService');
const auditService = require('./auditService');
const lieuAutocompleteService = require('./lieuAutocompleteService');
const { extractUploadFilename, normalizePhotoStorageValue } = require('../utils/uploads');
const bcrypt = require('bcryptjs');

class MembreService {
  async getById(id) {
    const membre = await prisma.membre.findUnique({
      where: { id: Number(id) },
      select: membrePublicSelect,
    });
    if (!membre) throw new AppError('Membre introuvable', 404);
    return withAdminFlag(membre);
  }

  async list({ page = 1, limit = 20, search, regionId, statut, roleId } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;
    const where = {};

    if (regionId) where.regionId = Number(regionId);
    if (statut) where.statut = statut;
    if (roleId) where.roleId = Number(roleId);
    if (search) {
      const q = String(search).trim();
      if (q) {
        where.OR = [
          { nom: { contains: q } },
          { prenom: { contains: q } },
          { idMembre: { contains: q } },
          { contact: { contains: q } },
          { email: { contains: q } },
        ];
      }
    }

    const [items, total] = await Promise.all([
      prisma.membre.findMany({
        where,
        skip,
        take,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        select: membrePublicSelect,
      }),
      prisma.membre.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / take) || 1);

    return {
      items: items.map(withAdminFlag),
      total,
      page: pageNum,
      limit: take,
      totalPages,
    };
  }

  async createByAdmin(payload, adminId, meta = {}) {
    const {
      nom,
      prenom,
      contact,
      email,
      password,
      dateNaissance,
      lieuNaissance,
      branche,
      regionId,
      districtId,
      districtNom,
      paroisseNom,
      paroisseId,
      communauteNom,
      communauteId,
      roleId,
      titreId,
      statut = 'VALIDE',
      mandateParId,
      situationMatrimoniale,
      profession,
      responsabiliteBureau,
      photoUrl,
    } = payload;

    if (!nom || !prenom || !dateNaissance || !lieuNaissance || !password || !roleId) {
      throw new AppError('Champs obligatoires manquants', 400);
    }
    if (!branche || !['FLAMBEAUX', 'LUMIERES'].includes(branche)) {
      throw new AppError('Sélectionnez Flambeaux (Hommes) ou Lumières (Femmes)', 400);
    }

    // Création de membres classiques uniquement — les sous-admins passent par /api/admins
    if (payload.isAdmin || payload.isSuperAdmin) {
      throw new AppError(
        'Seuls le Super Admin peut créer un compte administrateur (page Compte / API /admins)',
        403
      );
    }

    let finalDistrictId = districtId ? Number(districtId) : null;
    if (!finalDistrictId && districtNom && regionId) {
      try {
        const { district } = await lieuAutocompleteService.findOrCreateDistrict(
          districtNom,
          Number(regionId)
        );
        finalDistrictId = district.id;
      } catch (err) {
        throw new AppError(err.message || "Impossible d'enregistrer le district", 400);
      }
    }

    let finalParoisseId = paroisseId ? Number(paroisseId) : null;
    let finalCommunauteId = communauteId ? Number(communauteId) : null;

    if (!finalParoisseId && paroisseNom && finalDistrictId) {
      const { paroisse } = await lieuAutocompleteService.findOrCreateParoisse(
        paroisseNom,
        Number(finalDistrictId)
      );
      finalParoisseId = paroisse.id;
    }

    if (!finalCommunauteId && communauteNom && finalParoisseId) {
      const { communaute } = await lieuAutocompleteService.findOrCreateCommunaute(
        communauteNom,
        finalParoisseId
      );
      finalCommunauteId = communaute.id;
    }

    const rolesResolved = await resolveMembreRoles({ roleId, titreId });

    const idResult = await membreIdService.generateUniqueId(nom, prenom, dateNaissance);
    const passwordHash = await bcrypt.hash(password, 12);

    const membre = await prisma.membre.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        contact: contact || null,
        email: email || null,
        passwordHash,
        dateNaissance: new Date(dateNaissance),
        lieuNaissance: lieuNaissance.trim(),
        branche,
        situationMatrimoniale: situationMatrimoniale?.trim() || null,
        profession: profession?.trim() || null,
        responsabiliteBureau: responsabiliteBureau?.trim() || null,
        idMembre: idResult.idMembre,
        collisionSuffix: idResult.suffix,
        roleId: rolesResolved.roleId,
        titreId: rolesResolved.titreId,
        regionId: regionId ? Number(regionId) : null,
        districtId: finalDistrictId,
        paroisseId: finalParoisseId,
        communauteId: finalCommunauteId,
        mandateParId: mandateParId ? Number(mandateParId) : null,
        photoUrl: photoUrl || null,
        isAdmin: false,
        isSuperAdmin: false,
        statut,
      },
      select: membrePublicSelect,
    });

    if (idResult.collision) {
      await membreIdService.notifyCollision({
        idMembre: idResult.idMembre,
        baseId: idResult.baseId,
        suffix: idResult.suffix,
        inscritParId: adminId,
      });
    }

    await prisma.historiqueMandat.create({
      data: {
        membreId: membre.id,
        roleId: membre.roleId,
        regionId: membre.regionId,
        districtId: membre.districtId,
        paroisseId: membre.paroisseId,
        communauteId: membre.communauteId,
      },
    });

    // Pas de cotisation « en attente » à la création :
    // le paiement se crée au moment du versement (montant libre).

    await auditService.log({
      acteurId: adminId,
      action: 'CREATE_MEMBRE',
      entite: 'Membre',
      entiteId: membre.id,
      details: { idMembre: membre.idMembre },
      ipAddress: meta.ip,
    });

    return withAdminFlag(membre);
  }

  async updatePhoto(id, filename, actorId, meta = {}) {
    const existing = await this.getById(id);
    if (existing.isSuperAdmin) {
      throw new AppError('Le compte Super Admin n\'utilise pas de photo de profil', 400);
    }

    const photoUrl = normalizePhotoStorageValue(filename);
    if (!photoUrl) {
      throw new AppError('Photo invalide', 400);
    }

    const oldFilename = extractUploadFilename(existing.photoUrl);

    const membre = await prisma.membre.update({
      where: { id: Number(id) },
      data: { photoUrl },
      select: membrePublicSelect,
    });

    if (oldFilename && oldFilename !== photoUrl) {
      try {
        const oldPath = path.join(path.resolve(config.upload.dir), oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch {
        /* fichier déjà absent */
      }
    }

    await auditService.log({
      acteurId: actorId,
      action: 'UPDATE_MEMBRE_PHOTO',
      entite: 'Membre',
      entiteId: membre.id,
      details: { idMembre: membre.idMembre },
      ipAddress: meta.ip,
    });

    return withAdminFlag(membre);
  }

  async update(id, payload, adminId, meta = {}) {
    const existing = await this.getById(id);
    const data = {};
    const actorIsSuperAdmin = Boolean(meta.actorIsSuperAdmin);

    const stringFields = [
      'nom', 'prenom', 'contact', 'email', 'lieuNaissance', 'branche', 'statut',
      'situationMatrimoniale', 'profession', 'responsabiliteBureau',
    ];
    for (const key of stringFields) {
      if (payload[key] === undefined) continue;
      if (typeof payload[key] === 'string') {
        const trimmed = payload[key].trim();
        data[key] = ['contact', 'email', 'situationMatrimoniale', 'profession', 'responsabiliteBureau'].includes(key)
          ? trimmed || null
          : trimmed;
      } else {
        data[key] = payload[key];
      }
    }

    if (payload.branche && !['FLAMBEAUX', 'LUMIERES'].includes(payload.branche)) {
      throw new AppError('Branche invalide : Flambeaux ou Lumières', 400);
    }

    if (payload.dateNaissance) {
      data.dateNaissance = new Date(payload.dateNaissance);
    }

    if (payload.password) {
      data.passwordHash = await bcrypt.hash(payload.password, 12);
    }

    const toNullableInt = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      return Number(v);
    };

    if (payload.roleId !== undefined || payload.fonctionId !== undefined || payload.titreId !== undefined) {
      const resolved = await resolveMembreRoles({
        roleId: payload.roleId !== undefined ? payload.roleId : existing.roleId,
        titreId: payload.titreId !== undefined ? payload.titreId : existing.titreId,
      });
      data.roleId = resolved.roleId;
      data.titreId = resolved.titreId;
    }
    if (payload.regionId !== undefined) data.regionId = toNullableInt(payload.regionId);
    if (payload.mandateParId !== undefined) data.mandateParId = toNullableInt(payload.mandateParId);

    if (payload.districtNom && (payload.regionId !== undefined || existing.regionId)) {
      const regionForDistrict =
        payload.regionId !== undefined ? toNullableInt(payload.regionId) : existing.regionId;
      if (!regionForDistrict) {
        throw new AppError('La région est requise pour enregistrer le district', 400);
      }
      try {
        const { district } = await lieuAutocompleteService.findOrCreateDistrict(
          payload.districtNom,
          regionForDistrict
        );
        data.districtId = district.id;
      } catch (err) {
        throw new AppError(err.message || "Impossible d'enregistrer le district", 400);
      }
    } else if (payload.districtId !== undefined) {
      data.districtId = toNullableInt(payload.districtId);
    }

    let finalParoisseId =
      payload.paroisseId !== undefined ? toNullableInt(payload.paroisseId) : existing.paroisseId;
    let finalCommunauteId =
      payload.communauteId !== undefined ? toNullableInt(payload.communauteId) : existing.communauteId;

    const districtId = data.districtId !== undefined ? data.districtId : existing.districtId;

    if (payload.paroisseNom && districtId) {
      const { paroisse } = await lieuAutocompleteService.findOrCreateParoisse(
        payload.paroisseNom,
        Number(districtId)
      );
      finalParoisseId = paroisse.id;
    }

    if (payload.communauteNom && finalParoisseId) {
      const { communaute } = await lieuAutocompleteService.findOrCreateCommunaute(
        payload.communauteNom,
        Number(finalParoisseId)
      );
      finalCommunauteId = communaute.id;
    }

    if (payload.paroisseId !== undefined || payload.paroisseNom) {
      data.paroisseId = finalParoisseId;
    }
    if (payload.communauteId !== undefined || payload.communauteNom) {
      data.communauteId = finalCommunauteId;
    }

    // Droits admin SAAP : seuls le Super Admin peut les modifier (via Compte /admins de préférence)
    if (existing.isSuperAdmin) {
      data.isAdmin = true;
      data.isSuperAdmin = true;
      if (payload.statut && payload.statut !== 'VALIDE' && Number(id) === Number(adminId)) {
        throw new AppError('Vous ne pouvez pas suspendre votre propre compte Super Admin', 403);
      }
      if (payload.statut && ['SUSPENDU', 'REJETE'].includes(payload.statut)) {
        throw new AppError('Le compte Super Admin ne peut pas être suspendu ainsi', 403);
      }
    } else if (actorIsSuperAdmin && payload.isAdmin !== undefined) {
      data.isAdmin = Boolean(payload.isAdmin);
      data.isSuperAdmin = false;
    } else {
      // Conserver le flag existant — pas d'élévation via rôle C.G. ou PATCH membre
      data.isAdmin = Boolean(existing.isAdmin);
      delete data.isSuperAdmin;
    }

    const roleChanged = data.roleId && Number(data.roleId) !== existing.roleId;

    const membre = await prisma.membre.update({
      where: { id: Number(id) },
      data,
      select: membrePublicSelect,
    });

    if (roleChanged) {
      await prisma.historiqueMandat.updateMany({
        where: { membreId: membre.id, dateFin: null },
        data: { dateFin: new Date() },
      });
      await prisma.historiqueMandat.create({
        data: {
          membreId: membre.id,
          roleId: membre.roleId,
          regionId: membre.regionId,
          districtId: membre.districtId,
          paroisseId: membre.paroisseId,
          communauteId: membre.communauteId,
        },
      });
    }

    await auditService.log({
      acteurId: adminId,
      action: 'UPDATE_MEMBRE',
      entite: 'Membre',
      entiteId: membre.id,
      details: payload,
      ipAddress: meta.ip,
    });

    return withAdminFlag(membre);
  }

  /**
   * Suppression définitive d'un membre.
   * Droits :
   * - Super Admin : peut supprimer n'importe quel compte (membres + sous-admins)
   * - Sous-admin (isAdmin) : peut supprimer n'importe quel compte sauf le Super Admin
   * - Le compte Super Admin n'est jamais supprimable
   */
  async remove(id, adminId, meta = {}) {
    const actor = await this.getById(adminId);
    if (!hasAdminAccess(actor)) {
      throw new AppError('Seuls le Super Admin et les sous-admins peuvent supprimer un compte', 403);
    }

    const existing = await this.getById(id);
    const membreId = Number(id);
    const actorId = Number(adminId);

    if (existing.isSuperAdmin) {
      throw new AppError('Le compte Super Admin ne peut pas être supprimé', 403);
    }

    if (membreId === actorId) {
      throw new AppError('Vous ne pouvez pas supprimer votre propre compte', 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.cotisation.deleteMany({ where: { membreId } });
      await tx.historiqueMandat.deleteMany({ where: { membreId } });
      await tx.auditLog.updateMany({
        where: { acteurId: membreId },
        data: { acteurId: null },
      });
      await tx.membre.updateMany({
        where: { mandateParId: membreId },
        data: { mandateParId: null },
      });
      await tx.membre.delete({ where: { id: membreId } });
    });

    await auditService.log({
      acteurId: actorId,
      action: 'DELETE_MEMBRE',
      entite: 'Membre',
      entiteId: membreId,
      details: {
        idMembre: existing.idMembre,
        nom: existing.nom,
        prenom: existing.prenom,
        wasAdmin: Boolean(existing.isAdmin),
        actorIsSuperAdmin: Boolean(actor.isSuperAdmin),
        actorIsAdmin: Boolean(actor.isAdmin),
      },
      ipAddress: meta.ip,
    });

    return { id: membreId, idMembre: existing.idMembre };
  }
}

module.exports = new MembreService();
