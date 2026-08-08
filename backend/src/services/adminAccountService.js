const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const { membrePublicSelect, withAdminFlag } = require('./authService');
const { ROLE_MEMBRES_ACTIFS } = require('../utils/roles');
const membreIdService = require('./membreIdService');
const auditService = require('./auditService');

const SALT_ROUNDS = 12;
/** Nombre max de sous-admins (hors Super Admin) */
const MAX_SUB_ADMINS = 3;

class AdminAccountService {
  async listAdmins({ search, statut } = {}) {
    const where = {
      OR: [{ isAdmin: true }, { isSuperAdmin: true }],
    };

    if (statut) where.statut = statut;

    if (search) {
      where.AND = [
        {
          OR: [
            { nom: { contains: search } },
            { prenom: { contains: search } },
            { idMembre: { contains: search } },
            { contact: { contains: search } },
            { email: { contains: search } },
          ],
        },
      ];
    }

    const items = await prisma.membre.findMany({
      where,
      orderBy: [{ isSuperAdmin: 'desc' }, { nom: 'asc' }, { prenom: 'asc' }],
      select: membrePublicSelect,
    });

    return items.map(withAdminFlag);
  }

  /**
   * Crée un compte admin délégué (jamais Super Admin).
   * Le Super Admin reste le seul isSuperAdmin.
   */
  async createAdmin(payload, superAdminId, meta = {}) {
    const {
      nom,
      prenom,
      email,
      contact,
      password,
      dateNaissance,
      lieuNaissance = 'Abidjan',
      branche = 'FLAMBEAUX',
    } = payload;

    if (!nom?.trim() || !prenom?.trim() || !password) {
      throw new AppError('Nom, prénom et mot de passe sont obligatoires', 400);
    }
    if (password.length < 6) {
      throw new AppError('Mot de passe : 6 caractères minimum', 400);
    }
    if (!email?.trim()) {
      throw new AppError('Email obligatoire pour un compte administrateur', 400);
    }
    if (!['FLAMBEAUX', 'LUMIERES'].includes(branche)) {
      throw new AppError('Branche invalide', 400);
    }

    const existingEmail = await prisma.membre.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingEmail) {
      throw new AppError('Cet email est déjà utilisé', 409);
    }

    const subAdminCount = await prisma.membre.count({
      where: { isAdmin: true, isSuperAdmin: false },
    });
    if (subAdminCount >= MAX_SUB_ADMINS) {
      throw new AppError(`Maximum ${MAX_SUB_ADMINS} sous-administrateurs autorisés`, 400);
    }

    const role = await prisma.role.findUnique({ where: { nom: ROLE_MEMBRES_ACTIFS } });
    if (!role) throw new AppError('Rôle Membres actifs non configuré', 500);

    const birth = dateNaissance ? new Date(dateNaissance) : new Date('1990-01-01');
    if (Number.isNaN(birth.getTime())) {
      throw new AppError('Date de naissance invalide', 400);
    }

    const idResult = await membreIdService.generateUniqueId(nom, prenom, birth);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const membre = await prisma.membre.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        contact: contact?.trim() || null,
        passwordHash,
        dateNaissance: birth,
        lieuNaissance: String(lieuNaissance).trim() || 'Abidjan',
        branche,
        idMembre: idResult.idMembre,
        collisionSuffix: idResult.suffix,
        roleId: role.id,
        mandateParId: Number(superAdminId),
        isAdmin: true,
        isSuperAdmin: false,
        statut: 'VALIDE',
      },
      select: membrePublicSelect,
    });

    await auditService.log({
      acteurId: superAdminId,
      action: 'CREATE_ADMIN',
      entite: 'Membre',
      entiteId: membre.id,
      details: { idMembre: membre.idMembre, email: membre.email },
      ipAddress: meta.ip,
    });

    return withAdminFlag(membre);
  }

  async updateAdmin(id, payload, superAdminId, meta = {}) {
    const targetId = Number(id);
    const existing = await prisma.membre.findUnique({
      where: { id: targetId },
      select: membrePublicSelect,
    });

    if (!existing) throw new AppError('Compte introuvable', 404);
    if (!existing.isAdmin && !existing.isSuperAdmin) {
      throw new AppError('Ce compte n\'est pas un administrateur', 400);
    }
    if (existing.isSuperAdmin) {
      throw new AppError('Le compte Super Admin ne peut pas être modifié ici', 403);
    }
    if (targetId === Number(superAdminId)) {
      throw new AppError('Utilisez la section « Mon compte » pour votre propre profil', 400);
    }

    const data = {};

    if (payload.statut !== undefined) {
      if (!['VALIDE', 'SUSPENDU'].includes(payload.statut)) {
        throw new AppError('Statut autorisé : VALIDE ou SUSPENDU', 400);
      }
      data.statut = payload.statut;
    }

    if (payload.password) {
      if (payload.password.length < 6) {
        throw new AppError('Mot de passe : 6 caractères minimum', 400);
      }
      data.passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
    }

    if (payload.nom !== undefined) data.nom = String(payload.nom).trim();
    if (payload.prenom !== undefined) data.prenom = String(payload.prenom).trim();
    if (payload.contact !== undefined) data.contact = String(payload.contact).trim() || null;
    if (payload.email !== undefined) {
      const email = String(payload.email).trim().toLowerCase();
      if (!email) throw new AppError('Email invalide', 400);
      data.email = email;
    }

    // Impossible d'élever un admin au rang Super Admin via cette API
    data.isSuperAdmin = false;
    data.isAdmin = true;

    if (!Object.keys(data).length) {
      throw new AppError('Aucune modification', 400);
    }

    const membre = await prisma.membre.update({
      where: { id: targetId },
      data,
      select: membrePublicSelect,
    });

    await auditService.log({
      acteurId: superAdminId,
      action: 'UPDATE_ADMIN',
      entite: 'Membre',
      entiteId: membre.id,
      details: { ...payload, password: payload.password ? '[changed]' : undefined },
      ipAddress: meta.ip,
    });

    return withAdminFlag(membre);
  }
}

module.exports = new AdminAccountService();
