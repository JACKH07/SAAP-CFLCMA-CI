require('dotenv').config({
  path: require('path').resolve(__dirname, `../../.env.${process.env.APP_ENV || process.env.NODE_ENV || 'development'}`),
});
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

const nodeEnv = process.env.NODE_ENV || 'development';
const appEnv = process.env.APP_ENV || nodeEnv;

if ((appEnv === 'production' || appEnv === 'preprod') && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change'))) {
  console.warn(
    `[config] ATTENTION (${appEnv}) : définissez un JWT_SECRET fort et unique dans .env.${appEnv}`
  );
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  appEnv,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },
  orangeMoney: {
    apiUrl: process.env.ORANGE_MONEY_API_URL,
    clientId: process.env.ORANGE_MONEY_CLIENT_ID,
    clientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET,
    merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY,
    webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
  },
  mtnMomo: {
    apiUrl: process.env.MTN_MOMO_API_URL,
    subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY,
    apiUser: process.env.MTN_MOMO_API_USER,
    apiKey: process.env.MTN_MOMO_API_KEY,
    targetEnvironment: process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MTN_MOMO_CALLBACK_URL,
    webhookSecret: process.env.MTN_MOMO_WEBHOOK_SECRET,
  },
};
