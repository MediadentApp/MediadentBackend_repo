import { PostSave } from '#src/models/postSave.model.js';
import { IPostSave } from '#src/types/model.post.type.js';
import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';

const postSaveServiceHandler = new DebouncedMongoBatchExecutor({
  SavedPost: {
    create: async (savedPosts: IPostSave[]) => {
      if (!savedPosts.length) return;

      // No need to await, as response is ignored
      const res = await PostSave.insertMany(savedPosts, { ordered: false });

      // console.log(`Created  saved posts`, { res });
    },
    delete: async (savedPosts: IPostSave[]) => {
      if (!savedPosts.length) return;

      // No need to await, as response is ignored
      const res = await PostSave.deleteMany({
        $or: savedPosts.map(post => ({
          postId: post.postId,
          userId: post.userId,
        })),
      });

      // console.log(`Deleted saved posts`, { res });
    },
  },
});

export default postSaveServiceHandler;
