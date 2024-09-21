const express = require('express');
const userFormatController = require('@src/controllers/userFormatController.js');

const router = express.Router();

//? Form formats
router.get('/usertypes', userFormatController.userTypes);
router.get('/usergenders', userFormatController.userGenders);

//? Academic Details
router.get('/allboards', userFormatController.allBoards);
router.get('/allstreams', userFormatController.allStreams);
router.get('/allgraduationcourses', userFormatController.allGraduationCourses);
router.get('/allpostgraduationcourses', userFormatController.allPostGraduationCourses);
router.get('/professions', userFormatController.allProfessions);

//? College,State,University apis
router.get('/totalcollege', userFormatController.total);
router.get('/universities', userFormatController.getAllUniversities);
router.get('/searchcollege', userFormatController.searchCollege);
router.get('/allstates', userFormatController.getAllStates);
router.get('/allcities', userFormatController.getAllCities);
router.get('/state', userFormatController.getByState);
router.get('/districts', userFormatController.getDistrictsByState);
router.get('/district', userFormatController.getByDistrict);

module.exports = router;