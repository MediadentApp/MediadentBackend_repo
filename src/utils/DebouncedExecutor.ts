import appConfig from '#src/config/appConfig.js';

/**
 * A single operation to be debounced and executed.
 */
export type WriteOperation = {
  /**
   * Optional unique identifier for deduplication.
   * If not provided, a UUID will be generated.
   * Example: combining userId + postId for uniqueness.
   */
  id?: string;

  /**
   * Function that returns a MongoDB write operation Promise (insert/update/delete).
   */
  query: () => Promise<any>;
};

/**
 * Public interface for a debounced executor that supports adding operations and flushing them.
 */
export interface IDebouncedExecutor {
  /**
   * Add an operation to the buffer to be executed later.
   * @param op - The operation to enqueue
   */
  addOperation: (op: WriteOperation) => void;

  /**
   * Immediately flush and execute all pending operations.
   */
  flush: () => Promise<void>;
}

/**
 * Utility class that buffers MongoDB operations and executes them in batches
 * after a certain delay or when the maximum number of operations is reached.
 *
 * @example
 * const executor = new DebouncedExecutor();
 * executor.addOperation({
 *   id: 'user:123+post:456',
 *   query: () => Post.updateOne({ _id: '456' }, { $inc: { views: 1 } })
 * });
 */
export class DebouncedExecutor implements IDebouncedExecutor {
  /** Internal buffer for storing pending operations */
  private buffer = new Map<string, WriteOperation>();

  /** Timeout handle for flush delay */
  private timeoutId: NodeJS.Timeout | null = null;

  /**
   * @param flushDelay - Time (ms) to wait before auto-flushing
   * @param maxOperations - Maximum number of buffered operations before forced flush
   */
  constructor(
    private flushDelay: number = appConfig.defaultDebounceExecutionFlushDelay,
    private maxOperations: number = appConfig.defaultDebounceExecutionMaxOperations
  ) {}

  /**
   * Add an operation to the buffer. Starts a timer if none exists,
   * or flushes immediately if the max limit is reached.
   * @param op - Operation to buffer and eventually execute
   */
  addOperation(op: WriteOperation) {
    const id = op.id || crypto.randomUUID();
    this.buffer.set(id, op);

    console.log(`Added operation to buffer: ${id}`);

    if (this.buffer.size >= this.maxOperations) {
      this.flush();
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), this.flushDelay);
    }
  }

  /**
   * Immediately flushes all buffered operations.
   * Executes them concurrently. Throws if any operation fails.
   */
  async flush() {
    const ops = Array.from(this.buffer.values());
    this.buffer.clear();

    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;

    console.log(`Flushing ${ops.length} operations...`);

    const results = await Promise.allSettled(ops.map(op => op.query()));
    const errors: Error[] = [];

    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        console.error(`Mongo op failed:`, result.reason);
        errors.push(result.reason instanceof Error ? result.reason : new Error(String(result.reason)));
      }
    });

    if (errors.length > 0) {
      throw new AggregateError(errors, `One or more debounced MongoDB operations failed`);
    }
  }
}
