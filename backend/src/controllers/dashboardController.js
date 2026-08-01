const dashboardService = require('../services/dashboardService');
const auditService = require('../services/auditService');
const { asyncHandler } = require('../utils/errors');

exports.stats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getStats(req.query);
  res.json({ success: true, data });
});

exports.statsDistricts = asyncHandler(async (req, res) => {
  const data = await dashboardService.statsByDistrict(req.query.regionId, req.query.activiteId);
  res.json({ success: true, data });
});

exports.exportExcel = asyncHandler(async (req, res) => {
  const buffer = await dashboardService.exportExcel(req.query);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=rapport-cflcma-ci.xlsx');
  res.send(buffer);
});

exports.exportPdf = asyncHandler(async (req, res) => {
  const buffer = await dashboardService.exportPdf(req.query);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=rapport-cflcma-ci.pdf');
  res.send(buffer);
});

exports.auditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.list(req.query);
  res.json({ success: true, ...result });
});
