const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { errorHandler } = require('./utils/errors');

const authRoutes = require('./routes/authRoutes');
const geoRoutes = require('./routes/geoRoutes');
const membreRoutes = require('./routes/membreRoutes');
const cotisationRoutes = require('./routes/cotisationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

app.use(errorHandler);

module.exports = app;
