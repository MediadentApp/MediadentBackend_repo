import catchAsync from '../utils/catchAsync.js';
import { CityStates, College, University, UserFormat } from '../models/userFormatModel.js';
import User from '../models/userModel.js';
import { FetchPaginatedData, FetchPaginatedDataWithAggregation } from '../utils/ApiPaginatedResponse.js';
import { ApiPaginatedResponse } from '../utils/ApiResponse.js';
// Search Users
export const getUsers = catchAsync(async (req, res, next) => {
    const defaultProjection = {
        firstName: '1',
        lastName: '1',
        email: '1',
        username: '1',
    };
    const fetchedData = await FetchPaginatedData(User, {
        ...req.query,
        defaultProjection,
        searchFields: req.query.searchFields ?? ['firstName', 'lastName', 'email', 'username', '_id'],
    });
    return ApiPaginatedResponse(res, fetchedData);
});
// Fetch user types
export const getUserTypes = catchAsync(async (req, res, next) => {
    const fetchedData = await FetchPaginatedData(UserFormat, {
        defaultProjection: { userType: '1', _id: '0' },
    });
    const userTypes = fetchedData?.data[0]?.userType ?? [];
    return ApiPaginatedResponse(res, { ...fetchedData, data: userTypes });
});
// Fetch user genders
export const getGenders = catchAsync(async (req, res, next) => {
    const fetchedData = await FetchPaginatedData(UserFormat, {
        defaultProjection: { userGender: '1', _id: '0' },
    });
    const genders = fetchedData?.data[0]?.userGender ?? [];
    return ApiPaginatedResponse(res, { ...fetchedData, data: genders });
});
// Fetch user interests
export const getUserInterests = catchAsync(async (req, res, next) => {
    const fetchedData = await FetchPaginatedData(UserFormat, {
        defaultProjection: { userInterest: '1', _id: '0' },
    });
    const userInterests = fetchedData?.data[0]?.userInterest ?? [];
    return ApiPaginatedResponse(res, { ...fetchedData, data: userInterests });
});
// Academic Details
export const getAllBoards = catchAsync(async (req, res, next) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
        defaultProjection: { 'userAcademicDetails.boards': '1', _id: '0' },
    });
    const flattenedBoards = fetchResponse.data.map((item) => item?.userAcademicDetails?.boards || []).flat();
    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedBoards });
});
export const allStreams = catchAsync(async (req, res, next) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
        defaultProjection: { 'userAcademicDetails.streams': '1', _id: '0' },
    });
    const flattenedStreams = fetchResponse.data.map((item) => item?.userAcademicDetails?.streams || []).flat();
    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedStreams });
});
export const allGraduationCourses = catchAsync(async (req, res, next) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
        defaultProjection: { 'userAcademicDetails.graduation': '1', _id: '0' },
    });
    const flattenedGraduation = fetchResponse.data
        .map((item) => item?.userAcademicDetails?.graduation || [])
        .flat();
    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedGraduation });
});
export const allPostGraduationCourses = catchAsync(async (req, res, next) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
        defaultProjection: { 'userAcademicDetails.postGraduation': '1', _id: '0' },
    });
    const flattenedPostGraduation = fetchResponse.data
        .map((item) => item?.userAcademicDetails?.postGraduation || [])
        .flat();
    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedPostGraduation });
});
export const allProfessions = catchAsync(async (req, res, next) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
        defaultProjection: { 'userAcademicDetails.professions': '1', _id: '0' },
    });
    const flattenedProfessions = fetchResponse.data
        .map((item) => item?.userAcademicDetails?.professions || [])
        .flat();
    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedProfessions });
});
// College, State, University APIs
export const getTotalColleges = catchAsync(async (req, res, next) => {
    const aggregation = [{ $count: 'total' }];
    const fetchedResponse = await FetchPaginatedDataWithAggregation(College, aggregation, {});
    return ApiPaginatedResponse(res, fetchedResponse);
});
export const getUniversities = catchAsync(async (req, res, next) => {
    const fetchedResponse = await FetchPaginatedData(University, {
        ...req.query,
    });
    return ApiPaginatedResponse(res, fetchedResponse);
});
// Search colleges by name
export const getCollege = catchAsync(async (req, res, next) => {
    const fetchedResponse = await FetchPaginatedData(College, {
        ...req.query,
    });
    return ApiPaginatedResponse(res, fetchedResponse);
});
// Get all unique states
export const getAllStates = catchAsync(async (req, res, next) => {
    const aggregation = [
        {
            $group: {
                _id: '$state',
            },
        },
        {
            $project: {
                _id: 0,
                state: '$_id',
            },
        },
    ];
    const fetchedResponse = await FetchPaginatedDataWithAggregation(CityStates, aggregation, {
        ...req.query,
        searchFields: ['state'],
    });
    return ApiPaginatedResponse(res, fetchedResponse);
});
// Get all unique cities
export const getAllCities = catchAsync(async (req, res, next) => {
    const aggregation = [
        {
            $group: {
                _id: '$city',
            },
        },
        {
            $project: {
                _id: 0,
                city: '$_id',
            },
        },
    ];
    const fetchedResponse = await FetchPaginatedDataWithAggregation(CityStates, aggregation, {
        ...req.query,
        searchFields: ['city'],
    });
    return ApiPaginatedResponse(res, fetchedResponse);
});
