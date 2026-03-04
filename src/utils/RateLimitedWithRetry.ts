import Bottleneck from 'bottleneck';

type RetryOptions = {
  retries?: number;
  initialDelayMs?: number;
  retryOn?: (err: any) => boolean;
};

type RateLimitOptions = {
  minTime?: number;
};

export function createRateLimitedWithRetry<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  rateLimit: RateLimitOptions = {},
  retry: RetryOptions = {}
) {
  const { minTime = 0 } = rateLimit;

  const { retries = 0, initialDelayMs = 500, retryOn = err => err?.status === 429 } = retry;

  const limiter = new Bottleneck({ minTime });
  const limitedFn = limiter.wrap(fn) as (...args: TArgs) => Promise<TResult>;

  return async (...args: TArgs): Promise<TResult> => {
    let delay = initialDelayMs;

    for (let i = 0; i <= retries; i++) {
      try {
        return await limitedFn(...args);
      } catch (err) {
        if (i < retries && retryOn(err)) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }

    // unreachable, but keeps TS happy
    throw new Error('Retry logic failed unexpectedly');
  };
}
