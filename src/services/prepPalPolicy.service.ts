// async function canCreateSession(userId: string) {
//   const active = await SessionModel.findOne({
//     user: userId,
//     status: 'in_progress',
//   });

//   if (active) {
//     return { allowed: false, reason: 'Active session exists' };
//   }

//   const usage = await usageService.getTodayUsage(userId);

//   if (usage.interviewsStarted >= DAILY_LIMIT) {
//     return { allowed: false, reason: 'Daily limit reached' };
//   }

//   const appUsage = await appUsageService.getMonthly();

//   if (appUsage.totalSttSeconds > STT_THRESHOLD) {
//     return { allowed: false, reason: 'System capacity reached' };
//   }

//   return { allowed: true };
// }

// const SessionPolicyService = {
//   canCreateSession,
// };

// export default SessionPolicyService;
