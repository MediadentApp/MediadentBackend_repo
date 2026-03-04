type QuotaResult = {
  userRemaining: {
    ttsCharacters: number;
    sttSeconds: number;
    geminiTokens: number;
    interviews: number;
  };

  appRemaining: {
    ttsCharacters: number;
    sttSeconds: number;
    geminiTokens: number;
  };

  fullyUsed: {
    user: string[];
    app: string[];
  };

  canCreateSession: boolean;
  canStartInterview: boolean;

  nextSessionAvailableAt: Date | null;
  reasonIfBlocked: string | null;

  canStartVoiceInterview: boolean;
};

type UserDailyUsage = {
  date: string;

  ttsCharactersUsed: number;
  sttSecondsUsed: number;
  geminiTokensUsed: number;

  interviewsStarted: number;
};
type AppMonthlyUsage = {
  month: string;

  totalTtsCharacters: number;
  totalSttSeconds: number;
  totalGeminiTokens: number;
};

type Limits = {
  user: {
    daily: {
      ttsCharacters: number;
      sttSeconds: number;
      geminiTokens: number;
      interviews: number;
    };
  };

  app: {
    monthly: {
      ttsCharacters: number;
      sttSeconds: number;
      geminiTokens: number;
    };
  };
};

type InterviewFeatures = {
  ttsEnabled: boolean;
  sttEnabled: boolean;
};

export function calculatePrepPalQuotaStatus(
  userUsage: UserDailyUsage,
  appUsage: AppMonthlyUsage,
  limits: Limits,
  features: InterviewFeatures,
  now: Date = new Date()
): QuotaResult {
  // -------------------------
  // 1️⃣ Remaining Calculations
  // -------------------------
  const userRemaining = {
    ttsCharacters: limits.user.daily.ttsCharacters - userUsage.ttsCharactersUsed,

    sttSeconds: limits.user.daily.sttSeconds - userUsage.sttSecondsUsed,

    geminiTokens: limits.user.daily.geminiTokens - userUsage.geminiTokensUsed,

    interviews: limits.user.daily.interviews - userUsage.interviewsStarted,
  };

  const appRemaining = {
    ttsCharacters: limits.app.monthly.ttsCharacters - appUsage.totalTtsCharacters,

    sttSeconds: limits.app.monthly.sttSeconds - appUsage.totalSttSeconds,

    geminiTokens: limits.app.monthly.geminiTokens - appUsage.totalGeminiTokens,
  };

  Object.keys(userRemaining).forEach(k => {
    if ((userRemaining as any)[k] < 0) {
      (userRemaining as any)[k] = 0;
    }
  });

  Object.keys(appRemaining).forEach(k => {
    if ((appRemaining as any)[k] < 0) {
      (appRemaining as any)[k] = 0;
    }
  });

  // -------------------------
  // 2️⃣ Fully Used Detection
  // -------------------------
  const fullyUsed = {
    user: [] as string[],
    app: [] as string[],
  };

  Object.entries(userRemaining).forEach(([k, v]) => {
    if (v === 0) fullyUsed.user.push(k);
  });

  Object.entries(appRemaining).forEach(([k, v]) => {
    if (v === 0) fullyUsed.app.push(k);
  });

  // -------------------------
  // 3️⃣ Base Session Check
  // -------------------------
  let canCreateSession = true;
  let reasonIfBlocked: string | null = null;

  if (userRemaining.interviews <= 0) {
    canCreateSession = false;
    reasonIfBlocked = 'User daily interview limit reached';
  }

  if (appRemaining.geminiTokens <= 0) {
    canCreateSession = false;
    reasonIfBlocked = 'App Gemini monthly limit exhausted';
  }

  // -------------------------
  // 4️⃣ Feature-Aware Interview Feasibility
  // -------------------------
  const estimated = {
    minQuestions: 3,
    minSttPerQuestion: 45, // seconds
    minTtsPerQuestion: 250, // chars
    minGeminiPerInterview: 1500,
  };

  let canStartInterview = true;

  // Gemini is always required
  if (
    userRemaining.geminiTokens < estimated.minGeminiPerInterview ||
    appRemaining.geminiTokens < estimated.minGeminiPerInterview
  ) {
    canStartInterview = false;
    reasonIfBlocked = 'Insufficient Gemini tokens';
  }

  // STT check only if enabled
  if (features.sttEnabled) {
    const requiredStt = estimated.minQuestions * estimated.minSttPerQuestion;

    if (userRemaining.sttSeconds < requiredStt || appRemaining.sttSeconds < requiredStt) {
      canStartInterview = false;
      reasonIfBlocked = 'Insufficient STT quota';
    }
  }

  // TTS check only if enabled
  if (features.ttsEnabled) {
    const requiredTts = estimated.minQuestions * estimated.minTtsPerQuestion;

    if (userRemaining.ttsCharacters < requiredTts || appRemaining.ttsCharacters < requiredTts) {
      canStartInterview = false;
      reasonIfBlocked = 'Insufficient TTS quota';
    }
  }

  // If session itself blocked
  if (!canCreateSession) {
    canStartInterview = false;
  }

  // -------------------------
  // 5️⃣ Reset Timing Logic
  // -------------------------
  let nextSessionAvailableAt: Date | null = null;

  if (!canStartInterview) {
    if (userRemaining.interviews <= 0) {
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      nextSessionAvailableAt = tomorrow;
    } else {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      nextSessionAvailableAt = nextMonth;
    }
  }

  const estimatedMinSttPerInterview = 120;
  const estimatedMinGeminiPerInterview = 1500;

  const canStartVoiceInterview =
    userRemaining.sttSeconds >= estimatedMinSttPerInterview &&
    userRemaining.geminiTokens >= estimatedMinGeminiPerInterview &&
    appRemaining.sttSeconds >= estimatedMinSttPerInterview &&
    appRemaining.geminiTokens >= estimatedMinGeminiPerInterview;

  return {
    userRemaining,
    appRemaining,
    fullyUsed,
    canCreateSession,
    canStartInterview,
    nextSessionAvailableAt,
    reasonIfBlocked,
    canStartVoiceInterview,
  };
}
