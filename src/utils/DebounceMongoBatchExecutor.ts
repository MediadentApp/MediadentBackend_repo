import appConfig from '#src/config/appConfig.js';

type DebouncedOperationType = 'create' | 'update' | 'delete';

type GenericOperation = {
  type: DebouncedOperationType;
  id: string; // Used for deduplication
  data: any; // Data required for the actual DB operation
  collectionName: string; // e.g., 'PostView', 'Post', etc.
};

type OperationHandlers = {
  [collectionName: string]: {
    create?: (items: any[]) => Promise<void>;
    update?: (items: any[]) => Promise<void>;
    delete?: (items: any[]) => Promise<void>;
  };
};

export class DebouncedMongoBatchExecutor {
  private buffer = new Map<string, GenericOperation>();
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private handlers: OperationHandlers,
    private flushDelay: number = appConfig.defaultDebounceMongoBatchExecutionFlushDelay,
    private maxOperations: number = appConfig.defaultDebounceMongoBatchExecutionMaxOperations
  ) {}

  add(op: GenericOperation) {
    const key = `${op.type}:${op.collectionName}:${op.id}`;
    this.buffer.set(key, op);

    console.log(`Added mongo op to buffer: ${key}`);

    // Flush if max limit reached or if there is no timeout
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

    // Group by collection + type
    const grouped: {
      [collectionKey: string]: any[];
    } = {};

    for (const op of ops) {
      const key = `${op.type}:${op.collectionName}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(op.data);
    }

    console.log(`Flushing mongo batch ${Object.keys(grouped).length} operations...`);

    // Execute batched handlers
    await Promise.allSettled(
      Object.entries(grouped).map(async ([key, data]) => {
        const [type, collectionName] = key.split(':') as [DebouncedOperationType, string];
        const handler = this.handlers[collectionName]?.[type];
        if (handler) {
          await handler(data);
        }
      })
    );
  }
}
