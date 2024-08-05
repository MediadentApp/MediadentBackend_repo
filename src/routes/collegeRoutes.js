const express = require('express');
const collegeDetailsController = require('../controllers/collegeDetailsController');

const router = express.Router();

router.get('/total', collegeDetailsController.total);
router.get('/universities', collegeDetailsController.getAllUniversities);
router.get('/search', collegeDetailsController.search);
router.get('/allstates', collegeDetailsController.getAllStates);
router.get('/state', collegeDetailsController.getByState);
router.get('/districts', collegeDetailsController.getDistrictsByState);
router.get('/district', collegeDetailsController.getByDistrict);

module.exports = router;
