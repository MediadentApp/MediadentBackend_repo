const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    message.includes('Eviction policy is volatile-lru')
  ) {
    return; // Suppress BullMQ eviction policy warning
  }
  originalWarn(...args);
};

const logger = {
  log: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message);
    }
  }
};

global.logger = logger;