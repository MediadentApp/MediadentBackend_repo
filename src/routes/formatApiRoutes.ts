import {
  allBoards,
  allGraduationCourses,
  allPostGraduationCourses,
  allProfessions,
  allStreams,
  getAllCities,
  getAllStates,
  getAllUniversities,
  getByDistrict,
  getByState,
  getCityStates,
  getDistrictsByState,
  searchCollege,
  searchUsers,
  total,
  userGenders,
  userInterests,
  userTypes,
} from '#src/controllers/userFormatController.js';
import express, { NextFunction, Request, Response, Router } from 'express';

const router: Router = express.Router();

// ?User
router.get('/search', (req: Request, res: Response, next: NextFunction) => searchUsers(req, res, next));

// ?Form formats
router.get('/usertypes', (req: Request, res: Response, next: NextFunction) => userTypes(req, res, next));
router.get('/usergenders', (req: Request, res: Response, next: NextFunction) => userGenders(req, res, next));
router.get('/userinterests', (req: Request, res: Response, next: NextFunction) => userInterests(req, res, next));

// ?Academic Details
router.get('/allboards', (req: Request, res: Response, next: NextFunction) => allBoards(req, res, next));
router.get('/allstreams', (req: Request, res: Response, next: NextFunction) => allStreams(req, res, next));
router.get('/allgraduationcourses', (req: Request, res: Response, next: NextFunction) =>
  allGraduationCourses(req, res, next)
);
router.get('/allpostgraduationcourses', (req: Request, res: Response, next: NextFunction) =>
  allPostGraduationCourses(req, res, next)
);
router.get('/professions', (req: Request, res: Response, next: NextFunction) => allProfessions(req, res, next));

// ?College, State, University APIs
router.get('/totalcollege', (req: Request, res: Response, next: NextFunction) => total(req, res, next));
router.get('/universities', (req: Request, res: Response, next: NextFunction) => getAllUniversities(req, res, next));
router.get('/searchcollege', (req: Request, res: Response, next: NextFunction) => searchCollege(req, res, next));
router.get('/allstates', (req: Request, res: Response, next: NextFunction) => getAllStates(req, res, next));
router.get('/allcities', (req: Request, res: Response, next: NextFunction) => getAllCities(req, res, next));
router.get('/getcitystate', (req: Request, res: Response, next: NextFunction) => getCityStates(req, res, next));
router.get('/state', (req: Request, res: Response, next: NextFunction) => getByState(req, res, next));
router.get('/districts', (req: Request, res: Response, next: NextFunction) => getDistrictsByState(req, res, next));
router.get('/district', (req: Request, res: Response, next: NextFunction) => getByDistrict(req, res, next));

export default router;
