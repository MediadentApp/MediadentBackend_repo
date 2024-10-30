const config = require("@src/config/config");
const { UserFormat, College, University, CityStates } = require("@src/models/userFormatModel");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const { findKeyValues, stringToObjectID } = require("@src/utils/util");

// ?User
exports.searchUsers = catchAsync(async (req, res, next) => {
  const { searchValue = ' ', userId = '' } = req.query;

  if (!searchValue) {
    return next(new AppError('Please provide a search term', 400));
  }

  // Use aggregation to search users
  const users = await User.aggregate([
    {
      $match: {
        $or: [
          { firstName: { $regex: searchValue, $options: 'i' } },
          { lastName: { $regex: searchValue, $options: 'i' } },
          { email: { $regex: searchValue, $options: 'i' } },
          { username: { $regex: searchValue, $options: 'i' } },
        ],
        _id: { $ne: stringToObjectID(userId) }
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        username: 1,
        'chats.chatIds': 1,
        'chats.groupChatIds': 1
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

// ?Form formats
exports.userTypes = catchAsync(async (req, res, next) => {
  const userTypes = await UserFormat.findOne({}, 'userType');
  if (!userTypes?.userType) return next(new AppError(`Could not find User Type Options`, 404));

  res.status(200).json({ data: userTypes?.userType });
});

exports.userGenders = catchAsync(async (req, res, next) => {
  const userGenders = await UserFormat.findOne({}, 'userGender');
  if (!userGenders?.userGender) return next(new AppError(`Could not find Gender Options`, 404));

  res.status(200).json({ data: userGenders?.userGender });
});

exports.userInterests = catchAsync(async (req, res, next) => {
  const userInterests = await UserFormat.findOne({}, 'userInterest');
  if (!userInterests?.userInterest) return next(new AppError(`Could not find Interest Options`, 404));

  res.status(200).json({ data: { interests: userInterests?.userInterest, required: config.app.numOfSignupInterests } });
});

// ?Academic Details
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

// ?College,State,University apis
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

exports.getAllCities = catchAsync(async (req, res, next) => {
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

exports.getCityStates = catchAsync(async (req, res, next) => {
  const { query = '', page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  let pipeline = [
    {
      $project: {
        _id: 0,
        cityState: { $concat: ["$city", ", ", "$state"] }
      }
    },
    {
      $group: {
        _id: null,
        citiesStatesArray: { $push: "$cityState" }
      }
    },
    {
      $project: {
        _id: 0,
        citiesStatesArray: 1
      }
    },
    // Unwind the array to be able to paginate
    {
      $unwind: "$citiesStatesArray"
    },
    // Skip and limit for pagination
    {
      $skip: skip
    },
    {
      $limit: parseInt(limit)
    },
    // Group it back into an array after pagination
    {
      $group: {
        _id: null,
        paginatedCitiesStatesArray: { $push: "$citiesStatesArray" }
      }
    }
  ];

  // If a search query is provided, add a match stage
  if (query.length > 0) {
    pipeline.unshift({
      $match: {
        $or: [
          { city: { $regex: query, $options: 'i' } },
          { state: { $regex: query, $options: 'i' } }
        ]
      }
    });
  }

  const citiesStatesData = await CityStates.aggregate(pipeline);

  if (!citiesStatesData || citiesStatesData.length === 0) {
    return next(new AppError('No city/state combinations found', 404));
  }

  const paginatedCitiesStatesArray = citiesStatesData[0]?.paginatedCitiesStatesArray || [];

  // Get the total count of documents for pagination info
  const totalResults = await CityStates.countDocuments(query ? {
    $or: [
      { city: { $regex: query, $options: 'i' } },
      { state: { $regex: query, $options: 'i' } }
    ]
  } : {});

  res.status(200).json({
    status: 'success',
    data: paginatedCitiesStatesArray,
    page: parseInt(page),
    limit: parseInt(limit),
    totalResults
  });
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