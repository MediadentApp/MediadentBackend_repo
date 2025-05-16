export type WriteOperation = {
  id?: string; // optional identifier (e.g., user+post) for deduplication
  query: () => Promise<any>; // function that returns a MongoDB operation
};

// Can use Redis to store the buffer
/**
 * Utility class for debouncing operations
 * It performs a batch of operations and flushes them after a certain delay
 *
 * @example
 * const executor = new DebouncedExecutor();
 *
 * executor.addOperation({ query: () => Post.updateOne({ _id: post._id }, { $set: { title: 'new title' } }) });
 */
export class DebouncedExecutor {
  private buffer = new Map<string, WriteOperation>();
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private flushDelay: number = 5000, // ms
    private maxOperations: number = 100
  ) {}

  addOperation(op: WriteOperation) {
    const id = op.id || crypto.randomUUID();
    this.buffer.set(id, op);

    if (this.buffer.size >= this.maxOperations) {
      this.flush();
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), this.flushDelay);
    }
  }

  async flush() {
    const ops = Array.from(this.buffer.values());
    this.buffer.clear();
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;

    // Execute all queries in parallel
    await Promise.allSettled(ops.map(op => op.query())).then(results => {
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          console.error(`Mongo op failed:`, result.reason);
        }
      });
    });
  }
}
