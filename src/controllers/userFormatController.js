const { UserFormat, College, University, CityStates } = require("@src/models/userFormatModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const { findKeyValues } = require("@src/utils/util");

exports.allBoards = catchAsync(async (req, res, next) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.boards');
  const boards = result?.userAcademicDetails?.boards;
  if (!boards) return next(new AppError(`Could not find board list`, 404));

  res.status(200).json({ data: boards });
});

exports.allStreams = catchAsync(async (req, res, next) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.streams');
  const streams = result?.userAcademicDetails?.streams;
  if (!streams) return next(new AppError(`Could not find streams list`, 404));

  res.status(200).json({ data: streams });
});

exports.allGraduationCourses = catchAsync(async (req, res, next) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.graduation');
  const graduationCourses = result?.userAcademicDetails?.graduation;
  if (!graduationCourses) return next(new AppError(`Could not find graduation courses list`, 404));

  const courses = findKeyValues(graduationCourses, 'courses');

  res.status(200).json({ data: courses });
});

exports.allPostGraduationCourses = catchAsync(async (req, res, next) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.postGraduation');
  const postGraduationCourses = result?.userAcademicDetails?.postGraduation;
  if (!postGraduationCourses) return next(new AppError(`Could not find graduation courses list`, 404));

  const courses = findKeyValues(postGraduationCourses, 'courses');

  res.status(200).json({ data: courses });
});

exports.allProfessions = catchAsync(async (req, res, next) => {
  const result = await UserFormat.findOne({}, 'userAcademicDetails.professions');
  const professions = result?.userAcademicDetails?.professions;
  if (!professions) return next(new AppError(`Could not find professions list`, 404));

  res.status(200).json({ data: professions });
});


//? College,State,University apis
exports.total = catchAsync(async (req, res, next) => {
  const count = await College.aggregate([
    { $count: 'total' }
  ]);

  res.status(200).json({ data: count[0].total });
});

exports.getAllUniversities = catchAsync(async (req, res, next) => {
  const universities = await University.aggregate([
    {
      $group: {
        _id: null,
        universitiesArr: { $addToSet: "$name" } // Use $addToSet to avoid duplicates
      }
    }
  ]);

  // Check if universitiesArr exists and has items
  if (!universities.length || !universities[0].universitiesArr.length) {
    return next(new AppError('No universities found', 404));
  }

  res.status(200).json({ data: universities[0].universitiesArr });
});

exports.searchCollege = catchAsync(async (req, res, next) => {
  const keyword = req.query.keyword.toLowerCase();
  const regex = new RegExp(keyword, 'i');

  const colleges = await College.find(
    { name: { $regex: regex } }, // Use regex to search for college names
    { name: 1, state: 1, city: 1, _id: 0 } // Project only the name field, exclude _id
  );

  if (!colleges) {
    return next(new AppError('No colleges found matching the search criteria', 404));
  }
  const formattedColleges = colleges.map(college => {
    return `${college.name} - ${college.state}, ${college.city}`;
  });

  res.status(200).json({ data: formattedColleges });
});

exports.getAllStates = catchAsync(async (req, res, next) => {
  const states = await CityStates.aggregate([
    {
      $group: {
        _id: null,
        states: {
          $addToSet: "$state"
        }
      }
    },
    {
      $project: {
        states: {
          $sortArray: {
            input: "$states",
            sortBy: 1
          }
        }
      }
    }
  ]);

  if (!states) {
    return next(new AppError('No states found', 404));
  }

  res.status(200).json({ data: states[0].states });
});

exports.getAllCities= catchAsync(async (req, res, next) => {
  const cities = await CityStates.aggregate([
    {
      $group: {
        _id: null,
        cities: {
          $addToSet: "$city"
        }
      }
    },
    {
      $project: {
        cities: {
          $sortArray: {
            input: "$cities",
            sortBy: 1
          }
        }
      }
    }
  ]);

  if (!cities) {
    return next(new AppError('No cities found', 404));
  }

  res.status(200).json({ data: cities[0].cities });
});

// !Not updated
exports.getByState = catchAsync(async (req, res, next) => {
  res.status(200).json({ data: 'Not updated!' });
  const state = req.query.state.toLowerCase();
  const offset = parseInt(req.query.offset, 10) || 0;
  const limit = 10;

  const result = await College.find({ state: new RegExp(state, 'i') })
    .skip(offset)
    .limit(limit)
    .select('_id state');

  if (result.length === 0) {
    return next(new AppError('No colleges found for the specified state', 404));
  }

  res.status(200).json({ data: result });
});

// !Not updated
exports.getByDistrict = catchAsync(async (req, res, next) => {
  res.status(200).json({ data: 'Not updated!' });
  const district = req.query.district.toLowerCase();
  const offset = parseInt(req.query.offset, 10) || 0;
  const limit = 10;

  const result = await College.find({ district: new RegExp(district, 'i') })
    .skip(offset)
    .limit(limit)
    .select('_id district');

  if (result.length === 0) {
    return next(new AppError('No colleges found for the specified district', 404));
  }

  res.status(200).json({ data: result });
});

// !Not updated
exports.getDistrictsByState = catchAsync(async (req, res, next) => {
  res.status(200).json({ data: 'Not updated!' });
  const state = req.query.state.toLowerCase();
  const districts = await College.distinct('district', { state: new RegExp(state, 'i') });

  if (districts.length === 0) {
    return next(new AppError('No districts found for the specified state', 404));
  }

  res.status(200).json({ data: districts });
});