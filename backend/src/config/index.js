const path = require('path');

function resolveUploadDir() {
  const raw = process.env.UPLOAD_DIR || 'uploads';
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

require('dotenv').config({
  path: path.resolve(__dirname, `../../.env.${process.env.APP_ENV || process.env.NODE_ENV || 'development'}`),
});
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

const nodeEnv = process.env.NODE_ENV || 'development';
const appEnv = process.env.APP_ENV || nodeEnv;

/** Sandbox tant que l’app Orange Developer n’est pas abonnée à WebPay CI. */
function resolveOrangeWebpayEnv() {
  const raw = String(process.env.ORANGE_MONEY_ENV || 'dev').toLowerCase();
  if (raw === 'ci' && process.env.ORANGE_MONEY_ALLOW_CI === 'true') return 'ci';
  return 'dev';
}

const orangeWebpayEnv = resolveOrangeWebpayEnv();
const orangeCurrency = orangeWebpayEnv === 'ci' ? 'XOF' : 'OUV';

if ((appEnv === 'production' || appEnv === 'preprod') && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change'))) {
  console.warn(
    `[config] ATTENTION (${appEnv}) : définissez un JWT_SECRET fort et unique dans .env.${appEnv}`
  );
}

const frontendUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(
  /\/$/,
  ''
);

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  appEnv,
  corsOrigin: process.env.CORS_ORIGIN || frontendUrl,
  urls: {
    frontend: frontendUrl,
    apiPublic: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}/api`,
    memberLogin: process.env.MEMBER_LOGIN_URL || `${frontendUrl}/login`,
    adminLogin: process.env.ADMIN_LOGIN_URL || `${frontendUrl}/admin_connecte`,
    register: process.env.REGISTER_URL || `${frontendUrl}/register`,
    adminDashboard: process.env.ADMIN_DASHBOARD_URL || `${frontendUrl}/admin`,
    adminMembres: process.env.ADMIN_MEMBRES_URL || `${frontendUrl}/admin/membres`,
    adminCotisations: process.env.ADMIN_COTISATIONS_URL || `${frontendUrl}/admin/cotisations`,
    adminBureau: process.env.ADMIN_BUREAU_URL || `${frontendUrl}/admin/bureau`,
    adminCompte: process.env.ADMIN_COMPTE_URL || `${frontendUrl}/admin/compte`,
    adminActivite: process.env.ADMIN_ACTIVITE_URL || `${frontendUrl}/admin/activites`,
    profil: process.env.PROFIL_URL || `${frontendUrl}/profil`,
    mesCotisations: process.env.MES_COTISATIONS_URL || `${frontendUrl}/mes-cotisations`,
    resetPasswordPath: process.env.RESET_PASSWORD_PATH || '/reset-password',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  upload: {
    dir: resolveUploadDir(),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },
  passwordReset: {
    ttlMs: parseInt(process.env.PASSWORD_RESET_TTL_MS || `${60 * 60 * 1000}`, 10),
    // true en local par défaut pour tester sans SMTP
    exposeLink:
      process.env.PASSWORD_RESET_EXPOSE_LINK === 'true' ||
      (process.env.PASSWORD_RESET_EXPOSE_LINK !== 'false' &&
        (appEnv === 'development' || nodeEnv === 'development')),
  },
  orangeMoney: {
    apiUrl: process.env.ORANGE_MONEY_API_URL || 'https://api.orange.com/orange-money-webpay',
    oauthUrl: process.env.ORANGE_MONEY_OAUTH_URL || 'https://api.orange.com/oauth/v3/token',
    env: orangeWebpayEnv,
    currency: orangeCurrency,
    clientId: process.env.ORANGE_MONEY_CLIENT_ID,
    clientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET,
    merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY,
    webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
    returnUrl: process.env.ORANGE_MONEY_RETURN_URL,
    cancelUrl: process.env.ORANGE_MONEY_CANCEL_URL,
    notifUrl:
      process.env.ORANGE_MONEY_NOTIF_URL ||
      process.env.ORANGE_MONEY_CALLBACK_URL ||
      `${process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}/api`}/cotisations/webhooks/orange`,
    callbackUrl:
      process.env.ORANGE_MONEY_CALLBACK_URL ||
      `${process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}/api`}/cotisations/webhooks/orange`,
  },
  wave: {
    apiUrl: process.env.WAVE_API_URL || 'https://api.wave.com',
    apiKey: process.env.WAVE_API_KEY,
    webhookSecret: process.env.WAVE_WEBHOOK_SECRET,
    successUrl: process.env.WAVE_SUCCESS_URL,
    errorUrl: process.env.WAVE_ERROR_URL,
    callbackUrl:
      process.env.WAVE_CALLBACK_URL ||
      `${process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}/api`}/cotisations/webhooks/wave`,
  },
  /** MTN MoMo — prêt pour une future activation */
  mtnMomo: {
    apiUrl: process.env.MTN_MOMO_API_URL,
    subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY,
    apiUser: process.env.MTN_MOMO_API_USER,
    apiKey: process.env.MTN_MOMO_API_KEY,
    targetEnvironment: process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MTN_MOMO_CALLBACK_URL,
    webhookSecret: process.env.MTN_MOMO_WEBHOOK_SECRET,
  },
  payment: {
    // true | false | undefined (auto : mock si pas de credentials)
    mockMode:
      process.env.PAYMENT_MOCK_MODE === 'true'
        ? true
        : process.env.PAYMENT_MOCK_MODE === 'false'
          ? false
          : undefined,
    // success | pending | failed | timeout
    mockResult: process.env.PAYMENT_MOCK_RESULT || 'success',
  },
};
