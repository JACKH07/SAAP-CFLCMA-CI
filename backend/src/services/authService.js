const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config');
const { AppError } = require('../utils/errors');
const { ROLE_MEMBRES_ACTIFS, ROLE_COORDINATEUR_GENERAL, hasAdminAccess } = require('../utils/roles');
const membreIdService = require('./membreIdService');
const lieuAutocompleteService = require('./lieuAutocompleteService');
const auditService = require('./auditService');
const { absolutizePhotoUrl } = require('../utils/uploads');

const SALT_ROUNDS = 12;

const membrePublicSelect = {
  id: true,
  nom: true,
  prenom: true,
  contact: true,
  email: true,
  dateNaissance: true,
  lieuNaissance: true,
  branche: true,
  situationMatrimoniale: true,
  profession: true,
  responsabiliteBureau: true,
  photoUrl: true,
  idMembre: true,
  isAdmin: true,
  isSuperAdmin: true,
  statut: true,
  roleId: true,
  regionId: true,
  districtId: true,
  paroisseId: true,
  communauteId: true,
  role: { select: { id: true, nom: true, niveauHierarchique: true } },
  region: { select: { id: true, nom: true, code: true } },
  district: { select: { id: true, nom: true } },
  paroisse: { select: { id: true, nom: true } },
  communaute: { select: { id: true, nom: true } },
  createdAt: true,
};

function withAdminFlag(membre) {
  if (!membre) return membre;
  return {
    ...membre,
    photoUrl: absolutizePhotoUrl(membre.photoUrl),
    isAdmin: hasAdminAccess(membre),
    isSuperAdmin: Boolean(membre.isSuperAdmin),
  };
}

class AuthService {
  signToken(membre) {
    const isAdmin = hasAdminAccess(membre);
    return jwt.sign(
      {
        sub: membre.id,
        idMembre: membre.idMembre,
        isAdmin,
        roleId: membre.roleId,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  async resolveRoleId(fonctionId) {
    if (fonctionId) {
      const role = await prisma.role.findUnique({ where: { id: Number(fonctionId) } });
      if (!role) throw new AppError('Titre (rôle) introuvable', 400);
      // Le Coordinateur général ne peut pas être auto-attribué à l'inscription
      if (role.nom === ROLE_COORDINATEUR_GENERAL) {
        throw new AppError(
          'Le rôle Coordinateur général (C.G.) ne peut pas être choisi à l\'inscription',
          403
        );
      }
      return role.id;
    }

    const membresRole = await prisma.role.findUnique({ where: { nom: ROLE_MEMBRES_ACTIFS } });
    if (!membresRole) throw new AppError('Rôle Membres actifs non configuré', 500);
    return membresRole.id;
  }

  async register(payload, meta = {}) {
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
      paroisseNom,
      communauteNom,
      fonctionId,
      situationMatrimoniale,
      profession,
      responsabiliteBureau,
    } = payload;

    if (!nom || !prenom || !dateNaissance || !lieuNaissance || !password) {
      throw new AppError('Champs obligatoires manquants', 400);
    }
    if (!branche || !['FLAMBEAUX', 'LUMIERES'].includes(branche)) {
      throw new AppError('Sélectionnez Flambeaux (Hommes) ou Lumières (Femmes)', 400);
    }
    if (!regionId || !districtId || !paroisseNom || !communauteNom) {
      throw new AppError('Rattachement géographique incomplet', 400);
    }

    const district = await prisma.district.findUnique({
      where: { id: Number(districtId) },
    });
    if (!district || district.regionId !== Number(regionId)) {
      throw new AppError('Le district ne correspond pas à la région sélectionnée', 400);
    }

    if (email) {
      const existingEmail = await prisma.membre.findFirst({
        where: { email: email.trim().toLowerCase() },
      });
      if (existingEmail) {
        throw new AppError(
          'Vous êtes déjà inscrit avec cet email. Connectez-vous à votre compte.',
          409
        );
      }
    }

    const contactNorm = contact ? String(contact).replace(/\s+/g, '').trim() : '';
    if (contactNorm) {
      const existingContact = await prisma.membre.findFirst({
        where: { contact: contactNorm },
      });
      if (existingContact) {
        throw new AppError(
          'Vous êtes déjà inscrit avec ce numéro de contact. Connectez-vous à votre compte.',
          409
        );
      }
    }

    const nomTrim = nom.trim();
    const prenomTrim = prenom.trim();
    const dateNaiss = new Date(dateNaissance);
    const existingIdentity = await prisma.membre.findFirst({
      where: {
        nom: { equals: nomTrim },
        prenom: { equals: prenomTrim },
        dateNaissance: dateNaiss,
      },
    });
    if (existingIdentity) {
      throw new AppError(
        'Cette personne est déjà inscrite. Connectez-vous avec votre ID membre, contact ou email.',
        409
      );
    }

    const { paroisse } = await lieuAutocompleteService.findOrCreateParoisse(
      paroisseNom,
      Number(districtId)
    );
    const { communaute } = await lieuAutocompleteService.findOrCreateCommunaute(
      communauteNom,
      paroisse.id
    );

    const idResult = await membreIdService.generateUniqueId(nomTrim, prenomTrim, dateNaissance);
    const roleId = await this.resolveRoleId(fonctionId);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const membre = await prisma.membre.create({
      data: {
        nom: nomTrim,
        prenom: prenomTrim,
        contact: contactNorm || null,
        email: email ? email.trim().toLowerCase() : null,
        passwordHash,
        dateNaissance: dateNaiss,
        lieuNaissance: lieuNaissance.trim(),
        branche,
        situationMatrimoniale: situationMatrimoniale?.trim() || null,
        profession: profession?.trim() || null,
        responsabiliteBureau: responsabiliteBureau?.trim() || null,
        photoUrl: payload.photoUrl || null,
        idMembre: idResult.idMembre,
        collisionSuffix: idResult.suffix,
        roleId,
        regionId: Number(regionId),
        districtId: Number(districtId),
        paroisseId: paroisse.id,
        communauteId: communaute.id,
        isAdmin: false,
        statut: 'VALIDE',
      },
      select: membrePublicSelect,
    });

    if (idResult.collision) {
      await membreIdService.notifyCollision({
        idMembre: idResult.idMembre,
        baseId: idResult.baseId,
        suffix: idResult.suffix,
      });
    }

    await auditService.log({
      acteurId: membre.id,
      action: 'INSCRIPTION',
      entite: 'Membre',
      entiteId: membre.id,
      details: {
        idMembre: membre.idMembre,
        collision: idResult.collision,
      },
      ipAddress: meta.ip,
    });

    // Pas de cotisation « en attente » à l'inscription :
    // le paiement se crée au moment du versement (montant libre).

    const token = this.signToken(membre);
    return {
      token,
      membre: withAdminFlag(membre),
      collision: idResult.collision,
      message: idResult.collision
        ? `Inscription réussie. Un ID de collision a été généré : ${membre.idMembre}`
        : 'Inscription réussie. Votre compte est validé.',
    };
  }

  async login({ email, contact, password, idMembre }, meta = {}) {
    if (!password) throw new AppError('Mot de passe requis', 400);

    let membre = null;
    if (email) {
      membre = await prisma.membre.findUnique({
        where: { email },
        include: { role: true },
      });
    } else if (idMembre) {
      membre = await prisma.membre.findUnique({
        where: { idMembre },
        include: { role: true },
      });
    } else if (contact) {
      const contactNorm = String(contact).replace(/\s+/g, '').trim();
      membre = await prisma.membre.findFirst({
        where: {
          OR: [{ contact: contactNorm }, { contact }],
        },
        include: { role: true },
      });
    } else {
      throw new AppError('Identifiant requis (email, contact ou id_membre)', 400);
    }

    if (!membre) throw new AppError('Identifiants incorrects', 401);

    const valid = await bcrypt.compare(password, membre.passwordHash);
    if (!valid) throw new AppError('Identifiants incorrects', 401);

    if (membre.statut === 'REJETE' || membre.statut === 'SUSPENDU') {
      throw new AppError('Compte non autorisé', 403);
    }

    const publicMembre = withAdminFlag(
      await prisma.membre.findUnique({
        where: { id: membre.id },
        select: membrePublicSelect,
      })
    );

    await auditService.log({
      acteurId: membre.id,
      action: 'LOGIN',
      entite: 'Membre',
      entiteId: membre.id,
      ipAddress: meta.ip,
    });

    return { token: this.signToken(publicMembre), membre: publicMembre };
  }
}

module.exports = new AuthService();
module.exports.membrePublicSelect = membrePublicSelect;
module.exports.withAdminFlag = withAdminFlag;
