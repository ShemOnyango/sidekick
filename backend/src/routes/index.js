const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const agencyRoutes = require('./agencyRoutes');
const authorityRoutes = require('./authorityRoutes');
const alertRoutes = require('./alertRoutes');
const pinRoutes = require('./pinRoutes');
const tripRoutes = require('./tripRoutes');
const uploadRoutes = require('./uploadRoutes');
const gpsRoutes = require('./gpsRoutes');
const offlineRoutes = require('./offlineRoutes');
const syncRoutes = require('./syncRoutes');
const brandingRoutes = require('./brandingRoutes');
const pinTypeRoutes = require('./pinTypeRoutes');
const alertConfigRoutes = require('./alertConfigRoutes');
const authorityConfigRoutes = require('./authorityConfigRoutes');
const configRoutes = require('./configRoutes');
const proximityRoutes = require('./proximityRoutes');
const emailRoutes = require('./emailRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const trackRoutes = require('./trackRoutes');
const tripReportRoutes = require('./tripReportRoutes');
const mapLayerRoutes = require('./mapLayerRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/agencies', agencyRoutes);
router.use('/authorities', authorityRoutes);
router.use('/alerts', alertRoutes);
router.use('/pins', pinRoutes);
router.use('/trips', tripRoutes);
router.use('/trip-reports', tripReportRoutes);
router.use('/upload', uploadRoutes);
router.use('/gps', gpsRoutes);
router.use('/offline', offlineRoutes);
router.use('/sync', syncRoutes);
router.use('/branding', brandingRoutes);
router.use('/config', configRoutes);
router.use('/config', pinTypeRoutes);
router.use('/config', alertConfigRoutes);
router.use('/config', authorityConfigRoutes);
router.use('/proximity', proximityRoutes);
router.use('/email', emailRoutes);
router.use('/audit', auditLogRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/tracks', trackRoutes);
router.use('/map', mapLayerRoutes);

module.exports = router;
