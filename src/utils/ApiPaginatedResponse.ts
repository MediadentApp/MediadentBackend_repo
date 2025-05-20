import { Types, Model, PipelineStage, SortOrder } from 'mongoose';
import responseMessages from '#src/config/constants/responseMessages.js';
import { IPaginatedResponse, IPaginationOptions } from '#src/types/api.response.paginated.js';

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
export async function FetchPaginatedData<T = any, M extends Model<T> = Model<T>>(
  model: M,
  rawOptions: IPaginationOptions<T> & Record<string, any>
): Promise<IPaginatedResponse<T>> {
  const {
    page: rawPage = '1',
    pageSize: rawPageSize = '10',
    selectFields,
    searchValue,
    searchFields = [],
    projection,
    populateFields,
    defaultProjection = {},
    sortField,
    sortOrder,
    excludeIds,
    ids,
    ...rawFilter
  } = rawOptions;

  const page = Number(rawPage);
  const pageSize = Number(rawPageSize);

  const filter: any = { ...rawFilter };

  // Parse and apply selectFields (overrides projection if used)
  let selectFieldsObj: Record<string, number> | undefined = undefined;
  if (selectFields && typeof selectFields === 'string') {
    const fields = selectFields.split(',').map(field => field.trim());
    if (fields.length > 0) {
      selectFieldsObj = fields.reduce(
        (acc, field) => {
          if (field.startsWith('-')) {
            acc[field.substring(1)] = 0;
          } else {
            acc[field] = 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  let projectionObj: Record<string, string> = defaultProjection;
  // If projection is passed in the query, as comma separated, override defaults
  if (projection && typeof projection === 'string') {
    const fields = projection.split(',').map(field => field.trim());
    if (fields.length > 0) {
      projectionObj = fields.reduce(
        (acc, field) => {
          if (field) acc[field] = '1';
          return acc;
        },
        {} as Record<string, string>
      );
    }
  }

  // Parse and apply `excludeIds` (skip specified _ids)
  if (excludeIds) {
    const parsed = Array.isArray(excludeIds) ? excludeIds : typeof excludeIds === 'string' ? excludeIds.split(',') : [];
    filter._id = {
      ...(filter._id || {}),
      $nin: parsed
        .filter((id: string) => Types.ObjectId.isValid(id))
        .map((id: string) => Types.ObjectId.createFromHexString(id.toString())),
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
    const objectIdOr =
      Types.ObjectId.isValid(searchValue) && normalizedSearchFields.includes('_id')
        ? [{ _id: new Types.ObjectId(searchValue) }]
        : [];
    filter.$or = [...regexOrs, ...objectIdOr];
  }

  const totalItems = await model.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / Number(pageSize));
  const skip = (Number(page) - 1) * Number(pageSize);
  const cleanProjection = Object.fromEntries(Object.entries(projectionObj).map(([key, value]) => [key, Number(value)]));
  const sort: { [key: string]: SortOrder } = !!sortField
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
    const fieldsToPopulate = Array.isArray(populateFields)
      ? populateFields
      : typeof populateFields === 'string'
        ? populateFields.split(',').map(field => field.trim())
        : [];

    const nestedPopulate = buildNestedPopulate(fieldsToPopulate);
    nestedPopulate.forEach(populateObj => {
      query.populate(populateObj);
    });
  }

  const data = (await query.exec()) as T[];

  const returnData: IPaginatedResponse<T> = {
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

export async function FetchPaginatedDataWithAggregation<T = any>(
  model: Model<any>,
  basePipeline: PipelineStage[] = [],
  rawOptions: IPaginationOptions & Record<string, any>
): Promise<IPaginatedResponse<T>> {
  const {
    page: rawPage = '1',
    pageSize: rawPageSize = '10',
    searchValue,
    searchFields = [],
    sortField,
    sortOrder,
    projection,
    excludeIds,
    ids,
    ...rawFilter
  } = rawOptions;

  const page = Number(rawPage);
  const pageSize = Number(rawPageSize);
  const skip = (Number(page) - 1) * Number(pageSize);

  // Build $match stage from filters
  const matchStage: Record<string, any> = { ...rawFilter };

  // IDs filter
  if (ids) {
    const parsedIds = Array.isArray(ids) ? ids : ids.split(',');
    const validIds = parsedIds.filter(Types.ObjectId.isValid).map(id => new Types.ObjectId(id));
    if (validIds.length > 0) matchStage._id = { $in: validIds };
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
    const objectIdOr =
      Types.ObjectId.isValid(searchValue) && normalizedSearchFields.includes('_id')
        ? [{ _id: new Types.ObjectId(searchValue) }]
        : [];
    matchStage.$or = [...regexOrs, ...objectIdOr];
  }

  // Add $match to the pipeline
  const pipeline: PipelineStage[] = [...basePipeline, { $match: matchStage }];

  // Projection handling
  if (projection && typeof projection === 'string') {
    const fields = projection.split(',').map(f => f.trim());
    if (fields.length > 0) {
      pipeline.push({
        $project: fields.reduce(
          (acc, field) => {
            acc[field] = 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      });
    }
  }

  // Sorting
  const sort: { [key: string]: 1 | -1 } = !!sortField
    ? { [sortField]: sortOrder === 'desc' ? -1 : 1 }
    : { createdAt: -1 };
  pipeline.push({ $sort: sort });

  // Count pipeline
  const countPipeline = [...pipeline, { $count: 'totalItems' }];

  // Paginate pipeline
  const paginatedPipeline = [...pipeline, { $skip: skip }, { $limit: Number(pageSize) }];

  const [data, countResult] = await Promise.all([model.aggregate(paginatedPipeline), model.aggregate(countPipeline)]);

  const totalItems = countResult[0]?.totalItems || 0;
  const totalPages = Math.ceil(totalItems / Number(pageSize));

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

function buildNestedPopulate(fields: string[]): any[] {
  const tree: Record<string, any> = {};

  for (const field of fields) {
    const parts = field.split('.');
    let current = tree;

    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  const buildPopulate = (obj: Record<string, any>): any[] =>
    Object.entries(obj).map(([path, sub]) => ({
      path,
      ...(Object.keys(sub).length > 0 ? { populate: buildPopulate(sub) } : {}),
    }));

  return buildPopulate(tree);
}
