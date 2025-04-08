import { Request, Response, NextFunction } from 'express';
import ApiError from '#src/utils/appError.js';
import catchAsync from '#src/utils/catchAsync.js';
import { findKeyValues, stringToObjectID } from '#src/utils/index.js';
import { CityStates, College, University, UserFormat } from '#src/models/userFormatModel.js';
import User from '#src/models/userModel.js';
import appConfig from '#src/config/appConfig.js';

// Search Users
export const searchUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const searchValue = (req.query.searchValue as string) || ' ';
  const userId = req.query.userId as string;

  if (!searchValue.trim()) {
    return next(new ApiError('Please provide a search term', 400));
  }

  const users = await User.aggregate([
    {
      $match: {
        $or: [
          { firstName: { $regex: searchValue, $options: 'i' } },
          { lastName: { $regex: searchValue, $options: 'i' } },
          { email: { $regex: searchValue, $options: 'i' } },
          { username: { $regex: searchValue, $options: 'i' } },
        ],
        _id: { $ne: stringToObjectID(userId) },
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        username: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

// Fetch user types
export const userTypes = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userTypes = await UserFormat.findOne({}, 'userType');
  if (!userTypes || !userTypes.userType) return next(new ApiError('Could not find User Type Options', 404));

  res.status(200).json({ data: userTypes.userType });
});

// Fetch user genders
export const userGenders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userGenders = await UserFormat.findOne({}, 'userGender');
  if (!userGenders || !userGenders.userGender) return next(new ApiError('Could not find Gender Options', 404));

  res.status(200).json({ data: userGenders.userGender });
});

// Fetch user interests
export const userInterests = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userInterests = await UserFormat.findOne({}, 'userInterest');
  if (!userInterests || !userInterests.userInterest) return next(new ApiError('Could not find Interest Options', 404));

  res.status(200).json({
    data: {
      interests: userInterests.userInterest,
      required: appConfig.app.numOfSignupInterests,
    },
  });
});

// Academic Details
export const allBoards = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.boards');
  const boards = result?.userAcademicDetails?.boards;
  if (!boards || boards.length === 0) return next(new ApiError('Could not find board list', 404));

  res.status(200).json({ data: boards });
});

export const allStreams = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.streams');
  const streams = result?.userAcademicDetails?.streams;
  if (!streams || streams.length === 0) return next(new ApiError('Could not find streams list', 404));

  res.status(200).json({ data: streams });
});

export const allGraduationCourses = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.graduation');
  const graduationCourses = result?.userAcademicDetails?.graduation;
  if (!graduationCourses) return next(new ApiError('Could not find graduation courses list', 404));

  const courses = findKeyValues(graduationCourses, 'courses');

  res.status(200).json({ data: courses });
});

export const allPostGraduationCourses = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.postGraduation');
  const postGraduationCourses = result?.userAcademicDetails?.postGraduation;
  if (!postGraduationCourses) {
    return next(new ApiError('Could not find post-graduation courses list', 404));
  }

  const courses = findKeyValues(postGraduationCourses, 'courses');

  res.status(200).json({ data: courses });
});

export const allProfessions = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.professions');
  const professions = result?.userAcademicDetails?.professions;
  if (!professions || professions.length === 0) return next(new ApiError('Could not find professions list', 404));

  res.status(200).json({ data: professions });
});

// College, State, University APIs
export const total = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const count = await College.aggregate([{ $count: 'total' }]);

  res.status(200).json({ data: count[0]?.total || 0 });
});

export const getAllUniversities = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const universities = await University.aggregate([
    {
      $group: {
        _id: null,
        universitiesArr: { $addToSet: '$name' }, // Ensures unique university names
      },
    },
  ]);

  if (!universities.length || !universities[0].universitiesArr.length) {
    return next(new ApiError('No universities found', 404));
  }

  res.status(200).json({ data: universities[0].universitiesArr });
});

// Search colleges by name
export const searchCollege = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const keyword = req.query.keyword as string;

  if (!keyword) {
    return next(new ApiError('Keyword is required for searching colleges', 400));
  }

  const regex = new RegExp(keyword.trim(), 'i');

  const colleges = await College.find(
    { name: { $regex: regex } }, // Use regex to search for college names
    {
      name: 1,
      state: 1,
      city: 1,
      _id: 0,
    } // Project only necessary fields
  );

  if (colleges.length === 0) {
    return next(new ApiError('No colleges found matching the search criteria', 404));
  }

  const formattedColleges = colleges.map(college => `${college.name} - ${college.state}, ${college.city}`);

  res.status(200).json({ data: formattedColleges });
});

// Get all unique states
export const getAllStates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const states = await CityStates.aggregate([
    {
      $group: { _id: null, states: { $addToSet: '$state' } },
    },
    {
      $project: { states: 1 },
    },
  ]);

  if (states.length === 0 || !states[0].states.length) {
    return next(new ApiError('No states found', 404));
  }

  res.status(200).json({ data: states[0].states.sort() });
});

// Get all unique cities
export const getAllCities = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const cities = await CityStates.aggregate([
    {
      $group: { _id: null, cities: { $addToSet: '$city' } },
    },
    {
      $project: { cities: 1 },
    },
  ]);

  if (cities.length === 0 || !cities[0].cities.length) {
    return next(new ApiError('No cities found', 404));
  }

  res.status(200).json({ data: cities[0].cities.sort() });
});
// Get paginated city/state combinations
export const getCityStates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const query = (req.query.query as string) || '';
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const skip = (page - 1) * limit;

  const pipeline: any[] = [
    {
      $project: {
        _id: 0,
        cityState: { $concat: ['$city', ', ', '$state'] },
      },
    },
    {
      $group: {
        _id: null,
        citiesStatesArray: { $push: '$cityState' },
      },
    },
    {
      $unwind: '$citiesStatesArray',
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $group: {
        _id: null,
        paginatedCitiesStatesArray: { $push: '$citiesStatesArray' },
      },
    },
  ];

  if (query.trim()) {
    pipeline.unshift({
      $match: {
        $or: [{ city: { $regex: query, $options: 'i' } }, { state: { $regex: query, $options: 'i' } }],
      },
    });
  }

  const citiesStatesData = await CityStates.aggregate(pipeline);
  const paginatedCitiesStatesArray = citiesStatesData[0]?.paginatedCitiesStatesArray || [];

  const totalResults = await CityStates.countDocuments(
    query
      ? {
          $or: [{ city: { $regex: query, $options: 'i' } }, { state: { $regex: query, $options: 'i' } }],
        }
      : {}
  );

  res.status(200).json({
    status: 'success',
    data: paginatedCitiesStatesArray,
    page,
    limit,
    totalResults,
  });
});

// Get colleges by state
export const getByState = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const state = (req.query.state as string)?.toLowerCase();
  if (!state) {
    return next(new ApiError('State is required', 400));
  }

  const offset = parseInt(req.query.offset as string, 10) || 0;
  const limit = 10;

  const result = await College.find({ state: new RegExp(state, 'i') })
    .skip(offset)
    .limit(limit)
    .select('_id state');

  if (result.length === 0) {
    return next(new ApiError('No colleges found for the specified state', 404));
  }

  res.status(200).json({ data: result });
});

// Get colleges by district
export const getByDistrict = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const district = (req.query.district as string)?.toLowerCase();
  if (!district) {
    return next(new ApiError('District is required', 400));
  }

  const offset = parseInt(req.query.offset as string, 10) || 0;
  const limit = 10;

  const result = await College.find({ district: new RegExp(district, 'i') })
    .skip(offset)
    .limit(limit)
    .select('_id district');

  if (result.length === 0) {
    return next(new ApiError('No colleges found for the specified district', 404));
  }

  res.status(200).json({ data: result });
});

// Get distinct districts by state
export const getDistrictsByState = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const state = (req.query.state as string)?.toLowerCase();
  if (!state) {
    return next(new ApiError('State is required', 400));
  }

  const districts = await College.distinct('district', {
    state: new RegExp(state, 'i'),
  });

  if (districts.length === 0) {
    return next(new ApiError('No districts found for the specified state', 404));
  }

  res.status(200).json({ data: districts });
});
