declare global {
  namespace NodeJS {
    interface Global {
      logger: {
        log: (message: string) => void;
      };
    }
  }
}
