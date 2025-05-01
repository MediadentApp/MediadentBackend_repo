export interface PostRegBody {
    title: string;
    content: string;
    data: Express.Multer.File[];
    tags: string[]
}
