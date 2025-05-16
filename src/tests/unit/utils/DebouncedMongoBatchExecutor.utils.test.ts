import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.useFakeTimers();

describe.only('DebouncedMongoBatchExecutor', () => {
  let mockCreateHandler: ReturnType<typeof vi.fn>;
  let executor: DebouncedMongoBatchExecutor;

  beforeEach(() => {
    mockCreateHandler = vi.fn().mockResolvedValue(undefined);

    executor = new DebouncedMongoBatchExecutor(1000, 3, {
      TestCollection: {
        create: mockCreateHandler,
      },
    });

    vi.clearAllTimers();
    mockCreateHandler.mockClear();
  });

  it('should batch and flush after time delay', async () => {
    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '1',
      data: { name: 'A' },
    });

    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '2',
      data: { name: 'B' },
    });

    expect(mockCreateHandler).not.toHaveBeenCalled();

    // Advance timers to trigger flush
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCreateHandler).toHaveBeenCalledOnce();
    expect(mockCreateHandler).toHaveBeenCalledWith([{ name: 'A' }, { name: 'B' }]);
  });

  it('should batch and flush when max limit reached', async () => {
    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '1',
      data: { name: 'A' },
    });

    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '2',
      data: { name: 'B' },
    });

    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '3',
      data: { name: 'C' },
    });

    // Should flush immediately after 3rd add
    expect(mockCreateHandler).toHaveBeenCalledOnce();
    expect(mockCreateHandler).toHaveBeenCalledWith([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  });

  it('should deduplicate by id', async () => {
    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '1',
      data: { name: 'A' },
    });

    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '1',
      data: { name: 'A-updated' },
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCreateHandler).toHaveBeenCalledOnce();
    expect(mockCreateHandler).toHaveBeenCalledWith([
      { name: 'A-updated' }, // Only latest version kept
    ]);
  });

  it('should handle multiple types and collections', async () => {
    const anotherHandler = vi.fn().mockResolvedValue(undefined);
    executor = new DebouncedMongoBatchExecutor(1000, 10, {
      TestCollection: {
        create: mockCreateHandler,
      },
      OtherCollection: {
        create: anotherHandler,
      },
    });

    executor.add({
      type: 'create',
      collectionName: 'TestCollection',
      id: '1',
      data: { foo: 1 },
    });

    executor.add({
      type: 'create',
      collectionName: 'OtherCollection',
      id: '2',
      data: { bar: 2 },
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCreateHandler).toHaveBeenCalledWith([{ foo: 1 }]);
    expect(anotherHandler).toHaveBeenCalledWith([{ bar: 2 }]);
  });
});
