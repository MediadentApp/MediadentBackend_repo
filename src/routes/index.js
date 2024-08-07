const express = require('express');
const mainRoutes = require('./mainRoutes');
const userRoutes = require('./userRoutes');
const githubRoutes = require('./githubRoutes');
const googleRoutes = require('./googleAuthRoutes.js');
const collegeRoutes = require('./collegeUniversityApiRoutes');

const router = express.Router();

router.use('/', mainRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/colleges', collegeRoutes);
router.use('/auth/google', googleRoutes);
router.use('/auth/github', githubRoutes);

module.exports = router;
