export enum PostSortOptions {
  Hot = 'Hot',
  New = 'New',
  Top = 'Top',
  Controversial = 'Controversial',
}

export const AI_SERVICE_VALUES = ['Gemini', 'tts', 'stt'] as const;
export type AIService = (typeof AI_SERVICE_VALUES)[number];

export const GEMINI_MODELS = {
  GEMINI_2_0_FLASH_LITE: 'gemini-2.0-flash-lite',
} as const;
export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

export const TTS_MODELS = {
  WAVENET: 'Wavenet',
  STUDIO: 'Studio',
  STANDARD: 'Standard',
  NEUTRAL2: 'Neutral2',
  POLYGLOT: 'Polyglot',
};
export type TTSModel = (typeof TTS_MODELS)[keyof typeof TTS_MODELS];

export const STT_MODELS = {
  LONG: 'latest_long',
};
export type STTModel = (typeof STT_MODELS)[keyof typeof STT_MODELS];

export const ALL_AI_MODELS = Object.values({
  ...GEMINI_MODELS,
  ...TTS_MODELS,
  ...STT_MODELS,
});

export const INTERVIEW_TYPES = {
  TECHNICAL: 'technical',
  HR: 'hr',
  SYSTEM_DESIGN: 'system-design',
  MIXED: 'mixed',
} as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[keyof typeof INTERVIEW_TYPES];

export const INTERVIEW_DIFFICULTIES = {
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
} as const;
export type InterviewDifficulty = (typeof INTERVIEW_DIFFICULTIES)[keyof typeof INTERVIEW_DIFFICULTIES];

export const INTERVIEW_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export type InterviewStatus = (typeof INTERVIEW_STATUS)[keyof typeof INTERVIEW_STATUS];

export const QUESTION_STATUS = {
  PENDING: 'pending',
  ANSWERED: 'answered',
  SKIPPED: 'skipped',
} as const;

export type QuestionStatus = (typeof QUESTION_STATUS)[keyof typeof QUESTION_STATUS];

export enum PostSortRangeOptions {
  Now = 'now',
  Today = 'today',
  Week = 'week',
  Month = 'month',
  Year = 'year',
  All = 'all',
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export enum UserType {
  Student = 'Student',
  CollegeStudent = 'College Student',
  Teacher = 'Teacher',
  Professional = 'Professional',
  // Other = 'Other',
}

export enum PostAuthorType {
  Personal = 'Personal',
  Community = 'Community',
}

export enum CommunityType {
  Public = 'Public',
  Private = 'Private',
}

export enum CommunityStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum CommunityRole {
  Admin = 'Admin',
  Moderator = 'Moderator',
  Member = 'Member',
}

export enum CommunityInviteStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Declined = 'Declined',
}

export enum CommunityMemberStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum ReportStatus {
  Pending = 'Pending',
  Reviewed = 'Reviewed',
  Resolved = 'Resolved',
  Rejected = 'Rejected',
}

export enum VoteEnum {
  upVote = 'upvote',
  downVote = 'downvote',
}

export enum BooleanQuery {
  True = '1',
  False = '0',
}

export enum SortMethod {
  Date = 'date',
  Votes = 'votes',
}

export enum SortOrder {
  Ascending = 'asc',
  Descending = 'desc',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}
