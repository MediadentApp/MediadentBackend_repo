import { DebouncedExecutor } from '#src/utils/DebouncedMongoExecutor.js';
import { describe, expect, it, vi } from 'vitest';

describe.skip('DebouncedExecutor', () => {
  it('should batch multiple operations and flush them', async () => {
    const executor = new DebouncedExecutor(100, 100); // fast flush for test

    const queryMocks = Array.from({ length: 5 }, (_, i) =>
      vi.fn().mockImplementation(async () => {
        console.log(`Executing fake op ${i}`);
      })
    );

    queryMocks.forEach((mockFn, i) => executor.addOperation({ id: `test-${i}`, query: mockFn }));

    await new Promise(res => setTimeout(res, 150)); // wait for flush
    queryMocks.forEach(mock => {
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  it('should execute a single operation immediately when flushed manually', async () => {
    const executor = new DebouncedExecutor();
    const mockQuery = vi.fn().mockResolvedValue('result');

    executor.addOperation({ query: mockQuery });
    await executor.flush();

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('should execute multiple operations after delay', async () => {
    const executor = new DebouncedExecutor(100); // fast delay
    const mock1 = vi.fn().mockResolvedValue('result1');
    const mock2 = vi.fn().mockResolvedValue('result2');

    executor.addOperation({ query: mock1 });
    executor.addOperation({ query: mock2 });

    await new Promise(res => setTimeout(res, 150)); // wait for flush
    expect(mock1).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
  });

  it('should flush immediately when buffer is full', async () => {
    const executor = new DebouncedExecutor(5000, 2); // buffer size = 2
    const mock1 = vi.fn().mockResolvedValue('result1');
    const mock2 = vi.fn().mockResolvedValue('result2');

    executor.addOperation({ query: mock1 });
    executor.addOperation({ query: mock2 });

    // Give a bit of time to let flush happen
    await new Promise(res => setTimeout(res, 100));

    expect(mock1).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
  });

  it('should only keep latest operation with same id', async () => {
    const executor = new DebouncedExecutor();

    const mock1 = vi.fn().mockResolvedValue('result1');
    const mock2 = vi.fn().mockResolvedValue('result2');

    executor.addOperation({ id: 'vote-user-1', query: mock1 });
    executor.addOperation({ id: 'vote-user-1', query: mock2 }); // overwrites mock1

    await executor.flush();

    expect(mock1).not.toHaveBeenCalled(); // replaced
    expect(mock2).toHaveBeenCalledTimes(1);
  });

  it('should support operation without id', async () => {
    const executor = new DebouncedExecutor();
    const mock = vi.fn().mockResolvedValue('done');

    executor.addOperation({ query: mock });
    await executor.flush();

    expect(mock).toHaveBeenCalledTimes(1);
  });
});
