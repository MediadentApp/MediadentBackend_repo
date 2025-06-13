import appConfig from '../config/appConfig.js';
/**
 * DebouncedMongoBatchExecutor batches multiple DB operations
 * and executes them in bulk after a delay or when max count is reached.
 */
export class DebouncedMongoBatchExecutor {
    handlers;
    flushDelay;
    maxOperations;
    /** Internal buffer to deduplicate and store pending operations */
    buffer = new Map();
    /** Timeout reference for delayed execution */
    timeoutId = null;
    /**
     * Constructor for the executor.
     * @param handlers - Map of collection-wise operation handlers
     * @param flushDelay - Delay (in ms) after which operations are flushed if not already
     * @param maxOperations - Max number of operations before immediate flush
     */
    constructor(handlers, flushDelay = appConfig.defaultDebounceMongoBatchExecutionFlushDelay, maxOperations = appConfig.defaultDebounceMongoBatchExecutionMaxOperations) {
        this.handlers = handlers;
        this.flushDelay = flushDelay;
        this.maxOperations = maxOperations;
    }
    /**
     * Adds an operation to the internal buffer.
     * Triggers flush if max limit reached or starts timer.
     * @param op - The operation to buffer.
     */
    add(op) {
        const key = `${op.type}:${op.collectionName}:${op.id}`;
        this.buffer.set(key, op);
        console.log(`Added mongo op to buffer: ${key}`);
        // Flush immediately if buffer is full
        if (this.buffer.size >= this.maxOperations) {
            this.flush();
        }
        // Otherwise, start a timer if not already active
        else if (!this.timeoutId) {
            this.timeoutId = setTimeout(() => this.flush(), this.flushDelay);
        }
    }
    /**
     * Immediately flushes all buffered operations by grouping them and
     * calling the appropriate collection/type handlers in parallel.
     */
    async flush() {
        const ops = Array.from(this.buffer.values());
        this.buffer.clear();
        if (this.timeoutId)
            clearTimeout(this.timeoutId);
        this.timeoutId = null;
        // Group operations by collection + operation type
        const grouped = {};
        for (const op of ops) {
            const key = `${op.type}:${op.collectionName}`;
            if (!grouped[key])
                grouped[key] = [];
            grouped[key].push(op.data);
        }
        console.log(`Flushing mongo batch ${Object.keys(grouped).length} operations...`);
        // Execute handlers in parallel using Promise.allSettled
        await Promise.allSettled(Object.entries(grouped).map(async ([key, data]) => {
            const [type, collectionName] = key.split(':');
            const handler = this.handlers[collectionName]?.[type];
            if (handler) {
                const res = await handler(data);
                if (res && process.env.NODE_ENV === 'development') {
                    console.log(`Mongo batch execution result of ${key}:\n${JSON.stringify(res, null, 2)}`);
                }
            }
        }));
    }
}
