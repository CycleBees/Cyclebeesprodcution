
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require('fs');
const path = require("path");

const { config } = require("dotenv");
config()

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
})

// Generate pre-signed upload URL for direct S3 upload
const generatePresignedUploadUrl = async (fileName, fileType, requestType) => {
    const s3Key = `${requestType}/${Date.now()}-${fileName}`;
    
    const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType
    });

    try {
        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry
        
        console.log("Generated pre-signed upload URL:", {
            s3Key,
            fileType,
            requestType,
            expiresIn: "1 hour"
        });
        
        return {
            uploadUrl: presignedUrl,
            s3Key: s3Key
        };
    } catch (err) {
        console.error("Error generating pre-signed upload URL:", err);
        return false;
    }
};

// Generate pre-signed download URL for secure file access
const generatePresignedDownloadUrl = async (s3Key) => {
    const command = new GetObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: s3Key
    });

    try {
        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry
        
        console.log("Generated pre-signed download URL:", {
            s3Key,
            expiresIn: "1 hour"
        });
        
        return presignedUrl;
    } catch (err) {
        console.error("Error generating pre-signed download URL:", err);
        return false;
    }
};

// Delete file from S3 bucket
const deleteS3File = async (s3Key) => {
    const command = new DeleteObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: s3Key
    });

    try {
        await s3.send(command);
        console.log("S3 file deleted successfully:", s3Key);
        return true;
    } catch (err) {
        console.error("Error deleting S3 file:", s3Key, err);
        return false;
    }
};

// Delete multiple files from S3 bucket
const deleteS3Files = async (s3Keys) => {
    if (!Array.isArray(s3Keys) || s3Keys.length === 0) {
        return { success: true, deleted: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
        s3Keys.map(s3Key => deleteS3File(s3Key))
    );

    const deleted = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - deleted;

    console.log(`S3 batch deletion completed: ${deleted} deleted, ${failed} failed`);

    return {
        success: failed === 0,
        deleted,
        failed
    };
};

// upload file to S3 bucket (legacy method - keeping for backward compatibility)
const uploadFilesinS3 = async (fileUrl, fileType, fileName, requestType) => {
    const filePath = path.join(__dirname, '..', fileUrl);
    const fileStream = fs.createReadStream(filePath);
    const s3Key = `${requestType}/${Date.now()}-${fileName}`;

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileStream,
        ContentType: fileType
    };

    console.log("S3 Upload Params: ", {
        filePath,
        s3Key,
        fileType,
        fileName,
        requestType
    });
    
    try {
        await s3.send(new PutObjectCommand(params))

        const s3FileUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`

        // cleanup 
        fs.unlink(filePath, err => {
            if (err) console.error('Failed to delete local file:', err);
        });

        console.log("S3 upload successful:", s3FileUrl);
        return s3FileUrl;
    } catch (err) {
        console.error("S3 Upload error: ", err)

        fs.unlink(filePath, () => { });
        return false;
    }
}

module.exports = {
    uploadFilesinS3,
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    deleteS3File,
    deleteS3Files
}