import Notification from '#src/models/userNotificationModel.js';
import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';

const NotificationService = new DebouncedMongoBatchExecutor({
  ReadNotifications: {
    update: async (ids: string[][]) => {
      const flattenedIds = ids.flat();
      await Notification.updateMany({ _id: { $in: flattenedIds } }, { $set: { isRead: true } });
    },
    delete: async (ids: string[][]) => {
      const flattenedIds = ids.flat();
      await Notification.deleteMany({ _id: { $in: flattenedIds } });
    },
  },
});

export default NotificationService;
