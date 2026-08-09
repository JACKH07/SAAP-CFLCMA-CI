const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const config = require('../config');
const { AppError } = require('../utils/errors');
const auditService = require('./auditService');

const SALT_ROUNDS = 12;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

function normalizeContact(value) {
  return String(value || '')
    .replace(/[\s.\-()]/g, '')
    .trim();
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function buildResetUrl(rawToken) {
  const base = (config.urls.frontend || 'http://localhost:5173').replace(/\/$/, '');
  const path = config.urls.resetPasswordPath || '/reset-password';
  return `${base}${path}?token=${encodeURIComponent(rawToken)}`;
}

/**
 * Envoi du lien (email). Sans SMTP : log console + option d’exposition en mode mock.
 */
async function deliverResetLink({ membre, resetUrl }) {
  const toEmail = membre.email || null;
  const toPhone = membre.contact || null;

  // Placeholder SMTP / SMS — brancher un vrai provider plus tard
  console.info('[password-reset] Lien de réinitialisation généré', {
    membreId: membre.id,
    idMembre: membre.idMembre,
    email: toEmail,
    contact: toPhone,
    resetUrl,
  });

  return {
    channel: toEmail ? 'email' : toPhone ? 'sms' : 'none',
    deliveredTo: toEmail || toPhone || null,
  };
}

class PasswordResetService {
  /**
   * Demande de réinitialisation par email ou téléphone.
   * Réponse générique (ne révèle pas si le compte existe), sauf en mode mock.
   */
  async requestReset({ email, contact, identifiant }, meta = {}) {
    const raw = String(identifiant || email || contact || '').trim();
    if (!raw) {
      throw new AppError('Indiquez votre email ou numéro de téléphone', 400);
    }

    let membre = null;
    if (raw.includes('@')) {
      membre = await prisma.membre.findUnique({
        where: { email: raw.toLowerCase() },
      });
    } else {
      const phone = normalizeContact(raw);
      const candidates = await prisma.membre.findMany({
        where: { contact: { not: null } },
        take: 500,
      });
      membre =
        candidates.find((m) => normalizeContact(m.contact) === phone) || null;
    }

    const genericMessage =
      'Si un compte correspond à ces informations, un lien de réinitialisation a été envoyé.';

    if (!membre) {
      // Ne pas révéler l’absence de compte en production
      if (config.passwordReset?.exposeLink) {
        throw new AppError('Aucun compte trouvé avec cet email ou ce numéro', 404, 'ACCOUNT_NOT_FOUND');
      }
      return { message: genericMessage, sent: false };
    }

    if (membre.statut === 'SUSPENDU' || membre.statut === 'REJETE') {
      if (config.passwordReset?.exposeLink) {
        throw new AppError('Ce compte ne peut pas réinitialiser son mot de passe', 403);
      }
      return { message: genericMessage, sent: false };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + (config.passwordReset?.ttlMs || TOKEN_TTL_MS));

    // Invalider les anciens jetons non utilisés
    await prisma.passwordResetToken.updateMany({
      where: { membreId: membre.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: {
        membreId: membre.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = buildResetUrl(rawToken);
    const delivery = await deliverResetLink({ membre, resetUrl });

    await auditService.log({
      acteurId: membre.id,
      action: 'PASSWORD_RESET_REQUEST',
      entite: 'Membre',
      entiteId: membre.id,
      details: { channel: delivery.channel },
      ipAddress: meta.ip,
    });

    const payload = {
      message: genericMessage,
      sent: true,
      channel: delivery.channel,
    };

    // Utile en local / sans SMTP : exposer le lien pour tester le flow
    if (config.passwordReset?.exposeLink) {
      payload.resetUrl = resetUrl;
      payload.devToken = rawToken;
    }

    return payload;
  }

  async resetPassword({ token, password, confirmPassword }, meta = {}) {
    if (!token) throw new AppError('Lien de réinitialisation invalide', 400, 'TOKEN_INVALID');
    if (!password || String(password).length < 6) {
      throw new AppError('Mot de passe : 6 caractères minimum', 400);
    }
    if (confirmPassword != null && password !== confirmPassword) {
      throw new AppError('Les mots de passe ne correspondent pas', 400);
    }

    const tokenHash = hashToken(String(token).trim());
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: { membre: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new AppError('Lien invalide ou déjà utilisé', 400, 'TOKEN_INVALID');
    }
    if (record.usedAt) {
      throw new AppError('Ce lien a déjà été utilisé', 400, 'TOKEN_USED');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppError('Ce lien a expiré. Demandez-en un nouveau.', 400, 'TOKEN_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.membre.update({
        where: { id: record.membreId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.updateMany({
        where: { membreId: record.membreId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    await auditService.log({
      acteurId: record.membreId,
      action: 'PASSWORD_RESET_COMPLETE',
      entite: 'Membre',
      entiteId: record.membreId,
      ipAddress: meta.ip,
    });

    return {
      message: 'Mot de passe mis à jour. Vous pouvez vous connecter.',
      idMembre: record.membre?.idMembre || null,
    };
  }
}

module.exports = new PasswordResetService();
