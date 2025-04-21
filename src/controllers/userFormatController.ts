import { NextFunction } from 'express';
import catchAsync from '#src/utils/catchAsync.js';
import { CityStates, College, University, UserFormat } from '#src/models/userFormatModel.js';
import User from '#src/models/userModel.js';
import { FetchPaginatedData, FetchPaginatedDataWithAggregation } from '#src/utils/ApiPaginatedResponse.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import {
  AppPaginatedResponse,
  DefaultProjectionType,
  IPaginatedResponse,
  IPaginationOptions,
} from '#src/types/api.response.paginated.js';
import { ApiPaginatedResponse } from '#src/utils/ApiResponse.js';
import { ICityStates, ICollege, IUniversity, IUser, IUserFormat } from '#src/types/model.js';
import { PipelineStage } from 'mongoose';
import responseMessages from '#src/config/constants/responseMessages.js';

// Search Users
export const getUsers = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse<IUser>, next: NextFunction) => {
    const defaultProjection: DefaultProjectionType = {
      firstName: '1',
      lastName: '1',
      email: '1',
      username: '1',
    };

    const fetchedData = await FetchPaginatedData<IUser>(User, {
      ...req.query,
      defaultProjection,
      searchFields: req.query.searchFields ?? ['firstName', 'lastName', 'email', 'username', '_id'],
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

// Fetch user types
export const getUserTypes = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(UserFormat, {
      defaultProjection: { userType: '1', _id: '0' },
    });

    const userTypes = fetchedData?.data[0]?.userType ?? [];

    return ApiPaginatedResponse(res, { ...fetchedData, data: userTypes });
  }
);

// Fetch user genders
export const getGenders = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(UserFormat, {
      defaultProjection: { userGender: '1', _id: '0' },
    });

    const genders = fetchedData?.data[0]?.userGender ?? [];

    return ApiPaginatedResponse(res, { ...fetchedData, data: genders });
  }
);

// Fetch user interests
export const getUserInterests = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(UserFormat, {
      defaultProjection: { userInterest: '1', _id: '0' },
    });

    const userInterests = fetchedData?.data[0]?.userInterest ?? [];

    return ApiPaginatedResponse(res, { ...fetchedData, data: userInterests });
  }
);

// Academic Details
export const getAllBoards = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
      defaultProjection: { 'userAcademicDetails.boards': '1', _id: '0' },
    });

    const flattenedBoards = fetchResponse.data.map((item: any) => item?.userAcademicDetails?.boards || []).flat();

    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedBoards });
  }
);

export const allStreams = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
      defaultProjection: { 'userAcademicDetails.streams': '1', _id: '0' },
    });

    const flattenedStreams = fetchResponse.data.map((item: any) => item?.userAcademicDetails?.streams || []).flat();

    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedStreams });
  }
);

export const allGraduationCourses = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
      defaultProjection: { 'userAcademicDetails.graduation': '1', _id: '0' },
    });

    const flattenedGraduation = fetchResponse.data
      .map((item: any) => item?.userAcademicDetails?.graduation || [])
      .flat();

    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedGraduation });
  }
);

export const allPostGraduationCourses = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
      defaultProjection: { 'userAcademicDetails.postGraduation': '1', _id: '0' },
    });

    const flattenedPostGraduation = fetchResponse.data
      .map((item: any) => item?.userAcademicDetails?.postGraduation || [])
      .flat();

    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedPostGraduation });
  }
);

export const allProfessions = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchResponse = await FetchPaginatedData(UserFormat, {
      defaultProjection: { 'userAcademicDetails.professions': '1', _id: '0' },
    });

    const flattenedProfessions = fetchResponse.data
      .map((item: any) => item?.userAcademicDetails?.professions || [])
      .flat();

    return ApiPaginatedResponse(res, { ...fetchResponse, data: flattenedProfessions });
  }
);

// College, State, University APIs
export const getTotalColleges = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const aggregation = [{ $count: 'total' }];

    const fetchedResponse = await FetchPaginatedDataWithAggregation(College, aggregation, {});

    return ApiPaginatedResponse(res, fetchedResponse);
  }
);

export const getUniversities = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse<IUniversity>, next: NextFunction) => {
    const fetchedResponse = await FetchPaginatedData<IUniversity>(University, {
      ...req.query,
    });

    return ApiPaginatedResponse(res, fetchedResponse);
  }
);

// Search colleges by name
export const getCollege = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse<ICollege>, next: NextFunction) => {
    const fetchedResponse = await FetchPaginatedData<ICollege>(College, {
      ...req.query,
    });

    return ApiPaginatedResponse(res, fetchedResponse);
  }
);

// Get all unique states
export const getAllStates = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const states = await CityStates.distinct('state', {
      ...(req.query.searchValue && {
        state: { $regex: req.query.searchValue.trim(), $options: 'i' },
      }),
    });

    states.sort(); // Optional: sort alphabetically
    const fetchedResponse: IPaginatedResponse = {
      data: states,
      message: responseMessages.GENERAL.SUCCESS,
      totalItems: states.length,
      totalPages: 1,
      currentPage: 1,
      pageSize: states.length,
      status: 'success',
    };

    return ApiPaginatedResponse(res, fetchedResponse);
  }
);

// Get all unique cities
export const getAllCities = catchAsync(
  async (req: AppPaginatedRequest<IPaginationOptions>, res: AppPaginatedResponse, next: NextFunction) => {
    const searchValue = req.query.searchValue?.trim();
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const cities = await CityStates.distinct('city', {
      ...(searchValue && {
        city: { $regex: searchValue, $options: 'i' },
      }),
    });

    cities.sort();

    const totalItems = cities.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedCities = cities.slice(startIndex, startIndex + pageSize);

    const fetchedResponse: IPaginatedResponse = {
      data: paginatedCities,
      message: responseMessages.GENERAL.SUCCESS,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize,
      status: 'success',
    };

    return ApiPaginatedResponse(res, fetchedResponse);
  }
);
