import { describe, it, expect } from 'vitest';

describe('Check project is using in-memory MongoDB', () => {
  it('should be configured to use in-memory MongoDB', () => {
    expect(process.env.USE_IN_MEMORY_DB).toBe('true');
  });
});
