export interface PostBody {
    title: string;
    content: string;
    data: Express.Multer.File[];
    tags: string[]
}