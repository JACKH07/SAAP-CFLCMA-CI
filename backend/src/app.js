const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { errorHandler } = require('./utils/errors');

const authRoutes = require('./routes/authRoutes');
const geoRoutes = require('./routes/geoRoutes');
const membreRoutes = require('./routes/membreRoutes');
const cotisationRoutes = require('./routes/cotisationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

if (config.appEnv === 'production' || config.appEnv === 'preprod') {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto.split(',')[0].trim() === 'http') {
      const host = req.headers.host || 'localhost';
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    next();
  });
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: config.appEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(config.upload.dir)));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'SAAP CFLCMA-CI', status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', geoRoutes);
app.use('/api/activites', require('./routes/activiteRoutes'));
app.use('/api/membres', membreRoutes);
app.use('/api/admins', require('./routes/adminAccountRoutes'));
app.use('/api/cotisations', cotisationRoutes);
app.use('/api/dashboard', dashboardRoutes);

const publicDir = path.resolve(__dirname, '../public');
const serveFrontend =
  process.env.SERVE_FRONTEND === 'true' ||
  (config.appEnv === 'production' && fs.existsSync(path.join(publicDir, 'index.html')));

if (serveFrontend) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

app.use(errorHandler);

module.exports = app;
