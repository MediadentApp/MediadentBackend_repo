const express = require('express');
const academicProgramsController = require('../controllers/academicProgramsController');
const { protect } = require('@src/controllers/authController');

const router = express.Router();

router.get('/allboards', academicProgramsController.allBoards);
router.get('/allstreams', academicProgramsController.allStreams);
router.get('/allgraduationcourses', academicProgramsController.allGraduationCourses);
router.get('/allpostgraduationcourses', academicProgramsController.allPostGraduationCourses);
router.get('/professions', academicProgramsController.allProfessions);

router.post('/academicdetails',protect, academicProgramsController.saveAcademicDetails);
router.put('/ademicdetails',protect, academicProgramsController.updateAcademicDetails);
router.get('/academicdetails',protect, academicProgramsController.getAcademicDetails);

module.exports = router;
