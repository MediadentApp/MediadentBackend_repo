import { ApiAccessLog, IApiAccessLog } from '#src/models/accessLogs.model.js';
import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';

const ApiAccessLogsService = new DebouncedMongoBatchExecutor(
  {
    SaveApiAccessLog: {
      create: async (data: IApiAccessLog[]) => {
        await ApiAccessLog.insertMany(data);
      },
    },
  },
  20000,
  100
);

export default ApiAccessLogsService;
