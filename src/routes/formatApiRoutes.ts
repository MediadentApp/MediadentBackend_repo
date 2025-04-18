import {
  getAllBoards,
  allGraduationCourses,
  allPostGraduationCourses,
  allProfessions,
  allStreams,
  getAllCities,
  getAllStates,
  getUniversities,
  getUserTypes,
  getCollege,
  getUsers,
  getTotalColleges,
  getGenders,
  getUserInterests,
} from '#src/controllers/userFormatController.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppPaginatedResponse, IPaginationOptions } from '#src/types/api.response.paginated.js';
import express, { NextFunction, Request, Response, Router } from 'express';

const router: Router = express.Router();

// ?User
router.get('/search', (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
  getUsers(req, res, next)
);

// ?Form formats
router.get(
  '/usertypes',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getUserTypes(req, res, next)
);
router.get(
  '/usergenders',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getGenders(req, res, next)
);
router.get(
  '/userinterests',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getUserInterests(req, res, next)
);

// ?Academic Details
router.get(
  '/allboards',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getAllBoards(req, res, next)
);
router.get(
  '/allstreams',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    allStreams(req, res, next)
);
router.get(
  '/allgraduationcourses',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    allGraduationCourses(req, res, next)
);
router.get(
  '/allpostgraduationcourses',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    allPostGraduationCourses(req, res, next)
);
router.get(
  '/professions',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    allProfessions(req, res, next)
);

// ?College, State, University APIs
router.get(
  '/totalcollege',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getTotalColleges(req, res, next)
);
router.get(
  '/universities',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getUniversities(req, res, next)
);
router.get(
  '/searchcollege',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getCollege(req, res, next)
);
router.get(
  '/allstates',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getAllStates(req, res, next)
);
router.get(
  '/allcities',
  (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) =>
    getAllCities(req, res, next)
);

export default router;
