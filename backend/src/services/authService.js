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

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

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
  const isAdminAccount = hasAdminAccess(membre);
  return {
    ...membre,
    // Photo de profil réservée aux comptes utilisateur (pas Super Admin / sous-admins)
    photoUrl: isAdminAccount ? null : absolutizePhotoUrl(membre.photoUrl),
    isAdmin: isAdminAccount,
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
      paroisseId,
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
    if (!regionId || !districtId || (!paroisseId && !paroisseNom) || !communauteNom) {
      throw new AppError('Rattachement géographique incomplet', 400);
    }

    const nomTrim = nom.trim();
    const prenomTrim = prenom.trim();
    const dateNaiss = new Date(dateNaissance);
    const emailNorm = email ? email.trim().toLowerCase() : '';
    const contactNorm = contact ? String(contact).replace(/\s+/g, '').trim() : '';

    // Validations + hash en parallèle (bcrypt ~100–200ms)
    const [district, existingEmail, existingContact, existingIdentity, passwordHash, roleId] =
      await Promise.all([
        prisma.district.findUnique({ where: { id: Number(districtId) } }),
        emailNorm
          ? prisma.membre.findUnique({
              where: { email: emailNorm },
              select: { id: true },
            })
          : Promise.resolve(null),
        contactNorm
          ? prisma.membre.findFirst({
              where: { contact: contactNorm },
              select: { id: true },
            })
          : Promise.resolve(null),
        prisma.membre.findFirst({
          where: {
            nom: nomTrim,
            prenom: prenomTrim,
            dateNaissance: dateNaiss,
          },
          select: { id: true },
        }),
        bcrypt.hash(password, SALT_ROUNDS),
        this.resolveRoleId(fonctionId),
      ]);

    if (!district || district.regionId !== Number(regionId)) {
      throw new AppError('Le district ne correspond pas à la région sélectionnée', 400);
    }
    if (existingEmail) {
      throw new AppError(
        'Vous êtes déjà inscrit avec cet email. Connectez-vous à votre compte.',
        409
      );
    }
    if (existingContact) {
      throw new AppError(
        'Vous êtes déjà inscrit avec ce numéro de contact. Connectez-vous à votre compte.',
        409
      );
    }
    if (existingIdentity) {
      throw new AppError(
        'Cette personne est déjà inscrite. Connectez-vous avec votre ID membre, contact ou email.',
        409
      );
    }

    // Paroisse déjà choisie dans la liste → pas de findOrCreate
    let paroisse;
    if (paroisseId) {
      paroisse = await prisma.paroisse.findUnique({ where: { id: Number(paroisseId) } });
      if (!paroisse || paroisse.districtId !== Number(districtId)) {
        throw new AppError('Paroisse invalide pour ce district', 400);
      }
    } else {
      ({ paroisse } = await lieuAutocompleteService.findOrCreateParoisse(
        paroisseNom,
        Number(districtId)
      ));
    }

    const [{ communaute }, idResult] = await Promise.all([
      lieuAutocompleteService.findOrCreateCommunaute(communauteNom, paroisse.id),
      membreIdService.generateUniqueId(nomTrim, prenomTrim, dateNaissance),
    ]);

    const membre = await prisma.membre.create({
      data: {
        nom: nomTrim,
        prenom: prenomTrim,
        contact: contactNorm || null,
        email: emailNorm || null,
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

    const token = this.signToken(membre);
    const publicMembre = withAdminFlag(membre);

    // Traitements secondaires hors chemin critique (réponse immédiate)
    setImmediate(() => {
      auditService
        .log({
          acteurId: membre.id,
          action: 'INSCRIPTION',
          entite: 'Membre',
          entiteId: membre.id,
          details: {
            idMembre: membre.idMembre,
            collision: idResult.collision,
          },
          ipAddress: meta.ip,
        })
        .catch(() => {});
      if (idResult.collision) {
        membreIdService
          .notifyCollision({
            idMembre: idResult.idMembre,
            baseId: idResult.baseId,
            suffix: idResult.suffix,
          })
          .catch(() => {});
      }
    });

    return {
      token,
      membre: publicMembre,
      collision: idResult.collision,
      message: idResult.collision
        ? `Inscription réussie. Un ID de collision a été généré : ${membre.idMembre}`
        : 'Inscription réussie. Votre compte est validé.',
    };
  }

  async login({ email, contact, password, idMembre, portal, requireAdmin }, meta = {}) {
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

    const wantsAdminPortal =
      portal === 'admin' ||
      requireAdmin === true ||
      requireAdmin === 'true' ||
      requireAdmin === 1 ||
      requireAdmin === '1';

    // Les membres simples n'ont pas le droit de se connecter sur la page admin
    if (wantsAdminPortal && !hasAdminAccess(publicMembre)) {
      throw new AppError(
        'Accès réservé aux administrateurs. Utilisez la page Connexion membre.',
        403
      );
    }

    await auditService.log({
      acteurId: membre.id,
      action: wantsAdminPortal ? 'LOGIN_ADMIN' : 'LOGIN',
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
