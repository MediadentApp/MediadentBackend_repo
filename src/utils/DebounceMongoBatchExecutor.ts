import appConfig from '#src/config/appConfig.js';

/**
 * Type of database operation supported by the executor.
 */
type DebouncedOperationType = 'create' | 'update' | 'delete';

/**
 * Structure of a generic debounced operation to be buffered.
 */
type GenericOperation = {
  /** Operation type: create, update, or delete */
  type: DebouncedOperationType;

  /** Unique identifier for deduplication (e.g., postId, userId, etc.) */
  id: string;

  /** Data payload to be passed to the handler */
  data: any;

  /** Name of the collection/table/entity to operate on */
  collectionName: string;
};

export type DebouncedExecutorHandler<T = any> = {
  /** Handler for batched `create` operations */
  create?: (items: T[]) => Promise<T | void>;

  /** Handler for batched `update` operations */
  update?: (items: T[]) => Promise<T | void>;

  /** Handler for batched `delete` operations */
  delete?: (items: T[]) => Promise<T | void>;
};

/**
 * Structure for operation handlers per collection.
 */
type OperationHandlers = {
  [collectionName: string]: DebouncedExecutorHandler;
};

/**
 * Public interface for the debounced executor, exposing only `add` and `flush`.
 */
export interface IDebouncedMongoBatchExecutor {
  /**
   * Adds a new operation to the buffer.
   * @param op - The operation to enqueue.
   */
  add: (op: GenericOperation) => void;

  /**
   * Forces execution of all buffered operations immediately.
   */
  flush: () => Promise<void>;
}

/**
 * DebouncedMongoBatchExecutor batches multiple DB operations
 * and executes them in bulk after a delay or when max count is reached.
 */
export class DebouncedMongoBatchExecutor implements IDebouncedMongoBatchExecutor {
  /** Internal buffer to deduplicate and store pending operations */
  private buffer = new Map<string, GenericOperation>();

  /** Timeout reference for delayed execution */
  private timeoutId: NodeJS.Timeout | null = null;

  /**
   * Constructor for the executor.
   * @param handlers - Map of collection-wise operation handlers
   * @param flushDelay - Delay (in ms) after which operations are flushed if not already
   * @param maxOperations - Max number of operations before immediate flush
   */
  constructor(
    private handlers: OperationHandlers,
    private flushDelay: number = appConfig.defaultDebounceMongoBatchExecutionFlushDelay,
    private maxOperations: number = appConfig.defaultDebounceMongoBatchExecutionMaxOperations
  ) {}

  /**
   * Adds an operation to the internal buffer.
   * Triggers flush if max limit reached or starts timer.
   * @param op - The operation to buffer.
   */
  add(op: GenericOperation) {
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

    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;

    // Group operations by collection + operation type
    const grouped: Record<string, any[]> = {};
    for (const op of ops) {
      const key = `${op.type}:${op.collectionName}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(op.data);
    }

    console.log(`Flushing mongo batch ${Object.keys(grouped).length} operations...`);

    // Execute handlers in parallel using Promise.allSettled
    await Promise.allSettled(
      Object.entries(grouped).map(async ([key, data]) => {
        const [type, collectionName] = key.split(':') as [DebouncedOperationType, string];
        const handler = this.handlers[collectionName]?.[type];
        if (handler) {
          const res = await handler(data);
          if (res && process.env.NODE_ENV === 'development') {
            console.log(`Mongo batch execution result of ${key}:\n${JSON.stringify(res, null, 2)}`);
          }
        }
      })
    );
  }
}
