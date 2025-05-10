const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    imageCompressUpload: {
        width: 1280,
        height: 1280,
        quality: 60,
        type: 'jpeg',
        host: process.env.AWS_IMAGE_UPLOAD_LAMBDA_HOST,
        path: '/default/ImageCompressorV2',
        method: 'POST',
    }
}

export default awsConfig