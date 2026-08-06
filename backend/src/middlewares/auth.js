const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');
const { membrePublicSelect } = require('../services/authService');
const { hasAdminAccess, isSuperAdmin } = require('../utils/roles');

/**
 * Vérifie le JWT et charge le membre connecté.
 */
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentification requise', 401);
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch {
      throw new AppError('Token invalide ou expiré', 401);
    }

    const membreId = Number(payload.sub);
    if (!Number.isFinite(membreId) || membreId <= 0) {
      throw new AppError('Token invalide ou expiré', 401);
    }

    const membre = await prisma.membre.findUnique({
      where: { id: membreId },
      select: membrePublicSelect,
    });

    if (!membre) throw new AppError('Utilisateur introuvable', 401);
    if (membre.statut === 'REJETE' || membre.statut === 'SUSPENDU') {
      throw new AppError('Compte non autorisé', 403);
    }

    req.user = {
      ...membre,
      isAdmin: hasAdminAccess(membre),
      isSuperAdmin: isSuperAdmin(membre),
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Réservé aux comptes admin (Super Admin ou Admin délégué).
 */
function requireAdmin(req, _res, next) {
  if (!hasAdminAccess(req.user)) {
    return next(new AppError('Accès réservé aux administrateurs', 403));
  }
  next();
}

/**
 * Réservé au Super Admin — création et supervision des comptes admin.
 */
function requireSuperAdmin(req, _res, next) {
  if (!isSuperAdmin(req.user)) {
    return next(new AppError('Accès réservé au Super Admin', 403));
  }
  next();
}

/**
 * Pour les non-admins, force le membre_id de la ressource à celui du connecté.
 * Utilisé sur les routes qui acceptent un :id ou un body.membreId.
 */
function restrictToSelf(paramName = 'id') {
  return (req, _res, next) => {
    if (hasAdminAccess(req.user)) return next();

    const targetId = req.params[paramName] || req.body.membreId || req.query.membreId;
    if (targetId != null && Number(targetId) !== req.user.id) {
      return next(new AppError('Accès limité à votre propre profil', 403));
    }

    // Force le membreId dans le body pour les créations de paiement
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'membreId')) {
      req.body.membreId = req.user.id;
    }

    next();
  };
}

/**
 * Vérifie le périmètre géographique pour les rôles de coordination.
 * Croise niveau_hierarchique avec region/district/paroisse/communaute.
 * Niveaux : 1=C.G., 2=C.D.R., 3=C.D.D., 4=C.D.P., 5–8=troupe/patrouille, 9=membres actifs
 */
function requireGeoScope(getResourceScope) {
  return async (req, _res, next) => {
    try {
      if (hasAdminAccess(req.user)) return next();

      const niveau = req.user.role?.niveauHierarchique ?? 99;

      // Membres actifs (niveau 9) : pas d'accès géo étendu
      if (niveau >= 9) {
        return next(new AppError('Permission insuffisante', 403));
      }

      // Coordinateur général (niveau 1) : accès national
      if (niveau === 1) return next();

      const scope = await getResourceScope(req);
      if (!scope) return next();

      if (niveau === 2 && scope.regionId && scope.regionId !== req.user.regionId) {
        return next(new AppError('Hors de votre périmètre régional', 403));
      }
      if (niveau === 3 && scope.districtId && scope.districtId !== req.user.districtId) {
        return next(new AppError('Hors de votre périmètre de district', 403));
      }
      if (niveau === 4 && scope.paroisseId && scope.paroisseId !== req.user.paroisseId) {
        return next(new AppError('Hors de votre périmètre de paroisse', 403));
      }
      if (niveau >= 5 && niveau < 10) {
        if (scope.communauteId && scope.communauteId !== req.user.communauteId) {
          return next(new AppError('Hors de votre périmètre de communauté', 403));
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  restrictToSelf,
  requireGeoScope,
};
