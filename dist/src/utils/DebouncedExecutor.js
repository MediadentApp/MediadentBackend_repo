import appConfig from '../config/appConfig.js';
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
export class DebouncedExecutor {
    flushDelay;
    maxOperations;
    /** Internal buffer for storing pending operations */
    buffer = new Map();
    /** Timeout handle for flush delay */
    timeoutId = null;
    /**
     * @param flushDelay - Time (ms) to wait before auto-flushing
     * @param maxOperations - Maximum number of buffered operations before forced flush
     */
    constructor(flushDelay = appConfig.defaultDebounceExecutionFlushDelay, maxOperations = appConfig.defaultDebounceExecutionMaxOperations) {
        this.flushDelay = flushDelay;
        this.maxOperations = maxOperations;
    }
    /**
     * Add an operation to the buffer. Starts a timer if none exists,
     * or flushes immediately if the max limit is reached.
     * @param op - Operation to buffer and eventually execute
     */
    addOperation(op) {
        const id = op.id || crypto.randomUUID();
        this.buffer.set(id, op);
        console.log(`Added operation to buffer: ${id}`);
        if (this.buffer.size >= this.maxOperations) {
            this.flush();
        }
        else if (!this.timeoutId) {
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
        if (this.timeoutId)
            clearTimeout(this.timeoutId);
        this.timeoutId = null;
        console.log(`Flushing ${ops.length} operations...`);
        const results = await Promise.allSettled(ops.map(op => op.query()));
        const errors = [];
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
