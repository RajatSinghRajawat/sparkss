const crypto = require("crypto");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getS3Client, getS3Bucket, getS3Url, getPresignedUploadUrl } = require("../config/s3");

// ─── MIME → Extension mapping ───
const mimeToExt = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-msvideo": ".avi",
  "video/3gpp": ".3gp",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/**
 * Generate a unique S3 key + presigned upload URL
 * @param {string} folder - S3 folder path e.g. 'reels/videos'
 * @param {string} contentType - MIME type e.g. 'video/mp4'
 * @returns {Promise<{ key: string, uploadUrl: string, fileUrl: string }>}
 */
const generateUploadUrl = async (folder, contentType) => {
  const ext = mimeToExt[contentType] || ".bin";
  const uniqueId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  const key = `${folder}/${uniqueId}${ext}`;

  // Generate presigned PUT URL (valid for 10 minutes)
  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  // Build the final public URL (after upload completes)
  const fileUrl = getS3Url(key);

  console.log(`🔗 Presigned URL generated: ${key} (${contentType})`);

  return { key, uploadUrl, fileUrl };
};

/**
 * Delete a file from AWS S3
 * @param {string} key - S3 object key e.g. 'reels/videos/xxx.mp4'
 */
const deleteFromS3 = async (key) => {
  if (!key) return;

  try {
    const s3Client = getS3Client();
    const bucket = getS3Bucket();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`🗑️  S3 Deleted: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to delete from S3: ${key}`, error.message);
  }
};

module.exports = {
  generateUploadUrl,
  deleteFromS3,
};
