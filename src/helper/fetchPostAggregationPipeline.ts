import { PipelineStage, Types } from 'mongoose';

type Options = {
  saved?: boolean; // default true, searches for saved posts
};

export const fetchPostPipelineStage = (id: string, options: Options = { saved: true }): PipelineStage[] => {
  const userId = new Types.ObjectId(id);
  return [
    {
      $lookup: {
        from: 'users',
        localField: 'authorId',
        foreignField: '_id',
        as: 'authorId',
      },
    },
    { $unwind: { path: '$authorId', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        authorId: {
          $cond: [
            {
              $ifNull: ['$authorId', false],
            },
            {
              _id: '$authorId._id',
              slug: '$authorId.slug',
              profilePicture: '$authorId.profilePicture',
              fullName: '$authorId.fullName',
              username: '$authorId.username',
            },
            null,
          ],
        },
      },
    },
    ...(options.saved === true ? [
      {
        $lookup: {
          from: 'postsaves',
          let: { postId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$postId', '$$postId'] }, { $eq: ['$userId', userId] }],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'savedByUser',
        },
      },
    ] : []),
    {
      $lookup: {
        from: 'postviews',
        let: { postId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$postId', '$$postId'] }, { $eq: ['$userId', userId] }],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'viewedByUser',
      },
    },
    {
      $lookup: {
        from: 'postvotes',
        let: { postId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$postId', '$$postId'] }, { $eq: ['$userId', userId] }],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'votedByUser',
      },
    },
    {
      $addFields: {
        ...(options.saved === true ? { isSaved: { $gt: [{ $size: '$savedByUser' }, 0] } } : {}),
        isViewed: { $gt: [{ $size: '$viewedByUser' }, 0] },
        voteType: {
          $cond: [{ $gt: [{ $size: '$votedByUser' }, 0] }, { $arrayElemAt: ['$votedByUser.voteType', 0] }, null],
        },
        netVotes: { $subtract: ['$upvotesCount', '$downvotesCount'] },
      },
    },
    {
      $project: {
        savedByUser: 0,
        viewedByUser: 0,
        votedByUser: 0,
      },
    },
  ];
};
