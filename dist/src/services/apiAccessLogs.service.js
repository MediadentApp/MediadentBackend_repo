import { ApiAccessLog } from '../models/accessLogs.model.js';
import { DebouncedMongoBatchExecutor } from '../utils/DebounceMongoBatchExecutor.js';
const ApiAccessLogsService = new DebouncedMongoBatchExecutor({
    SaveApiAccessLog: {
        create: async (data) => {
            await ApiAccessLog.insertMany(data);
        },
    },
}, 10000, 100);
export default ApiAccessLogsService;
