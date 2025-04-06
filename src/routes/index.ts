const express = require('express');
const mongoose = require('mongoose');
const os = require('os');

const userFormatApi = require('./formatApiRoutes');
const mainRoutes = require('./mainRoutes');
const oauthRoutes = require('./oauthRoutes');
const userAuthRoutes = require('./userAuthRoutes');
const { protect } = require('@src/controllers/authController');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const dbStatus =
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const loadAvg = os.loadavg();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      loadAvg,
      memoryUsage,
      dbConnection: dbStatus,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res
      .status(500)
      .json({ status: 'error', message: 'Server health check failed' });
  }
});
router.use('/api/v1/user', protect, mainRoutes);
router.use('/api/v1/auth', userAuthRoutes);
router.use('/api/v1/userformat', userFormatApi);
router.use('/oauth2', oauthRoutes);

module.exports = router;
