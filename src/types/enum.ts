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
