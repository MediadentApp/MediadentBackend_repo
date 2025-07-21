import { Types } from 'mongoose';
import responseMessages from '../config/constants/responseMessages.js';
import ApiError from '../utils/ApiError.js';
import { ErrorCodes } from '../config/constants/errorCodes.js';
// !!! TODO: Move rawFilter to its own field
/**
 * Fetches paginated data from the database.
 *
 * @param {Model} model - The model to query
 * @param {Partial<IPaginationOptions> & Record<string, any>} rawOptions - The raw query options
 * @returns {Promise<IPaginatedResponse<T>>} - The paginated response
 *
 * @remarks
 * This function takes a model and raw query options as parameters and returns a paginated response.
 * The raw query options can include the following properties:
 * - page: The page number to fetch (starts from 1)
 * - pageSize: The number of items to fetch per page
 * - searchValue: The value to search for in the search fields
 * - searchFields: The fields to search in
 * - projection: The fields to project
 * - excludeIds: The _ids to exclude
 * - ids: The _ids to match
 * - sortField: The field to sort by
 * - sortOrder: The order to sort by (asc or desc)
 *
 * The function normalizes the search fields, applies the search filter, and fetches the data.
 * It then creates a paginated response object and returns it.
 *
 * @example GET /api/users/search?page=1&pageSize=5&searchValue=alice
 * @example GET /api/users/search?page=1&projection=firstName,email,username
 * @example GET /api/users/search?excludeIds=661fabc9e4f1a0d33c5d3333,661fabc9e4f1a0d33c5d3334
 */
export async function FetchPaginatedData(model, rawOptions) {
    const { page: rawPage = '1', pageSize: rawPageSize = '10', selectFields, searchValue, searchFields = [], projection, populateFields, defaultProjection = {}, sortField, sortOrder, excludeIds, ids, ...rawFilter } = rawOptions;
    const page = Number(rawPage);
    const pageSize = Number(rawPageSize);
    const filter = { ...rawFilter };
    if (page <= 0) {
        throw new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT);
    }
    // Parse and apply selectFields (overrides projection if used)
    let selectFieldsObj = undefined;
    if (selectFields && typeof selectFields === 'string') {
        const fields = selectFields.split(',').map(field => field.trim());
        if (fields.length > 0) {
            selectFieldsObj = fields.reduce((acc, field) => {
                if (field.startsWith('-')) {
                    acc[field.substring(1)] = 0;
                }
                else {
                    acc[field] = 1;
                }
                return acc;
            }, {});
        }
    }
    let projectionObj = defaultProjection;
    // If projection is passed in the query, as comma separated, override defaults
    if (projection && typeof projection === 'string') {
        const fields = projection.split(',').map(field => field.trim());
        if (fields.length > 0) {
            projectionObj = fields.reduce((acc, field) => {
                if (field)
                    acc[field] = '1';
                return acc;
            }, {});
        }
    }
    // Parse and apply `excludeIds` (skip specified _ids)
    if (excludeIds) {
        const parsed = Array.isArray(excludeIds) ? excludeIds : typeof excludeIds === 'string' ? excludeIds.split(',') : [];
        filter._id = {
            ...(filter._id || {}),
            $nin: parsed
                .filter((id) => Types.ObjectId.isValid(id))
                .map((id) => Types.ObjectId.createFromHexString(id.toString())),
        };
    }
    // Parse and apply `ids` filter (match only specified _ids)
    if (ids) {
        const parsed = Array.isArray(ids) ? ids : typeof ids === 'string' ? ids.split(',') : [];
        const validIds = parsed.filter(id => Types.ObjectId.isValid(id)).map(id => Types.ObjectId.createFromHexString(id));
        if (validIds.length > 0) {
            filter._id = { $in: validIds };
        }
    }
    // Normalize search fields
    const normalizedSearchFields = Array.isArray(searchFields)
        ? searchFields
        : typeof searchFields === 'string'
            ? searchFields.split(',').map(field => field.trim())
            : [];
    // Apply search
    if (searchValue && normalizedSearchFields.length > 0) {
        const regexOrs = normalizedSearchFields
            .filter(field => field !== '_id')
            .map(field => ({
            [field]: { $regex: searchValue.trim(), $options: 'i' },
        }));
        const objectIdOr = Types.ObjectId.isValid(searchValue) && normalizedSearchFields.includes('_id')
            ? [{ _id: new Types.ObjectId(searchValue) }]
            : [];
        filter.$or = [...regexOrs, ...objectIdOr];
    }
    const totalItems = await model.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / Number(pageSize));
    const skip = (Number(page) - 1) * Number(pageSize);
    const cleanProjection = Object.fromEntries(Object.entries(projectionObj).map(([key, value]) => [key, Number(value)]));
    const sort = !!sortField
        ? { [sortField]: sortOrder === 'desc' ? -1 : 1 }
        : { createdAt: -1 };
    // Create query
    const query = model
        .find(filter, cleanProjection)
        .sort(sort)
        .skip(skip)
        .limit(Number(pageSize))
        .lean({ virtuals: true });
    // Apply selectFields if provided
    if (selectFieldsObj) {
        query.select(selectFieldsObj);
    }
    // Apply population
    if (populateFields) {
        const populateArray = Array.isArray(populateFields) ? populateFields : [populateFields];
        populateArray.forEach((populateObj) => {
            query.populate(populateObj);
        });
    }
    const data = (await query.exec());
    const returnData = {
        data,
        totalItems,
        totalPages,
        currentPage: Number(page),
        pageSize: Number(pageSize),
        status: 'success',
        message: responseMessages.GENERAL.SUCCESS,
        hasMore: data.length === Number(pageSize),
    };
    return returnData;
}
export async function FetchPaginatedDataWithAggregation(model, basePipeline = [], rawOptions, endPipeline = []) {
    const { page: rawPage = '1', pageSize: rawPageSize = '10', searchValue, searchFields = [], sortField, sortOrder, projection, excludeIds, selectFields, ids, populateFields, ...rawFilter } = rawOptions;
    const page = Number(rawPage);
    const pageSize = Number(rawPageSize);
    const skip = (Number(page) - 1) * Number(pageSize);
    // Build $match stage from filters
    const matchStage = { ...rawFilter };
    if (page <= 0) {
        throw new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT);
    }
    // IDs filter
    if (ids) {
        const parsedIds = Array.isArray(ids) ? ids : ids.split(',');
        const validIds = parsedIds.filter(Types.ObjectId.isValid).map(id => new Types.ObjectId(id));
        if (validIds.length > 0)
            matchStage._id = { $in: validIds };
    }
    // Exclude IDs
    if (excludeIds) {
        const parsedIds = Array.isArray(excludeIds) ? excludeIds : excludeIds.split(',');
        const validIds = parsedIds.filter(Types.ObjectId.isValid).map(id => new Types.ObjectId(id));
        matchStage._id = { ...(matchStage._id || {}), $nin: validIds };
    }
    // Normalize search fields
    const normalizedSearchFields = Array.isArray(searchFields)
        ? searchFields
        : typeof searchFields === 'string'
            ? searchFields.split(',').map(field => field.trim())
            : [];
    // Search handling
    if (searchValue && normalizedSearchFields.length > 0) {
        const regexOrs = normalizedSearchFields
            .filter(field => field !== '_id')
            .map(field => ({
            [field]: { $regex: searchValue.trim(), $options: 'i' },
        }));
        const objectIdOr = Types.ObjectId.isValid(searchValue) && normalizedSearchFields.includes('_id')
            ? [{ _id: new Types.ObjectId(searchValue) }]
            : [];
        matchStage.$or = [...regexOrs, ...objectIdOr];
    }
    // Add $match to the pipeline
    const pipeline = [...basePipeline, { $match: matchStage }];
    // Projection handling
    if (projection && typeof projection === 'string') {
        const fields = projection.split(',').map(f => f.trim());
        if (fields.length > 0) {
            pipeline.push({
                $project: fields.reduce((acc, field) => {
                    acc[field] = 1;
                    return acc;
                }, {}),
            });
        }
    }
    // Sorting
    if (sortField) {
        const sort = !!sortField
            ? { [sortField]: sortOrder === 'desc' ? -1 : 1 }
            : { createdAt: -1 };
        pipeline.push({ $sort: sort });
    }
    const dataPipeline = [{ $skip: skip }, { $limit: pageSize }, ...endPipeline];
    // Apply populateFields inside `dataPipeline` before putting it into $facet
    if (populateFields && Array.isArray(populateFields)) {
        for (const { path, select, from: collectionName } of populateFields) {
            const localField = path;
            const foreignField = '_id';
            const from = collectionName ?? path.replace(/Id$/, 's');
            const selectedFields = select
                ? select.split(' ').reduce((acc, field) => {
                    acc[field] = 1;
                    return acc;
                }, { _id: 1 })
                : { _id: 1 };
            dataPipeline.push({
                $lookup: {
                    from,
                    localField,
                    foreignField,
                    as: path,
                },
            }, {
                $unwind: {
                    path: `$${path}`,
                    preserveNullAndEmptyArrays: true,
                },
            }, {
                $addFields: {
                    [path]: {
                        $cond: [
                            { $ifNull: [`$${path}`, false] },
                            Object.fromEntries(Object.entries(selectedFields).map(([key]) => [key, `$${path}.${key}`])),
                            null,
                        ],
                    },
                },
            });
        }
    }
    // Add $facet to the pipeline, to count the total number of items & apply pagination
    const paginatedPipeline = [
        ...pipeline,
        {
            $facet: {
                data: [...dataPipeline],
                totalCount: [{ $count: 'totalItems' }],
            },
        },
        {
            $addFields: {
                totalItems: { $ifNull: [{ $arrayElemAt: ['$totalCount.totalItems', 0] }, 0] },
            },
        },
    ];
    // console.log('pipeline', JSON.stringify(paginatedPipeline, null, 2));
    const result = await model.aggregate(paginatedPipeline);
    const { data, totalItems } = result[0] || { data: [], totalItems: 0 };
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
        status: 'success',
        message: responseMessages.GENERAL.SUCCESS,
        data,
        totalItems,
        totalPages,
        currentPage: Number(page),
        pageSize: Number(pageSize),
        hasMore: data.length === Number(pageSize),
    };
}
function buildNestedPopulate(fields) {
    const tree = {};
    for (const field of fields) {
        const parts = field.split('.');
        let current = tree;
        for (const part of parts) {
            if (!current[part])
                current[part] = {};
            current = current[part];
        }
    }
    const buildPopulate = (obj) => Object.entries(obj).map(([path, sub]) => ({
        path,
        ...(Object.keys(sub).length > 0 ? { populate: buildPopulate(sub) } : {}),
    }));
    return buildPopulate(tree);
}
