import { getAllBoards, allGraduationCourses, allPostGraduationCourses, allProfessions, allStreams, getAllCities, getAllStates, getUniversities, getUserTypes, getCollege, getUsers, getTotalColleges, getGenders, getUserInterests, } from '../controllers/userFormatController.js';
import express from 'express';
const router = express.Router();
// ?User
router.get('/search', (req, res, next) => getUsers(req, res, next));
// ?Form formats
router.get('/usertypes', (req, res, next) => getUserTypes(req, res, next));
router.get('/usergenders', (req, res, next) => getGenders(req, res, next));
router.get('/userinterests', (req, res, next) => getUserInterests(req, res, next));
// ?Academic Details
router.get('/allboards', (req, res, next) => getAllBoards(req, res, next));
router.get('/allstreams', (req, res, next) => allStreams(req, res, next));
router.get('/allgraduationcourses', (req, res, next) => allGraduationCourses(req, res, next));
router.get('/allpostgraduationcourses', (req, res, next) => allPostGraduationCourses(req, res, next));
router.get('/professions', (req, res, next) => allProfessions(req, res, next));
// ?College, State, University APIs
router.get('/totalcollege', (req, res, next) => getTotalColleges(req, res, next));
router.get('/universities', (req, res, next) => getUniversities(req, res, next));
router.get('/searchcollege', (req, res, next) => getCollege(req, res, next));
router.get('/allstates', (req, res, next) => getAllStates(req, res, next));
router.get('/allcities', (req, res, next) => getAllCities(req, res, next));
export default router;
