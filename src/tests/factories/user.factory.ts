import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';

export const createMockUserId = () => new Types.ObjectId(); // Just ID for now
