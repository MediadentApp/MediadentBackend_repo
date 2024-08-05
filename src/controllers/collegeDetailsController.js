const College = require('@src/models/collegeDetailsSchema');
const AppError = require('@src/utils/appError');
const catchAsync = require('@src/utils/catchAsync');

exports.total = catchAsync(async (req, res, next) => {
  const count = await College.countDocuments();
  res.status(200).json({ data:count });
});

exports.getAllUniversities = catchAsync(async (req, res, next) => {
  const universities = await College.distinct('universityName');

  if (!universities) {
    return next(new AppError('No universities found', 404));
  }

  const cleanedUniversities = universities.map(university =>
    university.replace(/\(Id\s*:\s*[UC]-\d+\)/ig, '').trim()
  );

  res.status(200).json({data:cleanedUniversities});
});

exports.search = catchAsync(async (req, res, next) => {
  const keyword = req.query.keyword.toLowerCase();
  const regex = new RegExp(keyword, 'i');

  const colleges = await College.find({
    collegeName: { $regex: regex }
  }).select('_id collegeName');

  if (colleges.length === 0) {
    return next(new AppError('No colleges found matching the search criteria', 404));
  }

  const cleanedColleges = colleges.map(college => ({
    id: college._id,
    collegeName: college.collegeName.replace(/\(Id\s*:\s*[UC]-\d+\)/ig, '').trim()
  }));

  res.status(200).json({data:cleanedColleges});
});

exports.getByState = catchAsync(async (req, res, next) => {
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

  res.status(200).json({data:result});
});

exports.getByDistrict = catchAsync(async (req, res, next) => {
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

  res.status(200).json({data:result});
});

exports.getAllStates = catchAsync(async (req, res, next) => {
  const states = await College.distinct('state');

  if (!states) {
    return next(new AppError('No states found', 404));
  }

  res.status(200).json({data:states});
});

exports.getDistrictsByState = catchAsync(async (req, res, next) => {
  const state = req.query.state.toLowerCase();
  const districts = await College.distinct('district', { state: new RegExp(state, 'i') });

  if (districts.length === 0) {
    return next(new AppError('No districts found for the specified state', 404));
  }

  res.status(200).json({data:districts});
});