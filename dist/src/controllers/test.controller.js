import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generateQuestionsWithVertex } from '../services/test.vertex.service.js';
export const generateInterviewQuestions = catchAsync(async (req, res, next) => {
    const { type, topic, difficulty, count = 5 } = req.body;
    if (!type || !topic || !difficulty) {
        return next(new ApiError('Missing required parameters', 400, 'Missing required parameters: type, topic, difficulty'));
    }
    const questions = await generateQuestionsWithVertex({
        type,
        topic,
        difficulty,
        count,
    });
    return ApiResponse(res, 200, 'Interview questions generated successfully', { questions });
});
